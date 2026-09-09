import os
import cv2
import numpy as np
from ultralytics import YOLO

video_path = r"C:\Users\nikhi\Downloads\WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4"
model_path = r"c:\Users\nikhi\Downloads\CTRLF2\yolov8n.pt"

print("Loading model...")
model = YOLO(model_path)
names = model.names
print(f"Loaded {len(names)} classes. Names sample: {list(names.items())[:10]}")
bottle_ids = [k for k, v in names.items() if v.lower() == 'bottle']
print(f"Bottle class mapping in model.names: IDs = {bottle_ids}")

cap = cv2.VideoCapture(video_path)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"Video specs: {w}x{h}, {fps:.2f} FPS, {total_frames} total frames, duration: {total_frames/fps:.2f}s")

# 1. DIAGNOSTIC MODE: Run on EVERY FRAME from 0s to 3.5s (frames 0 to int(3.5*fps))
max_diagnostic_frame = int(3.5 * fps)
print(f"\n=== DIAGNOSTIC MODE: Frames 0 to {max_diagnostic_frame} (0s to 3.5s) on conf=0.25, imgsz=640 ===")

frame_idx = 0
bottle_count_0_35 = 0
all_detections_log = []

while cap.isOpened() and frame_idx <= max_diagnostic_frame:
    ret, frame = cap.read()
    if not ret or frame is None:
        break

    time_s = frame_idx / fps
    results = model(frame, conf=0.25, imgsz=640, verbose=False)
    boxes = results[0].boxes

    if boxes is not None and len(boxes) > 0:
        for box in boxes:
            cls_id = int(box.cls[0].item())
            cls_name = names[cls_id]
            conf = float(box.conf[0].item())
            xyxy = [round(x, 2) for x in box.xyxy[0].tolist()]
            target_match = (cls_name.lower() == 'bottle')
            
            log_line = f"[YOLO] frame={frame_idx} time={time_s:.2f}s class={cls_name} classId={cls_id} conf={conf:.3f} bbox={xyxy} targetMatch={target_match}"
            all_detections_log.append(log_line)
            if target_match:
                bottle_count_0_35 += 1
                print(log_line)

    frame_idx += 1

cap.release()
print(f"\nFrames 0..{max_diagnostic_frame} completed. Total bottle hits at conf=0.25: {bottle_count_0_35}")

# 3. CHECK CONFIDENCE THRESHOLD (0.25, 0.20, 0.15, 0.10) on frames 0..105 (0..3.5s)
print("\n=== CONFIDENCE THRESHOLD COMPARISON (Frames 0..105, imgsz=640) ===")
for test_conf in [0.25, 0.20, 0.15, 0.10]:
    cap = cv2.VideoCapture(video_path)
    b_count = 0
    f_idx = 0
    first_b = None
    last_b = None
    while cap.isOpened() and f_idx <= max_diagnostic_frame:
        ret, frame = cap.read()
        if not ret:
            break
        res = model(frame, conf=test_conf, imgsz=640, verbose=False)
        for b in res[0].boxes:
            c_name = names[int(b.cls[0].item())]
            if c_name.lower() == 'bottle':
                b_count += 1
                if first_b is None:
                    first_b = (f_idx, f_idx/fps, float(b.conf[0].item()))
                last_b = (f_idx, f_idx/fps, float(b.conf[0].item()))
        f_idx += 1
    cap.release()
    print(f"conf={test_conf:.2f} -> Bottle Detections: {b_count} | First: {first_b} | Last: {last_b}")

# 4. INFERENCE RESOLUTION COMPARISON (imgsz=640, 960, 1280) at conf=0.25 on frames 0..105
print("\n=== RESOLUTION COMPARISON (Frames 0..105, conf=0.25) ===")
for test_sz in [640, 960, 1280]:
    cap = cv2.VideoCapture(video_path)
    b_count = 0
    f_idx = 0
    first_b = None
    last_b = None
    while cap.isOpened() and f_idx <= max_diagnostic_frame:
        ret, frame = cap.read()
        if not ret:
            break
        res = model(frame, conf=0.25, imgsz=test_sz, verbose=False)
        for b in res[0].boxes:
            c_name = names[int(b.cls[0].item())]
            if c_name.lower() == 'bottle':
                b_count += 1
                if first_b is None:
                    first_b = (f_idx, f_idx/fps, float(b.conf[0].item()))
                last_b = (f_idx, f_idx/fps, float(b.conf[0].item()))
        f_idx += 1
    cap.release()
    print(f"imgsz={test_sz} -> Bottle Detections: {b_count} | First: {first_b} | Last: {last_b}")
