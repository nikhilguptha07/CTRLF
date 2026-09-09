"""
Explicit Exception Classes for CTRL-F Computer Vision Service
"""

class AIServiceError(Exception):
    """Base exception for all AI service errors."""
    def __init__(self, message: str, code: str = "AI_SERVICE_ERROR", status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class ModelLoadError(AIServiceError):
    """Raised when the YOLO model fails to load."""
    def __init__(self, message: str = "Failed to load YOLO model"):
        super().__init__(message=message, code="MODEL_LOAD_FAILED", status_code=500)


class InvalidImageError(AIServiceError):
    """Raised when an uploaded frame or image cannot be decoded."""
    def __init__(self, message: str = "Could not decode or validate image"):
        super().__init__(message=message, code="INVALID_IMAGE", status_code=400)


class InvalidVideoError(AIServiceError):
    """Raised when an uploaded video file cannot be opened or parsed by OpenCV."""
    def __init__(self, message: str = "Could not open or decode video file"):
        super().__init__(message=message, code="INVALID_VIDEO", status_code=400)


class VideoProcessingError(AIServiceError):
    """Raised when an unrecoverable error occurs during video frame extraction/processing."""
    def __init__(self, message: str = "Video frame processing failed"):
        super().__init__(message=message, code="VIDEO_PROCESSING_FAILED", status_code=500)


class UnsupportedTargetError(AIServiceError):
    """Raised when the requested target class is not supported by the loaded model."""
    def __init__(self, target: str, supported_classes: list = None):
        classes_str = ", ".join(supported_classes[:10]) + ("..." if supported_classes and len(supported_classes) > 10 else "")
        message = (
            f"Target class '{target}' is not supported by the pretrained model. "
            f"Pretrained YOLO supports 80 COCO classes ({classes_str})."
        )
        super().__init__(message=message, code="UNSUPPORTED_TARGET", status_code=400)
        self.target = target
        self.supported_classes = supported_classes or []


class InferenceError(AIServiceError):
    """Raised when model inference fails on a valid frame."""
    def __init__(self, message: str = "Model inference failed"):
        super().__init__(message=message, code="INFERENCE_FAILED", status_code=500)
