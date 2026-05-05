from collections.abc import Iterable

from fastapi import WebSocket


class SensorConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_json(self, payload: dict) -> None:
        stale: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception:
                stale.append(connection)
        for conn in stale:
            self.disconnect(conn)


manager = SensorConnectionManager()


def generate_sensor_insights(temperature: float, humidity: float, moisture: float) -> list[dict]:
    insights: list[dict] = []

    if moisture < 35:
        insights.append({"severity": "high", "message": "Soil is too dry, irrigation recommended."})
    elif moisture < 50:
        insights.append({"severity": "medium", "message": "Soil moisture is dropping, monitor irrigation schedule."})
    else:
        insights.append({"severity": "low", "message": "Soil moisture is in the healthy range."})

    if temperature > 34:
        insights.append({"severity": "high", "message": "Temperature is too high for stable seed germination."})
    elif temperature < 16:
        insights.append({"severity": "medium", "message": "Temperature is low; germination may slow down."})
    else:
        insights.append({"severity": "low", "message": "Temperature is suitable for seed vitality."})

    if humidity > 80:
        insights.append({"severity": "medium", "message": "High humidity can increase mold risk; improve ventilation."})
    elif humidity < 35:
        insights.append({"severity": "medium", "message": "Low humidity may dry seeds excessively during storage."})

    return insights
