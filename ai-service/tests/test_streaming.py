"""
Unit and Integration Tests for CTRL-F Streaming Subsystem.
Tests bounded buffer, health metrics, file/RTSP camera sources,
isolated live tracking, and live search workers.
"""

import os
import time
import pytest
import numpy as np
import cv2

from app.streaming.camera_source import (
    CameraSourceType,
    StreamState,
    mask_stream_credentials,
)
from app.streaming.frame_buffer import FrameBuffer
from app.streaming.stream_health import StreamHealthTracker
from app.streaming.file_source import FileCameraSource
from app.streaming.stream_manager import StreamManager


def test_credential_masking():
    """Verify RTSP/HTTP URLs mask secrets."""
    url = "rtsp://admin:SecretPass123@192.168.1.100:554/stream"
    masked = mask_stream_credentials(url)
    assert "SecretPass123" not in masked
    assert "admin" not in masked
    assert masked == "rtsp://***:***@192.168.1.100:554/stream"

    clean_url = "rtsp://192.168.1.100:554/live"
    assert mask_stream_credentials(clean_url) == clean_url


def test_frame_buffer_bounded_drops():
    """Verify bounded FrameBuffer drops oldest frames when capacity is exceeded."""
    buf = FrameBuffer(maxlen=3)
    dummy_frame = np.zeros((100, 100, 3), dtype=np.uint8)

    for i in range(5):
        buf.push(dummy_frame, timestamp=float(i), frame_number=i)

    assert buf.size == 3
    assert buf.frames_received == 5
    assert buf.frames_dropped == 2

    latest = buf.get_latest()
    assert latest is not None
    assert latest.frame_number == 4


def test_stream_health_and_stale_detection():
    """Verify stream health transitions and stale frame detection."""
    tracker = StreamHealthTracker(camera_id="CAM_TEST", stale_timeout_s=0.2)
    assert tracker.check_stale() == StreamState.STOPPED

    tracker.set_connecting()
    info = tracker.get_health_info(frames_received=0, frames_dropped=0)
    assert info.status == StreamState.CONNECTING

    tracker.record_frame_received()
    info = tracker.get_health_info(frames_received=1, frames_dropped=0)
    assert info.status == StreamState.LIVE

    # Wait past stale timeout
    time.sleep(0.3)
    info = tracker.get_health_info(frames_received=1, frames_dropped=0)
    assert info.status == StreamState.RECONNECTING
    assert "Stale frame timeout" in (info.lastError or "")


def test_file_camera_source_real_frames():
    """Verify FileCameraSource reads real video frames and loops."""
    candidates = [
        os.path.abspath("reference/cctv-reference.mp4"),
        os.path.abspath("../reference/cctv-reference.mp4"),
    ]
    video_path = next((p for p in candidates if os.path.exists(p)), None)
    if not video_path:
        pytest.skip("Reference video not found")

    source = FileCameraSource(
        camera_id="CAM_FILE_TEST",
        video_path=video_path,
        target_fps=100.0,  # Fast for unit test
    )

    assert source.start() is True
    health = source.get_health()
    assert health.status in (StreamState.CONNECTING, StreamState.LIVE)

    success, frame, ts = source.read_frame()
    assert success is True
    assert frame is not None
    assert frame.shape[0] > 0 and frame.shape[1] > 0
    assert ts > 0

    assert source.stop() is True
    health = source.get_health()
    assert health.status == StreamState.STOPPED


def test_stream_manager_preview_and_search():
    """Verify StreamManager lifecycle, preview generation, and live search."""
    candidates = [
        os.path.abspath("reference/cctv-reference.mp4"),
        os.path.abspath("../reference/cctv-reference.mp4"),
    ]
    video_path = next((p for p in candidates if os.path.exists(p)), None)
    if not video_path:
        pytest.skip("Reference video not found")

    mgr = StreamManager()
    cam_id = "CAM_MGR_TEST"

    started = mgr.start_camera(
        camera_id=cam_id,
        source_type=CameraSourceType.FILE,
        source_uri=video_path,
        target_fps=60.0,
    )
    assert started is True

    # Give reader thread time to ingest initial frames
    time.sleep(0.3)

    health = mgr.get_health(cam_id)
    assert health is not None
    assert health.framesReceived > 0
    assert health.status == StreamState.LIVE

    # Snapshot retrieval
    jpg = mgr.get_latest_jpeg(cam_id)
    assert jpg is not None
    assert len(jpg) > 100

    # Start live search for "bottle" (present in reference CCTV video)
    session_id = "test-live-session-1"
    job = mgr.start_live_search(
        camera_id=cam_id,
        session_id=session_id,
        target_query="bottle",
        sample_fps=20.0,
        min_confirmation_frames=2,
        timeout_seconds=2.0,
    )

    # Wait for target acquisition or timeout
    max_wait = 3.5
    start_t = time.time()
    while time.time() - start_t < max_wait:
        status = mgr.get_live_search_status(session_id)
        if status and status["status"] in ("TARGET_ACQUIRED", "NOT_DETECTED", "FAILED"):
            break
        time.sleep(0.2)

    final_status = mgr.get_live_search_status(session_id)
    assert final_status is not None
    assert final_status["status"] in ("TARGET_ACQUIRED", "NOT_DETECTED")

    if final_status["status"] == "TARGET_ACQUIRED":
        assert final_status["bestDetection"] is not None
        assert final_status["bestDetection"]["class_name"] == "bottle"
        assert len(final_status["evidenceFrames"]) > 0

    mgr.stop_camera(cam_id)
