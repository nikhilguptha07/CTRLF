import cv2
import numpy as np
from ultralytics import YOLO
import sys

VIDEO_PATH = r"C:\Users\nikhi\Downloads\WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4"
MODEL_PATH = r"c:\Users\nikhi\Downloads\CTRLF2\yolov8n.pt"

print(f"Loading YOLO model from {MODEL_PATH}...")
model = YOLO(MODEL_PATH)
print("Model names:", model.names)
has_bottle = "bottle" in model.names.values()
bottle_id = [k for k, v in model.names.items() if v == "bottle"][0]
print(f"Model class map includes bottle: {'YES' if has_bottle else 'NO'} (class_id={bottle_id})")

cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    print("Failed to open video")
    sys.exit(1)

total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = total_frames / fps
print(f"Video: {total_frames} frames, ~{fps:.2f} FPS, ~{duration:.2f} seconds, {w}x{h}")

# Test matrix: combinations of imgsz and conf
test_configs = [
    {"imgsz": 640, "conf": 0.25},
    {"imgsz": 640, "conf": 0.20},
    {"imgsz": 640, "conf": 0.15},
    {"imgsz": 640, "conf": 0.10},
    {"imgsz": 960, "conf": 0.25},
    {"imgsz": 960, "conf": 0.20},
    {"imgsz": 960, "conf": 0.15},
    {"imgsz": 960, "conf": 0.10},
    {"imgsz": 1280, "conf": 0.25},
    {"imgsz": 1280, "conf": 0.20},
    {"imgsz": 1280, "conf": 0.15},
    {"imgsz": 1280, "conf": 0.10},
]

# Read first 3.5 seconds of frames (0 to ~105 frames)
frames_to_read = int(3.5 * fps)
frames = []
for i in range(frames_to_read):
    ret, frame = cap.read()
    if not ret:
        break
    frames.append((i, i / fps, frame))
cap.release()

print(f"Read {len(frames)} frames for 0.0s - 3.5s range.")

for cfg in test_configs:
    imgsz = cfg["imgsz"]
    conf = cfg["conf"]
    bottle_detections = []
    
    for frame_idx, timestamp_s, frame in frames:
        res = model(frame, imgsz=imgsz, conf=conf, verbose=False)
        boxes = res[0].boxes
        if boxes is not None and len(boxes) > 0:
            for b in boxes:
                cls_id = int(b.cls[0].item())
                cls_name = model.names[cls_id]
                score = float(b.conf[0].item())
                if cls_name == "bottle":
                    xyxy = [round(x, 1) for x in b.xyxy[0].tolist()]
                    bottle_detections.append({
                        "frame": frame_idx,
                        "time": round(timestamp_s, 2),
                        "conf": round(score, 3),
                        "bbox": xyxy
                    })
    
    print(f"Config imgsz={imgsz} conf={conf}: {len(bottle_detections)} bottle detections found across {len(frames)} frames")
    if bottle_detections:
        first = bottle_detections[0]
        last = bottle_detections[-1]
        print(f"   First: frame={first['frame']}, time={first['time']}s, conf={first['conf']}, bbox={first['bbox']}")
        print(f"   Last:  frame={last['frame']}, time={last['time']}s, conf={last['conf']}, bbox={last['bbox']}")

