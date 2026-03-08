"""
CourtVision AI — CV Engine v3.0
Production basketball highlight detection pipeline.

Capabilities:
  1. YOLOv8 player + ball detection with ByteTrack
  2. MediaPipe BlazePose for biomechanics
  3. Shot attempt / make / miss / dunk detection
  4. Court zone classification (paint, mid-range, 3pt, corner)
  5. Audio spike detection (crowd reaction via FFmpeg + numpy)
  6. Highlight scoring with multi-signal fusion
  7. GPU acceleration (CUDA) with CPU fallback

Endpoints:
  GET  /health
  POST /analyze/video          — Legacy skeleton-only analysis
  POST /analyze/frame          — Single frame pose + YOLO
  POST /detect/highlights      — Full highlight detection pipeline
  GET  /job/{job_id}/status    — Job progress polling
  GET  /job/{job_id}/result    — Get completed result
"""

from __future__ import annotations

import asyncio
import cv2
import logging
import numpy as np
import os
import subprocess
import tempfile
import time
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ── Optional imports with graceful fallback ────────────────────

try:
    import mediapipe as mp

    mp_pose = mp.solutions.pose
    MEDIAPIPE_AVAILABLE = True
except (ImportError, AttributeError):
    MEDIAPIPE_AVAILABLE = False

try:
    from ultralytics import YOLO

    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

try:
    import torch

    GPU_AVAILABLE = torch.cuda.is_available()
    DEVICE = "cuda" if GPU_AVAILABLE else "cpu"
except ImportError:
    GPU_AVAILABLE = False
    DEVICE = "cpu"

# ── Logging ────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cv-engine")

# ── App ────────────────────────────────────────────────────────

app = FastAPI(
    title="CourtVision CV Engine",
    description="Production basketball computer vision pipeline — YOLOv8 + MediaPipe + Audio",
    version="3.0.0",
)

# Thread pool for CPU-bound work
executor = ThreadPoolExecutor(max_workers=int(os.getenv("CV_WORKERS", "2")))

# In-memory job store (production: swap for Redis)
jobs: Dict[str, dict] = {}

# ── Model lazy loaders ─────────────────────────────────────────

_yolo_model: Optional["YOLO"] = None


def get_yolo():
    """Lazy-load YOLOv8 model. Uses yolov8s (small) for accuracy over nano."""
    global _yolo_model
    if _yolo_model is None and YOLO_AVAILABLE:
        model_path = os.getenv("YOLO_MODEL", "yolov8s.pt")
        logger.info("Loading YOLOv8 model: %s on %s", model_path, DEVICE)
        _yolo_model = YOLO(model_path)
        if GPU_AVAILABLE:
            _yolo_model.to(DEVICE)
    return _yolo_model


# ═══════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════


class Point2D(BaseModel):
    x: float
    y: float
    confidence: float = 1.0


class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_id: int
    class_name: str
    track_id: Optional[int] = None


class Landmark3D(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class Skeleton(BaseModel):
    nose: Optional[Point2D] = None
    left_eye: Optional[Point2D] = None
    right_eye: Optional[Point2D] = None
    left_shoulder: Optional[Point2D] = None
    right_shoulder: Optional[Point2D] = None
    left_elbow: Optional[Point2D] = None
    right_elbow: Optional[Point2D] = None
    left_wrist: Optional[Point2D] = None
    right_wrist: Optional[Point2D] = None
    left_hip: Optional[Point2D] = None
    right_hip: Optional[Point2D] = None
    left_knee: Optional[Point2D] = None
    right_knee: Optional[Point2D] = None
    left_ankle: Optional[Point2D] = None
    right_ankle: Optional[Point2D] = None


class CourtZone(str, Enum):
    PAINT = "paint"
    RESTRICTED = "restricted"
    MIDRANGE = "midrange"
    CORNER3_LEFT = "corner3_left"
    CORNER3_RIGHT = "corner3_right"
    WING3_LEFT = "wing3_left"
    WING3_RIGHT = "wing3_right"
    TOP3 = "top3"


class EventType(str, Enum):
    SHOT_ATTEMPT = "shot_attempt"
    SHOT_MADE = "shot_made"
    SHOT_MISSED = "shot_missed"
    DUNK = "dunk"
    THREE_POINTER = "three_pointer"
    BLOCK = "block"
    CROWD_REACTION = "crowd_reaction"
    FAST_BREAK = "fast_break"


class DetectedEvent(BaseModel):
    event_type: EventType
    timestamp_sec: float
    end_sec: float
    confidence: float
    score: float  # highlight worthiness 0-100
    zone: Optional[CourtZone] = None
    description: str
    metadata: dict = {}


class FrameDetection(BaseModel):
    frame_index: int
    timestamp_sec: float
    players: List[BBox] = []
    ball: Optional[BBox] = None
    skeleton: Optional[Skeleton] = None
    landmarks_3d: Optional[List[Landmark3D]] = None
    elbow_angle: Optional[float] = None
    knee_angle: Optional[float] = None
    wrist_above_shoulder: bool = False
    ball_near_rim: bool = False


class HighlightResult(BaseModel):
    job_id: str
    events: List[DetectedEvent]
    total_duration_sec: float
    frames_analyzed: int
    fps: float
    resolution: Tuple[int, int]
    audio_spikes: List[float] = []
    processing_time_sec: float
    engine: str


class SingleFrameResult(BaseModel):
    landmarks_3d: Optional[List[Landmark3D]] = None
    skeleton: Optional[Skeleton] = None
    elbow_angle: Optional[float] = None
    knee_angle: Optional[float] = None
    players: List[BBox] = []
    ball: Optional[BBox] = None
    inference_ms: float
    success: bool


# ═══════════════════════════════════════════════════════════════
# GEOMETRY HELPERS
# ═══════════════════════════════════════════════════════════════


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle ABC in degrees."""
    ba = a - b
    bc = c - b
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    return float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))


def _lm_to_skeleton(lms, w: int, h: int) -> Skeleton:
    def pt(idx: int) -> Optional[Point2D]:
        lm = lms[idx]
        if lm.visibility > 0.3:
            return Point2D(x=lm.x * w, y=lm.y * h, confidence=lm.visibility)
        return None

    return Skeleton(
        nose=pt(0),
        left_eye=pt(2),
        right_eye=pt(5),
        left_shoulder=pt(11),
        right_shoulder=pt(12),
        left_elbow=pt(13),
        right_elbow=pt(14),
        left_wrist=pt(15),
        right_wrist=pt(16),
        left_hip=pt(23),
        right_hip=pt(24),
        left_knee=pt(25),
        right_knee=pt(26),
        left_ankle=pt(27),
        right_ankle=pt(28),
    )


def _lm_to_3d(lms) -> List[Landmark3D]:
    return [Landmark3D(x=l.x, y=l.y, z=l.z, visibility=l.visibility) for l in lms]


def _joint_angle(lms, a: int, b: int, c: int) -> Optional[float]:
    """Angle at joint b formed by a—b—c. Returns None if any landmark has low visibility."""
    try:
        if all(lms[i].visibility > 0.5 for i in (a, b, c)):
            va = np.array([lms[a].x, lms[a].y, lms[a].z])
            vb = np.array([lms[b].x, lms[b].y, lms[b].z])
            vc = np.array([lms[c].x, lms[c].y, lms[c].z])
            return _angle(va, vb, vc)
    except (IndexError, AttributeError):
        pass
    return None


def _wrist_above_shoulder(lms) -> bool:
    """True if either wrist is above its corresponding shoulder (shooting motion)."""
    try:
        # Right
        rw, rs = lms[16], lms[12]
        if rw.visibility > 0.5 and rs.visibility > 0.5 and rw.y < rs.y - 0.03:
            return True
        # Left
        lw, ls = lms[15], lms[11]
        if lw.visibility > 0.5 and ls.visibility > 0.5 and lw.y < ls.y - 0.03:
            return True
    except (IndexError, AttributeError):
        pass
    return False


# ═══════════════════════════════════════════════════════════════
# YOLO DETECTION
# ═══════════════════════════════════════════════════════════════

PERSON_CLS = 0
SPORTS_BALL_CLS = 32


def _detect_objects(frame: np.ndarray) -> Tuple[List[BBox], Optional[BBox]]:
    """Run YOLOv8 on a single frame. Returns (players, ball)."""
    model = get_yolo()
    if model is None:
        return [], None

    results = model.track(
        frame,
        persist=True,
        classes=[PERSON_CLS, SPORTS_BALL_CLS],
        conf=0.3,
        iou=0.5,
        verbose=False,
        device=DEVICE,
    )

    players: List[BBox] = []
    ball: Optional[BBox] = None

    if results and len(results) > 0:
        r = results[0]
        if r.boxes is not None:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                track_id = int(box.id[0]) if box.id is not None else None
                cls_name = "person" if cls_id == PERSON_CLS else "sports_ball"

                bbox = BBox(
                    x1=x1, y1=y1, x2=x2, y2=y2,
                    confidence=conf,
                    class_id=cls_id,
                    class_name=cls_name,
                    track_id=track_id,
                )
                if cls_id == PERSON_CLS:
                    players.append(bbox)
                elif cls_id == SPORTS_BALL_CLS and (ball is None or conf > ball.confidence):
                    ball = bbox

    return players, ball


# ═══════════════════════════════════════════════════════════════
# AUDIO SPIKE DETECTION
# ═══════════════════════════════════════════════════════════════


def _extract_audio_energy(
    video_path: str,
    window_sec: float = 0.5,
    sample_rate: int = 16000,
) -> List[Tuple[float, float]]:
    """
    Extract audio energy envelope: FFmpeg → raw PCM → RMS in windows.
    Returns [(timestamp_sec, rms_energy), ...].
    """
    audio_path = video_path + ".raw"
    try:
        cmd = [
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", str(sample_rate), "-ac", "1",
            "-f", "s16le", audio_path,
        ]
        subprocess.run(cmd, capture_output=True, timeout=120, check=False)

        if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 100:
            return []

        raw = np.fromfile(audio_path, dtype=np.int16).astype(np.float32) / 32768.0
        win = int(sample_rate * window_sec)
        hop = win // 2
        result: List[Tuple[float, float]] = []

        for i in range(0, len(raw) - win, hop):
            rms = float(np.sqrt(np.mean(raw[i : i + win] ** 2)))
            result.append((i / sample_rate, rms))

        return result
    except Exception as exc:
        logger.warning("Audio extraction failed: %s", exc)
        return []
    finally:
        try:
            os.unlink(audio_path)
        except OSError:
            pass


def _detect_audio_spikes(
    energy: List[Tuple[float, float]],
    threshold_mult: float = 2.5,
    cooldown_sec: float = 3.0,
) -> List[float]:
    """Energy spikes > mean + threshold_mult * std → crowd reaction timestamps."""
    if not energy:
        return []

    values = np.array([e for _, e in energy])
    threshold = float(np.mean(values) + threshold_mult * np.std(values))

    spikes: List[float] = []
    gate = 0.0
    for ts, e in energy:
        if e > threshold and ts > gate:
            spikes.append(ts)
            gate = ts + cooldown_sec

    return spikes


# ═══════════════════════════════════════════════════════════════
# COURT ZONE CLASSIFICATION
# ═══════════════════════════════════════════════════════════════


def _classify_zone(bx: float, by: float, w: int, h: int) -> CourtZone:
    """Heuristic court-zone from normalized ball position (broadcast-angle camera)."""
    nx, ny = bx / w, by / h

    if ny > 0.75 and 0.35 < nx < 0.65:
        return CourtZone.RESTRICTED
    if ny > 0.60 and 0.30 < nx < 0.70:
        return CourtZone.PAINT
    if ny > 0.55 and nx < 0.18:
        return CourtZone.CORNER3_LEFT
    if ny > 0.55 and nx > 0.82:
        return CourtZone.CORNER3_RIGHT
    if nx < 0.22:
        return CourtZone.WING3_LEFT
    if nx > 0.78:
        return CourtZone.WING3_RIGHT
    if ny < 0.45:
        return CourtZone.TOP3
    return CourtZone.MIDRANGE


_THREE_ZONES = frozenset({
    CourtZone.CORNER3_LEFT, CourtZone.CORNER3_RIGHT,
    CourtZone.WING3_LEFT, CourtZone.WING3_RIGHT,
    CourtZone.TOP3,
})


# ═══════════════════════════════════════════════════════════════
# SHOT / DUNK STATE MACHINE
# ═══════════════════════════════════════════════════════════════


@dataclass
class _ShotState:
    phase: str = "idle"  # idle → cocking → release → flight → resolved
    start_frame: int = 0
    start_sec: float = 0.0
    release_frame: int = 0
    release_sec: float = 0.0
    max_wrist_height: float = 1.0
    ball_positions: List[Tuple[float, float]] = field(default_factory=list)
    zone: Optional[CourtZone] = None
    elbow_at_release: Optional[float] = None
    is_dunk_candidate: bool = False
    frames_above_shoulder: int = 0
    flight_frames: int = 0
    ball_rising: bool = False
    ball_reached_peak: bool = False
    rim_proximity_frames: int = 0


class HighlightDetector:
    """
    Multi-signal highlight detector.
    Processes frames through a shot/dunk FSM, fuses audio spikes for scoring.
    """

    def __init__(self, fps: float, w: int, h: int):
        self.fps = fps
        self.w = w
        self.h = h
        self._ss = _ShotState()
        self.events: List[DetectedEvent] = []
        self.ball_history: deque = deque(maxlen=int(fps * 2))
        self.audio_spikes: List[float] = []
        # Approximate rim position (refined during analysis)
        self.rim_x = w * 0.50
        self.rim_y = h * 0.20

    # ── public ─────────────────────────────────────────────────

    def process_frame(self, det: FrameDetection) -> None:
        if det.ball:
            bx = (det.ball.x1 + det.ball.x2) / 2
            by = (det.ball.y1 + det.ball.y2) / 2
            self.ball_history.append((det.timestamp_sec, bx, by))
        self._advance_fsm(det)

    def inject_audio_spikes(self, spikes: List[float]) -> None:
        self.audio_spikes = spikes
        # Standalone crowd-reaction events for spikes far from any visual event
        for ts in spikes:
            overlaps = any(abs(e.timestamp_sec - ts) < 4.0 for e in self.events)
            if not overlaps:
                self.events.append(DetectedEvent(
                    event_type=EventType.CROWD_REACTION,
                    timestamp_sec=max(0, ts - 2.0),
                    end_sec=ts + 2.0,
                    confidence=0.6,
                    score=40.0,
                    description="Crowd reaction — possible exciting play",
                ))

    def get_highlights(self, min_score: float = 30.0, limit: int = 20) -> List[DetectedEvent]:
        out: List[DetectedEvent] = []
        for ev in sorted(self.events, key=lambda e: e.score, reverse=True):
            if ev.score < min_score:
                continue
            if any(abs(ev.timestamp_sec - o.timestamp_sec) < 3.0 for o in out):
                continue
            out.append(ev)
            if len(out) >= limit:
                break
        return sorted(out, key=lambda e: e.timestamp_sec)

    # ── FSM ────────────────────────────────────────────────────

    def _advance_fsm(self, det: FrameDetection) -> None:
        s = self._ss
        ts = det.timestamp_sec

        if s.phase == "idle":
            if det.wrist_above_shoulder:
                s.phase = "cocking"
                s.start_frame = det.frame_index
                s.start_sec = ts
                s.frames_above_shoulder = 1
                s.ball_positions.clear()
                s.is_dunk_candidate = False
                if det.ball:
                    bx = (det.ball.x1 + det.ball.x2) / 2
                    by = (det.ball.y1 + det.ball.y2) / 2
                    s.zone = _classify_zone(bx, by, self.w, self.h)

        elif s.phase == "cocking":
            if det.wrist_above_shoulder:
                s.frames_above_shoulder += 1
                if det.landmarks_3d and len(det.landmarks_3d) > 16:
                    s.max_wrist_height = min(s.max_wrist_height, det.landmarks_3d[16].y)
                if det.ball and det.ball_near_rim:
                    s.is_dunk_candidate = True
                if s.frames_above_shoulder >= 3:
                    s.phase = "release"
                    s.release_frame = det.frame_index
                    s.release_sec = ts
                    s.elbow_at_release = det.elbow_angle
            else:
                if s.frames_above_shoulder < 2:
                    self._reset()
                    return
                s.phase = "release"
                s.release_frame = det.frame_index
                s.release_sec = ts
                s.elbow_at_release = det.elbow_angle

        elif s.phase == "release":
            s.phase = "flight"
            s.flight_frames = 0
            s.ball_rising = False
            s.ball_reached_peak = False
            s.rim_proximity_frames = 0

        elif s.phase == "flight":
            s.flight_frames += 1
            if det.ball:
                bx = (det.ball.x1 + det.ball.x2) / 2
                by = (det.ball.y1 + det.ball.y2) / 2
                s.ball_positions.append((bx, by))
                if len(s.ball_positions) >= 2:
                    prev_y = s.ball_positions[-2][1]
                    if by < prev_y:
                        s.ball_rising = True
                    elif s.ball_rising and by > prev_y:
                        s.ball_reached_peak = True
                rim_dist = np.sqrt((bx - self.rim_x) ** 2 + (by - self.rim_y) ** 2)
                if rim_dist < self.h * 0.08:
                    s.rim_proximity_frames += 1
                if det.ball_near_rim:
                    s.rim_proximity_frames += 1

            max_flight = int(self.fps * 2.5)
            if s.flight_frames > max_flight:
                self._resolve("missed", 0.4)
            elif s.rim_proximity_frames >= 2:
                if s.ball_reached_peak or s.rim_proximity_frames >= 3:
                    self._resolve("made", 0.7)
                else:
                    self._resolve("missed", 0.5)
            elif s.flight_frames > int(self.fps * 1.5) and not det.ball:
                if s.ball_reached_peak and len(s.ball_positions) >= 3:
                    self._resolve("made", 0.5)
                else:
                    self._resolve("missed", 0.4)

    def _resolve(self, outcome: str, confidence: float) -> None:
        s = self._ss
        is_three = s.zone in _THREE_ZONES if s.zone else False
        zone_label = (s.zone.value.replace("_", " ") if s.zone else "midrange")

        if s.is_dunk_candidate and outcome == "made" and s.zone in (CourtZone.PAINT, CourtZone.RESTRICTED):
            ev_type, base, desc = EventType.DUNK, 90.0, "Dunk!"
        elif is_three and outcome == "made":
            ev_type, base = EventType.THREE_POINTER, 85.0
            desc = f"3-pointer from {zone_label}"
        elif outcome == "made":
            ev_type, base = EventType.SHOT_MADE, 60.0
            desc = f"Basket from {zone_label}"
        else:
            ev_type, base = EventType.SHOT_MISSED, 15.0
            desc = f"Shot attempt from {zone_label}"

        score = base * confidence
        if ev_type == EventType.DUNK:
            score = min(100, score + 15)
        if s.zone in (CourtZone.CORNER3_LEFT, CourtZone.CORNER3_RIGHT) and outcome == "made":
            score = min(100, score + 10)
        if s.elbow_at_release and abs(s.elbow_at_release - 90) < 15:
            score = min(100, score + 5)
            desc += " — great form"

        # Audio boost
        for spike_ts in self.audio_spikes:
            if abs(spike_ts - s.release_sec) < 3.0:
                score = min(100, score + 15)
                break

        pre_pad = 2.0 if ev_type == EventType.DUNK else 1.5
        post_pad = 2.0 if ev_type == EventType.DUNK else 1.0

        self.events.append(DetectedEvent(
            event_type=ev_type,
            timestamp_sec=max(0, s.start_sec - pre_pad),
            end_sec=s.release_sec + post_pad,
            confidence=confidence,
            score=round(score, 1),
            zone=s.zone,
            description=desc,
            metadata={
                "elbow_angle": round(s.elbow_at_release, 1) if s.elbow_at_release else None,
                "outcome": outcome,
                "flight_frames": s.flight_frames,
                "is_three": is_three,
                "trajectory_pts": len(s.ball_positions),
                "dunk_candidate": s.is_dunk_candidate,
            },
        ))
        self._reset()

    def _reset(self) -> None:
        self._ss = _ShotState()


# ═══════════════════════════════════════════════════════════════
# FULL PIPELINE
# ═══════════════════════════════════════════════════════════════


def _run_pipeline(
    video_path: str,
    job_id: str,
    frame_skip: int = 2,
    enable_audio: bool = True,
) -> HighlightResult:
    """
    Complete highlight detection pipeline (runs in thread pool).

    1. Open video → metadata
    2. Audio extraction → spike detection
    3. Per-frame: YOLOv8 + MediaPipe pose
    4. Shot/dunk FSM
    5. Fuse audio + visual → scored highlights
    """
    t0 = time.time()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Failed to open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps

    logger.info("[%s] Video: %d frames, %.1f fps, %dx%d, %.1f s", job_id, total_frames, fps, w, h, duration)
    jobs[job_id]["progress"] = 5

    # ── Audio ──────────────────────────────────────────────────
    audio_spikes: List[float] = []
    if enable_audio:
        energy = _extract_audio_energy(video_path)
        audio_spikes = _detect_audio_spikes(energy)
        logger.info("[%s] Audio: %d spikes detected", job_id, len(audio_spikes))
    jobs[job_id]["progress"] = 15

    # ── Detector ───────────────────────────────────────────────
    detector = HighlightDetector(fps, w, h)
    detector.inject_audio_spikes(audio_spikes)

    # ── Pose ───────────────────────────────────────────────────
    pose_ctx = None
    if MEDIAPIPE_AVAILABLE:
        pose_ctx = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    # ── Frame loop ─────────────────────────────────────────────
    fi = 0
    analyzed = 0
    max_fi = int(fps * 900)  # 15-min cap

    try:
        while cap.isOpened() and fi < max_fi:
            ret, frame = cap.read()
            if not ret:
                break

            if fi % frame_skip == 0:
                ts = fi / fps

                # YOLO
                players, ball = _detect_objects(frame)

                # Pose
                skeleton = None
                lm3d = None
                ea = None
                ka = None
                wrist_up = False

                if pose_ctx is not None:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pose_res = pose_ctx.process(rgb)
                    if pose_res.pose_landmarks:
                        lms = pose_res.pose_landmarks.landmark
                        skeleton = _lm_to_skeleton(lms, w, h)
                        lm3d = _lm_to_3d(lms)
                        ea = _joint_angle(lms, 12, 14, 16) or _joint_angle(lms, 11, 13, 15)
                        ka = _joint_angle(lms, 24, 26, 28)
                        wrist_up = _wrist_above_shoulder(lms)

                # Rim proximity
                ball_near_rim = False
                if ball:
                    bcx = (ball.x1 + ball.x2) / 2
                    bcy = (ball.y1 + ball.y2) / 2
                    ball_near_rim = np.sqrt((bcx - detector.rim_x) ** 2 + (bcy - detector.rim_y) ** 2) < h * 0.10

                det = FrameDetection(
                    frame_index=fi,
                    timestamp_sec=ts,
                    players=players,
                    ball=ball,
                    skeleton=skeleton,
                    landmarks_3d=lm3d,
                    elbow_angle=round(ea, 1) if ea else None,
                    knee_angle=round(ka, 1) if ka else None,
                    wrist_above_shoulder=wrist_up,
                    ball_near_rim=ball_near_rim,
                )
                detector.process_frame(det)
                analyzed += 1

            fi += 1
            if fi % 100 == 0:
                jobs[job_id]["progress"] = min(90, 15 + int(75 * fi / min(total_frames, max_fi)))
    finally:
        cap.release()
        if pose_ctx:
            pose_ctx.close()

    highlights = detector.get_highlights(min_score=25.0, limit=20)
    elapsed = time.time() - t0
    jobs[job_id]["progress"] = 100

    parts = []
    if YOLO_AVAILABLE:
        parts.append(f"yolov8-{DEVICE}")
    if MEDIAPIPE_AVAILABLE:
        parts.append("mediapipe")
    if enable_audio:
        parts.append("audio-spike")

    logger.info("[%s] Done: %d highlights in %.1f s", job_id, len(highlights), elapsed)

    return HighlightResult(
        job_id=job_id,
        events=highlights,
        total_duration_sec=round(duration, 2),
        frames_analyzed=analyzed,
        fps=fps,
        resolution=(w, h),
        audio_spikes=audio_spikes,
        processing_time_sec=round(elapsed, 2),
        engine="+".join(parts) or "fallback",
    )


# ═══════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "cv-engine",
        "version": "3.0.0",
        "capabilities": {
            "yolo": YOLO_AVAILABLE,
            "mediapipe": MEDIAPIPE_AVAILABLE,
            "gpu": GPU_AVAILABLE,
            "device": DEVICE,
        },
    }


@app.post("/detect/highlights")
async def detect_highlights(
    background_tasks: BackgroundTasks,
    video_file: UploadFile = File(...),
    frame_skip: int = Query(default=2, ge=1, le=10),
    enable_audio: bool = Query(default=True),
):
    """Upload video → async highlight detection. Poll /job/{id}/status."""
    ext = os.path.splitext(video_file.filename or "")[1].lower()
    if ext not in (".mp4", ".mov", ".avi", ".mkv", ".webm"):
        raise HTTPException(400, "Unsupported format. Use mp4/mov/avi/mkv/webm")

    content = await video_file.read()
    if len(content) < 1_000:
        raise HTTPException(400, "Video file too small")

    job_id = str(uuid.uuid4())
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    tmp.write(content)
    tmp_path = tmp.name
    tmp.close()

    jobs[job_id] = {"status": "processing", "progress": 0, "result": None, "error": None}

    async def _bg():
        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(executor, _run_pipeline, tmp_path, job_id, frame_skip, enable_audio)
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["result"] = result.model_dump()
        except Exception as exc:
            logger.error("[%s] Pipeline failed: %s", job_id, exc, exc_info=True)
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(exc)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    background_tasks.add_task(_bg)
    return {"job_id": job_id, "status": "processing"}


@app.get("/job/{job_id}/status")
def job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    j = jobs[job_id]
    return {"job_id": job_id, "status": j["status"], "progress": j["progress"], "error": j["error"]}


@app.get("/job/{job_id}/result")
def job_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    j = jobs[job_id]
    if j["status"] != "completed":
        raise HTTPException(409, f"Job not ready: {j['status']}")
    return j["result"]


@app.post("/analyze/video")
async def analyze_video_legacy(
    video_file: UploadFile = File(...),
    frame_skip: int = Query(default=3, ge=1, le=30),
    job_id: str = "",
):
    """Legacy endpoint — skeleton-only analysis (backward compat)."""
    if not job_id:
        job_id = str(uuid.uuid4())

    content = await video_file.read()
    if len(content) < 1_000:
        raise HTTPException(400, "Video file too small")

    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(400, "Cannot open video")

        vfps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        vw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        vh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        frames_out: list = []
        engine = "fallback"

        if MEDIAPIPE_AVAILABLE:
            engine = "mediapipe"
            with mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            ) as pose:
                fi = 0
                while cap.isOpened():
                    ret, frm = cap.read()
                    if not ret:
                        break
                    if fi % frame_skip == 0:
                        rgb = cv2.cvtColor(frm, cv2.COLOR_BGR2RGB)
                        res = pose.process(rgb)
                        skel = None
                        lm3d = None
                        ea_val = None
                        ka_val = None
                        if res.pose_landmarks:
                            lms = res.pose_landmarks.landmark
                            skel = _lm_to_skeleton(lms, vw, vh)
                            lm3d = _lm_to_3d(lms)
                            ea_val = _joint_angle(lms, 12, 14, 16)
                            ka_val = _joint_angle(lms, 24, 26, 28)
                        frames_out.append({
                            "frame_index": fi,
                            "timestamp_ms": (fi / vfps) * 1000,
                            "player_skeleton": skel.model_dump() if skel else None,
                            "landmarks_3d": [l.model_dump() for l in lm3d] if lm3d else None,
                            "elbow_angle": round(ea_val, 1) if ea_val else None,
                            "knee_angle": round(ka_val, 1) if ka_val else None,
                        })
                    fi += 1
                    if fi > vfps * 600:
                        break

        cap.release()
        return {
            "job_id": job_id,
            "fps": vfps,
            "total_frames": total,
            "analyzed_frames": len(frames_out),
            "frames": frames_out,
            "status": "completed",
            "engine": engine,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Legacy analyze failed: %s", exc, exc_info=True)
        raise HTTPException(500, "Video processing failed")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/analyze/frame", response_model=SingleFrameResult)
async def analyze_frame(frame_file: UploadFile = File(...)):
    """Single frame: pose + YOLO detection."""
    t0 = time.time()
    content = await frame_file.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image data")

    vh, vw = img.shape[:2]
    players_out, ball_out = _detect_objects(img)

    if not MEDIAPIPE_AVAILABLE:
        return SingleFrameResult(
            players=players_out,
            ball=ball_out,
            success=bool(players_out),
            inference_ms=round((time.time() - t0) * 1000, 1),
        )

    with mp_pose.Pose(static_image_mode=True, model_complexity=1, min_detection_confidence=0.5) as pose:
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)
        if not res.pose_landmarks:
            return SingleFrameResult(
                players=players_out,
                ball=ball_out,
                success=False,
                inference_ms=round((time.time() - t0) * 1000, 1),
            )
        lms = res.pose_landmarks.landmark
        ea = _joint_angle(lms, 12, 14, 16)
        ka = _joint_angle(lms, 24, 26, 28)
        return SingleFrameResult(
            landmarks_3d=_lm_to_3d(lms),
            skeleton=_lm_to_skeleton(lms, vw, vh),
            elbow_angle=round(ea, 1) if ea else None,
            knee_angle=round(ka, 1) if ka else None,
            players=players_out,
            ball=ball_out,
            inference_ms=round((time.time() - t0) * 1000, 1),
            success=True,
        )


# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, workers=1)
