"""
Real-Time Stream Health Tracker.
Monitors true ingestion state, windowed FPS, dropped frames,
and enforces stale-frame timeouts (never declares fake LIVE).
"""

from collections import deque
from datetime import datetime, timezone
import threading
import time
from typing import Optional
from .camera_source import StreamState, StreamHealthInfo


class StreamHealthTracker:
    """
    Tracks and computes honest real-time metrics for a single camera stream.
    """

    def __init__(
        self,
        camera_id: str,
        stale_timeout_s: float = 3.5,
        fps_window_s: float = 2.0,
    ):
        self.camera_id = camera_id
        self.stale_timeout_s = stale_timeout_s
        self.fps_window_s = fps_window_s

        self._lock = threading.Lock()
        self._status: StreamState = StreamState.STOPPED
        self._connected_at: Optional[float] = None
        self._last_frame_at: Optional[float] = None
        self._last_error: Optional[str] = None
        self._reconnect_attempts: int = 0
        self._processing_fps: float = 0.0

        # Circular timestamp buffers for windowed FPS calculation
        self._ingest_timestamps: deque[float] = deque(maxlen=100)
        self._inference_timestamps: deque[float] = deque(maxlen=100)

    def set_connecting(self):
        with self._lock:
            self._status = StreamState.CONNECTING
            self._last_error = None

    def set_connected(self):
        with self._lock:
            self._connected_at = time.time()
            self._status = StreamState.CONNECTING  # Transitions to LIVE only upon first verified frame!
            self._reconnect_attempts = 0

    def record_frame_received(self):
        """Called upon successful frame decode. Transitions stream to LIVE."""
        now = time.time()
        with self._lock:
            self._last_frame_at = now
            self._status = StreamState.LIVE
            self._ingest_timestamps.append(now)

    def record_inference_completed(self):
        """Called when AI detection finishes processing a frame."""
        now = time.time()
        with self._lock:
            self._inference_timestamps.append(now)

    def record_reconnecting(self, attempt: int, error: Optional[str] = None):
        with self._lock:
            self._status = StreamState.RECONNECTING
            self._reconnect_attempts = attempt
            if error:
                self._last_error = error

    def record_disconnected(self, reason: Optional[str] = None):
        with self._lock:
            self._status = StreamState.DISCONNECTED
            if reason:
                self._last_error = reason

    def record_error(self, error: str):
        with self._lock:
            self._status = StreamState.ERROR
            self._last_error = error

    def record_stopped(self):
        with self._lock:
            self._status = StreamState.STOPPED
            self._ingest_timestamps.clear()
            self._inference_timestamps.clear()

    def _calc_windowed_fps(self, timestamps: deque[float]) -> float:
        now = time.time()
        cutoff = now - self.fps_window_s
        # Count timestamps within window
        recent = [t for t in timestamps if t >= cutoff]
        if len(recent) < 2:
            return 0.0
        duration = recent[-1] - recent[0]
        if duration <= 0:
            return 0.0
        return round((len(recent) - 1) / duration, 1)

    def check_stale(self) -> StreamState:
        """
        Detects if frames have stopped arriving while status was LIVE.
        Transitions state to RECONNECTING if timeout exceeded.
        """
        with self._lock:
            if self._status == StreamState.LIVE and self._last_frame_at is not None:
                if (time.time() - self._last_frame_at) > self.stale_timeout_s:
                    self._status = StreamState.RECONNECTING
                    self._last_error = f"Stale frame timeout: No frames received in {self.stale_timeout_s}s"
            return self._status

    def get_health_info(self, frames_received: int, frames_dropped: int) -> StreamHealthInfo:
        """Snapshot current metrics."""
        self.check_stale()
        with self._lock:
            ingest_fps = self._calc_windowed_fps(self._ingest_timestamps)
            infer_fps = self._calc_windowed_fps(self._inference_timestamps)

            conn_iso = (
                datetime.fromtimestamp(self._connected_at, tz=timezone.utc).isoformat()
                if self._connected_at
                else None
            )
            frame_iso = (
                datetime.fromtimestamp(self._last_frame_at, tz=timezone.utc).isoformat()
                if self._last_frame_at
                else None
            )

            return StreamHealthInfo(
                cameraId=self.camera_id,
                status=self._status,
                connectedAt=conn_iso,
                lastFrameAt=frame_iso,
                currentFps=ingest_fps,
                processingFps=infer_fps,
                framesReceived=frames_received,
                framesDropped=frames_dropped,
                reconnectAttempts=self._reconnect_attempts,
                lastError=self._last_error,
            )
