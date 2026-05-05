from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.db.database import get_conn
from app.models.schemas import SensorDashboardResponse, SensorIngestRequest, SensorReading
from app.services.auth import decode_token, get_current_user
from app.services.realtime import generate_sensor_insights, manager


router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.post("/ingest")
async def ingest_sensor_data(payload: SensorIngestRequest, x_device_token: str | None = Header(default=None)):
    if settings.device_token and settings.device_token != (x_device_token or ""):
        raise HTTPException(status_code=401, detail="Invalid device token")

    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO sensor_readings (device_id, temperature, humidity, moisture, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (payload.device_id, payload.temperature, payload.humidity, payload.moisture, now),
        )
        conn.commit()

    insights = generate_sensor_insights(payload.temperature, payload.humidity, payload.moisture)
    message = {
        "device_id": payload.device_id,
        "temperature": payload.temperature,
        "humidity": payload.humidity,
        "moisture": payload.moisture,
        "created_at": now,
        "insights": insights,
    }

    await manager.broadcast_json(message)

    return {"saved": True, "latest": message}


@router.get("/latest", response_model=SensorDashboardResponse)
def latest_sensor_data(current_user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT device_id, temperature, humidity, moisture, created_at
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()

    if not row:
        return SensorDashboardResponse(latest=None, insights=[])

    latest = SensorReading(
        device_id=row["device_id"],
        temperature=row["temperature"],
        humidity=row["humidity"],
        moisture=row["moisture"],
        created_at=datetime.fromisoformat(row["created_at"]),
    )
    return SensorDashboardResponse(
        latest=latest,
        insights=generate_sensor_insights(latest.temperature, latest.humidity, latest.moisture),
    )


@router.get("/history")
def sensor_history(limit: int = Query(default=100, ge=1, le=500), current_user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT device_id, temperature, humidity, moisture, created_at
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    data = [
        {
            "device_id": row["device_id"],
            "temperature": row["temperature"],
            "humidity": row["humidity"],
            "moisture": row["moisture"],
            "created_at": row["created_at"],
        }
        for row in reversed(rows)
    ]
    return {"records": data, "count": len(data)}


@router.websocket("/ws")
async def sensor_stream(websocket: WebSocket, token: str = Query(default="")):
    try:
        payload = decode_token(token)
        if not payload.get("sub"):
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
