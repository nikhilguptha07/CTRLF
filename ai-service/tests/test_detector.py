import os
import cv2
import numpy as np
import pytest
from app.detector import detector
from app.exceptions import UnsupportedTargetError, InvalidImageError
from app.schemas import DetectionItem, BoundingBox

def test_detector_model_loaded():
    """Verify that YOLO model loads once and contains all 80 COCO classes."""
    assert detector.model_loaded is True
    classes = detector.get_supported_classes()
    assert len(classes) == 80
    class_names = [c.name for c in classes]
    assert "bottle" in class_names
    assert "backpack" in class_names
    assert "person" in class_names
    assert "cup" in class_names
    # Verify personal items like keys are NOT in pretrained COCO
    assert "keys" not in class_names
    assert "wallet" not in class_names

def test_supported_target_validation():
    """Verify canonical target support validation."""
    is_supp, name = detector.is_supported_target("bottle")
    assert is_supp is True
    assert name == "bottle"

    is_supp, name = detector.is_supported_target("  Backpack  ")
    assert is_supp is True
    assert name == "backpack"

    # Unsupported targets
    is_supp, name = detector.is_supported_target("keys")
    assert is_supp is False
    assert name is None

    is_supp, name = detector.is_supported_target("wallet")
    assert is_supp is False
    assert name is None

def test_inference_on_synthetic_frame():
    """Verify inference on a frame with valid bbox coordinates and confidence values."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Draw simple bright pattern
    cv2.circle(frame, (320, 240), 60, (255, 255, 255), -1)

    detections = detector.detect_frame(frame, frame_number=1, timestamp_s=0.033)
    assert isinstance(detections, list)
    for det in detections:
        assert isinstance(det.detection_id, str)
        assert 0.0 <= det.confidence <= 1.0
        assert det.track_id is None # Phase 3 constraint
        assert det.world_position is None # Phase 3 constraint
        b = det.bbox
        assert b.x1 < b.x2
        assert b.y1 < b.y2
        assert 0.0 <= b.normalized_x <= 1.0
        assert 0.0 <= b.normalized_y <= 1.0

def test_exact_semantic_matching():
    """Verify exact canonical class matching without dangerous cross-class fuzzy matching."""
    assert detector.is_match("bottle", "bottle") is True
    assert detector.is_match("bottle", "bottles") is True
    assert detector.is_match("backpack", "backpack") is True
    assert detector.is_match("backpack", "car") is False
    assert detector.is_match("person", "bottle") is False
    # Keys cannot match backpack or cell phone
    assert detector.is_match("backpack", "keys") is False
    assert detector.is_match("cell phone", "keys") is False
