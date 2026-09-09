"""
CONTROL F — Real Object Tracking Module (ByteTrack)
Phase 4: Multi-frame temporal association using ByteTrack with Kalman filtering.
"""
from typing import List, Dict, Optional, Tuple, Any
from types import SimpleNamespace
import numpy as np
import torch
import uuid

from ultralytics.trackers.byte_tracker import BYTETracker
from ultralytics.trackers.basetrack import TrackState
from ultralytics.engine.results import Boxes

from app.config import settings
from app.schemas import DetectionItem, BoundingBox, TrackSummary
from app.detector import detector
from app.color_analyzer import color_analyzer, is_color_match, parse_target_query, normalize_color

def ensure_boxes(boxes_or_detections: Any, frame_shape: Tuple[int, int]) -> Boxes:
    """Safely converts list, tensor, numpy array or Boxes into Ultralytics Boxes."""
    if isinstance(boxes_or_detections, Boxes):
        return boxes_or_detections
    if boxes_or_detections is None:
        return Boxes(torch.zeros((0, 6)), frame_shape)
    if isinstance(boxes_or_detections, torch.Tensor):
        if boxes_or_detections.numel() == 0:
            return Boxes(torch.zeros((0, 6)), frame_shape)
        if boxes_or_detections.ndim == 1:
            boxes_or_detections = boxes_or_detections.unsqueeze(0)
        return Boxes(boxes_or_detections, frame_shape)
    if isinstance(boxes_or_detections, (list, tuple, np.ndarray)):
        arr = np.asarray(boxes_or_detections, dtype=np.float32)
        if arr.size == 0:
            return Boxes(torch.zeros((0, 6)), frame_shape)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        return Boxes(torch.from_numpy(arr), frame_shape)
    return boxes_or_detections

class ByteTrackerManager:
    """
    Wraps Ultralytics ByteTrack algorithm and manages persistent track identities,
    temporal histories, track lifecycles (TENTATIVE -> ACTIVE -> LOST -> ENDED),
    and multi-frame target confirmation policies.
    """

    def __init__(
        self,
        track_high_thresh: Optional[float] = None,
        track_low_thresh: Optional[float] = None,
        new_track_thresh: Optional[float] = None,
        track_buffer: Optional[int] = None,
        match_thresh: Optional[float] = None,
        min_confirm_frames: Optional[int] = None,
    ):
        self.track_high_thresh = track_high_thresh or settings.TRACK_HIGH_THRESHOLD
        self.track_low_thresh = track_low_thresh or settings.TRACK_LOW_THRESHOLD
        self.new_track_thresh = new_track_thresh or self.track_high_thresh
        self.track_buffer = track_buffer or settings.TRACK_BUFFER
        self.match_thresh = match_thresh or settings.TRACK_MATCH_THRESHOLD
        self.min_confirm_frames = min_confirm_frames or settings.MIN_CONFIRM_FRAMES

        self._init_tracker()
        self.track_records: Dict[int, Dict[str, Any]] = {}

    def _init_tracker(self):
        """Instantiate clean BYTETracker with configured hyper-parameters."""
        args = SimpleNamespace(
            track_high_thresh=self.track_high_thresh,
            track_low_thresh=self.track_low_thresh,
            new_track_thresh=self.new_track_thresh,
            track_buffer=self.track_buffer,
            match_thresh=self.match_thresh,
            fuse_score=True,
            gmc_method="sparseOptFlow",
        )
        self.tracker = BYTETracker(args)

    def reset(self):
        """Reset tracker state and track history for a new video or search session."""
        self._init_tracker()
        self.track_records.clear()

    def update(
        self,
        boxes_or_detections: Any,
        frame_number: int,
        timestamp_s: float,
        frame_shape: Tuple[int, int],
        session_id: Optional[str] = None,
        camera_id: str = "CAM-01",
        frame: Optional[np.ndarray] = None,
    ) -> List[DetectionItem]:
        """
        Process frame detections through ByteTrack Kalman filter & Hungarian matching.
        Returns DetectionItem list with assigned persistent track_id and real color features.
        """
        frame_h, frame_w = frame_shape
        timestamp_ms = round(timestamp_s * 1000.0, 2)

        # Standardize input to Boxes object
        boxes = ensure_boxes(boxes_or_detections, frame_shape)

        # Pass boxes to ByteTrack
        # ByteTracker.update returns np.ndarray of shape (N, 8)
        # [x1, y1, x2, y2, track_id, score, class_id, detection_idx]
        tracks_output = self.tracker.update(boxes)

        active_detections: List[DetectionItem] = []

        if tracks_output is not None and len(tracks_output) > 0:
            for row in tracks_output:
                x1 = float(row[0])
                y1 = float(row[1])
                x2 = float(row[2])
                y2 = float(row[3])
                track_id = int(row[4])
                confidence = float(row[5])
                class_id = int(row[6])

                # Bounding box sanity checks
                x1 = max(0.0, min(x1, frame_w - 1.0))
                y1 = max(0.0, min(y1, frame_h - 1.0))
                x2 = max(x1 + 1.0, min(x2, float(frame_w)))
                y2 = max(y1 + 1.0, min(y2, float(frame_h)))

                bw = x2 - x1
                bh = y2 - y1

                bbox = BoundingBox(
                    x1=round(x1, 2),
                    y1=round(y1, 2),
                    x2=round(x2, 2),
                    y2=round(y2, 2),
                    width=round(bw, 2),
                    height=round(bh, 2),
                    normalized_x=round(x1 / frame_w, 4),
                    normalized_y=round(y1 / frame_h, 4),
                    normalized_width=round(bw / frame_w, 4),
                    normalized_height=round(bh / frame_h, 4),
                )

                canonical_class = detector.get_class_name(class_id)

                # Phase 11: Real color extraction from frame pixels within bounding box
                if frame is not None:
                    color_res = color_analyzer.extract_object_color(frame, x1, y1, x2, y2)
                else:
                    color_res = None

                dom_color = color_res.dominant_color if color_res else "UNKNOWN"
                col_conf = color_res.color_confidence if color_res else 0.0
                sec_colors = color_res.secondary_colors if color_res else []

                detection_item = DetectionItem(
                    detection_id=str(uuid.uuid4()),
                    class_id=class_id,
                    class_name=canonical_class,
                    confidence=round(confidence, 4),
                    bbox=bbox,
                    frame_number=frame_number,
                    timestamp_s=round(timestamp_s, 3),
                    timestamp_ms=timestamp_ms,
                    camera_id=camera_id,
                    session_id=session_id,
                    track_id=track_id,
                    world_position=None,
                    dominant_color=dom_color,
                    color_confidence=col_conf,
                    secondary_colors=sec_colors,
                )
                active_detections.append(detection_item)

                # Update track record history
                if track_id not in self.track_records:
                    self.track_records[track_id] = {
                        "track_id": track_id,
                        "class_id": class_id,
                        "class_name": canonical_class,
                        "confidence": round(confidence, 4),
                        "bbox": bbox,
                        "first_frame": frame_number,
                        "last_frame": frame_number,
                        "first_seen_s": round(timestamp_s, 3),
                        "last_seen_s": round(timestamp_s, 3),
                        "status": "ACTIVE",
                        "hit_streak": 1,
                        "total_detections": 1,
                        "detections": [detection_item],
                        "color_history": [dom_color] if dom_color != "UNKNOWN" else [],
                        "dominant_color": dom_color,
                        "color_confidence": col_conf,
                        "secondary_colors": sec_colors,
                    }
                else:
                    rec = self.track_records[track_id]
                    rec["last_frame"] = frame_number
                    rec["last_seen_s"] = round(timestamp_s, 3)
                    rec["hit_streak"] += 1
                    rec["total_detections"] += 1
                    rec["status"] = "ACTIVE"
                    if confidence > rec["confidence"]:
                        rec["confidence"] = round(confidence, 4)
                        rec["class_id"] = class_id
                        rec["class_name"] = canonical_class
                    rec["bbox"] = bbox
                    rec["detections"].append(detection_item)

                    # Temporal smoothing for color: maintain FIFO window (size = 5)
                    col_hist = rec.setdefault("color_history", [])
                    if dom_color != "UNKNOWN":
                        col_hist.append(dom_color)
                        if len(col_hist) > 5:
                            col_hist.pop(0)

                    # Majority vote across observation window
                    from collections import Counter
                    if col_hist:
                        smoothed_color = Counter(col_hist).most_common(1)[0][0]
                        rec["dominant_color"] = smoothed_color
                        rec["color_confidence"] = col_conf
                        rec["secondary_colors"] = sec_colors
                    elif dom_color != "UNKNOWN":
                        rec["dominant_color"] = dom_color
                        rec["color_confidence"] = col_conf
                        rec["secondary_colors"] = sec_colors

                    # Track canonical class: majority vote across all detections in this track
                    class_counts = Counter(d.class_name for d in rec["detections"])
                    most_common_class = class_counts.most_common(1)[0][0]
                    rec["class_name"] = most_common_class
                    for d in rec["detections"]:
                        if d.class_name == most_common_class:
                            rec["class_id"] = d.class_id
                            break

        # Update lifecycle statuses from tracker internal lists
        self._sync_track_lifecycles(frame_number)

        return active_detections

    def _sync_track_lifecycles(self, current_frame: int):
        """Map ByteTrack internal TrackState to canonical lifecycle: TENTATIVE, ACTIVE, LOST, ENDED."""
        tracked_ids = {st.track_id for st in self.tracker.tracked_stracks}
        lost_ids = {st.track_id for st in self.tracker.lost_stracks}
        removed_ids = {st.track_id for st in self.tracker.removed_stracks}

        for track_id, record in self.track_records.items():
            if track_id in tracked_ids:
                record["status"] = "ACTIVE" if record["total_detections"] >= 2 else "TENTATIVE"
            elif track_id in lost_ids:
                record["status"] = "LOST"
            elif track_id in removed_ids:
                record["status"] = "ENDED"
            else:
                # If expired beyond track_buffer
                if current_frame - record["last_frame"] > self.track_buffer:
                    record["status"] = "ENDED"
                else:
                    record["status"] = "LOST"

    def get_tracks(self, status_filter: Optional[str] = None) -> List[TrackSummary]:
        """Return list of TrackSummary objects optionally filtered by status."""
        tracks = []
        for tid, rec in self.track_records.items():
            if status_filter is None or rec["status"] == status_filter:
                tracks.append(
                    TrackSummary(
                        track_id=rec["track_id"],
                        class_id=rec["class_id"],
                        class_name=rec["class_name"],
                        confidence=rec["confidence"],
                        bbox=rec["bbox"],
                        first_frame=rec["first_frame"],
                        last_frame=rec["last_frame"],
                        first_seen_s=rec["first_seen_s"],
                        last_seen_s=rec["last_seen_s"],
                        status=rec["status"],
                        hit_streak=rec["hit_streak"],
                        total_detections=rec["total_detections"],
                        detections=rec["detections"],
                        dominant_color=rec.get("dominant_color", "UNKNOWN"),
                        color_confidence=rec.get("color_confidence", 0.0),
                        secondary_colors=rec.get("secondary_colors", []),
                    )
                )
        return tracks

    def get_active_tracks(self) -> List[TrackSummary]:
        return self.get_tracks(status_filter="ACTIVE")

    def get_lost_tracks(self) -> List[TrackSummary]:
        return self.get_tracks(status_filter="LOST")

    def confirm_target(
        self,
        target_query: Optional[str] = None,
        min_confirm_frames: Optional[int] = None,
        target_class: Optional[str] = None,
        target_color: Optional[str] = None,
    ) -> Optional[TrackSummary]:
        """
        Confirmation policy: Require that the SAME tracked object (same track_id)
        matches the target class AND optional target color across at least min_confirm_frames.
        CRITICAL RULE: If target_color is None, color filtering is ignored!
        """
        if not target_query and not target_class and not target_color:
            return None

        # Parse target query if structured params not provided
        if target_query and not target_class and not target_color:
            parsed_cls, parsed_col = parse_target_query(target_query)
            target_class = parsed_cls
            target_color = parsed_col

        canonical_target = detector.normalize_class_name(target_class) if target_class else None
        required_hits = min_confirm_frames if min_confirm_frames is not None else self.min_confirm_frames

        matched_tracks = self.get_matching_tracks(
            target_class=target_class,
            target_color=target_color,
            min_confirm_frames=min_confirm_frames,
        )

        # Default policy (Section 4): latest target observation across matching target tracks
        return matched_tracks[0] if matched_tracks else None

    def get_matching_tracks(
        self,
        target_class: Optional[str] = None,
        target_color: Optional[str] = None,
        min_confirm_frames: Optional[int] = None,
    ) -> List[TrackSummary]:
        """
        Returns all confirmed tracks matching the target class and optional color filter,
        sorted by last_seen_s DESCENDING (latest observed track first).
        """
        canonical_target = detector.normalize_class_name(target_class) if target_class else None
        required_hits = min_confirm_frames if min_confirm_frames is not None else self.min_confirm_frames
        matched: List[TrackSummary] = []

        for summary in self.get_tracks():
            matching_hits = 0
            for d in summary.detections:
                class_ok = True
                if canonical_target:
                    class_ok = detector.is_match(d.class_name, canonical_target)
                color_ok = True
                if target_color:
                    color_ok = is_color_match(
                        d.dominant_color or summary.dominant_color,
                        target_color,
                        d.secondary_colors or summary.secondary_colors
                    )
                if class_ok and color_ok:
                    matching_hits += 1

            summary_class_ok = True
            if canonical_target:
                summary_class_ok = detector.is_match(summary.class_name, canonical_target)
            summary_color_ok = True
            if target_color:
                summary_color_ok = is_color_match(summary.dominant_color, target_color, summary.secondary_colors)

            if matching_hits >= required_hits or (summary_class_ok and summary_color_ok and summary.total_detections >= required_hits):
                if canonical_target:
                    summary.class_name = canonical_target
                matched.append(summary)

        # Sort by last seen timestamp descending (Section 4 & 13)
        matched.sort(key=lambda t: (t.last_seen_s, t.confidence), reverse=True)
        return matched

# Singleton Tracker instance
tracker_manager = ByteTrackerManager()
