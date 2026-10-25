import hashlib
import hmac
import time
from fastapi import HTTPException, Request, status
from app.config import settings

SESSION_COOKIE = "profile_admin_session"
SESSION_MAX_AGE = 8 * 60 * 60


def _session_secret() -> bytes:
    secret = settings.admin_session_secret
    if not secret or len(secret) < 32:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin authentication is not configured")
    return secret.encode("utf-8")


def ensure_auth_is_configured() -> None:
    if not settings.admin_password or len(settings.admin_password) < 8:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin authentication is not configured")
    _session_secret()


def create_session() -> str:
    issued_at = str(int(time.time()))
    signature = hmac.new(_session_secret(), issued_at.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{issued_at}.{signature}"


def is_valid_session(value: str | None) -> bool:
    if not value:
        return False
    try:
        issued_at, supplied_signature = value.split(".", 1)
        if not issued_at.isascii() or not issued_at.isdigit() or not supplied_signature.isascii():
            return False
        issued = int(issued_at)
    except (ValueError, TypeError):
        return False
    now = int(time.time())
    if issued > now + 60 or now - issued > SESSION_MAX_AGE:
        return False
    expected = hmac.new(_session_secret(), issued_at.encode("ascii"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, supplied_signature)


def require_admin(request: Request) -> None:
    ensure_auth_is_configured()
    authorization = request.headers.get("authorization", "")
    bearer_token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else None
    session_token = bearer_token or request.cookies.get(SESSION_COOKIE)
    if not is_valid_session(session_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin login required")


def require_frontend_origin(request: Request) -> None:
    if request.headers.get("origin") not in settings.allowed_frontend_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Request origin is not allowed")
