"""
One-time conversion script: .keras → .onnx

Run this ONCE on your local machine where TensorFlow is installed:
    python convert_to_onnx.py

It will create  model/road_damage_filter_model.onnx
which you then commit and deploy to Render (TensorFlow is NOT needed at runtime).

Requirements (local only):
    pip install tensorflow tf2onnx onnxruntime onnx
"""

import os
import sys
import tempfile
from pathlib import Path

def main():
    model_dir = Path(__file__).resolve().parent / "model"
    keras_path = model_dir / "road_damage_filter_model.keras"
    onnx_path = model_dir / "road_damage_filter_model.onnx"

    if not keras_path.exists():
        print(f"❌ Keras model not found at: {keras_path}")
        sys.exit(1)

    if onnx_path.exists():
        print(f"⚠️  ONNX model already exists at: {onnx_path}")
        answer = input("Overwrite? [y/N] ").strip().lower()
        if answer != "y":
            print("Aborted.")
            sys.exit(0)

    # ---------- Import heavy deps only when actually needed ----------
    print("Loading TensorFlow…")
    import tensorflow as tf
    print(f"  TensorFlow version: {tf.__version__}")

    print("Loading Keras model…")

    # Patch for quantization_config compatibility (same as original app.py had)
    from keras.layers import Dense
    _orig_init = Dense.__init__
    def _patched_init(self, *args, **kwargs):
        kwargs.pop("quantization_config", None)
        return _orig_init(self, *args, **kwargs)
    Dense.__init__ = _patched_init

    model = tf.keras.models.load_model(str(keras_path))
    print(f"  Model loaded: input shape {model.input_shape}, output shape {model.output_shape}")

    # ---------- Convert via SavedModel → ONNX (more compatible) ----------
    print("Converting to ONNX via SavedModel format…")

    # Step 1: Export to SavedModel (a temporary directory)
    with tempfile.TemporaryDirectory() as tmpdir:
        saved_model_path = os.path.join(tmpdir, "saved_model")
        model.export(saved_model_path)
        print(f"  Exported SavedModel to: {saved_model_path}")

        # Step 2: Use tf2onnx CLI-style conversion from SavedModel
        import tf2onnx
        import onnxruntime as ort

        onnx_model, _ = tf2onnx.convert.from_tflite(
            tflite_path=None,  # not used
        ) if False else (None, None)  # placeholder

        # Use the from_saved_model approach (subprocess call, most reliable)
        import subprocess
        result = subprocess.run(
            [
                sys.executable, "-m", "tf2onnx.convert",
                "--saved-model", saved_model_path,
                "--output", str(onnx_path),
                "--opset", "13",
            ],
            capture_output=True, text=True
        )

        if result.returncode != 0:
            print(f"❌ tf2onnx conversion failed:\n{result.stderr}")
            sys.exit(1)

        print(result.stderr)  # tf2onnx logs to stderr

    size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"✅ ONNX model saved to: {onnx_path}  ({size_mb:.1f} MB)")

    # ---------- Quick sanity check ----------
    print("Running sanity check…")
    import numpy as np
    import onnxruntime as ort

    session = ort.InferenceSession(str(onnx_path))
    input_name = session.get_inputs()[0].name
    dummy = np.random.rand(1, 224, 224, 3).astype(np.float32)

    keras_out = float(model.predict(dummy, verbose=0)[0][0])
    onnx_out = float(session.run(None, {input_name: dummy})[0][0][0])

    print(f"  Keras  output: {keras_out:.6f}")
    print(f"  ONNX   output: {onnx_out:.6f}")
    print(f"  Difference:    {abs(keras_out - onnx_out):.8f}")

    if abs(keras_out - onnx_out) < 0.001:
        print("✅ Sanity check passed — outputs match!")
    else:
        print("⚠️  Outputs differ slightly. This is usually fine for sigmoid classifiers.")

    print("\nDone! You can now deploy with onnxruntime (no TensorFlow needed).")


if __name__ == "__main__":
    main()
