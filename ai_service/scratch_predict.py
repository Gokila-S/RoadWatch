import os
import numpy as np
from PIL import Image
import onnxruntime as ort
from clip_classifier import classify_road

# Load ONNX model
MODEL_PATH = "model/road_damage_filter_model.onnx"
session = ort.InferenceSession(MODEL_PATH)
input_name = session.get_inputs()[0].name

for filename in os.listdir("uploads"):
    filepath = os.path.join("uploads", filename)
    if not os.path.isfile(filepath):
        continue
    
    # Preprocess for ONNX
    img = Image.open(filepath).convert("RGB")
    img_resized = img.resize((224, 224))
    arr = np.array(img_resized, dtype=np.float32) / 255.0
    img_array = np.expand_dims(arr, axis=0)
    
    # Run ONNX
    outputs = session.run(None, {input_name: img_array})
    raw = float(outputs[0][0][0])
    
    # Run CLIP
    with open(filepath, "rb") as f:
        img_bytes = f.read()
    clip_result = classify_road(img_bytes)
    
    print(f"File: {filename}")
    print(f"  ONNX Raw output: {raw:.4f} (>=0.5 means road_damage)")
    print(f"  CLIP result: {clip_result['label']} (conf: {clip_result['confidence']:.4f})")
    print("-" * 50)
