import os
import pytest
from app.video_processor import video_processor
from app.schemas import VideoProcessRequest
from app.exceptions import UnsupportedTargetError, InvalidVideoError

def test_video_processing_reference_video():
    """Verify processing on real video cctv-reference.mp4."""
    video_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reference", "cctv-reference.mp4"))
    assert os.path.exists(video_path), f"Reference video not found at {video_path}"

    req = VideoProcessRequest(
        video_path=video_path,
        target_query="bottle",
        sample_fps=2.0,
        max_frames=12,
        session_id="test-session-123",
    )

    resp = video_processor.process_video(req)
    assert resp.total_frames > 0
    assert resp.processed_frames > 0
    assert resp.duration_seconds > 0
    assert isinstance(resp.detections, list)
    for d in resp.detections:
        assert d.track_id is None # Strictly null in Phase 3
        assert 0.0 <= d.confidence <= 1.0

def test_unsupported_target_raises_error():
    """Verify that unsupported target query (e.g. 'keys') immediately raises UnsupportedTargetError."""
    video_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reference", "cctv-reference.mp4"))
    req = VideoProcessRequest(
        video_path=video_path,
        target_query="keys",
    )

    with pytest.raises(UnsupportedTargetError):
        video_processor.process_video(req)

def test_missing_video_raises_file_not_found():
    """Verify that a non-existent video path raises FileNotFoundError."""
    req = VideoProcessRequest(
        video_path="non_existent_video_path.mp4",
        target_query="bottle",
    )
    with pytest.raises(FileNotFoundError):
        video_processor.process_video(req)
