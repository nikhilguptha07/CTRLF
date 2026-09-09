import cv2
from ultralytics import YOLO
from app.tracker import ByteTrackerManager
from app.detector import detector
from app.video_processor import video_processor
from app.schemas import VideoProcessRequest

video_path = r"C:\Users\nikhi\Downloads\WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4"

print("--- Running Full Video (227 frames) with VideoProcessor ---")
req = VideoProcessRequest(
    video_path=video_path,
    target_query="bottle",
    target_class="bottle",
    target_color=None,
    sample_fps=30.0,  # every frame
    confidence_threshold=0.20,
    max_frames=300,
    early_exit_on_target=False,
)

res = video_processor.process_video(req)
print(f"Status: {res.status}")
print(f"Target found: {res.target_found}")
print(f"Matches count: {res.matches_count}")
print(f"Total detections: {res.detections_count}")
print(f"Total tracks: {res.tracks_count}")
print(f"Matched track ID: {res.matched_track_id}")
if res.last_target_observation:
    lo = res.last_target_observation
    print(f"Last Target Observation: frame={lo.frame_number}, time={lo.timestamp_s}s, class={lo.class_name}, conf={lo.confidence}, bbox={lo.bbox.dict()}, track_id={lo.track_id}")
if res.evidence_frames:
    print(f"Evidence frames count: {len(res.evidence_frames)}")
    for ef in res.evidence_frames:
        print(f"  Evidence path: {ef}")
