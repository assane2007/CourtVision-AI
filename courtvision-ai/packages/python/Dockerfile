# Dockerfile — CourtVision Python Tracker (MediaPipe + YOLOv8)
# Used by docker-compose and called from packages/ai/src/tracking.ts

FROM python:3.11-slim

# System deps for OpenCV + MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY packages/python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy tracker code
COPY packages/python/tracker.py .

# Pre-download YOLOv8 model on build (avoids runtime download)
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Models cached in /app/models volume mount
ENV YOLO_MODEL_PATH=/app/models/yolov8n.pt

ENTRYPOINT ["python", "tracker.py"]
