# model/

Place your trained Keras model file here:

    road_damage_binary_classifier_latest.keras

The `app.py` loads it at startup via:

    MODEL_PATH = os.path.join("model", "road_damage_binary_classifier_latest.keras")

> **Important:** Run `app.py` from the project root directory so this path resolves correctly.
