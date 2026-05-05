from datetime import datetime, timezone
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse

from app.db.database import get_conn
from app.models.schemas import SeedPredictionResponse
from app.services.auth import get_current_user
from app.services.ml_inference import seed_inference_service


router = APIRouter(prefix="/api/seeds", tags=["seed-analysis"])

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


@router.post("/predict-seed", response_model=SeedPredictionResponse)
async def predict_seed(
    file: UploadFile = File(...),
    temperature: float | None = Query(None, description="Current chamber temperature"),
    humidity: float | None = Query(None, description="Current chamber humidity"),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")

    image_bytes = await file.read()
    result = seed_inference_service.predict(image_bytes)

    # Check for validation errors (non-seed images)
    if "error" in result:
        raise HTTPException(
            status_code=400,
            detail=result["error"]
        )

    # Save image to disk
    image_url = None
    original_filename = file.filename or "uploaded-image"
    file_ext = os.path.splitext(original_filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    image_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        image_url = f"/api/seeds/images/{unique_filename}"
    except Exception:
        # Continue without image if save fails
        pass

    # Calculate germination change based on sensor values
    germination_change = 0.0
    change_reason = "No sensor data available"
    if temperature is not None and humidity is not None:
        germination_change, change_reason = calculate_germination_change(temperature, humidity)

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO seed_predictions
            (username, image_name, germination_probability, quality_label, confidence, raw_class, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user["username"],
                original_filename,
                result["germination_probability"],
                result["quality_label"],
                result["confidence"],
                result["raw_class"],
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()

    return SeedPredictionResponse(
        germination_probability=result["germination_probability"],
        quality_label=result["quality_label"],
        confidence=result["confidence"],
        raw_class=result["raw_class"],
        recommendation=result["recommendation"],
        image_url=image_url,
        germination_change=germination_change,
        change_reason=change_reason,
    )


@router.get("/history")
def seed_prediction_history(current_user: dict = Depends(get_current_user), limit: int = 30):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, image_name, germination_probability, quality_label, confidence, raw_class, created_at
            FROM seed_predictions
            WHERE username = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (current_user["username"], limit),
        ).fetchall()

    return {
        "records": [dict(row) for row in rows],
        "count": len(rows),
    }


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
