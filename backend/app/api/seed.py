from datetime import datetime, timezone
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

from app.db.database import get_conn
from app.models.schemas import SeedPredictionResponse
from app.services.auth import get_current_user, get_optional_user
from app.services.ml_inference import seed_inference_service


router = APIRouter(prefix="/api/seeds", tags=["seed-analysis"])
DEVICE_FEED_USERNAME = "esp32-cam"

# Directory for storing uploaded images
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "artifacts", "uploads")

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


def calculate_germination_change(temperature: float, humidity: float) -> tuple[float, str]:
    """
    Calculate predicted germination percentage change based on temperature and humidity.
    Ideal: Temperature 24-32C, Humidity 55-70%
    Returns: (change_value, reason)
    """
    if temperature is None or humidity is None:
        return 0.0, "No sensor data available for prediction"
    
    change = 0.0
    reasons = []
    
    # Temperature effect (optimal: 24-32°C)
    if temperature < 20:
        change -= (20 - temperature) * 2.5
        reasons.append(f"Low temp ({temperature}°C) slows germination")
    elif temperature > 35:
        change -= (temperature - 35) * 3
        reasons.append(f"High temp ({temperature}°C) stresses seeds")
    elif 24 <= temperature <= 32:
        change += 5
        reasons.append("Optimal temperature range")
    
    # Humidity effect (optimal: 55-70%)
    if humidity < 45:
        change -= (45 - humidity) * 1.5
        reasons.append(f"Low humidity ({humidity}%) reduces moisture")
    elif humidity > 80:
        change -= (humidity - 80) * 2
        reasons.append(f"High humidity ({humidity}%) risks fungal growth")
    elif 55 <= humidity <= 70:
        change += 5
        reasons.append("Optimal humidity range")
    
    # Combine reasons
    reason = "; ".join(reasons) if reasons else "Conditions within acceptable range"
    
    # Clamp change to reasonable bounds
    change = max(-25, min(25, change))
    
    return round(change, 1), reason


def _device_feed_usernames(current_user: dict | None) -> list[str]:
    usernames = [DEVICE_FEED_USERNAME]
    username = (current_user or {}).get("username")
    if username and username not in usernames:
        usernames.insert(0, username)
    elif not username:
        usernames.insert(0, "guest")
    return usernames


def _save_and_store_prediction(
    *,
    image_bytes: bytes,
    original_filename: str,
    username: str,
    temperature: float | None,
    humidity: float | None,
) -> SeedPredictionResponse:
    result = seed_inference_service.predict(image_bytes)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    image_url = None
    file_ext = os.path.splitext(original_filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    image_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        image_url = f"/api/seeds/images/{unique_filename}"
    except Exception:
        unique_filename = None

    germination_change = None
    change_reason = None
    if temperature is not None and humidity is not None:
        germination_change, change_reason = calculate_germination_change(temperature, humidity)

    created_at = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO seed_predictions
            (username, image_name, image_path, germination_probability, quality_label, confidence, raw_class, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                username,
                original_filename,
                unique_filename,
                result["germination_probability"],
                result["quality_label"],
                result["confidence"],
                result["raw_class"],
                created_at,
            ),
        )
        record_id = cursor.lastrowid
        conn.commit()

    return SeedPredictionResponse(
        record_id=record_id,
        image_name=original_filename,
        germination_probability=result["germination_probability"],
        quality_label=result["quality_label"],
        confidence=result["confidence"],
        raw_class=result["raw_class"],
        recommendation=result["recommendation"],
        image_url=image_url,
        created_at=created_at,
        germination_change=germination_change,
        change_reason=change_reason,
    )


@router.post("/predict-seed", response_model=SeedPredictionResponse)
async def predict_seed(
    file: UploadFile = File(...),
    temperature: float | None = Query(None, description="Current chamber temperature"),
    humidity: float | None = Query(None, description="Current chamber humidity"),
    current_user: dict | None = Depends(get_optional_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")

    image_bytes = await file.read()
    username = (current_user or {}).get("username") or "guest"
    original_filename = file.filename or "uploaded-image.jpg"
    return _save_and_store_prediction(
        image_bytes=image_bytes,
        original_filename=original_filename,
        username=username,
        temperature=temperature,
        humidity=humidity,
    )


@router.post("/capture", response_model=SeedPredictionResponse)
async def capture_seed_image(
    request: Request,
    device_id: str = Query(DEVICE_FEED_USERNAME, description="ESP32 camera device identifier"),
    filename: str = Query("captured-seed.jpg", description="Captured image filename"),
    temperature: float | None = Query(None, description="Current chamber temperature"),
    humidity: float | None = Query(None, description="Current chamber humidity"),
):
    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image data received")

    original_filename = filename or f"{device_id}.jpg"
    return _save_and_store_prediction(
        image_bytes=image_bytes,
        original_filename=original_filename,
        username=DEVICE_FEED_USERNAME,
        temperature=temperature,
        humidity=humidity,
    )

@router.get("/history")
def seed_prediction_history(current_user: dict | None = Depends(get_optional_user), limit: int = 30):
    usernames = _device_feed_usernames(current_user)
    placeholders = ",".join("?" for _ in usernames)
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            SELECT id, image_name, image_path, germination_probability, quality_label, confidence, raw_class, created_at
            FROM seed_predictions
            WHERE username IN ({placeholders})
            ORDER BY id DESC
            LIMIT ?
            """,
            (*usernames, limit),
        ).fetchall()

    return {
        "records": [dict(row) for row in rows],
        "count": len(rows),
    }


@router.get("/latest", response_model=SeedPredictionResponse | None)
def latest_seed_prediction(current_user: dict | None = Depends(get_optional_user)):
    usernames = _device_feed_usernames(current_user)
    placeholders = ",".join("?" for _ in usernames)
    with get_conn() as conn:
        row = conn.execute(
            f"""
            SELECT id, image_name, image_path, germination_probability, quality_label, confidence, raw_class, created_at
            FROM seed_predictions
            WHERE username IN ({placeholders})
            ORDER BY id DESC
            LIMIT 1
            """,
            usernames,
        ).fetchone()

    if not row:
        return None

    data = dict(row)
    image_url = f"/api/seeds/images/{data['image_path']}" if data.get("image_path") else None
    recommendation = {
        "Good": "Predicted quality is good. Keep standard storage and dispatch plan.",
        "Average": "Predicted quality is average. Perform moisture balancing and periodic recheck.",
        "Poor": "Predicted quality is poor. Hold batch and run confirmatory germination testing.",
    }.get(data.get("quality_label"), "Review the captured image and re-run prediction.")

    return SeedPredictionResponse(
        record_id=data.get("id"),
        image_name=data.get("image_name"),
        germination_probability=data.get("germination_probability", 0.0),
        quality_label=data.get("quality_label", "Unknown"),
        confidence=data.get("confidence", 0.0),
        raw_class=data.get("raw_class", "Unknown"),
        recommendation=recommendation,
        image_url=image_url,
        created_at=data.get("created_at"),
    )


@router.delete("/history/{record_id}")
def delete_prediction_record(record_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a specific prediction record by ID"""
    with get_conn() as conn:
        # Check if record exists and belongs to current user
        row = conn.execute(
            "SELECT id FROM seed_predictions WHERE id = ? AND username = ?",
            (record_id, current_user["username"]),
        ).fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Delete the record
        conn.execute(
            "DELETE FROM seed_predictions WHERE id = ? AND username = ?",
            (record_id, current_user["username"]),
        )
        conn.commit()
    
    return {"message": "Record deleted successfully"}


@router.delete("/history")
def clear_prediction_history(current_user: dict = Depends(get_current_user)):
    """Clear all prediction history for the current user"""
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM seed_predictions WHERE username = ?",
            (current_user["username"],),
        )
        conn.commit()
    
    return {"message": "All records cleared successfully"}


@router.get("/images/{filename}")
def get_image(filename: str):
    """Serve uploaded seed images"""
    image_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path)
