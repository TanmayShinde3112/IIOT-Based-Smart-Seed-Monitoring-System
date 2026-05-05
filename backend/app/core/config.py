from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "change-this-in-production"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"
    sqlite_path: str = "./seed_platform.db"
    ml_model_path: str = "../../ML work/defect_classifier.pth"
    calibrated_model_path: str = "./artifacts/seed_quality_calibrated.joblib"
    device_token: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"


settings = Settings()


def resolve_sqlite_path() -> Path:
    return (Path(__file__).resolve().parents[2] / settings.sqlite_path).resolve()


def resolve_model_path() -> Path:
    return (Path(__file__).resolve().parents[2] / settings.ml_model_path).resolve()


def resolve_calibrated_model_path() -> Path:
    return (Path(__file__).resolve().parents[2] / settings.calibrated_model_path).resolve()
