"""Private backup browsing. Stored file and folder identifiers stay unchanged."""

import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException

from app.config import settings
from app.models.upload_user import UploadUser
from app.services.media_preview import media_type

GENERATED_PREFIX = re.compile(r"^(?:[a-f0-9]{64}_|\d{8}T\d{6}Z_[a-f0-9]{8}_)(.+)$")


def original_filename(stored_name: str) -> str:
    match = GENERATED_PREFIX.fullmatch(stored_name)
    return match.group(1) if match else stored_name


def upload_directory(user: UploadUser | None, *, create: bool = False) -> Path:
    root = Path(settings.photo_upload_dir).expanduser()
    try:
        if settings.photo_upload_mount:
            mount = Path(settings.photo_upload_mount).expanduser()
            resolved_mount = mount.resolve(strict=True)
            resolved_root = root.resolve(strict=True)
            if not mount.is_mount() or (resolved_root != resolved_mount and resolved_mount not in resolved_root.parents):
                raise OSError("Upload mount is unavailable")
            if not resolved_root.is_dir():
                raise OSError("Storage is not a directory")
        else:
            if create:
                root.mkdir(parents=True, exist_ok=True)
            resolved_root = root.resolve()
        if user is None:
            return resolved_root
        users = resolved_root / "users"
        directory = users / f"user-{user.id}"
        if users.is_symlink() or directory.is_symlink():
            raise OSError("Unexpected storage link")
        if users.exists() and (not users.is_dir() or users.resolve().parent != resolved_root):
            raise OSError("Unexpected storage directory")
        if create:
            directory.mkdir(parents=True, exist_ok=True)
        if directory.exists() and (not directory.is_dir() or directory.resolve().parent != users):
            raise OSError("Unexpected account directory")
        return directory
    except OSError as exc:
        raise HTTPException(status_code=503, detail="File storage is unavailable") from exc


def list_files(user: UploadUser | None, *, admin: bool) -> dict:
    directory = upload_directory(user)
    files = []
    try:
        if directory.exists():
            for path in directory.iterdir():
                if path.name.startswith(".") or path.is_symlink() or not path.is_file():
                    continue
                record = {"filename": original_filename(path.name)}
                media = media_type(path)
                if media:
                    record.update({"id": path.name, "mediaType": media[0]})
                if admin:
                    stat = path.stat()
                    record.update({"id": path.name, "bytes": stat.st_size,
                                   "modifiedAt": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()})
                files.append(record)
    except OSError as exc:
        raise HTTPException(status_code=503, detail="Could not list backup files") from exc
    files.sort(key=lambda item: item["filename"].casefold())
    return {"accountName": (user.display_name or user.email) if user else "Your backup",
            "email": user.email if user else None, "files": files}


def download_path(user: UploadUser | None, file_id: str) -> Path:
    if (not file_id or file_id.startswith(".") or any(c in file_id for c in '/\\\x00')
            or any(ord(c) < 32 or ord(c) == 127 for c in file_id)
            or len(file_id.encode("utf-8")) > 255):
        raise HTTPException(status_code=400, detail="Invalid file identifier")
    directory = upload_directory(user)
    path = directory / file_id
    if path.is_symlink() or not path.is_file() or path.resolve().parent != directory:
        raise HTTPException(status_code=404, detail="File not found")
    return path
