from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.seed import router as seed_router
from app.api.sensors import router as sensors_router
from app.core.config import settings
from app.db.database import get_conn, init_db
from app.services.ml_inference import seed_inference_service


app = FastAPI(
    title="Seed Quality, Precision Farming and Climate Resilience Platform",
    version="1.0.0",
)


@app.on_event("startup")
def startup_event():
    init_db()
    seed_inference_service.load()

    with get_conn() as conn:
        # Ensure there is a default admin account for first login.
        row = conn.execute("SELECT username FROM users WHERE username = ?", ("admin",)).fetchone()
        if not row:
            from app.services.auth import hash_password

            conn.execute(
                "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                ("admin", hash_password("admin123"), "admin", datetime.now(timezone.utc).isoformat()),
            )
            conn.commit()


origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(sensors_router)
app.include_router(seed_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "iiot-based-smart-seed-monitoring-system"}


@app.get("/")
def root():
    return {
        "message": "AI-powered platform for Seed Quality, Precision Farming, and Climate Resilience",
        "auth": "JWT",
        "default_admin": {"username": "admin", "password": "admin123"},
    }
