"""
Universal USB / UVC Webcam Camera Source for CTRL-F.
Handles local hardware video capture devices using OpenCV DirectShow (Windows) or V4L2 (Linux).
"""

import logging
import platform
import time
from typing import Optional, Tuple
import cv2
import numpy as np

from .camera_source import (
    CameraSource,
    CameraSourceType,
    StreamState,
    StreamHealthInfo,
)
from .stream_health import StreamHealthTracker

logger = logging.getLogger(__name__)


class USBCameraSource(CameraSource):
    """
    OpenCV-backed hardware device driver for USB Webcams, capture cards, and UVC cameras.
    """

    def __init__(self, camera_id: str, source_uri: str, target_fps: Optional[float] = None):
        super().__init__(camera_id, source_uri, CameraSourceType.USB_WEBCAM)
        self.target_fps = target_fps or 30.0
        # Parse device index from device://0 or plain integer string
        digits = "".join(filter(str.isdigit, source_uri))
        self.device_index = int(digits) if digits else 0
        self.cap: Optional[cv2.VideoCapture] = None
        self.health_tracker = StreamHealthTracker(camera_id)

    def start(self) -> bool:
        """Initialize physical hardware capture."""
        self.health_tracker.set_status(StreamState.CONNECTING)
        logger.info(f"[USB:{self.camera_id}] Opening hardware device #{self.device_index}")

        try:
            # DirectShow on Windows avoids initialization hangs
            if platform.system() == "Windows":
                self.cap = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW)
            else:
                self.cap = cv2.VideoCapture(self.device_index)

            if not self.cap or not self.cap.isOpened():
                # Fallback to default backend
                self.cap = cv2.VideoCapture(self.device_index)

            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)
                self.health_tracker.set_status(StreamState.LIVE)
                logger.info(f"[USB:{self.camera_id}] USB camera device #{self.device_index} opened successfully")
                return True
            else:
                err_msg = f"Failed to open USB capture device #{self.device_index}"
                logger.warning(f"[USB:{self.camera_id}] {err_msg}")
                self.health_tracker.record_error(err_msg)
                return False
        except Exception as e:
            err_msg = f"Exception opening USB device #{self.device_index}: {str(e)}"
            logger.error(f"[USB:{self.camera_id}] {err_msg}")
            self.health_tracker.record_error(err_msg)
            return False

    def stop(self) -> bool:
        """Release hardware camera capture."""
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.health_tracker.set_status(StreamState.STOPPED)
        logger.info(f"[USB:{self.camera_id}] USB device #{self.device_index} released")
        return True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """Read fresh frame from USB camera buffer."""
        now = time.time()
        if not self.cap or not self.cap.isOpened():
            return False, None, now

        ret, frame = self.cap.read()
        if ret and frame is not None:
            self.health_tracker.record_frame_received()
            return True, frame, now
        else:
            return False, None, now

    def reconnect(self) -> bool:
        """Attempt reconnection to USB device."""
        self.health_tracker.record_reconnect_attempt()
        self.stop()
        time.sleep(0.5)
        return self.start()

    def get_health(self) -> StreamHealthInfo:
        return self.health_tracker.get_health_info()
