from datetime import datetime
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


class UserProfile(BaseModel):
    username: str
    role: str


class UserSummary(BaseModel):
    username: str
    role: str
    created_at: str


class SensorIngestRequest(BaseModel):
    device_id: str = "esp32-seed-chamber"
    temperature: float
    humidity: float
    moisture: float


class SensorReading(BaseModel):
    device_id: str
    temperature: float
    humidity: float
    moisture: float
    created_at: datetime


class SensorInsight(BaseModel):
    severity: str
    message: str


class SensorDashboardResponse(BaseModel):
    latest: SensorReading | None
    insights: list[SensorInsight]


class SeedPredictionResponse(BaseModel):
    germination_probability: float
    quality_label: str
    confidence: float
    raw_class: str
    recommendation: str
    image_url: str | None = None
    germination_change: float | None = None
    change_reason: str | None = None
