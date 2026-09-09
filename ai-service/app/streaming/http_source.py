"""
HTTP / MJPEG Camera Stream Source.
Supports network video feeds over HTTP/HTTPS with automatic reconnect.
"""

from typing import Optional, Tuple
import cv2
import numpy as np
import time
from .camera_source import CameraSource, CameraSourceType, StreamHealthInfo, mask_stream_credentials
from .stream_health import StreamHealthTracker
from .frame_buffer import FrameBuffer


class HTTPCameraSource(CameraSource):
    """
    HTTP / MJPEG Stream Source using OpenCV VideoCapture.
    """

    def __init__(
        self,
        camera_id: str,
        http_url: str,
        buffer: Optional[FrameBuffer] = None,
        max_retries: int = 3,
    ):
        super().__init__(camera_id, http_url, CameraSourceType.HTTP_STREAM)
        self.http_url = http_url
        self.buffer = buffer or FrameBuffer(maxlen=5)
        self.health_tracker = StreamHealthTracker(camera_id=camera_id)
        self.max_retries = max_retries

        self._cap: Optional[cv2.VideoCapture] = None
        self._is_running: bool = False
        self._frame_number: int = 0

    def start(self) -> bool:
        self.health_tracker.set_connecting()
        try:
            self._cap = cv2.VideoCapture(self.http_url)
            if not self._cap.isOpened():
                masked = mask_stream_credentials(self.http_url)
                self.health_tracker.record_error(f"Cannot open HTTP stream: {masked}")
                return False

            self._is_running = True
            self.health_tracker.set_connected()
            return True
        except Exception as e:
            masked = mask_stream_credentials(str(e))
            self.health_tracker.record_error(f"HTTP stream error: {masked}")
            return False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        if not self._is_running or self._cap is None:
            return False, None, 0.0

        try:
            ret, frame = self._cap.read()
            if not ret or frame is None:
                return False, None, 0.0

            self._frame_number += 1
            now = time.time()
            self.health_tracker.record_frame_received()
            self.buffer.push(frame, timestamp=now, frame_number=self._frame_number)
            return True, frame, now
        except Exception as e:
            masked = mask_stream_credentials(str(e))
            self.health_tracker.record_error(f"Error reading HTTP frame: {masked}")
            return False, None, 0.0

    def reconnect(self) -> bool:
        self.stop()
        return self.start()

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
