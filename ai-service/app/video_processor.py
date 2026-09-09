import os
import cv2
import time
import uuid
import logging
from typing import List, Optional, Tuple, Set, Dict, Any

logger = logging.getLogger(__name__)
from .detector import detector
from .tracker import ByteTrackerManager
from .config import settings
from .exceptions import InvalidVideoError, VideoProcessingError, UnsupportedTargetError
from .color_analyzer import color_analyzer, is_color_match, parse_target_query, normalize_color
from .schemas import (
    VideoProcessRequest,
    VideoProcessResponse,
    DetectionItem,
    BoundingBox,
    TrackSummary,
    EvidenceItem,
    VideoMetadataResponse,
    JobProgressResponse,
)

class VideoProcessor:
    def __init__(self):
        self.evidence_dir = os.path.join(settings.STORAGE_DIR, "evidence")
        os.makedirs(self.evidence_dir, exist_ok=True)
        self.cancellation_tokens: Set[str] = set()
        self.active_progress: Dict[str, JobProgressResponse] = {}

    def cancel_session(self, session_id: str) -> bool:
        """Register a cancellation request for an active processing session."""
        if not session_id:
            return False
        self.cancellation_tokens.add(session_id)
        if session_id in self.active_progress:
            self.active_progress[session_id].status = "CANCELLED"
        return True

    def is_cancelled(self, session_id: Optional[str]) -> bool:
        return bool(session_id and session_id in self.cancellation_tokens)

    def get_progress(self, session_id: str) -> Optional[JobProgressResponse]:
        return self.active_progress.get(session_id)

    def extract_video_metadata(self, video_path: str) -> VideoMetadataResponse:
        """Probe video file and extract genuine dimensional and temporal metadata."""
        if not os.path.exists(video_path):
            return VideoMetadataResponse(
                video_path=video_path,
                is_readable=False,
                error_message=f"File does not exist: {video_path}",
            )
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return VideoMetadataResponse(
                video_path=video_path,
                is_readable=False,
                error_message="OpenCV could not open video stream (file may be empty or corrupted)",
            )
        try:
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration_s = frame_count / fps if fps > 0 else 0.0
            fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
            codec = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)]).strip()
            is_valid = width > 0 and height > 0 and frame_count > 0
            return VideoMetadataResponse(
                video_path=video_path,
                is_readable=is_valid,
                width=width,
                height=height,
                fps=round(fps, 2),
                frame_count=frame_count,
                duration_seconds=round(duration_s, 2),
                codec=codec or "unknown",
                error_message=None if is_valid else "Video has zero frames or invalid dimensions",
            )
        finally:
            cap.release()

    def draw_evidence_pair(
        self,
        frame,
        detection: DetectionItem,
    ) -> Tuple[str, str, str]:
        """
        Saves both:
        1. Pristine original frame (untouched)
        2. Annotated visualization frame (bounding box, label, color, track ID, confidence)
        Returns (evidence_id, original_path, annotated_path).
        """
        evidence_id = str(uuid.uuid4())
        frame_idx = detection.frame_number

        # 1. Save pristine untouched original frame
        orig_filename = f"evidence_orig_{evidence_id}_{frame_idx}.jpg"
        orig_path = os.path.join(self.evidence_dir, orig_filename)
        cv2.imwrite(orig_path, frame)

        # 2. Draw optical detection bounding box and badge onto copy
        annotated = frame.copy()
        b = detection.bbox
        x1, y1 = int(b.x1), int(b.y1)
        x2, y2 = int(b.x2), int(b.y2)

        # Box in green
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (16, 240, 112), 2)

        conf_pct = detection.confidence * 100.0 if detection.confidence <= 1.0 else detection.confidence
        track_str = f"#{detection.track_id} " if detection.track_id is not None else ""
        col_str = f"{detection.dominant_color.upper()} " if (detection.dominant_color and detection.dominant_color != "UNKNOWN") else ""
        text = f"{col_str}{detection.class_name.upper()} {track_str}[{conf_pct:.1f}%]"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        thickness = 2
        (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)

        cv2.rectangle(annotated, (x1, max(0, y1 - th - 8)), (x1 + tw + 8, y1), (16, 240, 112), -1)
        cv2.putText(annotated, text, (x1 + 4, max(th + 2, y1 - 4)), font, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)

        annotated_filename = f"evidence_annotated_{evidence_id}_{frame_idx}.jpg"
        annotated_path = os.path.join(self.evidence_dir, annotated_filename)
        cv2.imwrite(annotated_path, annotated)

        return evidence_id, orig_path, annotated_path

    def draw_evidence_box(
        self,
        frame,
        detection: DetectionItem,
    ) -> str:
        """Backward-compatible helper returning single annotated evidence frame path."""
        _, _, annotated_path = self.draw_evidence_pair(frame, detection)
        return annotated_path

    def process_video(self, request: VideoProcessRequest) -> VideoProcessResponse:
        video_path = request.video_path
        session_id = request.session_id or str(uuid.uuid4())
        start_time = time.time()

        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        # Target class and color resolution
        target_class = request.target_class
        target_color = request.target_color
        if not target_class and not target_color:
            target_class, target_color = parse_target_query(request.target_query)

        if target_color:
            target_color = normalize_color(target_color)

        canonical_target = None
        if target_class:
            is_supported, canonical_target = detector.is_supported_target(target_class)
            if not is_supported:
                supported_names = [c.name for c in detector.get_supported_classes()]
                raise UnsupportedTargetError(target=target_class, supported_classes=supported_names)
        elif not target_color:
            is_supported, canonical_target = detector.is_supported_target(request.target_query)
            if not is_supported:
                supported_names = [c.name for c in detector.get_supported_classes()]
                raise UnsupportedTargetError(target=request.target_query, supported_classes=supported_names)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise InvalidVideoError(f"OpenCV failed to open video file: {video_path}")

        tracker = ByteTrackerManager(
            min_confirm_frames=request.min_confirm_frames or settings.MIN_CONFIRM_FRAMES
        )

        try:
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            if native_fps <= 0:
                native_fps = 30.0
            duration_s = total_frames / native_fps if total_frames > 0 else 0.0

            # Configurable frame sampling
            # For short videos (<= 15s or <= 450 frames) or early portion (<= 3.5s): process every frame without skipping
            is_short_video = (total_frames <= 450) or (duration_s <= 15.0)
            frame_interval = request.frame_interval or settings.FRAME_INTERVAL
            if is_short_video or (request.sample_fps and request.sample_fps >= 25.0):
                frame_interval = 1
            elif request.sample_fps and request.sample_fps > 0:
                frame_interval = max(1, int(round(native_fps / request.sample_fps)))

            max_frames = request.max_frames or 600

            all_detections: List[DetectionItem] = []
            matching_detections: List[DetectionItem] = []
            evidence_frames: List[str] = []
            evidence_items: List[EvidenceItem] = []

            # Store candidate frame buffers for evidence selection policy
            candidate_evidence_frames: List[Tuple[Any, DetectionItem]] = []

            frame_idx = 0
            processed_count = 0
            is_was_cancelled = False
            color_mismatch_observed = False

            # Initialize active progress record
            self.active_progress[session_id] = JobProgressResponse(
                session_id=session_id,
                status="PROCESSING",
                progress_percent=0.0,
                processed_frames=0,
                total_frames=total_frames,
                current_frame=0,
                current_timestamp=0.0,
                elapsed_seconds=0.0,
                target_query=request.target_query,
            )

            while cap.isOpened() and processed_count < max_frames:
                # Check cancellation token on each frame loop
                if self.is_cancelled(session_id):
                    is_was_cancelled = True
                    self.cancellation_tokens.discard(session_id)
                    break

                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                should_process = (frame_idx % frame_interval == 0) or ((frame_idx / native_fps) <= 3.5)
                if should_process:
                    timestamp_s = frame_idx / native_fps

                    # Step 1: Real YOLO model inference with aspect-preserving letterbox
                    conf_thresh = request.confidence_threshold if request.confidence_threshold is not None else settings.CONFIDENCE_THRESHOLD
                    raw_boxes = detector.infer_raw_boxes(frame, conf_thresh, imgsz=getattr(request, 'imgsz', 640))

                    # Step 2: Feed raw boxes to ByteTrack with frame for real color extraction
                    tracked_detections = tracker.update(
                        boxes_or_detections=raw_boxes,
                        frame_number=frame_idx,
                        timestamp_s=timestamp_s,
                        frame_shape=frame.shape[:2],
                        session_id=session_id,
                        camera_id=request.camera_id or "CAM-01",
                        frame=frame,
                    )
                    processed_count += 1

                    # Extract raw detections for all YOLO boxes so zero raw hits are lost
                    h, w = frame.shape[:2]
                    frame_raw_detections: List[DetectionItem] = []
                    if raw_boxes is not None and len(raw_boxes) > 0:
                        for box in raw_boxes:
                            cls_id = int(box.cls[0].item())
                            cls_name = detector.get_class_name(cls_id)
                            score = float(box.conf[0].item())
                            xyxy = box.xyxy[0].tolist()
                            rx1, ry1, rx2, ry2 = xyxy
                            x1 = max(0.0, min(float(rx1), float(w - 1)))
                            y1 = max(0.0, min(float(ry1), float(h - 1)))
                            x2 = max(x1 + 1.0, min(float(rx2), float(w)))
                            y2 = max(y1 + 1.0, min(float(ry2), float(h)))
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
                            # Find if ByteTrack assigned a track_id to this box
                            assigned_track_id = None
                            for td in tracked_detections:
                                if td.class_id == cls_id and abs(td.bbox.x1 - bbox.x1) < 20 and abs(td.bbox.y1 - bbox.y1) < 20:
                                    assigned_track_id = td.track_id
                                    break

                            color_res = color_analyzer.extract_object_color(frame, x1, y1, x2, y2)
                            frame_raw_detections.append(
                                DetectionItem(
                                    detection_id=str(uuid.uuid4()),
                                    class_id=cls_id,
                                    class_name=cls_name,
                                    confidence=round(score, 4),
                                    bbox=bbox,
                                    frame_number=frame_idx,
                                    timestamp_s=round(timestamp_s, 3),
                                    timestamp_ms=round(timestamp_s * 1000.0, 2),
                                    camera_id=request.camera_id or "CAM-01",
                                    session_id=session_id,
                                    track_id=assigned_track_id,
                                    dominant_color=color_res.dominant_color if color_res else "UNKNOWN",
                                    color_confidence=color_res.color_confidence if color_res else 0.0,
                                    secondary_colors=color_res.secondary_colors if color_res else [],
                                )
                            )

                    current_detections = tracked_detections if tracked_detections else frame_raw_detections
                    all_detections.extend(current_detections)

                    # Step 3: Match against target query (class AND optional color)
                    for det in current_detections:
                        cls_match = True
                        if canonical_target:
                            cls_match = detector.is_match(det.class_name, canonical_target)

                        col_match = True
                        if target_color:
                            col_match = is_color_match(det.dominant_color, target_color, det.secondary_colors)

                        if cls_match and not col_match:
                            color_mismatch_observed = True

                        if cls_match and col_match:
                            matching_detections.append(det)
                            # Keep candidate frames for evidence selection policy
                            candidate_evidence_frames.append((frame.copy(), det))

                    # Early target confirmation check (disabled by default for full-video sequential tracking)
                    if getattr(request, 'early_exit_on_target', False):
                        min_req_frames = request.min_confirm_frames or settings.MIN_CONFIRM_FRAMES
                        candidate_track = tracker.confirm_target(
                            target_query=None,
                            min_confirm_frames=min_req_frames,
                            target_class=canonical_target,
                            target_color=target_color,
                        )
                        if candidate_track is not None and len(candidate_evidence_frames) >= min_req_frames:
                            logger.info(f"Target '{request.target_query}' confirmed early on frame {frame_idx} (Track #{candidate_track.track_id}). Exiting frame loop early.")
                            # Update progress to 100% since target is confirmed
                            self.active_progress[session_id] = JobProgressResponse(
                                session_id=session_id,
                                status="PROCESSING",
                                progress_percent=100.0,
                                processed_frames=processed_count,
                                total_frames=total_frames,
                                current_frame=frame_idx,
                                current_timestamp=round(timestamp_s, 2),
                                elapsed_seconds=round(time.time() - start_time, 2),
                                target_query=request.target_query,
                            )
                            break

                    # Update real-time progress state
                    pct = round((processed_count / total_frames) * 100.0, 1) if total_frames > 0 else 0.0
                    self.active_progress[session_id] = JobProgressResponse(
                        session_id=session_id,
                        status="PROCESSING",
                        progress_percent=min(99.0, pct),
                        processed_frames=processed_count,
                        total_frames=total_frames,
                        current_frame=frame_idx,
                        current_timestamp=round(timestamp_s, 2),
                        elapsed_seconds=round(time.time() - start_time, 2),
                        target_query=request.target_query,
                    )

                frame_idx += 1


            if is_was_cancelled:
                self.active_progress[session_id] = JobProgressResponse(
                    session_id=session_id,
                    status="CANCELLED",
                    progress_percent=round((processed_count / total_frames) * 100.0, 1) if total_frames > 0 else 0.0,
                    processed_frames=processed_count,
                    total_frames=total_frames,
                    current_frame=frame_idx,
                    current_timestamp=round(frame_idx / native_fps, 2),
                    elapsed_seconds=round(time.time() - start_time, 2),
                    target_query=request.target_query,
                )
                return VideoProcessResponse(
                    status="CANCELLED",
                    video_path=video_path,
                    total_frames=total_frames,
                    processed_frames=processed_count,
                    duration_seconds=round(duration_s, 2),
                    target_query=request.target_query,
                    target_found=False,
                    best_detection=None,
                    last_target_observation=None,
                    matched_track_id=None,
                    confirmed_track=None,
                    detections_count=len(all_detections),
                    matches_count=len(matching_detections),
                    tracks_count=len(tracker.get_tracks()),
                    evidence_frames=[],
                    evidence_items=[],
                    detections=[],
                    tracks=[],
                    matching_tracks=[],
                    errors=["Job was cancelled by operator."],
                )

            # Step 4: Multi-frame target confirmation & Last Known Position selection
            matching_tracks = tracker.get_matching_tracks(
                target_class=canonical_target,
                target_color=target_color,
                min_confirm_frames=request.min_confirm_frames or settings.MIN_CONFIRM_FRAMES,
            )

            # Multi-frame target confirmation & Last Known Position selection
            confirmed_track = matching_tracks[0] if matching_tracks else None
            target_found = (confirmed_track is not None) or (len(matching_detections) > 0)
            status = "COMPLETED" if target_found else "NO_MATCH"
            matched_track_id = confirmed_track.track_id if confirmed_track else (
                matching_detections[-1].track_id if (matching_detections and matching_detections[-1].track_id is not None) else None
            )

            # CRITICAL RULE (Section 2, 3, 10, 15):
            # Select the LAST VALID TARGET OBSERVATION in the video (Last Known Position)
            # DO NOT select first detection. DO NOT select peak confidence detection.
            last_target_observation: Optional[DetectionItem] = None
            if matching_detections:
                last_target_observation = max(matching_detections, key=lambda d: (d.timestamp_s, d.frame_number))
            elif confirmed_track and confirmed_track.detections:
                target_dets = [
                    d for d in confirmed_track.detections
                    if (not canonical_target or detector.is_match(d.class_name, canonical_target))
                    and (not target_color or is_color_match(d.dominant_color, target_color, d.secondary_colors))
                ]
                if target_dets:
                    last_target_observation = max(target_dets, key=lambda d: (d.timestamp_s, d.frame_number))
                else:
                    last_target_observation = max(confirmed_track.detections, key=lambda d: (d.timestamp_s, d.frame_number))

            # Step 5: Evidence Frame Generation for LAST KNOWN POSITION (Section 12)
            # Save the actual frame corresponding to the LAST target observation
            if candidate_evidence_frames and last_target_observation:
                # Find matching frame buffer for the last target observation
                last_pair = None
                for c_frame, c_det in reversed(candidate_evidence_frames):
                    if c_det.frame_number == last_target_observation.frame_number:
                        last_pair = (c_frame, c_det)
                        break

                if not last_pair:
                    last_pair = candidate_evidence_frames[-1]

                # Save the LAST SEEN frame as primary evidence
                ev_id, orig_path, annot_path = self.draw_evidence_pair(last_pair[0], last_target_observation)
                evidence_frames.append(annot_path)
                evidence_items.append(
                    EvidenceItem(
                        evidence_id=ev_id,
                        frame_number=last_target_observation.frame_number,
                        timestamp_s=last_target_observation.timestamp_s,
                        timestamp_ms=last_target_observation.timestamp_ms,
                        confidence=round(last_target_observation.confidence * 100.0, 1) if last_target_observation.confidence <= 1.0 else round(last_target_observation.confidence, 1),
                        track_id=last_target_observation.track_id,
                        class_name=last_target_observation.class_name,
                        original_path=orig_path,
                        annotated_path=annot_path,
                        selection_policy="last_known_position",
                        dominant_color=last_target_observation.dominant_color,
                        color_confidence=last_target_observation.color_confidence,
                    )
                )

                # Save up to 2 additional distinct candidate frames
                saved_frames_set = {last_target_observation.frame_number}
                for c_frame, c_det in reversed(candidate_evidence_frames):
                    if c_det.frame_number in saved_frames_set:
                        continue
                    saved_frames_set.add(c_det.frame_number)

                    ev_id, orig_path, annot_path = self.draw_evidence_pair(c_frame, c_det)
                    evidence_frames.append(annot_path)
                    evidence_items.append(
                        EvidenceItem(
                            evidence_id=ev_id,
                            frame_number=c_det.frame_number,
                            timestamp_s=c_det.timestamp_s,
                            timestamp_ms=c_det.timestamp_ms,
                            confidence=round(c_det.confidence * 100.0, 1) if c_det.confidence <= 1.0 else round(c_det.confidence, 1),
                            track_id=c_det.track_id,
                            class_name=c_det.class_name,
                            original_path=orig_path,
                            annotated_path=annot_path,
                            selection_policy="sequential_observation",
                            dominant_color=c_det.dominant_color,
                            color_confidence=c_det.color_confidence,
                        )
                    )
                    if len(evidence_items) >= 3:
                        break

            all_tracks = tracker.get_tracks()

            # Explanation if class was seen but color not confirmed
            processing_errors: List[str] = []
            if not target_found and color_mismatch_observed and target_color:
                processing_errors.append(f"Matching object found, but requested color {target_color} was not confirmed.")

            # Mark final progress record
            self.active_progress[session_id] = JobProgressResponse(
                session_id=session_id,
                status=status,
                progress_percent=100.0,
                processed_frames=processed_count,
                total_frames=total_frames,
                current_frame=frame_idx,
                current_timestamp=round(duration_s, 2),
                elapsed_seconds=round(time.time() - start_time, 2),
                target_query=request.target_query,
            )

            return VideoProcessResponse(
                status=status,
                video_path=video_path,
                total_frames=total_frames,
                processed_frames=processed_count,
                duration_seconds=round(duration_s, 2),
                target_query=request.target_query,
                target_found=target_found,
                best_detection=last_target_observation,
                last_target_observation=last_target_observation,
                matched_track_id=matched_track_id,
                confirmed_track=confirmed_track,
                detections_count=len(all_detections),
                matches_count=len(matching_detections),
                tracks_count=len(all_tracks),
                evidence_frames=evidence_frames,
                evidence_items=evidence_items,
                detections=matching_detections if target_found else all_detections[:50],
                tracks=all_tracks,
                matching_tracks=matching_tracks,
                errors=processing_errors,
            )
        finally:
            cap.release()

video_processor = VideoProcessor()
