# ====================================================================
# CONTROL F — Python AI Service Dockerfile
# YOLOv8 Object Detection & ByteTrack Visual Tracking
# ====================================================================

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and multimedia processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first to avoid heavy CUDA bloat in production container
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/
COPY tests/ ./tests/

# Pre-download YOLOv8n weights into model cache to ensure zero-delay startup
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

ENV PORT=8000
ENV HOST=0.0.0.0
ENV MODEL_PATH=/app/yolov8n.pt

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
