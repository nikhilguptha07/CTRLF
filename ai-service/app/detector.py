import uuid
import cv2
import numpy as np
from typing import List, Optional, Tuple, Dict
from ultralytics import YOLO
from .config import settings
from .schemas import DetectionItem, BoundingBox, ClassItem
from .exceptions import ModelLoadError, InferenceError
from .color_analyzer import color_analyzer, parse_target_query

class ObjectDetector:
    def __init__(self, model_path: Optional[str] = None):
        resolved_path = model_path or settings.resolve_model_path()
        self.model_path = resolved_path
        print(f"[ObjectDetector] Initializing YOLO model from: {resolved_path} on {settings.DEVICE}...")
        try:
            self.model = YOLO(resolved_path)
            # Perform a single warmup inference pass
            dummy = np.zeros((320, 320, 3), dtype=np.uint8)
            self.model(dummy, verbose=False)
            self.classes_map: Dict[int, str] = {int(k): str(v) for k, v in self.model.names.items()}
            self.class_name_to_id: Dict[str, int] = {v.lower(): k for k, v in self.classes_map.items()}
            self.model_loaded = True
            print(f"[ObjectDetector] YOLO model ready. {len(self.classes_map)} classes loaded.")
        except Exception as e:
            self.model_loaded = False
            raise ModelLoadError(f"Failed to load YOLO model from {resolved_path}: {str(e)}")

    def get_supported_classes(self) -> List[ClassItem]:
        """Returns the canonical 80 COCO classes supported by this model."""
        return [ClassItem(id=k, name=v) for k, v in sorted(self.classes_map.items())]

    def get_class_name(self, class_id: int) -> str:
        """Returns the canonical class name for a given class ID."""
        return self.classes_map.get(int(class_id), f"class_{class_id}")

    def normalize_class_name(self, name: str) -> str:
        """Normalizes class string to canonical lowercase COCO class name."""
        q = (name or "").strip().lower()
        is_supp, canon = self.is_supported_target(q)
        return canon or q

    def infer_raw_boxes(
        self,
        frame: np.ndarray,
        confidence_threshold: Optional[float] = None,
        imgsz: Optional[int] = None,
    ):
        """Executes YOLO inference with aspect-ratio preserving letterbox and returns raw Ultralytics Boxes for tracking."""
        if frame is None or frame.size == 0:
            return None
        conf = confidence_threshold if confidence_threshold is not None else settings.CONFIDENCE_THRESHOLD
        inf_sz = imgsz if imgsz is not None else 640
        results = self.model(
            frame,
            conf=conf,
            iou=settings.IOU_THRESHOLD,
            imgsz=inf_sz,
            device=settings.DEVICE,
            verbose=False,
        )
        return results[0].boxes


    def is_supported_target(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        Validates if the user query corresponds to a supported model class.
        Normalizes input (strips spaces, lowercases).
        Supports color prefixes (e.g. 'red bottle' -> 'bottle').
        Returns (is_supported, canonical_class_name).
        """
        q = (query or "").strip().lower()
        if not q:
            return False, None

        # Direct exact match against COCO classes
        if q in self.class_name_to_id:
            return True, q

        # Common plurals and minor variations for supported classes ONLY
        plural_map = {
            "bottles": "bottle",
            "backpacks": "backpack",
            "cups": "cup",
            "laptops": "laptop",
            "phones": "cell phone",
            "cell phones": "cell phone",
            "cellphone": "cell phone",
            "mobile": "cell phone",
            "handbags": "handbag",
            "bags": "backpack",
            "chairs": "chair",
            "books": "book",
            "cars": "car",
            "bicycles": "bicycle",
            "bikes": "bicycle",
            "persons": "person",
            "people": "person",
            "tvs": "tv",
            "monitors": "tv",
            "screens": "tv",
        }
        if q in plural_map and plural_map[q] in self.class_name_to_id:
            return True, plural_map[q]

        # Check if query has color modifier (e.g. 'red bottle', 'blue backpack')
        cls_part, col_part = parse_target_query(query)
        if cls_part and cls_part != q:
            is_supp, canon = self.is_supported_target(cls_part)
            if is_supp:
                return True, canon
        elif not cls_part and col_part:
            # Color-only query (e.g. 'red') is valid across any class
            return True, None

        return False, None

    def detect_frame(
        self,
        frame: np.ndarray,
        frame_number: int = 0,
        timestamp_s: float = 0.0,
        confidence_threshold: Optional[float] = None,
        target_query: Optional[str] = None,
        camera_id: str = "CAM-01",
        session_id: Optional[str] = None,
    ) -> List[DetectionItem]:
        """
        Executes real YOLO object detection inference on a single frame.
        Extracts real color features directly from the bounding box pixels.
        """
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        if h <= 0 or w <= 0:
            return []

        conf = confidence_threshold if confidence_threshold is not None else settings.CONFIDENCE_THRESHOLD

        try:
            results = self.model(
                frame,
                conf=conf,
                iou=settings.IOU_THRESHOLD,
                device=settings.DEVICE,
                verbose=False
            )
        except Exception as e:
            raise InferenceError(f"YOLO inference error on frame {frame_number}: {str(e)}")

        detections: List[DetectionItem] = []
        if not results or len(results) == 0:
            return detections

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return detections

        timestamp_ms = round(timestamp_s * 1000.0, 2)

        for box in boxes:
            cls_id = int(box.cls[0].item())
            cls_name = self.classes_map.get(cls_id, self.model.names[cls_id])
            score = float(box.conf[0].item()) # Real model confidence between 0.0 and 1.0

            # Real xyxy coordinates from detector
            xyxy = box.xyxy[0].tolist()
            raw_x1, raw_y1, raw_x2, raw_y2 = xyxy

            # Validate and clamp coordinates to frame boundary
            x1 = max(0.0, min(float(raw_x1), float(w - 1)))
            y1 = max(0.0, min(float(raw_y1), float(h - 1)))
            x2 = max(x1 + 1.0, min(float(raw_x2), float(w)))
            y2 = max(y1 + 1.0, min(float(raw_y2), float(h)))

            bw = x2 - x1
            bh = y2 - y1

            bbox = BoundingBox(
                x1=round(x1, 2),
                y1=round(y1, 2),
                x2=round(x2, 2),
                y2=round(y2, 2),
                width=round(bw, 2),
                height=round(bh, 2),
                normalized_x=round(x1 / w, 4),
                normalized_y=round(y1 / h, 4),
                normalized_width=round(bw / w, 4),
                normalized_height=round(bh / h, 4),
            )

            # Phase 11: Real color extraction from frame pixels within bounding box
            color_res = color_analyzer.extract_object_color(frame, x1, y1, x2, y2)

            detections.append(
                DetectionItem(
                    detection_id=str(uuid.uuid4()),
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=round(score, 4),
                    bbox=bbox,
                    frame_number=frame_number,
                    timestamp_s=round(timestamp_s, 3),
                    timestamp_ms=timestamp_ms,
                    camera_id=camera_id,
                    session_id=session_id,
                    track_id=None,       # Phase 4 tracking only
                    world_position=None, # Phase 5 spatial mapping only
                    dominant_color=color_res.dominant_color,
                    color_confidence=color_res.color_confidence,
                    secondary_colors=color_res.secondary_colors,
                )
            )

        return detections

    def is_match(self, detected_class: str, target_query: str) -> bool:
        """
        Determines whether a detected class matches the target query.
        Exact canonical matching only. No misleading cross-class fuzzy matching.
        """
        is_supported, canonical_target = self.is_supported_target(target_query)
        if not is_supported:
            return False
        if canonical_target is None:
            # Color-only query matches any class
            return True

        return detected_class.strip().lower() == canonical_target

# Global detector instance loaded once at startup
detector = ObjectDetector()
