"""Private image derivatives and narrowly scoped video playback tickets."""

import base64
import codecs
import hashlib
import hmac
import json
import threading
import time
import warnings
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import settings

VIDEO_TICKET_SECONDS = 10 * 60
IMAGE_LOCK = threading.Lock()
Image.MAX_IMAGE_PIXELS = 40_000_000
TEXT_PREVIEW_BYTES = 1024 * 1024


def text_encoding(sample: bytes) -> str | None:
    encoding = "utf-8-sig"
    if sample.startswith((codecs.BOM_UTF32_LE, codecs.BOM_UTF32_BE)):
        encoding = "utf-32"
    elif sample.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)):
        encoding = "utf-16"
    try:
        decoded = codecs.getincrementaldecoder(encoding)().decode(sample, final=False)
        if any(ord(char) < 32 and char not in "\t\n\r\f" for char in decoded):
            return None
        return encoding
    except UnicodeError:
        return None


def text_preview(path: Path) -> dict:
    try:
        with path.open("rb") as source:
            data = source.read(TEXT_PREVIEW_BYTES + 1)
        encoding = text_encoding(data[:4096])
        if encoding is None:
            raise HTTPException(status_code=415, detail="This file does not contain supported text")
        truncated = len(data) > TEXT_PREVIEW_BYTES
        content = codecs.getincrementaldecoder(encoding)(errors="replace").decode(
            data[:TEXT_PREVIEW_BYTES], final=not truncated)
        return {"text": content, "truncated": truncated}
    except OSError as exc:
        raise HTTPException(status_code=503, detail="Could not read this text preview") from exc


def media_type(path: Path) -> tuple[str, str] | None:
    """Recognize media signatures, then detect text independently of its extension."""
    extension = path.suffix.lower()
    try:
        with path.open("rb") as source:
            sample = source.read(4096)
            header = sample[:32]
    except OSError:
        return None
    if extension in {".jpg", ".jpeg"} and header.startswith(b"\xff\xd8\xff"):
        return "image", "image/jpeg"
    if extension == ".png" and header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", "image/png"
    if extension == ".gif" and header[:6] in {b"GIF87a", b"GIF89a"}:
        return "image", "image/gif"
    if extension == ".webp" and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image", "image/webp"
    if extension in {".mp4", ".m4v", ".mov"} and header[4:8] == b"ftyp":
        return "video", "video/quicktime" if extension == ".mov" else "video/mp4"
    if extension == ".webm" and header.startswith(b"\x1aE\xdf\xa3"):
        return "video", "video/webm"
    if extension in {".ogv", ".ogg"} and header.startswith(b"OggS"):
        return "video", "video/ogg"
    if extension == ".mp3" and (header.startswith(b"ID3") or (len(header) > 1 and header[0] == 255 and header[1] & 224 == 224)):
        return "audio", "audio/mpeg"
    if extension == ".wav" and header[:4] == b"RIFF" and header[8:12] == b"WAVE":
        return "audio", "audio/wav"
    if extension == ".flac" and header.startswith(b"fLaC"):
        return "audio", "audio/flac"
    if extension in {".oga", ".opus"} and header.startswith(b"OggS"):
        return "audio", "audio/ogg"
    if extension == ".m4a" and header[4:8] == b"ftyp":
        return "audio", "audio/mp4"
    if extension == ".pdf" and header.startswith(b"%PDF-"):
        return "pdf", "application/pdf"
    if extension not in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".m4v", ".mov", ".webm", ".ogv", ".ogg", ".pdf", ".mp3", ".wav", ".flac", ".m4a", ".oga", ".opus"} and text_encoding(sample) is not None:
        return "text", "text/plain"
    return None


def image_preview(path: Path, *, thumbnail: bool) -> Path:
    kind = media_type(path)
    if not kind or kind[0] != "image":
        raise HTTPException(status_code=415, detail="An image preview is not available for this file")
    edge = 320 if thumbnail else 2048
    try:
        stat = path.stat()
        key = hashlib.sha256(f"v1:{path.name}:{stat.st_size}:{stat.st_mtime_ns}:{edge}".encode()).hexdigest()
        cache = path.parent / ".media-previews"
        if cache.is_symlink() or (cache.exists() and (not cache.is_dir() or cache.resolve().parent != path.parent)):
            raise HTTPException(status_code=503, detail="Preview storage is unavailable")
        cache.mkdir(exist_ok=True)
        destination = cache / f"{key}.webp"
        if destination.is_symlink():
            raise HTTPException(status_code=503, detail="Preview storage is unavailable")
        # Serialize decoding to keep simultaneous thumbnails within the Pi's memory budget.
        with IMAGE_LOCK:
            if destination.is_file():
                return destination
            temporary = cache / f".{uuid4().hex}.webp"
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(path, formats=["JPEG", "PNG", "GIF", "WEBP"]) as image:
                        if image.width * image.height > Image.MAX_IMAGE_PIXELS:
                            raise HTTPException(status_code=413, detail="This image is too large to preview on this server")
                        image.seek(0)
                        image.draft("RGB", (edge, edge))
                        image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
                        with ImageOps.exif_transpose(image) as oriented:
                            with oriented.convert("RGBA" if "A" in oriented.getbands() or "transparency" in oriented.info else "RGB") as result:
                                result.save(temporary, "WEBP", quality=82, exif=b"", icc_profile=None, xmp=b"")
                temporary.replace(destination)
            finally:
                temporary.unlink(missing_ok=True)
        return destination
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(status_code=413, detail="This image is too large to preview on this server") from exc
    except (UnidentifiedImageError, ValueError) as exc:
        raise HTTPException(status_code=415, detail="This image cannot be previewed") from exc
    except OSError as exc:
        raise HTTPException(status_code=503, detail="Could not create an image preview") from exc


def _ticket_secret() -> bytes:
    if not settings.admin_session_secret or len(settings.admin_session_secret) < 32:
        raise HTTPException(status_code=503, detail="Preview authentication is unavailable")
    return settings.admin_session_secret.encode()


def issue_video_ticket(file_id: str, target_id: int | None, viewer_id: int | None, session_expires: int) -> tuple[str, int]:
    expires = min(int(time.time()) + VIDEO_TICKET_SECONDS, session_expires)
    payload = {"purpose": "video-preview-v1", "file": file_id, "target": target_id, "viewer": viewer_id, "expires": expires}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=").decode("ascii")
    signature = hmac.new(_ticket_secret(), b"video-preview-v1:" + encoded.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}", expires


def verify_video_ticket(token: str) -> dict:
    try:
        if len(token) > 2048 or not token.isascii():
            raise ValueError("Invalid ticket")
        encoded, signature = token.split(".", 1)
        expected = hmac.new(_ticket_secret(), b"video-preview-v1:" + encoded.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid signature")
        payload = json.loads(base64.b64decode(encoded + "=" * (-len(encoded) % 4), altchars=b"-_", validate=True))
        if not isinstance(payload, dict) or payload.get("purpose") != "video-preview-v1":
            raise ValueError("Invalid scope")
        if type(payload.get("expires")) is not int or payload["expires"] <= int(time.time()):
            raise ValueError("Expired ticket")
        for field in ("target", "viewer"):
            if payload.get(field) is not None and (type(payload[field]) is not int or payload[field] <= 0):
                raise ValueError("Invalid account")
        if payload.get("viewer") is not None and payload.get("target") != payload["viewer"]:
            raise ValueError("Invalid account scope")
        if not isinstance(payload.get("file"), str):
            raise ValueError("Invalid file")
        return payload
    except (ValueError, TypeError, KeyError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Video access has expired; reopen the preview") from exc
