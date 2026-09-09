import cv2
from ultralytics import YOLO
import sys

VIDEO_PATH = "C:/Users/nikhi/Downloads/WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4"
MODEL_PATH = "c:/Users/nikhi/Downloads/CTRLF2/yolov8n.pt"

print("Starting diagnostic test...", flush=True)
model = YOLO(MODEL_PATH)
cap = cv2.VideoCapture(VIDEO_PATH)

fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = total_frames / fps

print(f"Model: YOLOv8n, classes count: {len(model.names)}, bottle in model: {'bottle' in model.names.values()}", flush=True)
print(f"Video: {total_frames} frames, ~{fps:.2f} FPS, ~{duration:.2f} seconds, {w}x{h} portrait", flush=True)

# Read frames from 0.0s to 3.5s
max_frame_to_test = int(3.5 * fps)
frames = []
for i in range(max_frame_to_test):
    ret, frame = cap.read()
    if not ret:
        break
    frames.append((i, i / fps, frame))
cap.release()
print(f"Loaded {len(frames)} frames for evaluation.", flush=True)

# Test combinations of imgsz and conf
for imgsz in [640, 960, 1280]:
    for conf in [0.25, 0.20, 0.15, 0.10]:
        bottle_hits = []
        all_hits = []
        for frame_idx, t_sec, frame in frames:
            res = model(frame, imgsz=imgsz, conf=conf, verbose=False)
            boxes = res[0].boxes
            if boxes is not None and len(boxes) > 0:
                for b in boxes:
                    cls_id = int(b.cls[0].item())
                    cls_name = model.names[cls_id]
                    score = float(b.conf[0].item())
                    xyxy = [round(x, 1) for x in b.xyxy[0].tolist()]
                    hit = {
                        "frame": frame_idx,
                        "time": round(t_sec, 2),
                        "class": cls_name,
                        "cls_id": cls_id,
                        "conf": round(score, 3),
                        "bbox": xyxy
                    }
                    all_hits.append(hit)
                    if cls_name == "bottle":
                        bottle_hits.append(hit)
        
        print(f"--- [TEST] imgsz={imgsz}, conf={conf} ---", flush=True)
        print(f"Total detections: {len(all_hits)}, Bottle detections: {len(bottle_hits)}", flush=True)
        if bottle_hits:
            print(f"   First bottle: frame={bottle_hits[0]['frame']} time={bottle_hits[0]['time']}s conf={bottle_hits[0]['conf']} bbox={bottle_hits[0]['bbox']}", flush=True)
            print(f"   Last bottle:  frame={bottle_hits[-1]['frame']} time={bottle_hits[-1]['time']}s conf={bottle_hits[-1]['conf']} bbox={bottle_hits[-1]['bbox']}", flush=True)
            for bh in bottle_hits[:5]:
                print(f"      [BOTTLE MATCH] frame={bh['frame']} t={bh['time']}s conf={bh['conf']} bbox={bh['bbox']}", flush=True)
        else:
            # Print unique classes found
            classes_seen = set(h["class"] for h in all_hits)
            print(f"   No bottle. Other classes detected: {classes_seen}", flush=True)

