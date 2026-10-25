import hmac
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, SecretStr
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.api.admin_auth import (
    SESSION_COOKIE,
    SESSION_MAX_AGE,
    create_session,
    ensure_auth_is_configured,
    require_admin,
    require_frontend_origin,
)
from app.config import settings
from app.database import get_db
from app.repositories.profile_repository import ProfileRepository
from app.schemas import ProfileResponse, ProfileUpdate
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/api")
secure_cookie = settings.app_env.lower() not in {"development", "dev", "test"}
cookie_samesite = "none" if secure_cookie else "strict"

class AdminLoginRequest(BaseModel):
    password: SecretStr


@router.post("/admin/login", tags=["admin"])
def admin_login(data: AdminLoginRequest, request: Request, response: Response) -> dict[str, str]:
    ensure_auth_is_configured()
    require_frontend_origin(request)
    if not hmac.compare_digest(data.password.get_secret_value(), settings.admin_password or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    session_token = create_session()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=secure_cookie,
        samesite=cookie_samesite,
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"status": "authenticated", "token": session_token}


@router.get("/admin/session", tags=["admin"])
def admin_session(response: Response, _admin: None = Depends(require_admin)) -> dict[str, str]:
    response.headers["Cache-Control"] = "no-store"
    return {"status": "authenticated"}


@router.post("/admin/logout", tags=["admin"])
def admin_logout(request: Request, response: Response) -> dict[str, str]:
    require_frontend_origin(request)
    response.delete_cookie(
        key=SESSION_COOKIE,
        httponly=True,
        secure=secure_cookie,
        samesite=cookie_samesite,
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"status": "logged out"}

@router.get("/health", tags=["health"])
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "healthy"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "database": "unavailable"}) from exc

@router.get("/profile", response_model=ProfileResponse, response_model_by_alias=True, tags=["profile"])
def get_profile(db: Session = Depends(get_db)) -> ProfileResponse:
    return ProfileService(ProfileRepository(db)).get_profile()

@router.put("/profile", response_model=ProfileResponse, response_model_by_alias=True, tags=["profile"])
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    _admin: None = Depends(require_admin),
    _origin: None = Depends(require_frontend_origin),
) -> ProfileResponse:
    return ProfileService(ProfileRepository(db)).update_profile(data)
