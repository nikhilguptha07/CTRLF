import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
from pathlib import Path
import torch

class Settings:
    # Model configuration
    MODEL_PATH: str = os.getenv("MODEL_PATH") or os.getenv("YOLO_MODEL") or "yolov8n.pt"
    
    # Resolve relative model paths reliably across workspace directories
    @classmethod
    def resolve_model_path(cls) -> str:
        candidates = [
            cls.MODEL_PATH,
            os.path.abspath(cls.MODEL_PATH),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", cls.MODEL_PATH)),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", cls.MODEL_PATH)),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", cls.MODEL_PATH)),
        ]
        for p in candidates:
            if os.path.exists(p) and os.path.isfile(p):
                return p
        return cls.MODEL_PATH

    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.20"))
    IOU_THRESHOLD: float = float(os.getenv("IOU_THRESHOLD", "0.45"))
    FRAME_INTERVAL: int = int(os.getenv("FRAME_INTERVAL", "1"))
    PROCESS_EVERY_N_FRAMES: int = int(os.getenv("PROCESS_EVERY_N_FRAMES", "1"))
    MAX_VIDEO_DURATION: float = float(os.getenv("MAX_VIDEO_DURATION", "120.0"))
    MAX_VIDEO_SIZE_BYTES: int = int(os.getenv("MAX_VIDEO_SIZE_BYTES", str(500 * 1024 * 1024))) # 500MB
    
    # Phase 4 ByteTrack Configuration
    TRACK_HIGH_THRESHOLD: float = float(os.getenv("TRACK_HIGH_THRESHOLD", "0.30"))
    TRACK_LOW_THRESHOLD: float = float(os.getenv("TRACK_LOW_THRESHOLD", "0.10"))
    TRACK_MATCH_THRESHOLD: float = float(os.getenv("TRACK_MATCH_THRESHOLD", "0.80"))
    TRACK_BUFFER: int = int(os.getenv("TRACK_BUFFER", "30"))
    MIN_CONFIRM_FRAMES: int = int(os.getenv("MIN_CONFIRM_FRAMES", "2"))
    
    # Phase 5 Production Video & Evidence Configuration
    EVIDENCE_SELECTION_POLICY: str = os.getenv("EVIDENCE_SELECTION_POLICY", "highest_confidence")
    TARGET_PROCESS_FPS: float = float(os.getenv("TARGET_PROCESS_FPS", "15.0"))
    
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "server", "uploads")))
    HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))

settings = Settings()
