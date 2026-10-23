from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models  # noqa: F401 - register tables in metadata
from app.api.routes import router
from app.config import settings
from app.database import Base, engine

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Personal Profile API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=False, allow_methods=["GET"], allow_headers=["*"])
app.include_router(router)
