"""
RoadWatch Filter App - Flask Backend
Loads an ONNX road-damage classifier and exposes a /predict endpoint.
"""

import os
import uuid
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)

# Configure CORS explicitly. In production set `AI_ALLOWED_ORIGINS`
# to a comma-separated list of trusted frontends (example: https://app.example.com)
raw_origins = os.environ.get("AI_ALLOWED_ORIGINS", "*")
if raw_origins.strip() == "*":
    cors_origins = "*"
else:
    cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

CORS(
    app,
    resources={
        r"/predict": {"origins": cors_origins},
        r"/classify": {"origins": cors_origins},
        r"/pipeline": {"origins": cors_origins},
        r"/": {"origins": cors_origins},
        r"/health": {"origins": cors_origins},
    },
    supports_credentials=True,
    expose_headers=["Content-Type", "Authorization"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH      = BASE_DIR / "model" / "road_damage_filter_model.onnx"
UPLOAD_FOLDER   = "uploads"
IMAGE_SIZE      = (224, 224)
SIGMOID_THRESH  = 0.5    # class boundary
CONFIDENCE_THRESH = 0.80  # store-or-reject boundary

DISABLE_CLIP = os.environ.get("DISABLE_CLIP", "false").lower() in ("true", "1", "yes")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

app.config["UPLOAD_FOLDER"]      = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Cleanup old uploaded files on startup to avoid disk growth.
def cleanup_uploads(max_age_days: int = 7):
    try:
        now = __import__('time').time()
        max_age_seconds = max_age_days * 24 * 60 * 60
        for name in os.listdir(UPLOAD_FOLDER):
            path = os.path.join(UPLOAD_FOLDER, name)
            try:
                if not os.path.isfile(path):
                    continue
                mtime = os.path.getmtime(path)
                if (now - mtime) > max_age_seconds:
                    os.remove(path)
                    logger.info('Removed old upload: %s', path)
            except Exception:
                logger.exception('Failed to evaluate/remove upload: %s', path)
    except Exception:
        logger.exception('Failed during uploads cleanup')

cleanup_uploads()

# ── Model Loading (ONNX Runtime — lightweight, ~30 MB RAM) ──────────────────
model_session = None
model_input_name = None
model_load_attempted = False

def load_onnx_model():
    """Load the ONNX model from disk exactly once."""
    global model_session, model_input_name
    if not MODEL_PATH.exists():
        logger.error("Model file not found at: %s", MODEL_PATH)
        logger.error("Run 'python convert_to_onnx.py' first to create the ONNX model.")
        return False
    try:
        import onnxruntime as ort

        # Use minimal session options for low memory
        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 1
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        model_session = ort.InferenceSession(str(MODEL_PATH), sess_options=opts)
        model_input_name = model_session.get_inputs()[0].name

        logger.info("✅ ONNX model loaded successfully from %s", MODEL_PATH)
        logger.info("   Input name: %s, shape: %s",
                     model_input_name,
                     model_session.get_inputs()[0].shape)
        return True
    except Exception as exc:
        logger.exception("❌ Failed to load ONNX model: %s", exc)
        return False

def get_model():
    """Lazily load the model so the service can start fast on Render."""
    global model_load_attempted
    if model_session is not None:
        return model_session
    if not model_load_attempted:
        model_load_attempted = True
        load_onnx_model()
    return model_session

# ── Helpers ───────────────────────────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def preprocess_image(image_path: str) -> np.ndarray:
    """
    Open image, resize to IMAGE_SIZE, normalise pixel values to [0, 1],
    and expand dims to create a batch of 1.
    """
    img = Image.open(image_path).convert("RGB")
    img = img.resize(IMAGE_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)  # shape: (1, 224, 224, 3)


def interpret_prediction(raw_output: float):
    """
    raw_output  – sigmoid output in [0, 1]
    Returns (label, confidence, store_in_db)
    """
    # Sigmoid >= 0.5 → road_damage (positive class)
    if raw_output >= SIGMOID_THRESH:
        label      = "road_damage"
        confidence = float(raw_output)
    else:
        label      = "not_road"
        confidence = float(1.0 - raw_output)   # confidence for "not_road"

    store_in_db = label == "road_damage" and confidence >= CONFIDENCE_THRESH
    return label, confidence, store_in_db

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return jsonify({"status": "online", "service": "RoadWatch AI Filter API", "runtime": "onnxruntime"}), 200


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    """
    Accepts a multipart/form-data POST with field name 'image'.
    Returns JSON: { prediction, confidence, store_in_db }
    """
    # ── Model availability check ──
    current_session = get_model()
    if current_session is None:
        return jsonify({
            "error": "Model is not loaded. Run convert_to_onnx.py and place the .onnx file in the model/ folder."
        }), 503

    # ── File presence check ──
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use field name 'image'."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 415

    # ── Save to a temp path first ──
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    temp_path   = os.path.join(UPLOAD_FOLDER, unique_name)
    file.save(temp_path)
    logger.info("Saved temp file: %s", temp_path)

    try:
        # ── Preprocess ──
        img_array = preprocess_image(temp_path)

        # ── Predict (ONNX Runtime) ──
        outputs = current_session.run(None, {model_input_name: img_array})
        raw = float(outputs[0][0][0])
        logger.info("Raw sigmoid output: %.4f", raw)

        label, confidence, store_in_db = interpret_prediction(raw)

        # ── Keep or discard ──
        if store_in_db:
            logger.info("✅ ACCEPTED — storing: %s (conf=%.2f)", label, confidence)
            # File stays in uploads/ as the accepted record
        else:
            os.remove(temp_path)
            logger.info("🚫 REJECTED — deleted temp file (label=%s, conf=%.2f)", label, confidence)

        return jsonify({
            "prediction":  label,
            "confidence":  round(confidence, 4),
            "store_in_db": store_in_db,
            "filename":    unique_name if store_in_db else None,
        })

    except Exception as exc:
        # Clean up on any unexpected error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        logger.exception("Prediction error: %s", exc)
        return jsonify({"error": f"Prediction failed: {str(exc)}"}), 500


# Defensive fallback: ensure CORS headers are present on all responses
@app.after_request
def _add_cors_headers(response):
    # If flask-cors already added headers, this will be a no-op for those keys
    origin = os.environ.get("AI_ALLOWED_ORIGINS", "*")
    # Only echo specific origin when credentials are supported; avoid wildcard with credentials
    if origin.strip() == "*":
        response.headers.setdefault("Access-Control-Allow-Origin", "*")
    else:
        # When multiple origins are configured, mirror the request Origin if it matches
        req_origin = request.headers.get("Origin")
        if req_origin and req_origin in [o.strip() for o in origin.split(",")]:
            response.headers.setdefault("Access-Control-Allow-Origin", req_origin)
    response.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    response.headers.setdefault("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.setdefault("Access-Control-Allow-Credentials", "true")
    return response


@app.route("/classify", methods=["POST", "OPTIONS"])
def classify():
    """
    CLIP-based 3-class road condition classifier.
    Returns: { label, confidence, scores, description }
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use field name 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 415

    if DISABLE_CLIP:
        # Fallback to Stage 1 ONNX model when CLIP is disabled
        current_session = get_model()
        if current_session is None:
            return jsonify({"error": "Road detection model is not loaded."}), 503

        # Save temp file to run ONNX preprocessing
        unique_name = f"{uuid.uuid4().hex}_{file.filename}"
        temp_path = os.path.join(UPLOAD_FOLDER, unique_name)
        file_bytes = file.read()
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        try:
            img_array = preprocess_image(temp_path)
            outputs = current_session.run(None, {model_input_name: img_array})
            raw = float(outputs[0][0][0])
            label_s1, confidence_s1, store_s1 = interpret_prediction(raw)

            # Map road_damage -> pothole, not_road -> normal
            mapped_label = "pothole" if label_s1 == "road_damage" else "normal"
            confidence = confidence_s1

            scores = {
                "pothole": confidence if mapped_label == "pothole" else 1.0 - confidence,
                "normal": confidence if mapped_label == "normal" else 1.0 - confidence,
                "not_road": 0.0,
            }

            descriptions = {
                "pothole": "Road damage detected (ONNX fallback) — this road has potholes, cracks, or surface damage.",
                "normal": "This road appears to be in good condition. No damage detected (ONNX fallback).",
            }

            return jsonify({
                "label":       mapped_label,
                "confidence":  round(confidence, 4),
                "scores":      scores,
                "description": descriptions.get(mapped_label, ""),
            })
        except Exception as exc:
            logger.exception("Classification error (ONNX fallback): %s", exc)
            return jsonify({"error": f"Classification failed: {str(exc)}"}), 500
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    else:
        try:
            from clip_classifier import classify_road

            image_bytes = file.read()
            result = classify_road(image_bytes)

            descriptions = {
                "pothole": "Road damage detected — this road has potholes, cracks, or surface damage.",
                "normal": "This road appears to be in good condition. No damage detected.",
                "not_road": "This image does not appear to be a road.",
            }

            return jsonify({
                "label":       result["label"],
                "confidence":  result["confidence"],
                "scores":      result["scores"],
                "description": descriptions.get(result["label"], ""),
            })
        except Exception as exc:
            logger.exception("Classification error: %s", exc)
            return jsonify({"error": f"Classification failed: {str(exc)}"}), 500


@app.route("/pipeline", methods=["POST", "OPTIONS"])
def pipeline():
    """
    Two-stage AI pipeline:
      Stage 1 — ONNX road-detection model (road_damage / not_road)
      Stage 2 — CLIP damage classifier (pothole / normal / not_road)
    Returns combined results from both stages.
    """
    # ── Model availability check ──
    current_session = get_model()
    if current_session is None:
        return jsonify({
            "error": "Road detection model is not loaded. Run convert_to_onnx.py first."
        }), 503

    # ── File presence check ──
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use field name 'image'."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 415

    # ── Save to a temp path ──
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    temp_path = os.path.join(UPLOAD_FOLDER, unique_name)
    file_bytes = file.read()
    with open(temp_path, "wb") as f:
        f.write(file_bytes)
    logger.info("Pipeline: saved temp file: %s", temp_path)

    try:
        # ════════════════════════════════════════════════════════════════
        # STAGE 1: ONNX Road Detection
        # ════════════════════════════════════════════════════════════════
        img_array = preprocess_image(temp_path)
        outputs = current_session.run(None, {model_input_name: img_array})
        raw = float(outputs[0][0][0])
        logger.info("Pipeline Stage 1 — raw sigmoid: %.4f", raw)

        label_s1, confidence_s1, store_s1 = interpret_prediction(raw)

        stage1 = {
            "prediction": label_s1,
            "confidence": round(confidence_s1, 4),
            "passed": store_s1,
        }

        # ════════════════════════════════════════════════════════════════
        # STAGE 2: CLIP Damage Classification
        # ════════════════════════════════════════════════════════════════
        stage2 = None
        final_label = label_s1
        store_in_db = store_s1

        if not DISABLE_CLIP:
            try:
                from clip_classifier import classify_road

                clip_result = classify_road(file_bytes)
                logger.info("Pipeline Stage 2 — CLIP label: %s (conf=%.4f)",
                             clip_result["label"], clip_result["confidence"])

                descriptions = {
                    "pothole": "Road damage detected — potholes, cracks, or surface damage.",
                    "normal": "Road appears to be in good condition. No visible damage.",
                    "not_road": "CLIP reclassified this as not a road image.",
                }

                stage2 = {
                    "label": clip_result["label"],
                    "confidence": round(clip_result["confidence"], 4),
                    "scores": clip_result["scores"],
                    "description": descriptions.get(clip_result["label"], ""),
                }

                # Align constraints
                if clip_result["label"] == "pothole":
                    final_label = "pothole"
                    store_in_db = True
                    stage1["passed"] = True
                elif clip_result["label"] == "normal":
                    final_label = "normal"
                    store_in_db = True  # allow with warning popup
                    stage1["passed"] = True
                else:
                    final_label = "not_road"
                    store_in_db = False
                    stage1["passed"] = False

            except Exception as clip_err:
                logger.warning("Pipeline: CLIP classification failed, proceeding with Stage 1 result only: %s", clip_err)
                if not store_s1:
                    store_in_db = False
                    final_label = label_s1
        else:
            logger.info("Pipeline: CLIP classification skipped (DISABLE_CLIP is set to True)")

        # Keep or discard temp file
        if store_in_db:
            logger.info("Pipeline: ✅ ACCEPTED — %s", final_label)
        else:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            logger.info("Pipeline: 🚫 REJECTED by CLIP — %s", final_label)

        return jsonify({
            "stage1": stage1,
            "stage2": stage2,
            "store_in_db": store_in_db,
            "final_label": final_label,
            "prediction": "road_damage" if final_label in ["pothole", "normal"] else "not_road",
            "confidence": stage2["confidence"] if stage2 else round(confidence_s1, 4),
            "filename": unique_name if store_in_db else None,
        })

    except Exception as exc:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        logger.exception("Pipeline error: %s", exc)
        return jsonify({"error": f"Pipeline failed: {str(exc)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    clip_ready = False
    if not DISABLE_CLIP:
        try:
            from clip_classifier import is_model_ready
            clip_ready = is_model_ready()
        except Exception:
            pass

    return jsonify({
        "status":       "ok",
        "model_loaded": model_session is not None,
        "clip_loaded":  clip_ready,
        "clip_disabled": DISABLE_CLIP,
        "runtime":      "onnxruntime" + (" + clip" if not DISABLE_CLIP else ""),
    })


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    from clip_classifier import USE_HF_API
    if not DISABLE_CLIP and not USE_HF_API:
        # Pre-load the CLIP model at startup so the first /pipeline call doesn't timeout
        logger.info("Pre-loading local CLIP model at startup...")
        try:
            from clip_classifier import get_classifier
            get_classifier()
            logger.info("✅ local CLIP model pre-loaded successfully")
        except Exception as e:
            logger.warning("⚠️ Could not pre-load local CLIP model: %s (will retry on first request)", e)
    else:
        logger.info("CLIP model pre-loading skipped (DISABLE_CLIP or USE_HF_API is set to True)")

    app.run(debug=True, host="0.0.0.0", port=5000)
