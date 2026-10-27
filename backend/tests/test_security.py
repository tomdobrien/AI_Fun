import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.api import admin_auth
from app.config import settings
from app.main import app


def test_throttle_blocks_then_recovers_and_separates_sources(monkeypatch):
    monkeypatch.setattr(admin_auth, "_auth_attempts", admin_auth.defaultdict(admin_auth.deque))
    monkeypatch.setattr(admin_auth.time, "monotonic", lambda: 1000)
    request = Request({"type": "http", "client": ("192.0.2.1", 1234)})
    for _ in range(admin_auth.AUTH_MAX_ATTEMPTS):
        admin_auth.check_auth_rate_limit(request)
    with pytest.raises(HTTPException) as blocked:
        admin_auth.check_auth_rate_limit(request)
    assert blocked.value.status_code == 429
    assert blocked.value.headers["Retry-After"] == "900"
    admin_auth.check_auth_rate_limit(Request({"type": "http", "client": ("192.0.2.2", 1234)}))
    monkeypatch.setattr(admin_auth.time, "monotonic", lambda: 1900)
    admin_auth.check_auth_rate_limit(request)


def test_security_headers_on_errors_and_production_https(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    client = TestClient(app)
    try:
        response = client.get("/does-not-exist")
        assert response.status_code == 404
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["referrer-policy"] == "no-referrer"
        assert response.headers["strict-transport-security"].startswith("max-age=31536000")
    finally:
        client.close()
