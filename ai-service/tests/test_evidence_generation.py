import os
import uuid
import cv2
import pytest
from app.video_processor import video_processor
from app.schemas import VideoProcessRequest

CCTV_REF = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reference", "cctv-reference.mp4"))

def test_dual_evidence_frame_generation():
    session_id = f"test-evidence-{uuid.uuid4()}"
    req = VideoProcessRequest(
        video_path=CCTV_REF,
        target_query="tv",
        session_id=session_id,
        sample_fps=4.0,
    )
    res = video_processor.process_video(req)
    assert res.status == "COMPLETED"
    assert res.target_found is True
    assert len(res.evidence_items) > 0

    first_ev = res.evidence_items[0]
    # Check that both original and annotated paths exist on disk
    assert os.path.exists(first_ev.original_path), f"Original frame missing at {first_ev.original_path}"
    assert os.path.exists(first_ev.annotated_path), f"Annotated frame missing at {first_ev.annotated_path}"

    # Verify original frame and annotated frame are readable images
    orig_img = cv2.imread(first_ev.original_path)
    annot_img = cv2.imread(first_ev.annotated_path)
    assert orig_img is not None
    assert annot_img is not None
    assert orig_img.shape == annot_img.shape

    # Check evidence metadata properties
    assert first_ev.class_name == "tv"
    assert first_ev.track_id is not None
    assert first_ev.confidence > 0
    assert first_ev.selection_policy == "highest_confidence"
