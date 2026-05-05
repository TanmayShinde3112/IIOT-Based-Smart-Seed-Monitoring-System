"""
Retrain a calibrated seed classifier from ML Work image data and export model artifact
for backend inference.

Dataset expected:
  ML work/GermPredDataset/GermPredDataset/
    PennisetumGlaucum/img/*.jpg
    SecaleCereale/img/*.jpg
    ZeaMays/img/*.jpg

Usage:
  python ml/retrain_calibrated_model.py
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import joblib
import numpy as np
from PIL import Image
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


ROOT = Path(__file__).resolve().parents[1]
DATASET_ROOT = ROOT.parent / "ML work" / "GermPredDataset" / "GermPredDataset"
OUTPUT_MODEL = ROOT / "backend" / "artifacts" / "seed_quality_calibrated.joblib"
OUTPUT_METRICS = ROOT / "backend" / "artifacts" / "seed_quality_training_metrics.json"

CLASSES = ["PennisetumGlaucum", "SecaleCereale", "ZeaMays"]


def extract_features(image_path: Path) -> np.ndarray:
    image = Image.open(image_path).convert("RGB").resize((96, 96))
    arr = np.asarray(image, dtype=np.float32) / 255.0

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    gray = 0.299 * r + 0.587 * g + 0.114 * b

    feats = [
        float(r.mean()),
        float(g.mean()),
        float(b.mean()),
        float(r.std()),
        float(g.std()),
        float(b.std()),
        float(gray.mean()),
        float(gray.std()),
        float(np.percentile(gray, 10)),
        float(np.percentile(gray, 50)),
        float(np.percentile(gray, 90)),
    ]

    for channel in (r, g, b, gray):
        hist, _ = np.histogram(channel, bins=8, range=(0.0, 1.0), density=True)
        feats.extend(hist.astype(float).tolist())

    return np.array(feats, dtype=np.float32)


def build_dataset(max_images_per_class: int = 2200, seed: int = 42):
    random.seed(seed)
    X = []
    y = []

    for class_name in CLASSES:
        img_dir = DATASET_ROOT / class_name / "img"
        files = [p for p in img_dir.glob("*.jpg")]
        if not files:
            raise FileNotFoundError(f"No images found in {img_dir}")

        random.shuffle(files)
        subset = files[:max_images_per_class]
        print(f"Using {len(subset)} images for {class_name}")

        for path in subset:
            try:
                X.append(extract_features(path))
                y.append(class_name)
            except Exception:
                continue

    if not X:
        raise RuntimeError("No training samples collected.")

    return np.vstack(X), np.array(y)


def main():
    print(f"Dataset root: {DATASET_ROOT}")
    X, y = build_dataset()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    base = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "rf",
                RandomForestClassifier(
                    n_estimators=220,
                    random_state=42,
                    class_weight="balanced",
                    n_jobs=-1,
                ),
            ),
        ]
    )

    calibrated = CalibratedClassifierCV(base, method="sigmoid", cv=3)
    calibrated.fit(X_train, y_train)

    pred = calibrated.predict(X_test)
    proba = calibrated.predict_proba(X_test)
    confidence = np.max(proba, axis=1)

    acc = accuracy_score(y_test, pred)
    report = classification_report(y_test, pred, output_dict=True)

    OUTPUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": calibrated,
            "classes": CLASSES,
            "feature_size": int(X.shape[1]),
        },
        OUTPUT_MODEL,
    )

    metrics = {
        "dataset_root": str(DATASET_ROOT),
        "samples": int(len(y)),
        "feature_size": int(X.shape[1]),
        "accuracy": float(acc),
        "mean_confidence": float(np.mean(confidence)),
        "classification_report": report,
    }
    with open(OUTPUT_METRICS, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Saved model: {OUTPUT_MODEL}")
    print(f"Saved metrics: {OUTPUT_METRICS}")
    print(f"Validation accuracy: {acc:.4f}")


if __name__ == "__main__":
    main()
