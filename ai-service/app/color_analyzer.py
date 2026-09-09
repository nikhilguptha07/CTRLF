"""
CONTROL F — Real Object Color Analyzer Module
Phase 11: Real Color Extraction, HSV Classification, Background Suppression,
Deterministic Vocabulary, and Authentic Pixel-Evidence Confidence Calculation.
"""
from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass, field
import cv2
import numpy as np

# Canonical Supported Color Vocabulary
COLOR_VOCABULARY = [
    "RED",
    "ORANGE",
    "YELLOW",
    "GREEN",
    "BLUE",
    "PURPLE",
    "PINK",
    "BROWN",
    "BLACK",
    "WHITE",
    "GRAY",
    "MULTICOLOR",
    "UNKNOWN",
]

# Aliases and normalization
COLOR_ALIASES = {
    "GREY": "GRAY",
    "LIGHT GRAY": "GRAY",
    "DARK GRAY": "GRAY",
    "DARK BLUE": "BLUE",
    "LIGHT BLUE": "BLUE",
    "CYAN": "BLUE",
    "NAVY": "BLUE",
    "MAROON": "RED",
    "CRIMSON": "RED",
    "SCARLET": "RED",
    "GOLD": "YELLOW",
    "VIOLET": "PURPLE",
    "MAGENTA": "PINK",
    "BEIGE": "WHITE",
}

@dataclass
class ColorAnalysisResult:
    dominant_color: str
    color_confidence: float
    secondary_colors: List[str] = field(default_factory=list)
    pixel_counts: Dict[str, int] = field(default_factory=dict)
    total_valid_pixels: int = 0

def normalize_color(name: Optional[str]) -> Optional[str]:
    """Normalizes color string to uppercase canonical color or None."""
    if not name:
        return None
    cleaned = name.strip().upper()
    if cleaned in COLOR_VOCABULARY:
        return cleaned
    if cleaned in COLOR_ALIASES:
        return COLOR_ALIASES[cleaned]
    return None

def parse_target_query(query: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parses a search query into (target_class, target_color).
    Color is optional.
    Examples:
    'red bottle' -> ('bottle', 'RED')
    'bottle' -> ('bottle', None)
    'red' -> (None, 'RED')
    'dark blue backpack' -> ('backpack', 'BLUE')
    """
    if not query:
        return None, None

    tokens = query.strip().split()
    if not tokens:
        return None, None

    # Check multi-word colors first (e.g. 'light blue', 'dark gray')
    matched_color = None
    remaining_tokens = []

    i = 0
    while i < len(tokens):
        # Check two-word alias
        if i + 1 < len(tokens):
            two_word = f"{tokens[i]} {tokens[i+1]}".upper()
            if two_word in COLOR_ALIASES:
                matched_color = COLOR_ALIASES[two_word]
                i += 2
                continue

        # Check single-word color
        one_word = tokens[i].upper()
        if one_word in COLOR_VOCABULARY and one_word not in ("UNKNOWN",):
            matched_color = one_word
            i += 1
            continue
        elif one_word in COLOR_ALIASES:
            matched_color = COLOR_ALIASES[one_word]
            i += 1
            continue

        remaining_tokens.append(tokens[i])
        i += 1

    class_part = " ".join(remaining_tokens).strip() if remaining_tokens else None
    return class_part, matched_color

def is_color_match(
    detected_dominant: str,
    target_color: Optional[str],
    detected_secondary: Optional[List[str]] = None,
) -> bool:
    """
    Evaluates whether detected color satisfies target color requirement.
    CRITICAL RULE: Color is ALWAYS optional.
    If target_color is None or empty, returns True (no color filtering).
    """
    if not target_color:
        return True

    norm_target = normalize_color(target_color)
    if not norm_target:
        return True

    norm_dom = normalize_color(detected_dominant) or "UNKNOWN"
    if norm_dom == norm_target:
        return True

    if detected_secondary:
        for sec in detected_secondary:
            if normalize_color(sec) == norm_target:
                return True

    return False

class ColorAnalyzer:
    """
    Extracts real colors from bounding box crops in video frames.
    Operates strictly on actual image pixels.
    """

    def __init__(self, interior_margin: float = 0.15, min_dominant_ratio: float = 0.35):
        """
        :param interior_margin: Fraction of bounding box edges to suppress (background suppression).
        :param min_dominant_ratio: Minimum fraction of pixels needed to declare a dominant color.
        """
        self.interior_margin = interior_margin
        self.min_dominant_ratio = min_dominant_ratio

    def extract_crop_with_background_suppression(
        self,
        frame: np.ndarray,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
    ) -> Optional[np.ndarray]:
        """
        Extracts interior crop of bounding box to eliminate background bleed and edge artifacts.
        """
        if frame is None or frame.size == 0:
            return None

        h, w = frame.shape[:2]
        ix1 = max(0, min(int(round(x1)), w - 1))
        iy1 = max(0, min(int(round(y1)), h - 1))
        ix2 = max(ix1 + 1, min(int(round(x2)), w))
        iy2 = max(iy1 + 1, min(int(round(y2)), h))

        bw = ix2 - ix1
        bh = iy2 - iy1

        if bw < 4 or bh < 4:
            # Too small for interior suppression
            crop = frame[iy1:iy2, ix1:ix2]
            return crop if crop.size > 0 else None

        # Apply background suppression by sampling interior 70% of box
        inset_x = int(round(bw * self.interior_margin))
        inset_y = int(round(bh * self.interior_margin))

        # Ensure at least 2 pixels remain
        if bw - 2 * inset_x >= 2 and bh - 2 * inset_y >= 2:
            crop = frame[iy1 + inset_y : iy2 - inset_y, ix1 + inset_x : ix2 - inset_x]
        else:
            crop = frame[iy1:iy2, ix1:ix2]

        return crop if crop.size > 0 else None

    def classify_pixel_hsv(self, h: int, s: int, v: int) -> str:
        """
        Deterministic classification of a single pixel in OpenCV HSV space:
        H: 0 - 180, S: 0 - 255, V: 0 - 255.
        """
        # 1. Low Value -> BLACK
        if v < 45 or (v < 60 and s < 50):
            return "BLACK"

        # 2. Low Saturation + High Value -> WHITE
        if s < 35 and v >= 180:
            return "WHITE"

        # 3. Low Saturation + Mid Value -> GRAY
        if s < 45 and 45 <= v < 180:
            return "GRAY"

        # 4. Chromatic Colors (S >= 35, V >= 45)
        # Check Brown: orange/yellow hue with lower brightness and moderate saturation
        if 8 <= h <= 25 and 40 <= s <= 210 and 40 <= v <= 140:
            return "BROWN"

        # Hue ranges:
        if (0 <= h <= 10) or (165 <= h <= 180):
            return "RED"
        elif 11 <= h <= 24:
            return "ORANGE"
        elif 25 <= h <= 35:
            return "YELLOW"
        elif 36 <= h <= 85:
            return "GREEN"
        elif 86 <= h <= 130:
            return "BLUE"
        elif 131 <= h <= 150:
            return "PURPLE"
        elif 151 <= h <= 164:
            return "PINK"

        return "UNKNOWN"

    def analyze_crop(self, crop: np.ndarray) -> ColorAnalysisResult:
        """
        Performs pixel-by-pixel color analysis on a BGR crop.
        Returns authentic dominant color, pixel-evidence confidence, and secondary colors.
        """
        if crop is None or crop.size == 0:
            return ColorAnalysisResult(
                dominant_color="UNKNOWN",
                color_confidence=0.0,
                secondary_colors=[],
                pixel_counts={},
                total_valid_pixels=0,
            )

        # Convert BGR to HSV
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        h_ch, s_ch, v_ch = cv2.split(hsv)

        flat_h = h_ch.ravel()
        flat_s = s_ch.ravel()
        flat_v = v_ch.ravel()
        total_pixels = len(flat_h)

        if total_pixels == 0:
            return ColorAnalysisResult(
                dominant_color="UNKNOWN",
                color_confidence=0.0,
                secondary_colors=[],
                pixel_counts={},
                total_valid_pixels=0,
            )

        counts: Dict[str, int] = {c: 0 for c in COLOR_VOCABULARY if c not in ("MULTICOLOR", "UNKNOWN")}

        # Classify each pixel
        for i in range(total_pixels):
            h_val = int(flat_h[i])
            s_val = int(flat_s[i])
            v_val = int(flat_v[i])
            color = self.classify_pixel_hsv(h_val, s_val, v_val)
            if color in counts:
                counts[color] += 1

        valid_pixels = sum(counts.values())
        if valid_pixels == 0:
            return ColorAnalysisResult(
                dominant_color="UNKNOWN",
                color_confidence=0.0,
                secondary_colors=[],
                pixel_counts=counts,
                total_valid_pixels=0,
            )

        # Sort by frequency descending
        sorted_colors = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        top_color, top_count = sorted_colors[0]
        second_color, second_count = sorted_colors[1] if len(sorted_colors) > 1 else ("UNKNOWN", 0)

        top_ratio = top_count / float(valid_pixels)
        second_ratio = second_count / float(valid_pixels)

        # Multiple colors check: if two strong colors are co-dominant
        if top_ratio >= 0.28 and second_ratio >= 0.25 and abs(top_ratio - second_ratio) < 0.12:
            return ColorAnalysisResult(
                dominant_color="MULTICOLOR",
                color_confidence=round(top_ratio + second_ratio, 4),
                secondary_colors=[top_color, second_color],
                pixel_counts=counts,
                total_valid_pixels=valid_pixels,
            )

        # Clear dominant color
        if top_ratio >= self.min_dominant_ratio:
            secondary = [second_color] if second_ratio >= 0.20 else []
            return ColorAnalysisResult(
                dominant_color=top_color,
                color_confidence=round(top_ratio, 4),
                secondary_colors=secondary,
                pixel_counts=counts,
                total_valid_pixels=valid_pixels,
            )

        # Ambiguous evidence
        return ColorAnalysisResult(
            dominant_color="UNKNOWN",
            color_confidence=round(top_ratio, 4),
            secondary_colors=[top_color] if top_ratio >= 0.20 else [],
            pixel_counts=counts,
            total_valid_pixels=valid_pixels,
        )

    def extract_object_color(
        self,
        frame: np.ndarray,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
    ) -> ColorAnalysisResult:
        """
        Public entry point to extract real color from a bounding box region in a frame.
        """
        crop = self.extract_crop_with_background_suppression(frame, x1, y1, x2, y2)
        return self.analyze_crop(crop)

# Global ColorAnalyzer instance
color_analyzer = ColorAnalyzer()
