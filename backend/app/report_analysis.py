"""Report extraction, TorchXRayVision chest X-ray inference and exploratory comparison."""
from __future__ import annotations

import os
import re
import math
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
MAX_REPORT_CHARS = 100_000
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MODEL_VERSION = f"torchxrayvision-{MODEL_WEIGHTS}"

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
            "torch_version": torch.__version__, "weights": MODEL_WEIGHTS,
            "input_shape": [1, IMAGE_SIZE, IMAGE_SIZE], "labels": list(LABELS),
            "model_pathologies": list(model.pathologies),
            "preprocessing": "grayscale-center-crop-resize224-xrv-normalize-1024",
            "output_activation": "sigmoid"}


def initialize_model() -> bool:
    """Load once during API startup. Missing runtime/weights leave text-only mode usable."""
    model_metadata()
    return True


def preprocess(image_bytes: bytes):
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
    except (UnidentifiedImageError, OSError):
        raise ValueError("Arquivo de radiografia inválido") from None
    import torch
    import torchxrayvision as xrv
    # xrv.datasets.normalize maps 0..255 to the [-1024, 1024] range the models were trained on.
    img = xrv.datasets.normalize(gray, 255)[None, ...]
    img = xrv.datasets.XRayCenterCrop()(img)
    img = xrv.datasets.XRayResizer(IMAGE_SIZE)(img)
    return torch.from_numpy(img).float()[None, ...]


def infer(image_bytes: bytes) -> tuple[dict[str, float], str]:
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Radiografia vazia ou acima do limite de 10 MB")
    try:
        batch = preprocess(image_bytes)
        import torch
    except ImportError:
        raise RuntimeError("torch, torchxrayvision e Pillow precisam estar instalados no serviço de inferência") from None
    model = _model()
    with torch.inference_mode():
        output = model(batch)
    output = output.detach().cpu().numpy()
    if output.ndim != 2 or output.shape[0] != 1 or output.shape[1] != len(model.pathologies):
        raise RuntimeError("Saída do modelo incompatível com as classes esperadas")
    by_name = dict(zip(model.pathologies, output[0].tolist()))
    probabilities = [by_name[label] for label in LABELS]
    if any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities):
        raise RuntimeError("O modelo retornou probabilidades inválidas")
    return dict(zip(LABELS, (float(p) for p in probabilities))), MODEL_VERSION


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
