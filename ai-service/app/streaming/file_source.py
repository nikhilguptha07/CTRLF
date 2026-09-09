"""
Continuous Loop File Camera Source.
Simulates a live camera feed from a recorded MP4/video file with
real wall-clock pacing, monotonic timestamps, and automatic loop restart.
"""

import os
import time
from typing import Optional, Tuple
import cv2
import numpy as np
from .camera_source import CameraSource, CameraSourceType, StreamHealthInfo
from .stream_health import StreamHealthTracker
from .frame_buffer import FrameBuffer


class FileCameraSource(CameraSource):
    """
    Continuous video file player behaving as a live camera stream.
    Paces playback to match native video FPS so ingestion matches real-time hardware.
    """

    def __init__(
        self,
        camera_id: str,
        video_path: str,
        buffer: Optional[FrameBuffer] = None,
        target_fps: Optional[float] = None,
    ):
        super().__init__(camera_id, video_path, CameraSourceType.FILE)
        self.video_path = video_path
        self.buffer = buffer or FrameBuffer(maxlen=5)
        self.health_tracker = StreamHealthTracker(camera_id=camera_id)
        self.target_fps = target_fps

        self._cap: Optional[cv2.VideoCapture] = None
        self._fps: float = 25.0
        self._frame_delay: float = 1.0 / 25.0
        self._frame_number: int = 0
        self._is_running: bool = False
        self._last_read_time: float = 0.0

    def start(self) -> bool:
        path = self.video_path
        if not os.path.exists(path):
            candidates = [
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", path)),
                os.path.abspath(os.path.join("..", path)),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", path)),
            ]
            for candidate in candidates:
                if os.path.exists(candidate):
                    path = candidate
                    break

        if not os.path.exists(path):
            self.health_tracker.record_error(f"Video file not found: {self.video_path}")
            return False

        self.health_tracker.set_connecting()
        self._cap = cv2.VideoCapture(path)
        if not self._cap.isOpened():
            self.health_tracker.record_error(f"Cannot open video file: {self.video_path}")
            return False

        fps = self._cap.get(cv2.CAP_PROP_FPS)
        self._fps = self.target_fps if self.target_fps and self.target_fps > 0 else (fps if fps > 0 else 25.0)
        self._frame_delay = 1.0 / self._fps
        self._is_running = True
        self._last_read_time = time.time()
        self.health_tracker.set_connected()
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        if not self._is_running or self._cap is None:
            return False, None, 0.0

        # Wall-clock real-time pacing
        elapsed = time.time() - self._last_read_time
        if elapsed < self._frame_delay:
            time.sleep(self._frame_delay - elapsed)

        self._last_read_time = time.time()
        ret, frame = self._cap.read()

        # If reached end of file, loop from beginning
        if not ret or frame is None:
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self._cap.read()
            if not ret or frame is None:
                self.health_tracker.record_error("Failed to read video frame after loop reset")
                return False, None, 0.0

        self._frame_number += 1
        now = time.time()
        self.health_tracker.record_frame_received()
        self.buffer.push(frame, timestamp=now, frame_number=self._frame_number)
        return True, frame, now

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
