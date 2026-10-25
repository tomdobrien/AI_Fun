import hashlib
from urllib.parse import quote, unquote

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.admin_auth import create_session, create_upload_session
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.upload_user import UploadUser, utcnow
from app.services.file_storage import original_filename


@pytest.fixture
def backups(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "photo_upload_dir", str(tmp_path / "backup"))
    monkeypatch.setattr(settings, "photo_upload_mount", None)
    monkeypatch.setattr(settings, "admin_password", "test-owner-password")
    monkeypatch.setattr(settings, "admin_session_secret", "test-session-secret-for-private-files-123456789")
    monkeypatch.setattr(settings, "frontend_origin", "https://site.example")
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all([
            UploadUser(id=1, email="alice@example.com", display_name="Alice", password_hash="unused"),
            UploadUser(id=2, email="bob@example.com", display_name=None, password_hash="unused"),
        ])
        db.commit()

    def database():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = database
    # No lifespan: use only the isolated in-memory database, never the site's database.
    client = TestClient(app)
    root = tmp_path / "backup"
    alice = root / "users" / "user-1"
    bob = root / "users" / "user-2"
    alice.mkdir(parents=True)
    bob.mkdir(parents=True)
    alice_name = "a" * 64 + "_family photo.jpg"
    (alice / alice_name).write_bytes(b"alice-private-file")
    (bob / ("b" * 64 + "_bob-only.txt")).write_bytes(b"bob-private-file")
    (root / ("c" * 64 + "_owner-only.txt")).write_bytes(b"owner-private-file")
    try:
        yield client, root, engine, {
            "owner": {"Authorization": f"Bearer {create_session()}"},
            "alice": {"Authorization": f"Bearer {create_upload_session(1)}"},
            "bob": {"Authorization": f"Bearer {create_upload_session(2)}"},
        }, alice_name
    finally:
        client.close()
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def test_account_can_only_list_its_own_original_filenames(backups):
    client, _, _, tokens, _ = backups
    response = client.get("/api/upload/files?user_id=2", headers=tokens["alice"])
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "accountName": "Alice", "email": "alice@example.com", "files": [{"filename": "family photo.jpg"}],
    }
    assert client.get("/api/upload/files", headers=tokens["bob"]).json()["accountName"] == "bob@example.com"


def test_downloads_and_all_account_lists_require_owner_session(backups):
    client, _, _, tokens, name = backups
    for headers in ({}, tokens["alice"]):
        assert client.get("/api/admin/files?user_id=2", headers=headers).status_code == 401
        assert client.get("/api/admin/files/download", params={"user_id": 1, "file_id": name}, headers=headers).status_code == 401
    assert client.get("/api/upload/files").status_code == 401
    assert client.get("/api/upload/files/download", params={"file_id": name}, headers=tokens["alice"]).status_code == 404


def test_owner_lists_named_accounts_and_downloads_attachments(backups):
    client, root, _, tokens, name = backups
    response = client.get("/api/admin/files?user_id=1", headers=tokens["owner"])
    assert response.status_code == 200
    data = response.json()
    assert data["accountName"] == "Alice"
    assert data["files"][0]["filename"] == "family photo.jpg"
    assert data["files"][0]["id"] == name
    download = client.get("/api/admin/files/download", params={"user_id": 1, "file_id": name}, headers=tokens["owner"])
    assert download.content == b"alice-private-file"
    assert download.headers["content-type"] == "application/octet-stream"
    disposition = download.headers["content-disposition"]
    assert disposition.startswith("attachment;")
    assert unquote(disposition).endswith("family photo.jpg")
    assert download.headers["cache-control"] == "no-store"
    assert download.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in download.headers["content-security-policy"]
    assert (root / "users" / "user-1" / name).exists()
    own = client.get("/api/admin/files", headers=tokens["owner"]).json()
    assert [file["filename"] for file in own["files"]] == ["owner-only.txt"]


def test_download_rejects_paths_hidden_files_and_missing_accounts(backups):
    client, _, _, tokens, name = backups
    for filename in ("../owner-only.txt", "..\\owner-only.txt", ".secret", "x\x00.txt", "x\n.txt"):
        response = client.get("/api/admin/files/download", params={"file_id": filename, "user_id": 1}, headers=tokens["owner"])
        assert response.status_code == 400
    assert client.get("/api/admin/files?user_id=999", headers=tokens["owner"]).status_code == 404
    assert client.get("/api/admin/files/download", params={"file_id": name, "user_id": 2}, headers=tokens["owner"]).status_code == 404


def test_disabled_accounts_cannot_list_but_owner_can_still_browse(backups):
    client, _, engine, tokens, _ = backups
    with Session(engine) as db:
        db.get(UploadUser, 1).disabled_at = utcnow()
        db.commit()
    assert client.get("/api/upload/files", headers=tokens["alice"]).status_code == 401
    assert client.get("/api/admin/files?user_id=1", headers=tokens["owner"]).status_code == 200


def test_uploads_keep_hash_prefix_and_duplicate_detection(backups):
    client, root, _, tokens, _ = backups
    content = b"new file contents"
    headers = {**tokens["alice"], "Origin": "https://site.example", "X-File-Name": quote("budget.txt")}
    response = client.post("/api/admin/photos", content=content, headers=headers)
    assert response.status_code == 200
    assert response.json()["duplicate"] is False
    stored = root / "users" / "user-1" / f"{hashlib.sha256(content).hexdigest()}_budget.txt"
    assert stored.read_bytes() == content
    headers["X-File-Name"] = quote("another name.txt")
    duplicate = client.post("/api/admin/photos", content=content, headers=headers)
    assert duplicate.status_code == 200
    assert duplicate.json()["duplicate"] is True
    assert len(list(stored.parent.iterdir())) == 2


def test_linked_files_are_not_listed_or_downloaded(backups):
    client, root, _, tokens, _ = backups
    path = root / "users" / "user-1" / "linked.txt"
    try:
        path.symlink_to(root / ("c" * 64 + "_owner-only.txt"))
    except OSError:
        pytest.skip("This environment cannot create symbolic links")
    listing = client.get("/api/admin/files?user_id=1", headers=tokens["owner"]).json()
    assert not any(item["filename"] == "linked.txt" for item in listing["files"])
    assert client.get("/api/admin/files/download", params={"user_id": 1, "file_id": "linked.txt"}, headers=tokens["owner"]).status_code == 404


def test_display_strips_only_a_recognized_storage_prefix():
    assert original_filename("f" * 64 + "_report_final.pdf") == "report_final.pdf"
    assert original_filename("20261024T123456Z_ab12cd34_photo.jpg") == "photo.jpg"
    assert original_filename("20261024_notes.txt") == "20261024_notes.txt"
    assert original_filename("notes_with_underscores.txt") == "notes_with_underscores.txt"
