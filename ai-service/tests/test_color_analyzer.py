import pytest
import numpy as np
import cv2
from app.color_analyzer import (
    color_analyzer,
    normalize_color,
    is_color_match,
    COLOR_VOCABULARY,
)

def create_solid_bgr_image(b: int, g: int, r: int, size=(50, 50)) -> np.ndarray:
    img = np.zeros((size[0], size[1], 3), dtype=np.uint8)
    img[:, :] = (b, g, r)
    return img

def test_color_vocabulary_normalization():
    assert normalize_color("red") == "RED"
    assert normalize_color("RED") == "RED"
    assert normalize_color("grey") == "GRAY"
    assert normalize_color("GREY") == "GRAY"
    assert normalize_color("blue") == "BLUE"
    assert normalize_color("unknown_color") is None
    assert normalize_color(None) is None
    assert normalize_color("") is None

def test_is_color_match_optional_color():
    # When target color is None or empty, ANY detected color matches!
    assert is_color_match("RED", None) is True
    assert is_color_match("BLUE", "") is True
    assert is_color_match("UNKNOWN", None) is True
    assert is_color_match("BLACK", None) is True

def test_is_color_match_specific_color():
    assert is_color_match("RED", "red") is True
    assert is_color_match("RED", "RED") is True
    assert is_color_match("BLUE", "red") is False
    assert is_color_match("GREEN", "BLUE") is False
    # Secondary color match
    assert is_color_match("MULTICOLOR", "RED", detected_secondary=["RED", "BLUE"]) is True
    assert is_color_match("RED", "BLUE", detected_secondary=["BLUE"]) is True

def test_pure_red_detection():
    # Pure red in BGR: B=0, G=0, R=255
    red_img = create_solid_bgr_image(0, 0, 240)
    result = color_analyzer.extract_object_color(red_img, 0, 0, 50, 50)
    assert result.dominant_color == "RED"
    assert result.color_confidence >= 0.90

def test_pure_blue_detection():
    # Pure blue in BGR: B=255, G=0, R=0
    blue_img = create_solid_bgr_image(240, 0, 0)
    result = color_analyzer.extract_object_color(blue_img, 0, 0, 50, 50)
    assert result.dominant_color == "BLUE"
    assert result.color_confidence >= 0.90

def test_pure_green_detection():
    # Pure green in BGR: B=0, G=240, R=0
    green_img = create_solid_bgr_image(0, 240, 0)
    result = color_analyzer.extract_object_color(green_img, 0, 0, 50, 50)
    assert result.dominant_color == "GREEN"
    assert result.color_confidence >= 0.90

def test_pure_yellow_detection():
    # Pure yellow in BGR: B=0, G=240, R=240
    yellow_img = create_solid_bgr_image(0, 240, 240)
    result = color_analyzer.extract_object_color(yellow_img, 0, 0, 50, 50)
    assert result.dominant_color == "YELLOW"
    assert result.color_confidence >= 0.90

def test_pure_black_detection():
    black_img = create_solid_bgr_image(15, 15, 15)
    result = color_analyzer.extract_object_color(black_img, 0, 0, 50, 50)
    assert result.dominant_color == "BLACK"
    assert result.color_confidence >= 0.90

def test_pure_white_detection():
    white_img = create_solid_bgr_image(245, 245, 245)
    result = color_analyzer.extract_object_color(white_img, 0, 0, 50, 50)
    assert result.dominant_color == "WHITE"
    assert result.color_confidence >= 0.90

def test_pure_gray_detection():
    gray_img = create_solid_bgr_image(120, 120, 120)
    result = color_analyzer.extract_object_color(gray_img, 0, 0, 50, 50)
    assert result.dominant_color == "GRAY"
    assert result.color_confidence >= 0.90

def test_multicolor_detection():
    # Half red, half blue image
    img = np.zeros((60, 60, 3), dtype=np.uint8)
    img[:, :30] = (0, 0, 240) # Red
    img[:, 30:] = (240, 0, 0) # Blue
    result = color_analyzer.extract_object_color(img, 0, 0, 60, 60)
    assert result.dominant_color in ("MULTICOLOR", "RED", "BLUE")
    assert "RED" in result.secondary_colors or "BLUE" in result.secondary_colors or result.dominant_color in ("RED", "BLUE")

def test_background_suppression():
    # 100x100 image with green background and red center
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[:, :] = (0, 200, 0) # Green border/background
    # Inner 70x70 is pure red
    img[15:85, 15:85] = (0, 0, 240)
    # The bounding box encompasses the whole 100x100
    # Interior crop should suppress the outer green border
    result = color_analyzer.extract_object_color(img, 0, 0, 100, 100)
    assert result.dominant_color == "RED"
