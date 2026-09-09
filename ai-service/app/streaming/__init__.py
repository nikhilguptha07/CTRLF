"""
CTRL-F Streaming Subpackage
Provides real CCTV/RTSP camera source abstractions, bounded frame buffers,
authoritative stream lifecycle management, and live detection/tracking workers.
"""

from .camera_source import CameraSource, CameraSourceType, StreamState, StreamHealthInfo
from .frame_buffer import FrameBuffer, BufferedFrame
from .stream_health import StreamHealthTracker
from .rtsp_source import RTSPCameraSource
from .file_source import FileCameraSource
from .http_source import HTTPCameraSource
from .stream_manager import StreamManager, stream_manager

__all__ = [
    "CameraSource",
    "CameraSourceType",
    "StreamState",
    "StreamHealthInfo",
    "FrameBuffer",
    "BufferedFrame",
    "StreamHealthTracker",
    "RTSPCameraSource",
    "FileCameraSource",
    "HTTPCameraSource",
    "StreamManager",
    "stream_manager",
]
