"""Bounded, on-demand video derivatives. Originals are never modified."""

import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from collections import OrderedDict
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.config import settings

CACHE_BYTES = 5_000_000_000
MAX_PREVIEW_BYTES = 512 * 1024 * 1024
MIN_FREE_BYTES = 256 * 1024 * 1024
MAX_SECONDS = 4 * 60 * 60
CONVERSION_SECONDS = 30 * 60
PIN_SECONDS = 11 * 60  # Longer than a playback ticket; don't evict an active preview.
CACHE_NAME = re.compile(r"^v1-[a-f0-9]{64}\.mp4$")
_lock = threading.RLock()
_busy = False
_failures: OrderedDict[str, float] = OrderedDict()


def encoder_available() -> bool:
    # Production conversion requires Linux/systemd isolation, never an unsandboxed fallback.
    return sys.platform == "linux" and all(Path("/usr/bin", name).is_file() for name in ("systemd-run", "ffmpeg", "ffprobe"))


def _key(path: Path) -> str:
    stat = path.stat()
    return hashlib.sha256(f"480p-v1:{path.resolve()}:{stat.st_size}:{stat.st_mtime_ns}".encode()).hexdigest()


def _cache() -> Path:
    root = Path(settings.photo_upload_dir).expanduser().resolve(strict=True)
    cache = root / ".video-previews"
    if cache.is_symlink() or (cache.exists() and (not cache.is_dir() or cache.resolve().parent != root)):
        raise OSError("Unexpected video cache path")
    cache.mkdir(mode=0o700, exist_ok=True)
    return cache


def cached_video(path: Path) -> Path | None:
    try:
        with _lock:
            destination = _cache() / f"v1-{_key(path)}.mp4"
            if destination.is_symlink():
                raise OSError("Unexpected preview link")
            if destination.is_file() and destination.stat().st_size > 0:
                destination.touch()
                return destination
            return None
    except OSError as exc:
        raise HTTPException(status_code=503, detail="Video preview storage is unavailable") from exc


def _reserve(cache: Path) -> bool:
    """Reserve room for one conversion, removing only our oldest unpinned derivatives."""
    files = []
    total = 0
    now = time.time()
    for entry in cache.iterdir():
        if entry.is_symlink() or not entry.is_file():
            continue
        if CACHE_NAME.fullmatch(entry.name):
            stat = entry.stat()
            files.append((stat.st_mtime, entry, stat.st_size))
            total += stat.st_size
        elif re.fullmatch(r"\.[a-f0-9]{32}\.(part\.mp4|input)", entry.name):
            # No other worker runs while this lock is held: leftovers are from a restart.
            entry.unlink()
    for modified, entry, size in sorted(files):
        free = shutil.disk_usage(cache).free
        if total + MAX_PREVIEW_BYTES <= CACHE_BYTES and free >= MAX_PREVIEW_BYTES + MIN_FREE_BYTES:
            return True
        if now - modified > PIN_SECONDS:
            entry.unlink()
            total -= size
    return total + MAX_PREVIEW_BYTES <= CACHE_BYTES and shutil.disk_usage(cache).free >= MAX_PREVIEW_BYTES + MIN_FREE_BYTES


def _sandbox(command: list[str], source: Path, output: Path | None = None, *, timeout: int) -> subprocess.CompletedProcess:
    """Bind only the input/output files into a restricted transient user service."""
    root = Path(settings.photo_upload_dir).expanduser().resolve(strict=True)
    quoted_root = '"' + str(root).replace("\\", "\\\\").replace('"', '\\"') + '"'
    alias = _cache() / f".{uuid4().hex}.input"
    if ":" in str(alias.relative_to(alias.anchor)):
        raise ValueError("Storage path cannot be represented safely in a bind mount")
    with source.open("rb") as original:
        os.link(source, alias, follow_symlinks=False)
        if alias.is_symlink() or alias.stat().st_ino != os.fstat(original.fileno()).st_ino:
            alias.unlink()
            raise OSError("Unexpected input link")
        properties = [
            "MemoryMax=384M", "MemorySwapMax=0", "CPUQuota=50%", "TasksMax=32", "Nice=15",
            "NoNewPrivileges=yes", "PrivateUsers=yes", "PrivateNetwork=yes", "PrivateTmp=yes", "ProtectSystem=strict",
            "ProtectHome=yes", "RestrictSUIDSGID=yes", "RestrictAddressFamilies=AF_UNIX",
            "SystemCallFilter=~socket socketpair",
            "SystemCallErrorNumber=EPERM",
            "RestrictNamespaces=yes", "CapabilityBoundingSet=", "LockPersonality=yes",
            "BindsTo=profile-api.service", "After=profile-api.service",
            "WorkingDirectory=/tmp", "UMask=0077", f"RuntimeMaxSec={timeout}",
            f"InaccessiblePaths={quoted_root} /proc /run/user /run/dbus",
            f'BindReadOnlyPaths="{alias}":/tmp/video-input',
        ]
        # Exclusive creation prevents following a pre-existing output symlink.
        handle = None
        try:
            handle = output.open("xb") if output is not None else None
            if handle is not None:
                properties.extend([
                    f'BindPaths="{output}":/tmp/video-output.mp4',
                    "ReadWritePaths=/tmp/video-output.mp4",
                ])
            arguments = ["/usr/bin/systemd-run", "--user", "--quiet", "--wait", "--pipe", "--collect"]
            for prop in properties:
                arguments.extend(["--property", prop])
            arguments.extend(["--", *command])
            environment = {key: value for key, value in os.environ.items()
                           if key in {"PATH", "LANG", "XDG_RUNTIME_DIR", "DBUS_SESSION_BUS_ADDRESS"}}
            return subprocess.run(arguments, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                  timeout=timeout + 10, check=True, env=environment)
        finally:
            if handle is not None:
                handle.close()
            alias.unlink(missing_ok=True)


def _probe(path: Path, demuxer: str) -> dict:
    result = _sandbox([
        "/usr/bin/ffprobe", "-v", "error", "-max_alloc", "67108864", "-protocol_whitelist", "file",
        "-f", demuxer, "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
        "-of", "json", "/tmp/video-input",
    ], path, timeout=20)
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    duration = float(data["format"]["duration"])
    if (not math.isfinite(duration) or not 0 < duration <= MAX_SECONDS
            or not 2 <= stream["width"] <= 4096 or not 2 <= stream["height"] <= 4096
            or stream["width"] * stream["height"] > 4096 * 2160):
        raise ValueError("Video exceeds preview limits")
    return {"duration": duration, "width": stream["width"], "height": stream["height"]}


def _convert(path: Path, temporary: Path) -> None:
    demuxer = {".webm": "matroska", ".ogg": "ogg", ".ogv": "ogg"}.get(path.suffix.lower(), "mov")
    before = _probe(path, demuxer)
    if path.stat().st_size <= before["duration"] * 75_000:
        raise ValueError("Original is already compact enough for playback")
    command = [
        "/usr/bin/ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-max_alloc", "67108864", "-threads", "1", "-filter_threads", "1",
        "-protocol_whitelist", "file", "-f", demuxer,
    ]
    if demuxer == "mov":
        command.extend(["-enable_drefs", "0", "-use_absolute_path", "0"])
    command.extend([
        "-i", "/tmp/video-input", "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn",
        "-vf", "scale=w='min(854,iw)':h='min(480,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
        "-r", "24", "-c:v", "libx264", "-preset", "veryfast", "-threads", "1", "-pix_fmt", "yuv420p",
        "-b:v", "550k", "-maxrate", "650k", "-bufsize", "1300k", "-g", "48",
        "-c:a", "aac", "-b:a", "64k", "-ac", "2", "-map_metadata", "-1", "-map_chapters", "-1",
        "-movflags", "+faststart", "-fs", str(MAX_PREVIEW_BYTES - 1024 * 1024),
        "-f", "mp4", "/tmp/video-output.mp4",
    ])
    _sandbox(command, path, temporary, timeout=CONVERSION_SECONDS)
    after = _probe(temporary, "mov")
    if (temporary.stat().st_size >= min(path.stat().st_size, MAX_PREVIEW_BYTES)
            or after["width"] > 854 or after["height"] > 480
            or abs(after["duration"] - before["duration"]) > max(0.3, before["duration"] * 0.005)):
        raise ValueError("Preview is larger than the original or incomplete")


def _generate(path: Path, key: str, cache: Path) -> None:
    global _busy
    temporary = cache / f".{uuid4().hex}.part.mp4"
    try:
        if path.is_symlink() or _key(path) != key:
            raise OSError("Source changed")
        _convert(path, temporary)
        if _key(path) != key or temporary.is_symlink():
            raise OSError("Source changed")
        destination = cache / f"v1-{key}.mp4"
        if destination.exists() or destination.is_symlink():
            raise OSError("Unexpected existing preview")
        temporary.replace(destination)
    except (OSError, ValueError, KeyError, IndexError, TypeError, subprocess.SubprocessError):
        with _lock:
            _failures[key] = time.monotonic() + 60 * 60
            while len(_failures) > 128:
                _failures.popitem(last=False)
    finally:
        try:
            temporary.unlink(missing_ok=True)
        finally:
            with _lock:
                _busy = False


def request_video_preview(path: Path) -> tuple[bool, bool]:
    """Return (optimized, preparing). Keep original playback available during work."""
    global _busy
    try:
        with _lock:
            if cached_video(path) is not None:
                return True, False
            key = _key(path)
            if _failures.get(key, 0) > time.monotonic() or not encoder_available():
                return False, False
            if _busy:
                return False, True
            cache = _cache()
            if not _reserve(cache):
                return False, False
            _busy = True
            try:
                threading.Thread(target=_generate, args=(path, key, cache), daemon=True, name="video-preview").start()
            except RuntimeError:
                _busy = False
                return False, False
            return False, True
    except (OSError, HTTPException):
        return False, False
