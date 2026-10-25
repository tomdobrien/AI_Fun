import hmac
import errno
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote
from uuid import uuid4
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
MAX_PHOTO_UPLOAD_BYTES = 100 * 1024 * 1024
ALLOWED_PHOTO_EXTENSIONS = {
    ".avif", ".bmp", ".dng", ".gif", ".heic", ".heif", ".jpeg", ".jpg",
    ".m4v", ".mov", ".mp4", ".png", ".tif", ".tiff", ".webm", ".webp",
}


def _photo_upload_directory() -> Path:
    upload_dir = Path(settings.photo_upload_dir).expanduser()
    if settings.photo_upload_mount:
        mount = Path(settings.photo_upload_mount).expanduser()
        try:
            resolved_mount = mount.resolve(strict=True)
            resolved_upload_dir = upload_dir.resolve(strict=True)
        except OSError as exc:
            raise HTTPException(status_code=503, detail="Photo storage is unavailable") from exc
        if not mount.is_mount() or (resolved_upload_dir != resolved_mount and resolved_mount not in resolved_upload_dir.parents):
            raise HTTPException(status_code=503, detail="Photo storage is unavailable")
        if not resolved_upload_dir.is_dir():
            raise HTTPException(status_code=503, detail="Photo storage is unavailable")
        return resolved_upload_dir

    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir.resolve()

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


@router.post("/admin/photos", tags=["admin"])
async def upload_admin_photo(
    request: Request,
    response: Response,
    _admin: None = Depends(require_admin),
    _origin: None = Depends(require_frontend_origin),
) -> dict[str, str | int]:
    filename = unquote(request.headers.get("x-file-name", "")).strip()
    if (
        not filename
        or filename in {".", ".."}
        or "/" in filename
        or "\\" in filename
        or "\x00" in filename
        or any(ord(character) < 32 or ord(character) == 127 for character in filename)
        or len(filename.encode("utf-8")) > 180
    ):
        raise HTTPException(status_code=400, detail="A valid file name is required")
    if Path(filename).suffix.lower() not in ALLOWED_PHOTO_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Choose a supported photo or video file")

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_PHOTO_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="Files must be 100 MB or smaller")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid content length") from exc

    directory = _photo_upload_directory()
    upload_id = uuid4().hex
    stored_name = f"{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}_{upload_id[:8]}_{filename}"
    destination = directory / stored_name
    temporary = directory / f".{upload_id}.uploading"
    total_bytes = 0
    try:
        with temporary.open("xb") as output:
            async for chunk in request.stream():
                total_bytes += len(chunk)
                if total_bytes > MAX_PHOTO_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Files must be 100 MB or smaller")
                output.write(chunk)
        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty")
        temporary.replace(destination)
    except HTTPException:
        temporary.unlink(missing_ok=True)
        raise
    except OSError as exc:
        temporary.unlink(missing_ok=True)
        if exc.errno == errno.ENOSPC:
            raise HTTPException(status_code=507, detail="The photo drive is full") from exc
        raise HTTPException(status_code=503, detail="Could not save the file to photo storage") from exc
    except Exception:
        temporary.unlink(missing_ok=True)
        raise

    response.headers["Cache-Control"] = "no-store"
    return {"filename": filename, "bytes": total_bytes}

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
