"""
Bounded Thread-Safe Frame Buffer.
Prevents memory exhaustion by capping queue size (e.g. maxlen=5)
and prioritizing newest-frame processing for low-latency AI detection.
"""

from collections import deque
import threading
import time
from typing import Optional
from dataclasses import dataclass
import numpy as np


@dataclass
class BufferedFrame:
    frame: np.ndarray
    timestamp: float          # monotonic/stream timestamp in seconds
    received_at: float        # wall-clock epoch timestamp in seconds
    frame_number: int


class FrameBuffer:
    """
    Thread-safe bounded ring buffer for streaming video frames.
    Drops oldest frames when ingestion outpaces detection.
    """

    def __init__(self, maxlen: int = 5):
        if maxlen < 1:
            raise ValueError("Buffer maxlen must be >= 1")
        self.maxlen = maxlen
        self._buffer: deque[BufferedFrame] = deque(maxlen=maxlen)
        self._lock = threading.Lock()
        self._frames_received = 0
        self._frames_dropped = 0
        self._last_frame_at: Optional[float] = None

    def push(self, frame: np.ndarray, timestamp: float, frame_number: int) -> BufferedFrame:
        """
        Add a newly read frame to the buffer.
        If queue is at capacity, older frame is dropped and counter incremented.
        """
        now = time.time()
        buf_frame = BufferedFrame(
            frame=frame,
            timestamp=timestamp,
            received_at=now,
            frame_number=frame_number,
        )

        with self._lock:
            if len(self._buffer) >= self.maxlen:
                self._frames_dropped += 1
            self._buffer.append(buf_frame)
            self._frames_received += 1
            self._last_frame_at = now

        return buf_frame

    def get_latest(self) -> Optional[BufferedFrame]:
        """
        Return the most recently received frame without removing it.
        Essential for real-time inference sampling.
        """
        with self._lock:
            if not self._buffer:
                return None
            return self._buffer[-1]

    def pop_latest(self) -> Optional[BufferedFrame]:
        """
        Pop and return the newest frame, discarding all older frames.
        Ensures worker consumes only the most recent state.
        """
        with self._lock:
            if not self._buffer:
                return None
            latest = self._buffer.pop()
            dropped = len(self._buffer)
            self._frames_dropped += dropped
            self._buffer.clear()
            return latest

    def pop_fifo(self) -> Optional[BufferedFrame]:
        """
        Pop and return the oldest frame in FIFO order.
        """
        with self._lock:
            if not self._buffer:
                return None
            return self._buffer.popleft()

    def clear(self):
        """Empty buffer and reset frame counters."""
        with self._lock:
            self._buffer.clear()

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._buffer)

    @property
    def frames_received(self) -> int:
        with self._lock:
            return self._frames_received

    @property
    def frames_dropped(self) -> int:
        with self._lock:
            return self._frames_dropped

    @property
    def last_frame_at(self) -> Optional[float]:
        with self._lock:
            return self._last_frame_at
