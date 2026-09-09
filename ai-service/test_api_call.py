import requests

url = "http://localhost:8000/detect/video"
headers = {
    "Content-Type": "application/json",
    "X-Internal-Service-Key": "ctrlf_internal_service_key_2026_sec#"
}
data = {
    "video_path": r"C:\Users\nikhi\Downloads\WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4",
    "target_query": "bottle",
    "target_class": "bottle",
    "target_color": None,
    "confidence_threshold": 0.20,
    "sample_fps": 30.0
}

print(f"Calling {url}...")
resp = requests.post(url, json=data, headers=headers)
print(f"Response status: {resp.status_code}")
res_json = resp.json()
print("target_found:", res_json.get("target_found"))
print("status:", res_json.get("status"))
print("matches_count:", res_json.get("matches_count"))
print("detections_count:", res_json.get("detections_count"))
print("matched_track_id:", res_json.get("matched_track_id"))
lo = res_json.get("last_target_observation")
if lo:
    print(f"Last observation: frame={lo.get('frame_number')}, time={lo.get('timestamp_s')}s, conf={lo.get('confidence')}, bbox={lo.get('bbox')}, track_id={lo.get('track_id')}")
ef = res_json.get("evidence_frames")
print("Evidence frames:", ef)
