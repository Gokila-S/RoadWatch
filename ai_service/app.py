"""
RoadWatch Filter App - Flask Backend
Loads a Keras binary classifier and exposes a /predict endpoint.
"""

import os
import uuid
import logging
from flask import Flask, request, jsonify, render_template
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
CORS(app)

# ── Configuration ─────────────────────────────────────────────────────────────
MODEL_PATH      = os.path.join("model", "road_damage_filter_model.keras")
UPLOAD_FOLDER   = "uploads"
IMAGE_SIZE      = (224, 224)
SIGMOID_THRESH  = 0.5    # class boundary
CONFIDENCE_THRESH = 0.80  # store-or-reject boundary

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

app.config["UPLOAD_FOLDER"]      = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── Model Loading (once at startup) ──────────────────────────────────────────
model = None

def load_keras_model():
    """Load the Keras model from disk exactly once."""
    global model
    if not os.path.exists(MODEL_PATH):
        logger.error("Model file not found at: %s", MODEL_PATH)
        return False
    try:
        # Import TensorFlow here so the app can still start even if TF isn't
        # installed — the /predict route will return a clear error in that case.
        import tensorflow as tf
        model = tf.keras.models.load_model(MODEL_PATH)
        logger.info("✅ Model loaded successfully from %s", MODEL_PATH)
        return True
    except Exception as exc:
        logger.exception("❌ Failed to load model: %s", exc)
        return False

load_keras_model()

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
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts a multipart/form-data POST with field name 'image'.
    Returns JSON: { prediction, confidence, store_in_db }
    """
    # ── Model availability check ──
    if model is None:
        return jsonify({
            "error": "Model is not loaded. Place the .keras file in the model/ folder and restart."
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

        # ── Predict ──
        raw = float(model.predict(img_array, verbose=0)[0][0])
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


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":       "ok",
        "model_loaded": model is not None,
    })


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
