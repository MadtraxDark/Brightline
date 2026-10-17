"""Report extraction, NIH chest X-ray inference and exploratory comparison."""
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule",
    "Pneumonia", "Pneumothorax", "Consolidation", "Edema", "Emphysema",
    "Fibrosis", "Pleural_Thickening", "Hernia",
]
APP_ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = APP_ROOT / "artifacts" / "nih-chestxray14"
if not MODEL_ROOT.is_dir():
    MODEL_ROOT = APP_ROOT.parent / "artifacts" / "nih-chestxray14"
MODEL_PATH = Path(os.getenv("BRIGHTLINE_CXR_MODEL", str(MODEL_ROOT / "nih_chestxray14.keras")))
METRICS_PATH = Path(os.getenv("BRIGHTLINE_CXR_METRICS", str(MODEL_PATH.parent / "metrics.json")))
EXPLORATORY_THRESHOLD = float(os.getenv("BRIGHTLINE_CXR_THRESHOLD", "0.5"))
MAX_REPORT_CHARS = 100_000
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MODEL_VERSION = "nih-chestxray14-efficientnetb0-v1"

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


def read_metrics(path: Path = METRICS_PATH) -> dict[str, Any]:
    try:
        metrics = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return metrics if isinstance(metrics, dict) else {}


def load_model(path: Path = MODEL_PATH):
    if not path.is_file():
        raise FileNotFoundError("Modelo EfficientNetB0 não encontrado")
    import tensorflow as tf
    model = tf.keras.models.load_model(path, compile=False)
    if tuple(model.output_shape[-1:]) != (14,):
        raise ValueError("O modelo precisa retornar 14 probabilidades")
    return model


@lru_cache(maxsize=1)
def _model():
    return load_model()


def initialize_model() -> bool:
    """Load once during API startup. Missing artifacts leave text-only mode usable."""
    if not MODEL_PATH.is_file():
        return False
    _model()
    return True


def infer(image_bytes: bytes) -> tuple[dict[str, float], str]:
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Radiografia vazia ou acima do limite de 10 MB")
    try:
        import io
        import tensorflow as tf
        from PIL import Image, UnidentifiedImageError
        with Image.open(io.BytesIO(image_bytes)) as source:
            if source.format not in {"PNG", "JPEG"}:
                raise ValueError("A radiografia deve estar em PNG ou JPEG")
            if source.width * source.height > 40_000_000:
                raise ValueError("Resolução da radiografia excede o limite de 40 megapixels")
            image_format = source.format
        # Match train_nih.make_dataset: decode to RGB, resize with TensorFlow
        # antialiasing, and preserve the raw 0..255 scale used in training.
        decode = tf.io.decode_png if image_format == "PNG" else tf.io.decode_jpeg
        pixels = tf.image.resize(decode(image_bytes, channels=3), (224, 224), antialias=True)
    except ImportError:
        raise RuntimeError("TensorFlow e Pillow precisam estar instalados no serviço de inferência") from None
    except (UnidentifiedImageError, OSError):
        raise ValueError("Arquivo de radiografia inválido") from None
    probabilities = _model().predict(pixels[None, ...], verbose=0)[0].tolist()
    if len(probabilities) != len(LABELS):
        raise ValueError("Saída do modelo incompatível com as 14 classes")
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
