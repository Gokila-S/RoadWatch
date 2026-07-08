import os
import logging
from PIL import Image
from io import BytesIO
from huggingface_hub import InferenceClient

logger = logging.getLogger(__name__)

# ── Environment Configuration ─────────────────────────────────────────
HF_TOKEN = os.environ.get("HF_TOKEN")
USE_HF_API = os.environ.get("USE_HF_API", "false").lower() in ("true", "1", "yes")

# Auto-enable remote API if a Hugging Face token is provided
if HF_TOKEN:
    USE_HF_API = True

# ── Lazy-loaded local pipeline ────────────────────────────────────────
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
    """Download & load CLIP model locally (downloads ~600 MB, cached after)."""
    global _classifier, _load_error
    try:
        from transformers import pipeline

        logger.info("⏳ Loading local CLIP model (openai/clip-vit-base-patch32)…")
        logger.info("   First run downloads ~600 MB — subsequent starts are instant.")
        _classifier = pipeline(
            "zero-shot-image-classification",
            model="openai/clip-vit-base-patch32",
        )
        _load_error = None
        logger.info("✅ Local CLIP model loaded successfully")
    except Exception as exc:
        _load_error = str(exc)
        logger.exception("❌ Failed to load local CLIP model: %s", exc)


def get_classifier():
    """Lazy-load the CLIP pipeline locally on first use."""
    global _classifier, _load_error
    if _classifier is None and _load_error is None:
        _load_model()
    return _classifier


def is_model_ready():
    """Check if local model is loaded."""
    return _classifier is not None


def classify_road(image_bytes: bytes) -> dict:
    """
    Classify an image as pothole / normal / not_road.

    Checks USE_HF_API first to call Hugging Face Inference API remotely.
    Falls back to the local transformers pipeline if remote call fails or is disabled.
    """
    if USE_HF_API:
        try:
            client = InferenceClient(token=HF_TOKEN)
            logger.info("Calling Hugging Face Inference API for CLIP zero-shot classification...")
            
            results = client.zero_shot_image_classification(
                image=image_bytes,
                candidate_labels=CANDIDATE_LABELS,
                model="openai/clip-vit-base-patch32"
            )
            
            parsed_results = []
            for r in results:
                # Handle both dicts and objects returned by InferenceClient depending on version
                if isinstance(r, dict):
                    parsed_results.append({"label": r["label"], "score": r["score"]})
                else:
                    parsed_results.append({"label": getattr(r, "label", ""), "score": getattr(r, "score", 0.0)})
            
            # Sort results by score desc
            parsed_results.sort(key=lambda x: x["score"], reverse=True)
            
            top = parsed_results[0]
            label = LABEL_MAP.get(top["label"], "unknown")
            confidence = top["score"]

            all_scores = {
                LABEL_MAP.get(r["label"], r["label"]): round(r["score"], 4)
                for r in parsed_results
            }

            logger.info("✅ Remote CLIP classification complete: %s (conf=%.4f)", label, confidence)
            return {
                "label": label,
                "confidence": round(confidence, 4),
                "scores": all_scores,
            }
        except Exception as api_err:
            logger.warning("⚠️ Hugging Face Inference API failed: %s. Falling back to local pipeline.", api_err)

    # Local fallback
    clf = get_classifier()
    if clf is None:
        raise RuntimeError(
            _load_error or "CLIP model could not be loaded locally. Check logs."
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
