from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app import models  # noqa: F401 - register tables in metadata
from app.api.routes import router
from app.config import settings
from app.database import Base, engine

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    alembic_config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(alembic_config, "head")
    yield

app = FastAPI(title="Personal Profile API", version="0.1.0", lifespan=lifespan)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if settings.app_env.lower() not in {"development", "dev", "test"}:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_frontend_origins, allow_credentials=True, allow_methods=["GET", "HEAD", "POST", "PUT"], allow_headers=["*"])
app.include_router(router)
