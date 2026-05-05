from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.database import get_conn
from app.models.schemas import LoginRequest, RegisterRequest, TokenResponse, UserProfile, UserSummary
from app.services.auth import (
    create_access_token,
    get_current_user,
    get_optional_user,
    hash_password,
    require_roles,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, current_user: dict | None = Depends(get_optional_user)):
    with get_conn() as conn:
        users_count = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        if users_count > 0:
            if current_user is None or current_user.get("role", "").lower() != "admin":
                raise HTTPException(status_code=403, detail="Only admin can create new users")

        existing = conn.execute("SELECT username FROM users WHERE username = ?", (payload.username,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")

        password_hash = hash_password(payload.password)
        role = "user"
        conn.execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            (payload.username, password_hash, role, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()

    token = create_access_token(payload.username, role)
    return TokenResponse(access_token=token, username=payload.username, role=role)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    with get_conn() as conn:
        user = conn.execute(
            "SELECT username, password_hash, role FROM users WHERE username = ?",
            (payload.username,),
        ).fetchone()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(user["username"], user["role"])
    return TokenResponse(access_token=token, username=user["username"], role=user["role"])


@router.get("/me", response_model=UserProfile)
def me(current_user: dict = Depends(get_current_user)):
    return UserProfile(username=current_user["username"], role=current_user["role"])


@router.get("/users", response_model=list[UserSummary])
def list_users(current_user: dict = Depends(require_roles("admin"))):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT username, role, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
    return [UserSummary(username=row["username"], role=row["role"], created_at=row["created_at"]) for row in rows]
