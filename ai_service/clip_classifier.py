"""
CLIP-based road condition classifier.
Uses OpenAI CLIP via HuggingFace transformers for zero-shot image classification.
No training required — works accurately out of the box.

Classes:
  - pothole   → Road has potholes, cracks, or damage
  - normal    → Road is in good condition
  - not_road  → Image is not a road at all
"""

import logging
from PIL import Image
from io import BytesIO

logger = logging.getLogger(__name__)

# ── Lazy-loaded pipeline ─────────────────────────────────────────────
_classifier = None
_load_error = None

CANDIDATE_LABELS = [
    "a photo of a damaged road with potholes, cracks, or broken surface",
    "a photo of a smooth normal road in good condition",
    "this is not a photo of a road, it is a document, screenshot, person, building, or indoor scene",
]

LABEL_MAP = {
    CANDIDATE_LABELS[0]: "pothole",
    CANDIDATE_LABELS[1]: "normal",
    CANDIDATE_LABELS[2]: "not_road",
}


def _load_model():
    """Download & load CLIP model (first call downloads ~600 MB, cached after)."""
    global _classifier, _load_error
    try:
        from transformers import pipeline

        logger.info("⏳ Loading CLIP model (openai/clip-vit-base-patch32)…")
        logger.info("   First run downloads ~600 MB — subsequent starts are instant.")
        _classifier = pipeline(
            "zero-shot-image-classification",
            model="openai/clip-vit-base-patch32",
        )
        _load_error = None
        logger.info("✅ CLIP model loaded successfully")
    except Exception as exc:
        _load_error = str(exc)
        logger.exception("❌ Failed to load CLIP model: %s", exc)


def get_classifier():
    """Lazy-load the CLIP pipeline on first use."""
    if _classifier is None and _load_error is None:
        _load_model()
    return _classifier


def is_model_ready():
    """Check if model is loaded (without triggering a load)."""
    return _classifier is not None


def classify_road(image_bytes: bytes) -> dict:
    """
    Classify an image as pothole / normal / not_road.

    Returns:
        {
            "label":       "pothole" | "normal" | "not_road",
            "confidence":  float (0–1),
            "scores":      {"pothole": 0.xx, "normal": 0.xx, "not_road": 0.xx},
        }
    """
    clf = get_classifier()
    if clf is None:
        raise RuntimeError(
            _load_error or "CLIP model could not be loaded. Check logs."
        )

    image = Image.open(BytesIO(image_bytes)).convert("RGB")

    results = clf(image, candidate_labels=CANDIDATE_LABELS)

    # results → list of {label, score} sorted by score desc
    top = results[0]
    label = LABEL_MAP.get(top["label"], "unknown")
    confidence = top["score"]

    all_scores = {
        LABEL_MAP.get(r["label"], r["label"]): round(r["score"], 4)
        for r in results
    }

    return {
        "label": label,
        "confidence": round(confidence, 4),
        "scores": all_scores,
    }
