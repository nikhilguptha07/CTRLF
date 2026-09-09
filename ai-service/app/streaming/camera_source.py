"""
Camera Source Abstraction and Authoritative Stream Types.
Defines base interfaces for all camera feeds (RTSP, File loop, HTTP).
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, Tuple
import re
import numpy as np
from pydantic import BaseModel, Field


class CameraSourceType(str, Enum):
    FILE = "FILE"
    RTSP = "RTSP"
    HTTP_STREAM = "HTTP_STREAM"
    ONVIF = "ONVIF"
    ONVIF_PTZ = "ONVIF_PTZ"
    USB_WEBCAM = "USB_WEBCAM"
    LOCAL_NETWORK = "LOCAL_NETWORK"
    WEBRTC = "WEBRTC"
    HLS = "HLS"
    CUSTOM = "CUSTOM"


class StreamState(str, Enum):
    STOPPED = "STOPPED"
    CONNECTING = "CONNECTING"
    LIVE = "LIVE"
    RECONNECTING = "RECONNECTING"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"


class StreamHealthInfo(BaseModel):
    cameraId: str = Field(..., description="Unique camera identifier")
    status: StreamState = Field(StreamState.STOPPED, description="Authoritative stream state")
    connectedAt: Optional[str] = Field(None, description="ISO timestamp when connection was established")
    lastFrameAt: Optional[str] = Field(None, description="ISO timestamp of most recently received frame")
    currentFps: float = Field(0.0, description="Real measured frame rate from source")
    processingFps: float = Field(0.0, description="Real measured inference frame rate")
    framesReceived: int = Field(0, description="Total valid frames read from stream")
    framesDropped: int = Field(0, description="Total frames dropped due to bounded buffer overflow")
    reconnectAttempts: int = Field(0, description="Number of reconnect attempts since last clean connection")
    lastError: Optional[str] = Field(None, description="Most recent error message with secrets masked")


def mask_stream_credentials(uri: str) -> str:
    """
    Strips or masks user:password credentials from RTSP/HTTP URLs.
    Example: rtsp://admin:pass123@192.168.1.10:554/live -> rtsp://***:***@192.168.1.10:554/live
    """
    if not uri:
        return uri
    # Matches scheme://username:password@host
    pattern = r"^(?P<scheme>[a-zA-Z][a-zA-Z0-9+.-]*:\/\/)(?P<user>[^:@\/\s]+):(?P<pass>[^@\/\s]+)@(?P<rest>.*)$"
    match = re.match(pattern, uri)
    if match:
        return f"{match.group('scheme')}***:***@{match.group('rest')}"
    return uri


class CameraSource(ABC):
    """
    Authoritative abstraction for a camera input source.
    Decouples frame acquisition from detection and inference.
    """

    def __init__(self, camera_id: str, source_uri: str, source_type: CameraSourceType):
        self.camera_id = camera_id
        self.source_uri = source_uri
        self.source_type = source_type
        self.masked_uri = mask_stream_credentials(source_uri)

    @abstractmethod
    def start(self) -> bool:
        """Initialize connection to stream source."""
        pass

    @abstractmethod
    def stop(self) -> bool:
        """Cleanly close connection and release all resources."""
        pass

    @abstractmethod
    def read_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """
        Read a single raw frame from the source.
        Returns:
            (success: bool, frame: Optional[np.ndarray], timestamp: float)
        """
        pass

    @abstractmethod
    def reconnect(self) -> bool:
        """Attempt to re-establish connection after failure."""
        pass

    @abstractmethod
    def get_health(self) -> StreamHealthInfo:
        """Return current real-time health metrics."""
        pass
