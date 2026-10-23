from collections.abc import Generator
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from app.config import settings

class Base(DeclarativeBase):
    pass

def _ensure_sqlite_directory(database_url: str) -> None:
    url = make_url(database_url)
    if url.get_backend_name() == "sqlite" and url.database not in (None, ":memory:"):
        path = Path(url.database)
        if not path.is_absolute():
            path = Path.cwd() / path
        path.parent.mkdir(parents=True, exist_ok=True)

_ensure_sqlite_directory(settings.sqlalchemy_database_url)
connect_args = {"check_same_thread": False} if settings.sqlalchemy_database_url.startswith("sqlite") else {}
engine = create_engine(settings.sqlalchemy_database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
