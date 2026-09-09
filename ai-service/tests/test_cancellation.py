import os
import uuid
import pytest
from app.video_processor import video_processor
from app.schemas import VideoProcessRequest

CCTV_REF = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reference", "cctv-reference.mp4"))

def test_video_processing_cancellation():
    session_id = f"test-cancel-{uuid.uuid4()}"
    # Pre-register cancellation token
    video_processor.cancel_session(session_id)
    assert video_processor.is_cancelled(session_id) is True

    req = VideoProcessRequest(
        video_path=CCTV_REF,
        target_query="tv",
        session_id=session_id,
        sample_fps=4.0,
    )
    res = video_processor.process_video(req)
    assert res.status == "CANCELLED"
    assert res.target_found is False
    assert len(res.errors) > 0
    assert "cancelled" in res.errors[0].lower()

    # Verify progress state
    prog = video_processor.get_progress(session_id)
    assert prog is not None
    assert prog.status == "CANCELLED"
