from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left x in pixels")
    y1: float = Field(..., description="Top-left y in pixels")
    x2: float = Field(..., description="Bottom-right x in pixels")
    y2: float = Field(..., description="Bottom-right y in pixels")
    width: float = Field(..., description="Width in pixels")
    height: float = Field(..., description="Height in pixels")
    normalized_x: float = Field(..., description="Normalized top-left x (0.0 to 1.0)")
    normalized_y: float = Field(..., description="Normalized top-left y (0.0 to 1.0)")
    normalized_width: float = Field(..., description="Normalized width (0.0 to 1.0)")
    normalized_height: float = Field(..., description="Normalized height (0.0 to 1.0)")

class DetectionItem(BaseModel):
    detection_id: str = Field(..., description="Unique UUID for the detection")
    class_id: int = Field(..., description="Model class index")
    class_name: str = Field(..., description="Canonical class name")
    confidence: float = Field(..., description="Model confidence score between 0.0 and 1.0")
    bbox: BoundingBox
    frame_number: int = Field(0, description="Sequential frame index")
    timestamp_s: float = Field(0.0, description="Timestamp in seconds")
    timestamp_ms: float = Field(0.0, description="Timestamp in milliseconds")
    camera_id: str = Field("CAM-01", description="Identifier of camera source")
    session_id: Optional[str] = Field(None, description="Associated search session ID")
    # In Phase 4: Persistent ByteTrack track identifier
    track_id: Optional[int] = Field(None, description="Persistent ByteTrack track identity")
    # In Phase 4: world_position remains null unless metric calibration exists (Phase 5).
    world_position: Optional[List[float]] = Field(None, description="Must be null in Phase 4")
    # Phase 11: Real Color Classification & Authentic Pixel-Evidence Confidence
    dominant_color: Optional[str] = Field("UNKNOWN", description="Dominant classified color (e.g. RED, BLUE, WHITE, BLACK)")
    color_confidence: Optional[float] = Field(0.0, description="Fraction of foreground pixels supporting dominant color")
    secondary_colors: Optional[List[str]] = Field(default_factory=list, description="Secondary co-dominant or detected colors")

class TrackItem(BaseModel):
    track_id: int
    class_name: str
    confidence: float
    bbox: BoundingBox
    frame_index: int = 0
    timestamp_ms: float = 0.0
    status: str = "TRACKING"
    last_seen: float = 0.0
    dominant_color: Optional[str] = "UNKNOWN"
    color_confidence: Optional[float] = 0.0
    secondary_colors: Optional[List[str]] = []

class TrackSummary(BaseModel):
    track_id: int
    class_id: int
    class_name: str
    confidence: float
    bbox: BoundingBox
    first_frame: int
    last_frame: int
    first_seen_s: float
    last_seen_s: float
    status: str = "ACTIVE"
    hit_streak: int = 1
    total_detections: int = 1
    detections: List[DetectionItem] = []
    # Phase 11: Temporally smoothed color features
    dominant_color: Optional[str] = "UNKNOWN"
    color_confidence: Optional[float] = 0.0
    secondary_colors: Optional[List[str]] = []

class FrameInferenceResult(BaseModel):
    frame_number: int
    timestamp_s: float
    timestamp_ms: float
    detections: List[DetectionItem]
    evidence_frame_path: Optional[str] = None

class VideoProcessRequest(BaseModel):
    video_path: str
    target_query: str
    target_class: Optional[str] = None
    target_color: Optional[str] = None
    confidence_threshold: Optional[float] = None
    frame_interval: Optional[int] = 4
    sample_fps: Optional[float] = 4.0
    max_frames: Optional[int] = 300
    session_id: Optional[str] = None
    camera_id: Optional[str] = "CAM-01"
    min_confirm_frames: Optional[int] = 2
    early_exit_on_target: Optional[bool] = False


class EvidenceItem(BaseModel):
    evidence_id: str
    frame_number: int
    timestamp_s: float
    timestamp_ms: float
    confidence: float
    track_id: Optional[int] = None
    class_name: str
    original_path: str
    annotated_path: Optional[str] = None
    selection_policy: str = "last_known_position"
    dominant_color: Optional[str] = None
    color_confidence: Optional[float] = None

class VideoProcessResponse(BaseModel):
    status: str = Field("COMPLETED", description="COMPLETED, NO_MATCH, CANCELLED, or ERROR")
    video_path: str
    total_frames: int
    processed_frames: int
    duration_seconds: float
    target_query: str
    target_found: bool
    best_detection: Optional[DetectionItem] = None
    last_target_observation: Optional[DetectionItem] = None
    matched_track_id: Optional[int] = None
    confirmed_track: Optional[TrackSummary] = None
    detections_count: int
    matches_count: int
    tracks_count: int = 0
    evidence_frames: List[str] = []
    evidence_items: List[EvidenceItem] = []
    detections: List[DetectionItem] = []
    tracks: List[TrackSummary] = []
    matching_tracks: List[TrackSummary] = []
    errors: List[str] = []

class VideoMetadataRequest(BaseModel):
    video_path: str

class FrameExtractRequest(BaseModel):
    video_path: str
    frame_number: Optional[int] = None
    timestamp_s: Optional[float] = None
    timestamp_ms: Optional[float] = None
    annotate: bool = False
    bbox: Optional[Dict[str, Any]] = None
    label: Optional[str] = None
    confidence: Optional[float] = None
    track_id: Optional[int] = None
    dominant_color: Optional[str] = None

class VideoMetadataResponse(BaseModel):
    video_path: str
    is_readable: bool
    width: int = 0
    height: int = 0
    fps: float = 0.0
    frame_count: int = 0
    duration_seconds: float = 0.0
    codec: str = ""
    error_message: Optional[str] = None

class JobProgressResponse(BaseModel):
    session_id: str
    status: str
    progress_percent: float
    processed_frames: int
    total_frames: int
    current_frame: int
    current_timestamp: float
    elapsed_seconds: float
    target_query: Optional[str] = None

class HealthResponse(BaseModel):
    service: str = "ctrl-f-ai"
    status: str = "healthy"
    modelLoaded: bool = True
    modelName: str
    version: str = "1.0.0"
    device: str = "cpu"

class ClassItem(BaseModel):
    id: int
    name: str

class SupportedClassesResponse(BaseModel):
    model: str
    total_classes: int
    classes: List[ClassItem]

class StreamStartRequest(BaseModel):
    camera_id: str
    source_type: str = "FILE"  # FILE, RTSP, HTTP_STREAM
    source_uri: str
    buffer_size: int = 5
    target_fps: Optional[float] = None

class StreamStopRequest(BaseModel):
    camera_id: str

class LiveSearchStartRequest(BaseModel):
    session_id: str
    target_query: Optional[str] = None
    target_class: Optional[str] = None
    sample_fps: float = 5.0
    detection_fps: Optional[float] = None
    min_confirmation_frames: int = 3
    timeout_seconds: float = 30.0

    @model_validator(mode="after")
    def populate_target(self):
        if not self.target_query and self.target_class:
            self.target_query = self.target_class
        if not self.target_query:
            raise ValueError("Either target_query or target_class must be provided")
        if self.detection_fps and not self.sample_fps:
            self.sample_fps = self.detection_fps
        return self

class LiveSearchStopRequest(BaseModel):
    session_id: str
