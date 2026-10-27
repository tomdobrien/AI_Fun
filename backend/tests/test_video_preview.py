import os
import subprocess
import threading
import time
from types import SimpleNamespace

import pytest

from app.config import settings
from app.services import video_preview as video


@pytest.fixture
def storage(tmp_path, monkeypatch):
    root = tmp_path / "private uploads"
    root.mkdir()
    monkeypatch.setattr(settings, "photo_upload_dir", str(root))
    monkeypatch.setattr(video, "_failures", video.OrderedDict())
    monkeypatch.setattr(video, "_busy", False)
    monkeypatch.setattr(video, "encoder_available", lambda: True)
    monkeypatch.setattr(video.shutil, "disk_usage", lambda path: SimpleNamespace(free=10_000_000_000))
    source = root / "source with spaces;not-a-command.mp4"
    source.write_bytes(b"original" * 100)
    return source


def wait_worker():
    deadline = time.monotonic() + 3
    while video._busy and time.monotonic() < deadline:
        time.sleep(0.01)
    assert not video._busy


def test_on_demand_conversion_reuses_cache_and_preserves_source(storage, monkeypatch):
    before = storage.read_bytes()
    calls = []

    def convert(source, destination):
        calls.append(source)
        destination.write_bytes(b"small preview")

    monkeypatch.setattr(video, "_convert", convert)
    assert video.request_video_preview(storage) == (False, True)
    wait_worker()
    assert video.request_video_preview(storage) == (True, False)
    assert video.cached_video(storage).read_bytes() == b"small preview"
    assert storage.read_bytes() == before and len(calls) == 1
    storage.write_bytes(before + b"changed")
    assert video.cached_video(storage) is None


def test_only_one_conversion_runs_and_failures_cleanup_and_back_off(storage, monkeypatch):
    started = threading.Event()
    finish = threading.Event()
    calls = []

    def convert(source, destination):
        calls.append(source)
        destination.write_bytes(b"partial")
        started.set()
        assert finish.wait(3)
        raise subprocess.TimeoutExpired("ffmpeg", 1)

    monkeypatch.setattr(video, "_convert", convert)
    try:
        assert video.request_video_preview(storage) == (False, True)
        assert started.wait(2)
        for _ in range(5):
            assert video.request_video_preview(storage) == (False, True)
        assert len(calls) == 1
    finally:
        finish.set()
        wait_worker()
    assert video.request_video_preview(storage) == (False, False)
    assert not list(video._cache().glob("*.part.mp4"))
    assert video.cached_video(storage) is None
    assert storage.read_bytes().startswith(b"original")


def test_cache_cap_evicts_only_old_generated_previews_and_keeps_active_ones(storage, monkeypatch):
    monkeypatch.setattr(video, "CACHE_BYTES", 100)
    monkeypatch.setattr(video, "MAX_PREVIEW_BYTES", 30)
    cache = video._cache()
    old = cache / ("v1-" + "a" * 64 + ".mp4")
    recent = cache / ("v1-" + "b" * 64 + ".mp4")
    unrelated = cache / "never-delete-this.mp4"
    old.write_bytes(b"a" * 50)
    recent.write_bytes(b"b" * 40)
    unrelated.write_bytes(b"original data")
    os.utime(old, (time.time() - 7200, time.time() - 7200))
    assert video._reserve(cache) is True
    assert not old.exists() and recent.exists() and unrelated.exists() and storage.exists()
    recent.write_bytes(b"b" * 80)
    assert video._reserve(cache) is False
    assert recent.exists()


def test_low_disk_or_unavailable_encoder_keeps_original_playback(storage, monkeypatch):
    monkeypatch.setattr(video.shutil, "disk_usage", lambda path: SimpleNamespace(free=1))
    assert video.request_video_preview(storage) == (False, False)
    monkeypatch.setattr(video, "encoder_available", lambda: False)
    assert video.request_video_preview(storage) == (False, False)
    assert storage.exists() and not video._busy


def test_sandbox_uses_fixed_paths_and_limits_and_does_not_pass_secrets(storage, monkeypatch):
    calls = []
    monkeypatch.setenv("ADMIN_PASSWORD", "must-not-reach-the-encoder")

    def run(arguments, **options):
        calls.append((arguments, options))
        return subprocess.CompletedProcess(arguments, 0, b"{}")

    monkeypatch.setattr(video.subprocess, "run", run)
    output = video._cache() / ".test-output.mp4"
    video._sandbox(["/usr/bin/ffmpeg", "/tmp/video-input", "/tmp/video-output.mp4"], storage, output, timeout=10)
    arguments, options = calls[0]
    for prop in ("PrivateNetwork=yes", "PrivateUsers=yes", "MemoryMax=384M", "CPUQuota=50%", "NoNewPrivileges=yes", "ProtectHome=yes", "ProtectSystem=strict", "BindsTo=profile-api.service", "SystemCallFilter=~socket socketpair", "RestrictNamespaces=yes", "CapabilityBoundingSet="):
        assert prop in arguments
    assert "ADMIN_PASSWORD" not in options["env"] and not options.get("shell")
    assert str(storage) not in arguments
    assert arguments[-3:] == ["/usr/bin/ffmpeg", "/tmp/video-input", "/tmp/video-output.mp4"]
    output.unlink()
    output.symlink_to(storage) if os.name != "nt" else output.write_bytes(b"existing")
    with pytest.raises(FileExistsError):
        video._sandbox(["/usr/bin/ffmpeg"], storage, output, timeout=10)
    assert len(calls) == 1


def test_conversion_rejects_truncated_output_and_sets_bitrate_and_faststart(storage, monkeypatch):
    storage.write_bytes(b"original" * 800_000)
    probes = iter([{"duration": 60, "width": 1920, "height": 1080}, {"duration": 30, "width": 854, "height": 480}])
    monkeypatch.setattr(video, "_probe", lambda *args: next(probes))
    command = []

    def sandbox(arguments, source, output, **options):
        command.extend(arguments)
        output.write_bytes(b"truncated")

    monkeypatch.setattr(video, "_sandbox", sandbox)
    with pytest.raises(ValueError):
        video._convert(storage, video._cache() / "partial.mp4")
    assert command[command.index("-b:v") + 1] == "550k"
    assert command[command.index("-movflags") + 1] == "+faststart"
    assert command[command.index("-protocol_whitelist") + 1] == "file"


def test_already_compact_video_is_not_reencoded(storage, monkeypatch):
    monkeypatch.setattr(video, "_probe", lambda *args: {"duration": 60, "width": 854, "height": 480})
    monkeypatch.setattr(video, "_sandbox", lambda *args, **kwargs: pytest.fail("Compact video should not be encoded"))
    with pytest.raises(ValueError, match="already compact"):
        video._convert(storage, video._cache() / "compact.mp4")


def test_changed_source_is_never_published_as_current_preview(storage, monkeypatch):
    def convert(source, destination):
        destination.write_bytes(b"stale preview")
        source.write_bytes(b"a different source")

    monkeypatch.setattr(video, "_convert", convert)
    assert video.request_video_preview(storage) == (False, True)
    wait_worker()
    assert video.cached_video(storage) is None
    assert not list(video._cache().glob("*.mp4"))


def test_linked_cache_directory_is_not_used_or_cleaned(storage):
    outside = storage.parent / "other-private-files"
    outside.mkdir()
    original = outside / ("v1-" + "a" * 64 + ".mp4")
    original.write_bytes(b"must survive")
    try:
        (storage.parent / ".video-previews").symlink_to(outside, target_is_directory=True)
    except OSError:
        pytest.skip("This environment cannot create symbolic links")
    assert video.request_video_preview(storage) == (False, False)
    assert original.read_bytes() == b"must survive"
