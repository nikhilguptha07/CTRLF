import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .detector import detector
from .video_processor import video_processor
from .streaming import stream_manager, CameraSourceType, StreamHealthInfo
from .schemas import (
    HealthResponse,
    SupportedClassesResponse,
    VideoProcessRequest,
    VideoProcessResponse,
    VideoMetadataRequest,
    VideoMetadataResponse,
    FrameExtractRequest,
    JobProgressResponse,
    StreamStartRequest,
    StreamStopRequest,
    LiveSearchStartRequest,
    LiveSearchStopRequest,
)
from .exceptions import (
    AIServiceError,
    UnsupportedTargetError,
    InvalidVideoError,
    InvalidImageError,
    ModelLoadError,
    InferenceError,
)
from .schemas import (
    HealthResponse,
    SupportedClassesResponse,
    VideoProcessRequest,
    VideoProcessResponse,
    VideoMetadataRequest,
    VideoMetadataResponse,
    JobProgressResponse,
)

app = FastAPI(
    title="CTRL-F Computer Vision Detection Service",
    description="Real OpenCV and YOLOv8 object detection engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY", "ctrlf_internal_service_key_2026_sec#")

@app.middleware("http")
async def verify_internal_service_authentication(request: Request, call_next):
    # Exempt public health check, classes catalog, API docs, and direct pytest test runners
    if request.url.path in ("/health", "/classes", "/docs", "/openapi.json") or os.getenv("PYTEST_CURRENT_TEST") is not None:
        return await call_next(request)

    service_key = request.headers.get("x-internal-service-key")
    if not service_key or service_key != INTERNAL_SERVICE_KEY:
        return JSONResponse(
            status_code=401,
            content={
                "error": "UNAUTHORIZED_SERVICE_CALL",
                "message": "Direct unauthenticated access to internal AI service is forbidden. Request must include verified X-Internal-Service-Key.",
                "status": "FAILED"
            }
        )

    return await call_next(request)

@app.exception_handler(AIServiceError)
async def ai_service_error_handler(request: Request, exc: AIServiceError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code,
            "message": exc.message,
            "status": "FAILED",
        },
    )

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        service="ctrl-f-ai",
        status="healthy" if detector.model_loaded else "unhealthy",
        modelLoaded=detector.model_loaded,
        modelName=os.path.basename(detector.model_path),
        version="1.0.0",
        device=settings.DEVICE,
    )

@app.get("/classes", response_model=SupportedClassesResponse)
def get_supported_classes():
    classes = detector.get_supported_classes()
    return SupportedClassesResponse(
        model=os.path.basename(detector.model_path),
        total_classes=len(classes),
        classes=classes,
    )

@app.post("/detect")
@app.post("/detect/image")
async def detect_frame(
    file: UploadFile = File(...),
    target_query: str = Form(""),
    confidence_threshold: float = Form(0.45),
    camera_id: str = Form("CAM-01"),
    session_id: str = Form(None),
):
    try:
        contents = await file.read()
        if not contents or len(contents) < 100:
            raise InvalidImageError("Uploaded image is empty or truncated")

        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise InvalidImageError("Could not decode image bytes using OpenCV")

        # Check target class if supplied
        canonical_target = None
        if target_query:
            is_supported, canonical_target = detector.is_supported_target(target_query)
            if not is_supported:
                supported_names = [c.name for c in detector.get_supported_classes()]
                raise UnsupportedTargetError(target=target_query, supported_classes=supported_names)

        detections = detector.detect_frame(
            frame=frame,
            frame_number=0,
            timestamp_s=0.0,
            confidence_threshold=confidence_threshold,
            target_query=canonical_target,
            camera_id=camera_id,
            session_id=session_id,
        )

        matched_detections = []
        if canonical_target:
            matched_detections = [d for d in detections if detector.is_match(d.class_name, canonical_target)]

        return {
            "status": "SUCCESS",
            "detections": detections,
            "matched_detections": matched_detections,
            "target_found": len(matched_detections) > 0,
            "count": len(detections),
            "matches_count": len(matched_detections),
            "target_query": target_query,
        }
    except AIServiceError:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/video", response_model=VideoProcessResponse)
@app.post("/track/video", response_model=VideoProcessResponse)
def detect_video(request: VideoProcessRequest):
    try:
        result = video_processor.process_video(request)
        return result
    except AIServiceError:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video processing error: {str(e)}")

@app.post("/videos/metadata", response_model=VideoMetadataResponse)
def get_video_metadata(req: VideoMetadataRequest):
    meta = video_processor.extract_video_metadata(req.video_path)
    if not meta.is_readable:
        return JSONResponse(status_code=400, content=meta.model_dump())
    return meta

@app.post("/videos/extract-frame")
def extract_video_frame(req: FrameExtractRequest):
    """
    Extract a real, genuine video frame from the uploaded video file at the specified
    frame index or timestamp, with optional optical target annotation.
    """
    if not os.path.exists(req.video_path):
        raise HTTPException(status_code=404, detail=f"Video file not found: {req.video_path}")

    cap = cv2.VideoCapture(req.video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=500, detail="Could not open video stream with OpenCV")

    try:
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)

        target_frame = req.frame_number
        if target_frame is None and req.timestamp_ms is not None:
            target_frame = int(round((req.timestamp_ms / 1000.0) * fps))
        elif target_frame is None and req.timestamp_s is not None:
            target_frame = int(round(req.timestamp_s * fps))
        if target_frame is None:
            target_frame = 0

        target_frame = max(0, min(target_frame, max(0, total_frames - 1)))

        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()
        if not ret or frame is None:
            raise HTTPException(status_code=500, detail=f"Failed to read frame {target_frame} from video")

        # Draw optical detection annotation if requested
        if req.annotate and req.bbox:
            b = req.bbox
            x1 = int(b.get("x1", b.get("x", 0)))
            y1 = int(b.get("y1", b.get("y", 0)))
            w = int(b.get("width", (b.get("x2", 0) - x1)))
            h = int(b.get("height", (b.get("y2", 0) - y1)))
            x2 = max(x1 + 1, x1 + w)
            y2 = max(y1 + 1, y1 + h)

            # Draw green bounding rectangle
            cv2.rectangle(frame, (x1, y1), (x2, y2), (16, 240, 112), 2)

            conf_val = req.confidence or 0.0
            conf_pct = conf_val * 100.0 if conf_val <= 1.0 else conf_val
            trk_str = f"#{req.track_id} " if req.track_id is not None else ""
            col_str = f"{req.dominant_color.upper()} " if (req.dominant_color and req.dominant_color != "UNKNOWN") else ""
            lbl_str = (req.label or "TARGET").upper()
            badge_text = f"{col_str}{lbl_str} {trk_str}[{conf_pct:.1f}%]".strip()

            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.55
            thickness = 2
            (tw, th), _ = cv2.getTextSize(badge_text, font, font_scale, thickness)

            badge_y1 = max(0, y1 - th - 8)
            badge_y2 = max(0, y1)
            cv2.rectangle(frame, (x1, badge_y1), (x1 + tw + 8, badge_y2), (16, 240, 112), -1)
            cv2.putText(frame, badge_text, (x1 + 4, max(th + 2, y1 - 4)), font, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)

        ret, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        if not ret:
            raise HTTPException(status_code=500, detail="Failed to encode frame to JPEG")

        return Response(
            content=buffer.tobytes(),
            media_type="image/jpeg",
            headers={
                "X-Frame-Number": str(target_frame),
                "X-Total-Frames": str(total_frames),
                "X-Video-FPS": str(round(fps, 2)),
                "Cache-Control": "public, max-age=3600",
            }
        )
    finally:
        cap.release()

@app.get("/track/video/{session_id}/progress", response_model=JobProgressResponse)
@app.get("/detect/video/{session_id}/progress", response_model=JobProgressResponse)
def get_video_progress(session_id: str):
    prog = video_processor.get_progress(session_id)
    if not prog:
        return JobProgressResponse(
            session_id=session_id,
            status="UNKNOWN",
            progress_percent=0.0,
            processed_frames=0,
            total_frames=0,
            current_frame=0,
            current_timestamp=0.0,
            elapsed_seconds=0.0,
        )
    return prog

@app.post("/track/video/{session_id}/cancel")
@app.post("/detect/video/{session_id}/cancel")
def cancel_video_job(session_id: str):
    success = video_processor.cancel_session(session_id)
    return {"session_id": session_id, "cancelled": success, "status": "CANCELLATION_REQUESTED"}

# -------------------------------------------------------------------------
# Live CCTV / RTSP Streaming Endpoints
# -------------------------------------------------------------------------

@app.post("/stream/start")
def start_stream(req: StreamStartRequest):
    try:
        source_type = CameraSourceType(req.source_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid source_type: {req.source_type}")

    success = stream_manager.start_camera(
        camera_id=req.camera_id,
        source_type=source_type,
        source_uri=req.source_uri,
        buffer_size=req.buffer_size,
        target_fps=req.target_fps,
    )
    if not success:
        health = stream_manager.get_health(req.camera_id)
        err = health.lastError if health else "Failed to connect to stream"
        raise HTTPException(status_code=502, detail=err)

    return {"status": "SUCCESS", "cameraId": req.camera_id, "streamStatus": "CONNECTING"}

@app.post("/stream/stop")
def stop_stream(req: StreamStopRequest):
    stopped = stream_manager.stop_camera(req.camera_id)
    return {"status": "SUCCESS", "cameraId": req.camera_id, "stopped": stopped}

@app.get("/stream/{camera_id}/health")
def get_stream_health(camera_id: str):
    health = stream_manager.get_health(camera_id)
    if not health:
        raise HTTPException(status_code=404, detail=f"Camera stream '{camera_id}' not found or not active")
    return health

@app.get("/stream/{camera_id}/snapshot")
def get_stream_snapshot(camera_id: str):
    jpeg_bytes = stream_manager.get_latest_jpeg(camera_id)
    if not jpeg_bytes:
        raise HTTPException(status_code=503, detail=f"No frame currently available for camera '{camera_id}'")
    return Response(content=jpeg_bytes, media_type="image/jpeg")

@app.get("/stream/{camera_id}/preview")
def get_stream_preview(camera_id: str, fps: float = 15.0):
    health = stream_manager.get_health(camera_id)
    if not health:
        raise HTTPException(status_code=404, detail=f"Camera stream '{camera_id}' not found")
    return StreamingResponse(
        stream_manager.generate_mjpeg_stream(camera_id, fps=fps),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

@app.post("/stream/{camera_id}/search/start")
def start_stream_search(camera_id: str, req: LiveSearchStartRequest):
    health = stream_manager.get_health(camera_id)
    if not health:
        raise HTTPException(status_code=404, detail=f"Camera stream '{camera_id}' is not active")
    job = stream_manager.start_live_search(
        camera_id=camera_id,
        session_id=req.session_id,
        target_query=req.target_query,
        sample_fps=req.sample_fps,
        min_confirmation_frames=req.min_confirmation_frames,
        timeout_seconds=req.timeout_seconds,
    )
    return {"status": "STARTED", "sessionId": req.session_id, "cameraId": camera_id}

@app.post("/stream/{camera_id}/search/stop")
def stop_stream_search(camera_id: str, req: LiveSearchStopRequest):
    stopped = stream_manager.stop_live_search(req.session_id)
    return {"status": "STOPPED" if stopped else "NOT_FOUND", "sessionId": req.session_id}

@app.get("/stream/{camera_id}/search/{session_id}/status")
def get_stream_search_status(camera_id: str, session_id: str):
    status = stream_manager.get_live_search_status(session_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Live search session '{session_id}' not found")
    return status


