"""
Authoritative Stream Manager.
Orchestrates live camera streams, background ingestion threads,
connection deduplication, bounded frame buffers, MJPEG previews,
and camera-isolated live AI detection/tracking workers.
"""

from dataclasses import dataclass, field
import logging
import os
import threading
import time
from typing import Dict, List, Optional, Generator, Any
import cv2
import numpy as np

from .camera_source import (
    CameraSource,
    CameraSourceType,
    StreamState,
    StreamHealthInfo,
    mask_stream_credentials,
)
from .frame_buffer import FrameBuffer, BufferedFrame
from .file_source import FileCameraSource
from .rtsp_source import RTSPCameraSource
from .http_source import HTTPCameraSource
from .usb_source import USBCameraSource

from app.detector import detector
from app.tracker import ByteTrackerManager
from app.video_processor import video_processor
from app.config import settings
from app.schemas import DetectionItem, BoundingBox

logger = logging.getLogger(__name__)


@dataclass
class LiveSearchJob:
    session_id: str
    camera_id: str
    target_query: str
    sample_fps: float
    min_confirmation_frames: int
    timeout_seconds: float
    started_at: float = field(default_factory=time.time)
    status: str = "PROCESSING_LIVE"  # PROCESSING_LIVE, TARGET_ACQUIRED, NOT_DETECTED, CANCELLED, FAILED
    processed_frames: int = 0
    best_detection: Optional[DetectionItem] = None
    matched_track_id: Optional[int] = None
    evidence_frames: List[str] = field(default_factory=list)
    original_evidence: Optional[str] = None
    annotated_evidence: Optional[str] = None
    error_message: Optional[str] = None
    stop_event: threading.Event = field(default_factory=threading.Event)


class StreamManager:
    """
    Singleton managing all active camera feeds and live search detection workers.
    Ensures thread safety and prevents redundant connections to physical cameras.
    """

    def __init__(self):
        self._sources: Dict[str, CameraSource] = {}
        self._threads: Dict[str, threading.Thread] = {}
        self._stop_events: Dict[str, threading.Event] = {}
        self._searches: Dict[str, LiveSearchJob] = {}  # keyed by session_id
        self._lock = threading.Lock()

    def start_camera(
        self,
        camera_id: str,
        source_type: CameraSourceType,
        source_uri: str,
        buffer_size: int = 5,
        target_fps: Optional[float] = None,
    ) -> bool:
        """
        Start camera stream ingestion thread.
        If camera is already running with identical configuration, reuses the existing stream.
        """
        with self._lock:
            existing = self._sources.get(camera_id)
            if existing and existing.source_uri == source_uri and existing.source_type == source_type:
                health = existing.get_health()
                if health.status in (StreamState.LIVE, StreamState.CONNECTING):
                    logger.info(f"Reusing active stream for camera {camera_id}")
                    return True

            # Stop existing if different URI or dead
            if existing:
                self._stop_camera_unlocked(camera_id)

            buffer = FrameBuffer(maxlen=buffer_size)
            source: CameraSource

            if source_type == CameraSourceType.FILE:
                source = FileCameraSource(
                    camera_id=camera_id,
                    video_path=source_uri,
                    buffer=buffer,
                    target_fps=target_fps,
                )
            elif source_type in (CameraSourceType.RTSP, CameraSourceType.ONVIF, CameraSourceType.ONVIF_PTZ):
                source = RTSPCameraSource(
                    camera_id=camera_id,
                    rtsp_url=source_uri,
                    buffer=buffer,
                )
            elif source_type in (CameraSourceType.HTTP_STREAM, CameraSourceType.HLS, CameraSourceType.WEBRTC):
                source = HTTPCameraSource(
                    camera_id=camera_id,
                    http_url=source_uri,
                    buffer=buffer,
                )
            elif source_type == CameraSourceType.USB_WEBCAM:
                source = USBCameraSource(
                    camera_id=camera_id,
                    source_uri=source_uri,
                    target_fps=target_fps,
                )
            elif source_type == CameraSourceType.LOCAL_NETWORK:
                source = FileCameraSource(
                    camera_id=camera_id,
                    video_path=source_uri,
                    buffer=buffer,
                    target_fps=target_fps,
                )
            else:
                source = RTSPCameraSource(
                    camera_id=camera_id,
                    rtsp_url=source_uri,
                    buffer=buffer,
                )

            if not source.start():
                logger.error(f"Failed to start stream source for camera {camera_id}: {source.masked_uri}")
                return False

            stop_evt = threading.Event()
            thread = threading.Thread(
                target=self._ingest_worker,
                args=(camera_id, source, stop_evt),
                daemon=True,
                name=f"Ingest-{camera_id}",
            )
            self._sources[camera_id] = source
            self._stop_events[camera_id] = stop_evt
            self._threads[camera_id] = thread
            thread.start()

            logger.info(f"Started stream ingestion thread for camera {camera_id} ({source.masked_uri})")
            return True

    def _ingest_worker(self, camera_id: str, source: CameraSource, stop_evt: threading.Event):
        """Continuously decodes frames from camera source and stores in bounded buffer."""
        while not stop_evt.is_set():
            try:
                success, frame, timestamp = source.read_frame()
                if not success:
                    # Brief sleep to avoid 100% CPU on disconnection
                    time.sleep(0.05)
            except Exception as e:
                masked = mask_stream_credentials(str(e))
                logger.warning(f"Error in ingest loop for {camera_id}: {masked}")
                time.sleep(0.1)

    def stop_camera(self, camera_id: str) -> bool:
        with self._lock:
            return self._stop_camera_unlocked(camera_id)

    def _stop_camera_unlocked(self, camera_id: str) -> bool:
        stop_evt = self._stop_events.pop(camera_id, None)
        if stop_evt:
            stop_evt.set()

        thread = self._threads.pop(camera_id, None)
        if thread and thread.is_alive():
            thread.join(timeout=1.5)

        source = self._sources.pop(camera_id, None)
        if source:
            source.stop()
            logger.info(f"Stopped camera stream for {camera_id}")
            return True
        return False

    def get_health(self, camera_id: str) -> Optional[StreamHealthInfo]:
        with self._lock:
            source = self._sources.get(camera_id)
        if not source:
            return None
        return source.get_health()

    def get_latest_frame(self, camera_id: str) -> Optional[BufferedFrame]:
        with self._lock:
            source = self._sources.get(camera_id)
        if not source or not hasattr(source, "buffer"):
            return None
        return source.buffer.get_latest()

    def get_latest_jpeg(self, camera_id: str, quality: int = 75) -> Optional[bytes]:
        frame_item = self.get_latest_frame(camera_id)
        if frame_item is None or frame_item.frame is None:
            return None
        ret, encoded = cv2.imencode(".jpg", frame_item.frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if not ret:
            return None
        return encoded.tobytes()

    def generate_mjpeg_stream(self, camera_id: str, fps: float = 15.0) -> Generator[bytes, None, None]:
        """
        Yields multipart/x-mixed-replace boundary frames for direct browser HTML <img src="..." /> preview.
        """
        delay = 1.0 / max(1.0, min(fps, 30.0))
        while True:
            jpeg_bytes = self.get_latest_jpeg(camera_id)
            if jpeg_bytes:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(jpeg_bytes)).encode() + b"\r\n\r\n"
                    + jpeg_bytes + b"\r\n"
                )
            time.sleep(delay)

    # -------------------------------------------------------------------------
    # Live Search Detection Workers
    # -------------------------------------------------------------------------

    def start_live_search(
        self,
        camera_id: str,
        session_id: str,
        target_query: str,
        sample_fps: float = 5.0,
        min_confirmation_frames: int = 3,
        timeout_seconds: float = 30.0,
    ) -> LiveSearchJob:
        """
        Initiates a background detection worker on the camera stream.
        Runs isolated ByteTrack instance keyed by (camera_id, session_id).
        """
        with self._lock:
            if session_id in self._searches:
                return self._searches[session_id]

            job = LiveSearchJob(
                session_id=session_id,
                camera_id=camera_id,
                target_query=target_query,
                sample_fps=sample_fps,
                min_confirmation_frames=min_confirmation_frames,
                timeout_seconds=timeout_seconds,
            )
            self._searches[session_id] = job

        worker_thread = threading.Thread(
            target=self._live_detection_worker,
            args=(job,),
            daemon=True,
            name=f"Search-{session_id}-{camera_id}",
        )
        worker_thread.start()
        return job

    def _live_detection_worker(self, job: LiveSearchJob):
        """
        Worker loop executing real YOLO detection & isolated ByteTrack tracking.
        Enforces min_confirmation_frames and timeout.
        """
        camera_id = job.camera_id
        target = job.target_query.lower().strip()
        sample_delay = 1.0 / max(1.0, job.sample_fps)

        # Isolated ByteTracker instance for this camera search
        tracker = ByteTrackerManager(min_confirm_frames=job.min_confirmation_frames)

        # Canonical target class check
        is_supported, canonical_target = detector.is_supported_target(target)
        if not is_supported:
            job.status = "FAILED"
            job.error_message = f"Unsupported target class: '{job.target_query}'"
            return

        consecutive_confirmations = 0
        candidate_evidence: List[tuple[np.ndarray, DetectionItem]] = []

        logger.info(
            f"Live search worker started for camera {camera_id}, session {job.session_id}, target '{canonical_target}'"
        )

        while not job.stop_event.is_set():
            loop_start = time.time()

            # Check timeout
            elapsed = loop_start - job.started_at
            if elapsed >= job.timeout_seconds:
                logger.info(f"Live search {job.session_id} timed out after {elapsed:.1f}s without match")
                job.status = "NOT_DETECTED"
                break

            # Check camera stream health
            health = self.get_health(camera_id)
            if health and health.status in (StreamState.DISCONNECTED, StreamState.ERROR):
                job.status = "FAILED"
                job.error_message = f"Camera stream disconnected: {health.lastError}"
                break

            # Fetch latest fresh frame from bounded buffer
            buf_frame = self.get_latest_frame(camera_id)
            if buf_frame is None or buf_frame.frame is None:
                time.sleep(0.05)
                continue

            frame = buf_frame.frame
            frame_num = buf_frame.frame_number
            ts = buf_frame.timestamp

            job.processed_frames += 1

            # Run real YOLO inference
            try:
                raw_boxes = detector.infer_raw_boxes(frame, settings.CONFIDENCE_THRESHOLD)
            except Exception as e:
                logger.warning(f"Inference error during live search on {camera_id}: {e}")
                time.sleep(sample_delay)
                continue

            # Update camera-isolated ByteTrack tracker
            tracked_detections = tracker.update(
                boxes_or_detections=raw_boxes,
                frame_number=frame_num,
                timestamp_s=ts,
                frame_shape=(frame.shape[0], frame.shape[1]),
                session_id=job.session_id,
                camera_id=camera_id,
            )

            # Record inference latency metric in health tracker
            with self._lock:
                source = self._sources.get(camera_id)
                if source and hasattr(source, "health_tracker"):
                    source.health_tracker.record_inference_completed()

            # Check for confirmed matching track
            matched_det = None
            matched_track_id = None

            eval_list = tracked_detections or []
            for det in eval_list:
                if detector.is_match(det.class_name, canonical_target):
                    matched_det = det
                    matched_track_id = det.track_id
                    break

            if matched_det is not None:
                consecutive_confirmations += 1
                candidate_evidence.append((frame.copy(), matched_det))
                logger.info(
                    f"Match on {camera_id} [Frame {frame_num}]: '{matched_det.class_name}' ({matched_det.confidence*100:.1f}%) [Confirmations: {consecutive_confirmations}/{job.min_confirmation_frames}]"
                )

                if consecutive_confirmations >= job.min_confirmation_frames:
                    # TARGET ACQUIRED! Save real evidence frame
                    best_pair = candidate_evidence[-1]
                    ev_id, orig_p, annot_p = video_processor.draw_evidence_pair(best_pair[0], best_pair[1])

                    job.status = "TARGET_ACQUIRED"
                    job.best_detection = best_pair[1]
                    job.matched_track_id = matched_track_id or best_pair[1].track_id
                    job.original_evidence = orig_p
                    job.annotated_evidence = annot_p
                    job.evidence_frames = [annot_p]

                    logger.info(
                        f"TARGET_ACQUIRED on {camera_id}! Track #{job.matched_track_id} with {best_pair[1].confidence*100:.1f}% confidence. Evidence saved: {annot_p}"
                    )
                    break
            else:
                consecutive_confirmations = 0

            # Maintain sample rate pacing
            took = time.time() - loop_start
            if took < sample_delay:
                time.sleep(sample_delay - took)

    def stop_live_search(self, session_id: str) -> bool:
        with self._lock:
            job = self._searches.get(session_id)
        if job:
            job.stop_event.set()
            job.status = "CANCELLED"
            return True
        return False

    def get_live_search_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            job = self._searches.get(session_id)
        if not job:
            return None

        return {
            "sessionId": job.session_id,
            "cameraId": job.camera_id,
            "status": job.status,
            "processedFrames": job.processed_frames,
            "elapsedSeconds": round(time.time() - job.started_at, 1),
            "targetFound": job.status == "TARGET_ACQUIRED",
            "bestDetection": job.best_detection.model_dump() if job.best_detection else None,
            "matchedTrackId": job.matched_track_id,
            "evidenceFrames": job.evidence_frames,
            "annotatedEvidence": job.annotated_evidence,
            "originalEvidence": job.original_evidence,
            "errorMessage": job.error_message,
        }


# Authoritative Global Singleton
stream_manager = StreamManager()
