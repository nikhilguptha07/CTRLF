import os
import pytest
from app.video_processor import video_processor

CCTV_REF = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reference", "cctv-reference.mp4"))

def test_extract_video_metadata_valid():
    assert os.path.exists(CCTV_REF), f"Reference video must exist at {CCTV_REF}"
    meta = video_processor.extract_video_metadata(CCTV_REF)
    assert meta.is_readable is True
    assert meta.width == 848
    assert meta.height == 478
    assert meta.fps == 24.0
    assert meta.frame_count == 240
    assert meta.duration_seconds == 10.0
    assert meta.codec == "h264"
    assert meta.error_message is None

def test_extract_video_metadata_nonexistent():
    meta = video_processor.extract_video_metadata("nonexistent_video_path.mp4")
    assert meta.is_readable is False
    assert "not exist" in (meta.error_message or "").lower()

def test_extract_video_metadata_empty_file(tmp_path):
    empty_file = str(tmp_path / "empty.mp4")
    with open(empty_file, "wb") as f:
        f.write(b"")
    meta = video_processor.extract_video_metadata(empty_file)
    assert meta.is_readable is False
