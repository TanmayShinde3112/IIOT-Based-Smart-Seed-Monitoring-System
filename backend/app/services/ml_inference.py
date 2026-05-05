import io
from pathlib import Path

import joblib
import numpy as np
from PIL import Image
from ultralytics import YOLO

from app.core.config import resolve_calibrated_model_path


def resolve_yolo_model_path() -> Path:
    """Find YOLOv8 seed detection model."""
    possible_paths = [
        Path(__file__).resolve().parents[2] / ".." / ".." / "ML work" / "ml" / "yolov8n.pt",
        Path(__file__).resolve().parents[2] / ".." / ".." / "ML work" / "yolov8n.pt",
        Path(__file__).resolve().parents[3] / "ML work" / "ml" / "yolov8n.pt",
    ]
    for p in possible_paths:
        if p.exists():
            return p
    return possible_paths[0]


class SeedInferenceService:
    def __init__(self):
        self.calibrated_model_path = resolve_calibrated_model_path()
        self.yolo_model_path = resolve_yolo_model_path()
        self.yolo_model = None
        self.pipeline = None
        self.class_names: list[str] = []
        self.base_gp_by_class = {
            "PennisetumGlaucum": 84.0,
            "ZeaMays": 78.0,
            "SecaleCereale": 72.0,
        }
        # Increased threshold to require stronger confidence that image contains seeds
        self.min_seed_confidence = 0.6

    def load(self):
        if self.yolo_model_path.exists():
            try:
                self.yolo_model = YOLO(str(self.yolo_model_path))
            except Exception as e:
                print(f"Warning: Could not load YOLO model: {e}")

        if self.calibrated_model_path.exists():
            artifact = joblib.load(self.calibrated_model_path)
            self.pipeline = artifact.get("pipeline")
            self.class_names = artifact.get("classes", [])

    def _detect_seeds(self, image: Image.Image) -> tuple[bool, float]:
        """Detect if image contains valid seeds using YOLO model."""
        if self.yolo_model is None:
            return False, 0.0

        try:
            results = self.yolo_model.predict(image, verbose=False, conf=0.25)
            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                if boxes is not None and len(boxes) > 0:
                    confidences = boxes.conf.cpu().numpy()
                    max_conf = float(np.max(confidences))
                    return max_conf >= self.min_seed_confidence, max_conf
            return False, 0.0
        except Exception as e:
            print(f"Warning: Seed detection failed: {e}")
            return False, 0.0

    def _extract_features(self, image: Image.Image) -> np.ndarray:
        img = image.convert("RGB").resize((96, 96))
        arr = np.asarray(img, dtype=np.float32) / 255.0

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

    def _quality_from_confidence(self, confidence: float) -> str:
        if confidence >= 0.75:
            return "Good"
        if confidence >= 0.5:
            return "Average"
        return "Poor"

    def _gp_from_class_confidence(self, raw_class: str, confidence: float) -> float:
        base = self.base_gp_by_class.get(raw_class, 75.0)
        gp = base + (confidence - 0.5) * 28.0
        return float(max(35.0, min(99.0, gp)))

    def _fallback_prediction(self, image: Image.Image) -> dict:
        gray = image.convert("L")
        pixels = np.asarray(gray, dtype=np.float32) / 255.0
        mean_intensity = float(pixels.mean())
        contrast = float(pixels.std())

        if mean_intensity > 0.62 and contrast < 0.18:
            raw_class = "PennisetumGlaucum"
            confidence = 0.63
        elif mean_intensity < 0.42:
            raw_class = "SecaleCereale"
            confidence = 0.60
        else:
            raw_class = "ZeaMays"
            confidence = 0.58

        quality = self._quality_from_confidence(confidence)
        probability = self._gp_from_class_confidence(raw_class, confidence)
        recommendation = {
            "Good": "Seed lot looks strong. Continue normal storage and periodic checks.",
            "Average": "Moderate vigor expected. Recheck moisture and consider secondary testing.",
            "Poor": "Lower vigor risk. Run confirmatory germination test before release.",
        }[quality]

        return {
            "germination_probability": round(probability, 1),
            "quality_label": quality,
            "confidence": round(confidence, 3),
            "raw_class": raw_class,
            "recommendation": recommendation,
            "model_loaded": False,
            "model_path": str(self.calibrated_model_path),
        }

    def predict(self, image_bytes: bytes) -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # First, validate that the image contains seeds
        has_seeds, detection_conf = self._detect_seeds(image)
        if not has_seeds:
            return {
                "error": "No valid seed detected in image. Please upload an image containing seeds.",
                "germination_probability": 0.0,
                "quality_label": "Invalid",
                "confidence": 0.0,
                "raw_class": "Unknown",
                "recommendation": "Upload a clear image of seeds for analysis.",
                "model_loaded": self.yolo_model is not None,
                "seed_detection_confidence": detection_conf,
            }

        # Proceed with quality prediction
        if self.pipeline is None:
            result = self._fallback_prediction(image)
            result["seed_detection_confidence"] = detection_conf
            return result

        feats = self._extract_features(image).reshape(1, -1)
        probs = self.pipeline.predict_proba(feats)[0]
        idx = int(np.argmax(probs))
        confidence = float(probs[idx])
        raw_class = self.class_names[idx] if idx < len(self.class_names) else str(idx)

        quality = self._quality_from_confidence(confidence)
        probability = self._gp_from_class_confidence(raw_class, confidence)

        recommendation = {
            "Good": "Predicted quality is good. Keep standard storage and dispatch plan.",
            "Average": "Predicted quality is average. Perform moisture balancing and periodic recheck.",
            "Poor": "Predicted quality is poor. Hold batch and run confirmatory germination testing.",
        }[quality]

        return {
            "germination_probability": round(probability, 1),
            "quality_label": quality,
            "confidence": round(confidence, 3),
            "raw_class": raw_class,
            "recommendation": recommendation,
            "model_loaded": True,
            "model_path": str(self.calibrated_model_path),
            "seed_detection_confidence": detection_conf,
        }


seed_inference_service = SeedInferenceService()
