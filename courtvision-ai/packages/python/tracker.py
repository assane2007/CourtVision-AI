#!/usr/bin/env python3
"""
CourtVision AI — Video Tracking Pipeline
=========================================
Processes extracted video frames to detect and track:
  1. Player poses (MediaPipe Pose — 33 landmarks per person)
  2. Basketball detection (YOLOv8 — pretrained COCO "sports ball")
  3. Multi-object tracking (ByteTrack via ultralytics)

Usage:
  python tracker.py --frames-dir /path/to/frames --output json
  python tracker.py --frames-dir /path/to/frames --output jsonl --out-file results.jsonl

Output format matches the TypeScript TrackingResult[] interface expected by
packages/ai/src/tracking.ts::runPythonTracker().
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np

# ── MediaPipe Pose ──────────────────────────────────────────────

try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

# ── Ultralytics (YOLO) ─────────────────────────────────────────

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


# ── Data classes matching TypeScript interfaces ─────────────────

@dataclass
class Landmark:
    x: float
    y: float
    z: float
    visibility: float


@dataclass
class BBox:
    x: float
    y: float
    w: float
    h: float


@dataclass
class BallDetection:
    x: float
    y: float
    confidence: float
    radius: float


@dataclass
class TrackedPlayer:
    id: int
    landmarks: List[Landmark]
    bbox: BBox
    confidence: float
    jerseyNumber: Optional[str] = None


@dataclass
class TrackingResult:
    frameIndex: int
    timestamp: float
    players: List[TrackedPlayer]
    ballPosition: Optional[BallDetection]
    mainUserId: int = 0


# ── ByteTrack-style simple tracker ─────────────────────────────

class SimpleTracker:
    """Lightweight IoU-based tracker (replaces full ByteTrack when lap unavailable)."""

    def __init__(self, iou_threshold: float = 0.3, max_age: int = 30):
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.tracks: dict[int, dict] = {}
        self.next_id = 1
        self.frame_count = 0

    @staticmethod
    def _iou(a: BBox, b: BBox) -> float:
        xa = max(a.x, b.x)
        ya = max(a.y, b.y)
        xb = min(a.x + a.w, b.x + b.w)
        yb = min(a.y + a.h, b.y + b.h)
        inter = max(0, xb - xa) * max(0, yb - ya)
        area_a = a.w * a.h
        area_b = b.w * b.h
        union = area_a + area_b - inter
        return inter / union if union > 0 else 0.0

    def update(self, detections: list[BBox]) -> list[int]:
        """Returns track IDs for each detection (in same order)."""
        self.frame_count += 1
        assigned_ids = [0] * len(detections)
        used_tracks = set()

        # Greedy matching by highest IoU
        pairs = []
        for di, det in enumerate(detections):
            for tid, trk in self.tracks.items():
                iou = self._iou(det, trk["bbox"])
                if iou > self.iou_threshold:
                    pairs.append((iou, di, tid))
        pairs.sort(reverse=True)

        matched_dets = set()
        for iou, di, tid in pairs:
            if di in matched_dets or tid in used_tracks:
                continue
            assigned_ids[di] = tid
            self.tracks[tid] = {"bbox": detections[di], "age": 0}
            matched_dets.add(di)
            used_tracks.add(tid)

        # Create new tracks for unmatched detections
        for di in range(len(detections)):
            if di not in matched_dets:
                tid = self.next_id
                self.next_id += 1
                assigned_ids[di] = tid
                self.tracks[tid] = {"bbox": detections[di], "age": 0}

        # Age out old tracks
        to_remove = []
        for tid in self.tracks:
            if tid not in used_tracks:
                self.tracks[tid]["age"] += 1
                if self.tracks[tid]["age"] > self.max_age:
                    to_remove.append(tid)
        for tid in to_remove:
            del self.tracks[tid]

        return assigned_ids


# ── Pose estimation ─────────────────────────────────────────────

def detect_poses(image: np.ndarray, pose_model) -> list[tuple[list[Landmark], BBox, float]]:
    """Run MediaPipe Pose on a single image. Returns list of (landmarks, bbox, confidence)."""
    results = []
    h, w = image.shape[:2]
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    out = pose_model.process(rgb)

    if out.pose_landmarks:
        lms = out.pose_landmarks.landmark
        landmarks = [
            Landmark(x=lm.x * w, y=lm.y * h, z=lm.z, visibility=lm.visibility)
            for lm in lms
        ]
        # Compute bounding box from landmarks
        xs = [lm.x * w for lm in lms if lm.visibility > 0.3]
        ys = [lm.y * h for lm in lms if lm.visibility > 0.3]
        if xs and ys:
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            pad = 10
            bbox = BBox(
                x=max(0, x_min - pad),
                y=max(0, y_min - pad),
                w=min(w, x_max - x_min + 2 * pad),
                h=min(h, y_max - y_min + 2 * pad),
            )
            avg_vis = sum(lm.visibility for lm in lms) / len(lms)
            results.append((landmarks, bbox, avg_vis))

    return results


# ── Ball detection ──────────────────────────────────────────────

def detect_ball(image: np.ndarray, yolo_model) -> Optional[BallDetection]:
    """Detect basketball using YOLOv8. COCO class 32 = 'sports ball'."""
    results = yolo_model(image, verbose=False, conf=0.3)
    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            if cls == 32:  # sports ball
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                radius = max(x2 - x1, y2 - y1) / 2
                return BallDetection(
                    x=float(cx), y=float(cy),
                    confidence=float(box.conf[0]),
                    radius=float(radius),
                )
    return None


# ── Orange-color fallback ball detector ─────────────────────────

def detect_ball_by_color(image: np.ndarray) -> Optional[BallDetection]:
    """Fallback ball detection using orange color segmentation + contour analysis."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    # Orange range for basketball
    lower = np.array([5, 100, 100])
    upper = np.array([25, 255, 255])
    mask = cv2.inRange(hsv, lower, upper)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best: Optional[BallDetection] = None
    best_score = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 200 or area > 50000:
            continue
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter ** 2)
        if circularity < 0.5:
            continue
        (cx, cy), radius = cv2.minEnclosingCircle(cnt)
        score = circularity * area
        if score > best_score:
            best_score = score
            best = BallDetection(
                x=float(cx), y=float(cy),
                confidence=float(min(circularity, 0.95)),
                radius=float(radius),
            )

    return best


# ── Main player identification ──────────────────────────────────

def identify_main_player(frames: list[TrackingResult]) -> int:
    """The player most frequently closest to the ball is the main user."""
    proximity: dict[int, float] = {}
    for frame in frames:
        if frame.ballPosition is None:
            continue
        bx, by = frame.ballPosition.x, frame.ballPosition.y
        for player in frame.players:
            cx = player.bbox.x + player.bbox.w / 2
            cy = player.bbox.y + player.bbox.h / 2
            dist = ((cx - bx) ** 2 + (cy - by) ** 2) ** 0.5
            proximity[player.id] = proximity.get(player.id, 0) + 1 / (1 + dist)

    if not proximity:
        return 0
    return max(proximity, key=proximity.get)


# ── Pipeline ────────────────────────────────────────────────────

def run_tracking(frames_dir: str, fps: float = 30.0) -> list[TrackingResult]:
    """Full tracking pipeline over a directory of extracted JPEG frames."""
    frames_path = Path(frames_dir)
    frame_files = sorted(
        f for f in frames_path.iterdir()
        if f.suffix.lower() in ('.jpg', '.jpeg', '.png')
    )

    if not frame_files:
        print(f"[tracker] No frames found in {frames_dir}", file=sys.stderr)
        return []

    print(f"[tracker] Processing {len(frame_files)} frames from {frames_dir}", file=sys.stderr)

    # Initialize models
    pose_model = None
    if MEDIAPIPE_AVAILABLE:
        pose_model = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        print("[tracker] MediaPipe Pose loaded", file=sys.stderr)
    else:
        print("[tracker] WARNING: MediaPipe not available — no pose estimation", file=sys.stderr)

    yolo_model = None
    if YOLO_AVAILABLE:
        yolo_model = YOLO("yolov8n.pt")  # Downloads automatically on first run
        print("[tracker] YOLOv8n loaded", file=sys.stderr)
    else:
        print("[tracker] WARNING: YOLO not available — using color-based ball detection", file=sys.stderr)

    tracker = SimpleTracker(iou_threshold=0.3, max_age=15)
    results: list[TrackingResult] = []

    for idx, frame_file in enumerate(frame_files):
        image = cv2.imread(str(frame_file))
        if image is None:
            continue

        # 1. Pose detection
        players: list[TrackedPlayer] = []
        if pose_model:
            poses = detect_poses(image, pose_model)
            if poses:
                bboxes = [p[1] for p in poses]
                track_ids = tracker.update(bboxes)
                for (landmarks, bbox, conf), tid in zip(poses, track_ids):
                    players.append(TrackedPlayer(
                        id=tid,
                        landmarks=landmarks,
                        bbox=bbox,
                        confidence=conf,
                    ))

        # 2. Ball detection
        ball: Optional[BallDetection] = None
        if yolo_model:
            ball = detect_ball(image, yolo_model)
        if ball is None:
            ball = detect_ball_by_color(image)

        results.append(TrackingResult(
            frameIndex=idx,
            timestamp=idx / fps,
            players=players,
            ballPosition=ball,
            mainUserId=0,
        ))

        # Progress log every 100 frames
        if (idx + 1) % 100 == 0:
            print(f"[tracker] Processed {idx + 1}/{len(frame_files)} frames", file=sys.stderr)

    # Release pose model
    if pose_model:
        pose_model.close()

    # Post-process: identify main player
    main_id = identify_main_player(results)
    for frame in results:
        frame.mainUserId = main_id

    print(f"[tracker] Done. {len(results)} frames, main player ID={main_id}", file=sys.stderr)
    return results


# ── Serialization ───────────────────────────────────────────────

def to_dict(result: TrackingResult) -> dict:
    """Convert dataclass to dict matching TypeScript interface."""
    d = {
        "frameIndex": result.frameIndex,
        "timestamp": result.timestamp,
        "mainUserId": result.mainUserId,
        "ballPosition": asdict(result.ballPosition) if result.ballPosition else None,
        "players": [
            {
                "id": p.id,
                "jerseyNumber": p.jerseyNumber,
                "landmarks": [asdict(lm) for lm in p.landmarks],
                "bbox": asdict(p.bbox),
                "confidence": p.confidence,
            }
            for p in result.players
        ],
    }
    return d


# ── CLI ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="CourtVision AI Tracker")
    parser.add_argument("--frames-dir", required=True, help="Path to directory of extracted frames")
    parser.add_argument("--output", choices=["json", "jsonl"], default="json", help="Output format")
    parser.add_argument("--out-file", default=None, help="Write output to file instead of stdout")
    parser.add_argument("--fps", type=float, default=30.0, help="Video FPS for timestamp calc")
    args = parser.parse_args()

    if not os.path.isdir(args.frames_dir):
        print(f"Error: {args.frames_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    results = run_tracking(args.frames_dir, fps=args.fps)

    # Serialize
    if args.output == "json":
        output = json.dumps([to_dict(r) for r in results], separators=(",", ":"))
    else:  # jsonl
        output = "\n".join(json.dumps(to_dict(r), separators=(",", ":")) for r in results)

    if args.out_file:
        with open(args.out_file, "w") as f:
            f.write(output)
        print(f"[tracker] Output written to {args.out_file}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
