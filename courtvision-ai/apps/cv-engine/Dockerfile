# ── Stage 1: Dependencies ──────────────────────────────────────
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM python:3.11-slim

# System deps: OpenCV + FFmpeg (audio extraction)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Pre-download YOLOv8s model at build time (MUST succeed, no || true)
RUN python -c "\
from ultralytics import YOLO; \
import os; \
m = YOLO('yolov8s.pt'); \
assert os.path.exists('yolov8s.pt') or os.path.exists(os.path.expanduser('~/.cache/ultralytics')), \
    'YOLOv8s model download failed'; \
print('YOLOv8s model downloaded successfully')"

# Pre-download MediaPipe BlazePose model at build time
RUN python -c "\
import mediapipe as mp; \
import numpy as np; \
pose = mp.solutions.pose.Pose(static_image_mode=True, model_complexity=1); \
pose.process(np.zeros((480,640,3), dtype=np.uint8)); \
pose.close(); \
print('MediaPipe BlazePose model downloaded successfully')"

COPY . .

# Env defaults
ENV CV_WORKERS=2
ENV YOLO_MODEL=yolov8s.pt

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request, json; r=json.loads(urllib.request.urlopen('http://localhost:8000/health').read()); exit(0 if r.get('models_ready') else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
