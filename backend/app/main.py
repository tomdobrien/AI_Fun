from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
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
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_frontend_origins, allow_credentials=True, allow_methods=["GET", "POST", "PUT"], allow_headers=["*"])
app.include_router(router)
