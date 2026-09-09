"""
Production RTSP Camera Stream Source.
Uses OpenCV FFmpeg backend with TCP transport options, secret masking,
bounded exponential backoff reconnect, and stale-frame recovery.
"""

import os
import time
from typing import Optional, Tuple
import cv2
import numpy as np
from .camera_source import CameraSource, CameraSourceType, StreamHealthInfo, mask_stream_credentials
from .stream_health import StreamHealthTracker
from .frame_buffer import FrameBuffer


class RTSPCameraSource(CameraSource):
    """
    RTSP Camera Source using OpenCV VideoCapture.
    Configured for low latency and robust network reconnect.
    """

    def __init__(
        self,
        camera_id: str,
        rtsp_url: str,
        buffer: Optional[FrameBuffer] = None,
        max_retries: int = 5,
        connect_timeout_s: float = 10.0,
    ):
        super().__init__(camera_id, rtsp_url, CameraSourceType.RTSP)
        self.rtsp_url = rtsp_url
        self.buffer = buffer or FrameBuffer(maxlen=5)
        self.health_tracker = StreamHealthTracker(camera_id=camera_id)
        self.max_retries = max_retries
        self.connect_timeout_s = connect_timeout_s

        self._cap: Optional[cv2.VideoCapture] = None
        self._is_running: bool = False
        self._frame_number: int = 0
        self._consecutive_failures: int = 0

    def _get_capture_options(self) -> str:
        # Prefer TCP transport and 2-second socket timeout to prevent long hangs on unavailable hosts
        return "rtsp_transport;tcp|buffer_size;1024000|max_delay;500000|stimeout;2000000"

    def start(self) -> bool:
        self.health_tracker.set_connecting()
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = self._get_capture_options()

        try:
            self._cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            # Configure OpenCV capture parameters if supported
            self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not self._cap.isOpened():
                masked = mask_stream_credentials(self.rtsp_url)
                self.health_tracker.record_error(f"Failed to connect to RTSP endpoint: {masked}")
                return False

            self._is_running = True
            self._consecutive_failures = 0
            self.health_tracker.set_connected()
            return True
        except Exception as e:
            masked_err = mask_stream_credentials(str(e))
            self.health_tracker.record_error(f"RTSP connection error: {masked_err}")
            return False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        if not self._is_running or self._cap is None:
            return False, None, 0.0

        try:
            ret, frame = self._cap.read()
            if not ret or frame is None:
                self._consecutive_failures += 1
                if self._consecutive_failures > 3:
                    self.health_tracker.record_reconnecting(
                        attempt=self._consecutive_failures,
                        error="RTSP frame read returned empty/disconnected stream",
                    )
                    self.reconnect()
                return False, None, 0.0

            self._consecutive_failures = 0
            self._frame_number += 1
            now = time.time()
            self.health_tracker.record_frame_received()
            self.buffer.push(frame, timestamp=now, frame_number=self._frame_number)
            return True, frame, now
        except Exception as e:
            masked = mask_stream_credentials(str(e))
            self.health_tracker.record_error(f"Exception reading RTSP frame: {masked}")
            return False, None, 0.0

    def reconnect(self) -> bool:
        """
        Reconnect with exponential backoff: 1s, 2s, 4s, 8s, up to 15s.
        """
        self.stop()
        attempt = 1
        backoff = 1.0

        while attempt <= self.max_retries:
            self.health_tracker.record_reconnecting(
                attempt=attempt,
                error=f"Attempting reconnect ({attempt}/{self.max_retries}) after {backoff:.1f}s",
            )
            time.sleep(backoff)

            if self.start():
                return True

            attempt += 1
            backoff = min(15.0, backoff * 2.0)

        self.health_tracker.record_disconnected(
            f"Exceeded maximum reconnect retries ({self.max_retries})"
        )
        return False

    def stop(self) -> bool:
        self._is_running = False
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        self.health_tracker.record_stopped()
        return True

    def get_health(self) -> StreamHealthInfo:
        return self.health_tracker.get_health_info(
            frames_received=self.buffer.frames_received,
            frames_dropped=self.buffer.frames_dropped,
        )
