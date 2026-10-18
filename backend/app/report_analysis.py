"""Report extraction, TorchXRayVision chest X-ray inference and exploratory comparison."""
from __future__ import annotations

import os
import re
import math
import base64
import threading
import logging
import time
from functools import lru_cache
from typing import Any


LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule",
    "Pneumonia", "Pneumothorax", "Consolidation", "Edema", "Emphysema",
    "Fibrosis", "Pleural_Thickening", "Hernia",
]
MODEL_WEIGHTS = os.getenv("BRIGHTLINE_CXR_WEIGHTS", "densenet121-res224-nih")
IMAGE_SIZE = 224
EXPLORATORY_THRESHOLD = float(os.getenv("BRIGHTLINE_CXR_THRESHOLD", "0.5"))
LOCALIZATION_CANDIDATE_THRESHOLD = 0.25
MAX_REPORT_CHARS = 100_000
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MODEL_VERSION = f"torchxrayvision-{MODEL_WEIGHTS}"
_INFERENCE_LOCK = threading.RLock()
logger = logging.getLogger("uvicorn.error")

# The aliases intentionally map only the model's 14 labels. They are lexical
# equivalences, not a clinical ontology; negation/uncertainty remain visible.
ALIASES = {
    "Atelectasis": ("atelectasis", "atelectasia", "colapso pulmonar"),
    "Cardiomegaly": ("cardiomegaly", "cardiomegalia", "aumento da area cardiaca"),
    "Effusion": ("effusion", "derrame pleural", "pleural effusion"),
    "Infiltration": ("infiltration", "infiltrado pulmonar", "opacidade intersticial"),
    "Mass": ("mass", "massa pulmonar"),
    "Nodule": ("nodule", "nodulo pulmonar"),
    "Pneumonia": ("pneumonia", "broncopneumonia"),
    "Pneumothorax": ("pneumothorax", "pneumotorax"),
    "Consolidation": ("consolidation", "consolidacao pulmonar"),
    "Edema": ("edema", "edema pulmonar"),
    "Emphysema": ("emphysema", "enfisema"),
    "Fibrosis": ("fibrosis", "fibrose pulmonar"),
    "Pleural_Thickening": ("pleural thickening", "espessamento pleural"),
    "Hernia": ("hernia", "hérnia"),
}
NEGATION = re.compile(r"\b(?:sem|ausencia de|ausência de|nao ha|não há|nao se observa|não se observa|negativo para)\b", re.I)
UNCERTAINTY = re.compile(r"\b(?:possivel|possível|provavel|provável|suspeita de|sugestivo de|nao se pode excluir|não se pode excluir|questionavel|questionável)\b", re.I)


def load_model():
    """Load the pretrained TorchXRayVision DenseNet121 (NIH weights) for CPU inference."""
    try:
        import torch
        import torchxrayvision as xrv
    except ImportError:
        raise RuntimeError("torch e torchxrayvision precisam estar instalados no serviço de inferência") from None
    torch.set_num_threads(max(1, int(os.getenv("BRIGHTLINE_CXR_THREADS", "2"))))
    model = xrv.models.DenseNet(weights=MODEL_WEIGHTS).eval()
    pathologies = list(model.pathologies)
    missing = [label for label in LABELS if label not in pathologies]
    if missing:
        raise RuntimeError(f"O modelo não fornece as classes: {', '.join(missing)}")
    return model


@lru_cache(maxsize=1)
def _model():
    return load_model()


@lru_cache(maxsize=1)
def model_metadata() -> dict[str, Any]:
    """Identify the loaded model; weights are reused until the service restarts."""
    model = _model()
    import torch
    import torchxrayvision as xrv
    return {"engine": "torchxrayvision", "torchxrayvision_version": xrv.__version__,
            "torch_version": str(torch.__version__), "weights": MODEL_WEIGHTS,
            "input_shape": [1, IMAGE_SIZE, IMAGE_SIZE], "labels": list(LABELS),
            "model_pathologies": list(model.pathologies),
            "preprocessing": "grayscale-center-crop-resize224-xrv-normalize-1024",
            "output_activation": "sigmoid"}


def initialize_model() -> bool:
    """Load once during API startup. Missing runtime/weights leave text-only mode usable."""
    model_metadata()
    return True


def preprocess(image_bytes: bytes, *, return_geometry: bool = False):
    """Decode PNG/JPEG into the (1, 1, 224, 224) tensor expected by TorchXRayVision."""
    import io
    import numpy as np
    from PIL import Image, UnidentifiedImageError
    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            if source.format not in {"PNG", "JPEG"}:
                raise ValueError("A radiografia deve estar em PNG ou JPEG")
            if source.width * source.height > 40_000_000:
                raise ValueError("Resolução da radiografia excede o limite de 40 megapixels")
            gray = np.asarray(source.convert("L"), dtype=np.float32)
            original_width, original_height = source.size
    except (UnidentifiedImageError, OSError):
        raise ValueError("Arquivo de radiografia inválido") from None
    import torch
    import torchxrayvision as xrv
    # xrv.datasets.normalize maps 0..255 to the [-1024, 1024] range the models were trained on.
    crop_side = min(original_width, original_height)
    left = (original_width - crop_side) / 2
    top = (original_height - crop_side) / 2
    img = xrv.datasets.normalize(gray, 255)[None, ...]
    img = xrv.datasets.XRayCenterCrop()(img)
    img = xrv.datasets.XRayResizer(IMAGE_SIZE)(img)
    batch = torch.from_numpy(img).float()[None, ...]
    if return_geometry:
        return batch, {"width": original_width, "height": original_height,
                       "left": left, "top": top, "side": crop_side, "gray": gray}
    return batch


def _on_exposed_film(gray, x, y):
    """Reject centers that land on the unexposed black border of the radiograph."""
    import numpy as np

    if gray is None:
        return True
    height, width = gray.shape[:2]
    if width < 2 or height < 2 or not math.isfinite(x) or not math.isfinite(y):
        return False
    px = min(width - 1, max(0, int(round(x * (width - 1)))))
    py = min(height - 1, max(0, int(round(y * (height - 1)))))
    radius = max(3, int(round(min(width, height) * 0.015)))
    patch = gray[max(0, py - radius):py + radius + 1, max(0, px - radius):px + radius + 1]
    if patch.size == 0:
        return False
    return float(np.percentile(patch, 80)) >= 28


def _cam_localizations(model, batch, probabilities, geometry):
    """Return conservative Grad-CAM estimates; missing/ambiguous CAMs yield no marker."""
    import io
    import numpy as np
    import torch
    from PIL import Image

    layer = getattr(getattr(model, "features", None), "denseblock4", None)
    if layer is None or not hasattr(model, "pathologies"):
        return [], None
    activations = []
    handle = layer.register_forward_hook(lambda _module, _inputs, output: activations.append(output))
    try:
        model.zero_grad(set_to_none=True)
        with torch.enable_grad():
            output = model(batch.requires_grad_(True))
            candidates = [(label, list(model.pathologies).index(label)) for label in LABELS
                          if probabilities[label] >= LOCALIZATION_CANDIDATE_THRESHOLD]
            cams = []
            for candidate_number, (label, index) in enumerate(candidates):
                if not activations:
                    break
                gradient = torch.autograd.grad(output[0, index], activations[-1],
                                               retain_graph=candidate_number < len(candidates) - 1,
                                               allow_unused=True)[0]
                if gradient is None:
                    continue
                weights = gradient.mean(dim=(2, 3), keepdim=True)
                cam = torch.relu((weights * activations[-1]).sum(dim=1))[0]
                cam = torch.nn.functional.interpolate(cam[None, None], size=(IMAGE_SIZE, IMAGE_SIZE),
                                                       mode="bilinear", align_corners=False)[0, 0]
                maximum = float(cam.max().detach().cpu())
                if not math.isfinite(maximum) or maximum <= 1e-8:
                    continue
                cam = (cam / maximum).detach().cpu().numpy()
                # Reject diffuse/noisy maps and peaks at crop edges; never fabricate coordinates.
                support = cam >= 0.60
                area = float(support.mean())
                ys, xs = np.where(support)
                if not len(xs) or area < 0.002 or area > 0.35:
                    continue
                cx, cy = float(xs.mean()), float(ys.mean())
                if cx < 5 or cy < 5 or cx >= IMAGE_SIZE - 5 or cy >= IMAGE_SIZE - 5:
                    continue
                x = (geometry["left"] + ((cx + 0.5) / IMAGE_SIZE) * geometry["side"]) / geometry["width"]
                y = (geometry["top"] + ((cy + 0.5) / IMAGE_SIZE) * geometry["side"]) / geometry["height"]
                if not _on_exposed_film(geometry.get("gray"), x, y):
                    continue
                cams.append((label, float(probabilities[label]), cam, x, y))
    finally:
        handle.remove()
        model.zero_grad(set_to_none=True)
    if not cams:
        return [], None

    # Store a small original-aspect transparent heatmap; crop geometry matches displayed image.
    width, height = geometry["width"], geometry["height"]
    scale = min(1.0, 1024 / max(width, height))
    out_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    overlay = Image.new("RGBA", out_size, (0, 0, 0, 0))
    marker_entries = []
    for pathology, score, cam, x, y in cams:
        crop_size = max(1, round(geometry["side"] * scale))
        heat = Image.fromarray(np.uint8(np.clip(cam, 0, 1) * 255), "L").resize((crop_size, crop_size), Image.Resampling.BILINEAR)
        red = Image.new("RGBA", heat.size, (239, 45, 58, 0))
        red.putalpha(heat.point(lambda value: int(value * 0.48)))
        px, py = round(geometry["left"] * scale), round(geometry["top"] * scale)
        overlay.alpha_composite(red, (px, py))
        marker_entries.append({"pathology": pathology, "score": score,
                               "localization_method": "gradcam", "x": min(1.0, max(0.0, x)),
                               "y": min(1.0, max(0.0, y)), "localization_status": "estimated",
                               "heatmap_available": True})
    stream = io.BytesIO()
    overlay.save(stream, format="PNG", optimize=True)
    return marker_entries, "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode("ascii")


def infer(image_bytes: bytes, *, include_localizations: bool = False, on_classified=None):
    started = time.monotonic()
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Radiografia vazia ou acima do limite de 10 MB")
    try:
        if include_localizations:
            batch, geometry = preprocess(image_bytes, return_geometry=True)
        else:
            batch = preprocess(image_bytes)
        import torch
    except ImportError:
        raise RuntimeError("torch, torchxrayvision e Pillow precisam estar instalados no serviço de inferência") from None
    logger.info("[RECLASSIFY] stage=preprocessed elapsed=%.3f", time.monotonic() - started)
    with _INFERENCE_LOCK:
        logger.info("[RECLASSIFY] stage=model_loading elapsed=%.3f", time.monotonic() - started)
        model = _model()
        logger.info("[RECLASSIFY] stage=inference_started elapsed=%.3f", time.monotonic() - started)
        with torch.inference_mode():
            output = model(batch)
        output = output.detach().cpu().numpy()
        if output.ndim != 2 or output.shape[0] != 1 or output.shape[1] != len(model.pathologies):
            raise RuntimeError("Saída do modelo incompatível com as classes esperadas")
        by_name = dict(zip(model.pathologies, output[0].tolist()))
        probabilities = [by_name[label] for label in LABELS]
        if any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities):
            raise RuntimeError("O modelo retornou probabilidades inválidas")
        result = dict(zip(LABELS, (float(p) for p in probabilities)))
        logger.info("[RECLASSIFY] stage=classified elapsed=%.3f", time.monotonic() - started)
        if on_classified:
            on_classified(result, MODEL_VERSION)
        if include_localizations:
            logger.info("[RECLASSIFY] stage=localization_started elapsed=%.3f", time.monotonic() - started)
            try:
                markers, heatmap = _cam_localizations(model, batch.detach(), result, geometry)
            except Exception as exc:
                # Localization is optional: preserve valid classification scores.
                logger.error("[RECLASSIFY] stage=localization_failed exception=%s elapsed=%.3f",
                             type(exc).__name__, time.monotonic() - started)
                markers, heatmap = [], None
            logger.info("[RECLASSIFY] stage=localization_completed markers=%d elapsed=%.3f",
                        len(markers), time.monotonic() - started)
            return result, MODEL_VERSION, markers, heatmap
        return result, MODEL_VERSION


def find_text_classes(findings: list[dict[str, Any]]) -> tuple[set[str], dict[str, dict[str, Any]]]:
    affirmed, mentioned = set(), {}
    for finding in findings:
        text = f"{finding.get('finding', '')} {finding.get('evidence', '')}".casefold()
        for label, aliases in ALIASES.items():
            if any(alias.casefold() in text for alias in aliases):
                mentioned[label] = finding
                if not NEGATION.search(text):
                    affirmed.add(label)
    return affirmed, mentioned


def compare(findings: list[dict[str, Any]], probabilities: dict[str, float], threshold: float = EXPLORATORY_THRESHOLD) -> dict[str, Any]:
    text_classes, mentioned = find_text_classes(findings)
    predicted = {label for label, score in probabilities.items() if score >= threshold}
    disagreements = []
    for label in sorted(text_classes - predicted):
        finding = mentioned[label]
        disagreements.append({"type": "text_not_signaled", "class": label, "finding": finding.get("finding"),
                              "probability": probabilities[label], "threshold": threshold,
                "laterality": laterality(finding.get("finding", "")), "uncertainty": bool(UNCERTAINTY.search(f"{finding.get('finding', '')} {finding.get('evidence', '')}"))})
    for label in sorted(predicted - text_classes):
        finding = mentioned.get(label)
        disagreements.append({"type": "model_without_text_match", "class": label, "probability": probabilities[label],
                              "threshold": threshold, "text_mention": finding.get("finding") if finding else None,
                              "negated_or_uncertain": bool(finding and (NEGATION.search(f"{finding.get('finding', '')} {finding.get('evidence', '')}") or UNCERTAINTY.search(f"{finding.get('finding', '')} {finding.get('evidence', '')}")))})
    return {"threshold": threshold, "threshold_status": "exploratory_unvalidated", "text_classes": sorted(text_classes),
            "model_classes_above_threshold": sorted(predicted), "disagreements": disagreements,
            "limitations": ["Classes are lexical equivalents only; no validated clinical ontology is used.",
                            "Negation, uncertainty and laterality are surfaced but not clinically adjudicated.",
                            "Probabilities and exploratory threshold are not diagnoses or calibrated clinical decisions."]}


def laterality(text: str) -> str | None:
    value = text.casefold()
    if re.search(r"\b(?:bilateral|bilateralmente|ambos pulmões|ambos pulmoes)\b", value): return "bilateral"
    if re.search(r"\b(?:direita|direito|à direita|a direita)\b", value): return "right"
    if re.search(r"\b(?:esquerda|esquerdo|à esquerda|a esquerda)\b", value): return "left"
    return None
