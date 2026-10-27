import importlib.util
import json
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text

from app.database import Base
from app import models  # noqa: F401


def migration():
    path = Path(__file__).parents[1] / "alembic/versions/20261027_03_permissions.py"
    spec = importlib.util.spec_from_file_location("permission_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_migration_preserves_legacy_access_and_does_not_regrant_revoked_permissions():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        for table in ("upload_users", "upload_invitations"):
            connection.execute(text(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY, email TEXT)"))
            connection.execute(text(f"INSERT INTO {table} VALUES (1, 'existing@example.com')"))
        with Operations.context(MigrationContext.configure(connection)):
            migration().upgrade()
            for table in ("upload_users", "upload_invitations"):
                row = connection.execute(text(f"SELECT email, permissions FROM {table}")).one()
                assert row.email == "existing@example.com"
                assert json.loads(row.permissions) == ["files:upload", "files:view"]
                connection.execute(text(f"UPDATE {table} SET permissions = '[]'"))
            assert json.loads(connection.execute(text("SELECT permissions FROM public_access")).scalar()) == ["resume:view"]
            connection.execute(text("UPDATE public_access SET permissions = '[]'"))
            migration().upgrade()
            for table in ("upload_users", "upload_invitations", "public_access"):
                assert json.loads(connection.execute(text(f"SELECT permissions FROM {table}")).scalar()) == []
    engine.dispose()


def test_migration_handles_fresh_schema_created_before_alembic():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            migration().upgrade()
        assert json.loads(connection.execute(text("SELECT permissions FROM public_access WHERE id = 1")).scalar()) == ["resume:view"]
    engine.dispose()
