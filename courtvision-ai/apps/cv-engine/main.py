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
import base64
import cv2
import json
import logging
import numpy as np
import os
import random
import subprocess
import tempfile
import time
import uuid
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
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

try:
    from nba_api.stats.endpoints import commonallplayers, commonplayerinfo, leaguedashplayerstats
    from nba_api.stats.static import teams as nba_teams_static

    NBA_API_AVAILABLE = True
except Exception:
    NBA_API_AVAILABLE = False

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

# Background job workers for video highlight processing
CV_PIPELINE_WORKERS = max(1, int(os.getenv("CV_PIPELINE_WORKERS", "2")))
CV_MEDIAPIPE_WORKERS = max(1, int(os.getenv("CV_MEDIAPIPE_WORKERS", "2")))
_pipeline_queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
_pipeline_tasks: List[asyncio.Task] = []
_mediapipe_slots = asyncio.Semaphore(CV_MEDIAPIPE_WORKERS)

# In-memory job store (production: swap for Redis)
jobs: Dict[str, dict] = {}

# API hardening limits
CV_MAX_VIDEO_BYTES = int(os.getenv("CV_MAX_VIDEO_BYTES", str(500 * 1024 * 1024)))
CV_MAX_IMAGE_BYTES = int(os.getenv("CV_MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
CV_UPLOAD_CHUNK_SIZE = int(os.getenv("CV_UPLOAD_CHUNK_SIZE", str(1024 * 1024)))
CV_JOB_TTL_SEC = int(os.getenv("CV_JOB_TTL_SEC", "3600"))
CV_JOB_MAX_ENTRIES = int(os.getenv("CV_JOB_MAX_ENTRIES", "200"))

# Model readiness state (set after startup warm-up)
_models_ready = False
_models_loaded: Dict[str, bool] = {"yolo": False, "mediapipe": False}

# NBA cache and fallback data
NBA_CACHE_TTL_SEC = int(os.getenv("NBA_CACHE_TTL_SEC", "3600"))
_nba_cache: Dict[str, Tuple[float, Any]] = {}

_TEAM_META_BY_ABBR: Dict[str, Dict[str, str]] = {
    "ATL": {"conference": "East", "division": "Southeast"},
    "BOS": {"conference": "East", "division": "Atlantic"},
    "BKN": {"conference": "East", "division": "Atlantic"},
    "CHA": {"conference": "East", "division": "Southeast"},
    "CHI": {"conference": "East", "division": "Central"},
    "CLE": {"conference": "East", "division": "Central"},
    "DAL": {"conference": "West", "division": "Southwest"},
    "DEN": {"conference": "West", "division": "Northwest"},
    "DET": {"conference": "East", "division": "Central"},
    "GSW": {"conference": "West", "division": "Pacific"},
    "HOU": {"conference": "West", "division": "Southwest"},
    "IND": {"conference": "East", "division": "Central"},
    "LAC": {"conference": "West", "division": "Pacific"},
    "LAL": {"conference": "West", "division": "Pacific"},
    "MEM": {"conference": "West", "division": "Southwest"},
    "MIA": {"conference": "East", "division": "Southeast"},
    "MIL": {"conference": "East", "division": "Central"},
    "MIN": {"conference": "West", "division": "Northwest"},
    "NOP": {"conference": "West", "division": "Southwest"},
    "NYK": {"conference": "East", "division": "Atlantic"},
    "OKC": {"conference": "West", "division": "Northwest"},
    "ORL": {"conference": "East", "division": "Southeast"},
    "PHI": {"conference": "East", "division": "Atlantic"},
    "PHX": {"conference": "West", "division": "Pacific"},
    "POR": {"conference": "West", "division": "Northwest"},
    "SAC": {"conference": "West", "division": "Pacific"},
    "SAS": {"conference": "West", "division": "Southwest"},
    "TOR": {"conference": "East", "division": "Atlantic"},
    "UTA": {"conference": "West", "division": "Northwest"},
    "WAS": {"conference": "East", "division": "Southeast"},
}

FALLBACK_NBA_INSPIRATIONS: Dict[str, List[str]] = {
    "zone_shot": ["Ray Allen", "Klay Thompson", "Reggie Miller"],
    "fadeaway": ["Michael Jordan", "Kobe Bryant", "Dirk Nowitzki"],
    "stepback": ["James Harden", "Luka Don\u010di\u0107", "Trae Young"],
    "bank_shot": ["Tim Duncan", "Tony Parker", "Dwyane Wade"],
    "swish_only": ["Stephen Curry", "Kevin Durant", "Devin Booker"],
    "off_dribble": ["Chris Paul", "Kyrie Irving", "Damian Lillard"],
    "catch_and_shoot": ["Klay Thompson", "JJ Redick", "Duncan Robinson"],
    "turnaround": ["Hakeem Olajuwon", "Kevin McHale", "Nikola Joki\u0107"],
    "floater": ["Tony Parker", "Trae Young", "Derrick Rose"],
    "logo_shot": ["Stephen Curry", "Damian Lillard", "Trae Young"],
}


def _now_ts() -> float:
    return time.time()


def _prune_jobs() -> None:
    now = _now_ts()

    # Remove stale terminal jobs first.
    for jid, meta in list(jobs.items()):
        status = str(meta.get("status", ""))
        updated_at = float(meta.get("updated_at", meta.get("created_at", now)))
        if status in ("completed", "failed") and now - updated_at > CV_JOB_TTL_SEC:
            jobs.pop(jid, None)

    if len(jobs) <= CV_JOB_MAX_ENTRIES:
        return

    # Keep active processing jobs; evict oldest finished jobs to cap memory.
    sortable = sorted(
        jobs.items(),
        key=lambda item: float(item[1].get("created_at", now)),
    )
    for jid, meta in sortable:
        if len(jobs) <= CV_JOB_MAX_ENTRIES:
            break
        if meta.get("status") == "processing":
            continue
        jobs.pop(jid, None)


def _append_job_event(job_id: str, message: str, stage: str, progress: int) -> None:
    job = jobs.get(job_id)
    if job is None:
        return

    events = job.setdefault("events", [])
    events.append(
        {
            "timestamp": time.time(),
            "stage": stage,
            "progress": progress,
            "message": message,
        }
    )


def _create_job(job_id: str, priority: str = "normal") -> None:
    ts = _now_ts()
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "stage": "queued",
        "result": None,
        "error": None,
        "priority": priority,
        "events": [],
        "created_at": ts,
        "updated_at": ts,
    }
    _append_job_event(job_id, "Job queued for processing.", "queued", 0)
    _prune_jobs()


def _touch_job(job_id: str) -> None:
    job = jobs.get(job_id)
    if job is not None:
        job["updated_at"] = _now_ts()


def _set_job_progress(job_id: str, progress: int, stage: Optional[str] = None, message: Optional[str] = None) -> None:
    job = jobs.get(job_id)
    if job is None:
        return
    safe_progress = max(0, min(100, int(progress)))
    job["progress"] = safe_progress
    if stage:
        job["stage"] = stage
    if message:
        _append_job_event(job_id, message, job.get("stage", "processing"), safe_progress)
    _touch_job(job_id)


def _set_job_status(job_id: str, status: str, error: Optional[str] = None, stage: Optional[str] = None, message: Optional[str] = None) -> None:
    job = jobs.get(job_id)
    if job is None:
        return
    job["status"] = status
    if stage:
        job["stage"] = stage
    if error is not None:
        job["error"] = error
    if message:
        _append_job_event(job_id, message, job.get("stage", status), job.get("progress", 0))
    _touch_job(job_id)


def _priority_value(priority: str) -> int:
    if priority == "high":
        return 0
    if priority == "low":
        return 2
    return 1


def _job_queue_position(job_id: str) -> int:
    try:
        queue_snapshot = list(_pipeline_queue._queue)
    except Exception:
        return 0

    for idx, item in enumerate(queue_snapshot, start=1):
        payload = item[2] if len(item) >= 3 else None
        if isinstance(payload, dict) and payload.get("job_id") == job_id:
            return idx
    return 0


async def _pipeline_worker_loop(worker_idx: int) -> None:
    logger.info("Pipeline worker %d started", worker_idx)
    while True:
        _, _, payload = await _pipeline_queue.get()
        job_id = payload["job_id"]
        tmp_path = payload["tmp_path"]
        frame_skip = payload["frame_skip"]
        enable_audio = payload["enable_audio"]

        _set_job_status(
            job_id,
            "processing",
            stage="processing",
            message="Video queued processing started.",
        )

        try:
            loop = asyncio.get_event_loop()
            if MEDIAPIPE_AVAILABLE:
                async with _mediapipe_slots:
                    result = await loop.run_in_executor(executor, _run_pipeline, tmp_path, job_id, frame_skip, enable_audio)
            else:
                result = await loop.run_in_executor(executor, _run_pipeline, tmp_path, job_id, frame_skip, enable_audio)

            if job_id in jobs:
                jobs[job_id]["result"] = result.model_dump()

            _set_job_status(
                job_id,
                "completed",
                stage="completed",
                message="Highlight analysis completed.",
            )
        except Exception as exc:
            logger.error("[%s] Pipeline failed: %s", job_id, exc, exc_info=True)
            _set_job_status(
                job_id,
                "failed",
                error=str(exc),
                stage="failed",
                message="Highlight analysis failed.",
            )
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            _pipeline_queue.task_done()
            _prune_jobs()


def _nba_cache_get(key: str) -> Optional[Any]:
    entry = _nba_cache.get(key)
    if not entry:
        return None
    expires_at, data = entry
    if time.time() > expires_at:
        _nba_cache.pop(key, None)
        return None
    return data


def _nba_cache_set(key: str, data: Any) -> None:
    _nba_cache[key] = (time.time() + NBA_CACHE_TTL_SEC, data)


def _current_nba_season() -> str:
    now = time.localtime()
    start_year = now.tm_year if now.tm_mon >= 10 else now.tm_year - 1
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def _empty_team() -> Dict[str, Any]:
    return {
        "id": 0,
        "conference": "",
        "division": "",
        "city": "",
        "name": "",
        "full_name": "",
        "abbreviation": "",
    }


def _get_static_teams() -> List[Dict[str, Any]]:
    cached = _nba_cache_get("nba_teams")
    if cached is not None:
        return cached

    if not NBA_API_AVAILABLE:
        return []

    teams_raw = nba_teams_static.get_teams()
    teams: List[Dict[str, Any]] = []

    for team in teams_raw:
        abbr = str(team.get("abbreviation", ""))
        meta = _TEAM_META_BY_ABBR.get(abbr, {"conference": "", "division": ""})
        teams.append(
            {
                "id": int(team.get("id", 0)),
                "conference": meta["conference"],
                "division": meta["division"],
                "city": str(team.get("city", "")),
                "name": str(team.get("nickname", "")),
                "full_name": str(team.get("full_name", "")),
                "abbreviation": abbr,
            }
        )

    teams.sort(key=lambda t: t["full_name"])
    _nba_cache_set("nba_teams", teams)
    return teams


def _team_by_id(team_id: int) -> Dict[str, Any]:
    for team in _get_static_teams():
        if int(team.get("id", 0)) == int(team_id):
            return team
    return _empty_team()


def _parse_name(full_name: str) -> Tuple[str, str]:
    parts = full_name.strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _fetch_current_players_index() -> List[Dict[str, Any]]:
    cached = _nba_cache_get("nba_current_players")
    if cached is not None:
        return cached

    if not NBA_API_AVAILABLE:
        return []

    try:
        season = _current_nba_season()
        endpoint = commonallplayers.CommonAllPlayers(
            is_only_current_season=1,
            league_id="00",
            season=season,
            timeout=8,
        )
        payload = endpoint.get_normalized_dict()
        players = payload.get("CommonAllPlayers", [])
        _nba_cache_set("nba_current_players", players)
        return players
    except Exception as exc:
        logger.warning("NBA current players index failed: %s", exc)
        return []


def _map_index_player(row: Dict[str, Any]) -> Dict[str, Any]:
    player_id = int(row.get("PERSON_ID", 0))
    full_name = str(row.get("DISPLAY_FIRST_LAST", "")).strip()
    first_name, last_name = _parse_name(full_name)

    team_id_raw = row.get("TEAM_ID")
    team_id = int(team_id_raw) if str(team_id_raw).isdigit() else 0
    team = _team_by_id(team_id) if team_id else _empty_team()

    return {
        "id": player_id,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": full_name,
        "position": "",
        "height": "",
        "weight": "",
        "jersey_number": "",
        "college": None,
        "country": "USA",
        "draft_year": None,
        "team": team,
    }


def _search_players(query: str, limit: int) -> List[Dict[str, Any]]:
    q = query.strip().lower()
    if not q:
        return []

    all_players = _fetch_current_players_index()
    filtered = [
        p for p in all_players if q in str(p.get("DISPLAY_FIRST_LAST", "")).lower()
    ]
    return [_map_index_player(p) for p in filtered[:limit]]


def _get_player_by_id(player_id: int) -> Optional[Dict[str, Any]]:
    cache_key = f"nba_player_{player_id}"
    cached = _nba_cache_get(cache_key)
    if cached is not None:
        return cached

    if not NBA_API_AVAILABLE:
        return None

    try:
        endpoint = commonplayerinfo.CommonPlayerInfo(player_id=player_id, timeout=8)
        payload = endpoint.get_normalized_dict()
        rows = payload.get("CommonPlayerInfo", [])
        if rows:
            row = rows[0]

            team_id = int(row.get("TEAM_ID", 0) or 0)
            team = {
                "id": team_id,
                "conference": str(row.get("TEAM_CONFERENCE", "")),
                "division": str(row.get("TEAM_DIVISION", "")),
                "city": str(row.get("TEAM_CITY", "")),
                "name": str(row.get("TEAM_NAME", "")),
                "full_name": f"{row.get('TEAM_CITY', '')} {row.get('TEAM_NAME', '')}".strip(),
                "abbreviation": str(row.get("TEAM_ABBREVIATION", "")),
            }
            if not team["conference"] or not team["division"]:
                fallback_team = _team_by_id(team_id)
                if fallback_team["id"]:
                    team["conference"] = team["conference"] or fallback_team["conference"]
                    team["division"] = team["division"] or fallback_team["division"]

            draft_year_raw = str(row.get("DRAFT_YEAR", "")).strip()
            draft_year = int(draft_year_raw) if draft_year_raw.isdigit() else None

            player = {
                "id": int(row.get("PERSON_ID", player_id)),
                "first_name": str(row.get("FIRST_NAME", "")),
                "last_name": str(row.get("LAST_NAME", "")),
                "full_name": str(row.get("DISPLAY_FIRST_LAST", "")).strip(),
                "position": str(row.get("POSITION", "")),
                "height": str(row.get("HEIGHT", "")),
                "weight": str(row.get("WEIGHT", "")),
                "jersey_number": str(row.get("JERSEY", "")),
                "college": str(row.get("SCHOOL", "")) or None,
                "country": str(row.get("COUNTRY", "USA")) or "USA",
                "draft_year": draft_year,
                "team": team,
            }
            _nba_cache_set(cache_key, player)
            return player
    except Exception as exc:
        logger.warning("NBA player lookup failed for %s: %s", player_id, exc)

    for row in _fetch_current_players_index():
        if int(row.get("PERSON_ID", 0)) == player_id:
            player = _map_index_player(row)
            _nba_cache_set(cache_key, player)
            return player

    return None


def _pick_names(pool: List[str], n: int) -> List[str]:
    if not pool:
        return []
    unique = list(dict.fromkeys(pool))
    if len(unique) <= n:
        return unique
    return random.sample(unique, n)


def _build_inspirations() -> Dict[str, List[str]]:
    cached = _nba_cache_get("nba_inspirations")
    if cached is not None:
        return cached

    if not NBA_API_AVAILABLE:
        return FALLBACK_NBA_INSPIRATIONS

    try:
        season = _current_nba_season()
        endpoint = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            per_mode_detailed="PerGame",
            timeout=10,
        )
        rows = endpoint.get_normalized_dict().get("LeagueDashPlayerStats", [])
        names = [str(r.get("PLAYER_NAME", "")).strip() for r in rows if r.get("PLAYER_NAME")]
        if not names:
            return FALLBACK_NBA_INSPIRATIONS

        def top(metric: str, minimum_metric: Optional[str] = None, min_val: float = 0.0, limit: int = 25) -> List[str]:
            scored = []
            for row in rows:
                metric_value = row.get(metric)
                if metric_value is None:
                    continue
                if minimum_metric is not None and float(row.get(minimum_metric, 0.0) or 0.0) < min_val:
                    continue
                player_name = str(row.get("PLAYER_NAME", "")).strip()
                if not player_name:
                    continue
                scored.append((float(metric_value), player_name))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [name for _, name in scored[:limit]]

        shooters = top("FG3_PCT", minimum_metric="FG3A", min_val=3.0)
        scorers = top("PTS")
        creators = top("AST")
        finishers = top("FG_PCT", minimum_metric="FGA", min_val=8.0)

        inspirations = {
            "zone_shot": _pick_names(shooters or scorers or names, 4),
            "fadeaway": _pick_names(scorers or names, 4),
            "stepback": _pick_names((shooters + scorers) or names, 4),
            "bank_shot": _pick_names(finishers or scorers or names, 4),
            "swish_only": _pick_names(shooters or names, 4),
            "off_dribble": _pick_names((scorers + creators) or names, 4),
            "catch_and_shoot": _pick_names(shooters or names, 4),
            "turnaround": _pick_names((finishers + scorers) or names, 4),
            "floater": _pick_names((creators + finishers) or names, 4),
            "logo_shot": _pick_names(shooters or scorers or names, 4),
        }
        _nba_cache_set("nba_inspirations", inspirations)
        return inspirations
    except Exception as exc:
        logger.warning("NBA inspirations build failed: %s", exc)
        return FALLBACK_NBA_INSPIRATIONS


def _get_fg_percentages(player_ids: List[int], season: Optional[str]) -> List[Dict[str, Any]]:
    if not player_ids:
        return []

    season_value = season or _current_nba_season()
    key_ids = ",".join(str(pid) for pid in sorted(set(player_ids)))
    cache_key = f"nba_fg_pct::{season_value}::{key_ids}"
    cached = _nba_cache_get(cache_key)
    if cached is not None:
        return cached

    if not NBA_API_AVAILABLE:
        return []

    try:
        endpoint = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season_value,
            per_mode_detailed="PerGame",
            timeout=10,
        )
        rows = endpoint.get_normalized_dict().get("LeagueDashPlayerStats", [])
    except Exception as exc:
        logger.warning("NBA FG%% endpoint failed: %s", exc)
        return []

    by_id: Dict[int, float] = {}

    for row in rows:
        try:
            pid = int(row.get("PLAYER_ID", 0) or 0)
            fg_pct = row.get("FG_PCT")
            if pid > 0 and fg_pct is not None:
                by_id[pid] = round(float(fg_pct) * 100, 1)
        except (TypeError, ValueError):
            continue

    result = [
        {"player_id": pid, "fg_pct": by_id[pid]}
        for pid in sorted(set(player_ids))
        if pid in by_id
    ]
    _nba_cache_set(cache_key, result)
    return result

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
        # Warm-up: single dummy inference to trigger weight loading + JIT
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        _yolo_model.predict(dummy, verbose=False, classes=[0, 32])
        logger.info("YOLOv8 model warm-up complete")
    return _yolo_model


def _warmup_mediapipe() -> bool:
    """Run a dummy frame through MediaPipe to trigger model download + init."""
    if not MEDIAPIPE_AVAILABLE:
        return False
    try:
        with mp_pose.Pose(static_image_mode=True, model_complexity=1) as pose:
            dummy = np.zeros((480, 640, 3), dtype=np.uint8)
            pose.process(dummy)
        logger.info("MediaPipe BlazePose warm-up complete")
        return True
    except Exception as exc:
        logger.error("MediaPipe warm-up failed: %s", exc)
        return False


@app.on_event("startup")
async def startup_warmup():
    """Pre-load all ML models at startup so first request is fast."""
    global _models_ready
    logger.info("═" * 50)
    logger.info("CourtVision CV Engine v3.0 — starting model warm-up")
    logger.info("Device: %s | YOLO: %s | MediaPipe: %s", DEVICE, YOLO_AVAILABLE, MEDIAPIPE_AVAILABLE)
    logger.info("═" * 50)

    loop = asyncio.get_event_loop()

    if YOLO_AVAILABLE:
        try:
            await loop.run_in_executor(executor, get_yolo)
            _models_loaded["yolo"] = True
        except Exception as exc:
            logger.error("YOLO warm-up failed: %s", exc)

    if MEDIAPIPE_AVAILABLE:
        try:
            ok = await loop.run_in_executor(executor, _warmup_mediapipe)
            _models_loaded["mediapipe"] = ok
        except Exception as exc:
            logger.error("MediaPipe warm-up failed: %s", exc)

    _models_ready = any(_models_loaded.values())
    logger.info("Models ready: %s | YOLO=%s, MediaPipe=%s", _models_ready, _models_loaded["yolo"], _models_loaded["mediapipe"])

    # Start background priority workers for video processing.
    global _pipeline_tasks
    if not _pipeline_tasks:
        _pipeline_tasks = [
            asyncio.create_task(_pipeline_worker_loop(i + 1))
            for i in range(CV_PIPELINE_WORKERS)
        ]


@app.on_event("shutdown")
async def shutdown_workers():
    for task in _pipeline_tasks:
        task.cancel()
    for task in _pipeline_tasks:
        try:
            await task
        except asyncio.CancelledError:
            pass
    _pipeline_tasks.clear()
    executor.shutdown(wait=False)


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


class FrameBase64Request(BaseModel):
    frame_base64: str


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
    _set_job_progress(job_id, 5, stage="video_loaded", message="Video loaded. Starting preprocessing.")

    # ── Audio ──────────────────────────────────────────────────
    audio_spikes: List[float] = []
    if enable_audio:
        energy = _extract_audio_energy(video_path)
        audio_spikes = _detect_audio_spikes(energy)
        logger.info("[%s] Audio: %d spikes detected", job_id, len(audio_spikes))
    _set_job_progress(job_id, 15, stage="audio_analysis", message="Audio spike detection completed.")

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
                _set_job_progress(
                    job_id,
                    min(90, 15 + int(75 * fi / min(total_frames, max_fi))),
                    stage="frame_analysis",
                    message="Frame analysis in progress.",
                )
    finally:
        cap.release()
        if pose_ctx:
            pose_ctx.close()

    highlights = detector.get_highlights(min_score=25.0, limit=20)
    elapsed = time.time() - t0
    _set_job_progress(job_id, 100, stage="post_processing", message="Highlight scoring and packaging completed.")

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
    _prune_jobs()
    processing = sum(1 for j in jobs.values() if j.get("status") == "processing")
    completed = sum(1 for j in jobs.values() if j.get("status") == "completed")
    failed = sum(1 for j in jobs.values() if j.get("status") == "failed")

    return {
        "status": "ok" if _models_ready else "warming-up",
        "service": "cv-engine",
        "version": "3.0.0",
        "models_ready": _models_ready,
        "models": _models_loaded,
        "capabilities": {
            "yolo": YOLO_AVAILABLE,
            "mediapipe": MEDIAPIPE_AVAILABLE,
            "gpu": GPU_AVAILABLE,
            "device": DEVICE,
        },
        "limits": {
            "max_video_bytes": CV_MAX_VIDEO_BYTES,
            "max_image_bytes": CV_MAX_IMAGE_BYTES,
            "upload_chunk_size": CV_UPLOAD_CHUNK_SIZE,
            "job_ttl_sec": CV_JOB_TTL_SEC,
            "job_max_entries": CV_JOB_MAX_ENTRIES,
        },
        "jobs": {
            "total": len(jobs),
            "processing": processing,
            "completed": completed,
            "failed": failed,
        },
    }


@app.get("/nba/health")
def nba_health():
    if not NBA_API_AVAILABLE:
        return {
            "success": True,
            "data": {
                "api_available": False,
                "provider": "swar/nba_api",
                "reason": "nba_api package not installed",
            },
        }

    try:
        teams = _get_static_teams()
        return {
            "success": True,
            "data": {
                "api_available": len(teams) > 0,
                "provider": "swar/nba_api",
                "season": _current_nba_season(),
            },
        }
    except Exception as exc:
        logger.warning("NBA health failed: %s", exc)
        return {
            "success": True,
            "data": {
                "api_available": False,
                "provider": "swar/nba_api",
                "reason": str(exc),
            },
        }


@app.get("/nba/teams")
def nba_teams():
    try:
        teams = _get_static_teams()
        return {"success": True, "data": teams, "provider": "swar/nba_api"}
    except Exception as exc:
        logger.warning("NBA teams fetch failed: %s", exc)
        raise HTTPException(500, "Failed to fetch NBA teams")


@app.get("/nba/players/search")
def nba_search_players(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=25),
):
    try:
        players = _search_players(q, limit)
        return {"success": True, "data": players, "provider": "swar/nba_api"}
    except Exception as exc:
        logger.warning("NBA player search failed: %s", exc)
        return {"success": True, "data": [], "provider": "swar/nba_api"}


@app.get("/nba/players/{player_id}")
def nba_get_player(player_id: int):
    try:
        player = _get_player_by_id(player_id)
        if player is None:
            raise HTTPException(404, "Player not found")
        return {"success": True, "data": player, "provider": "swar/nba_api"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("NBA player fetch failed for %s: %s", player_id, exc)
        raise HTTPException(500, "Failed to fetch NBA player")


@app.get("/nba/inspirations")
def nba_inspirations():
    try:
        inspirations = _build_inspirations()
        return {"success": True, "data": inspirations, "provider": "swar/nba_api"}
    except Exception as exc:
        logger.warning("NBA inspirations failed: %s", exc)
        return {
            "success": True,
            "data": FALLBACK_NBA_INSPIRATIONS,
            "provider": "swar/nba_api",
            "fallback": True,
        }


@app.get("/nba/fg-pct")
def nba_fg_percentages(
    player_ids: str = Query(default="", description="Comma-separated NBA player IDs"),
    season: Optional[str] = Query(default=None),
):
    try:
        ids = [
            int(part.strip())
            for part in player_ids.split(",")
            if part.strip().isdigit()
        ]
        data = _get_fg_percentages(ids, season)
        return {
            "success": True,
            "data": data,
            "season": season or _current_nba_season(),
            "provider": "swar/nba_api",
        }
    except Exception as exc:
        logger.warning("NBA FG%% fetch failed: %s", exc)
        return {
            "success": True,
            "data": [],
            "season": season or _current_nba_season(),
            "provider": "swar/nba_api",
        }


@app.post("/detect/highlights")
async def detect_highlights(
    video_file: UploadFile = File(...),
    frame_skip: int = Query(default=2, ge=1, le=10),
    enable_audio: bool = Query(default=True),
    priority: str = Query(default="normal", pattern="^(high|normal|low)$"),
):
    """Upload video → async highlight detection. Poll /job/{id}/status."""
    _prune_jobs()

    allowed_exts = {".mp4", ".mov"}
    allowed_mime_types = {"video/mp4", "video/quicktime", "video/mov"}
    content_type_to_ext = {
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/mov": ".mov",
    }

    filename = video_file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    mime_type = (video_file.content_type or "").lower().strip()

    if mime_type not in allowed_mime_types:
        raise HTTPException(415, "Unsupported media type. Only video/mp4 and video/quicktime are allowed")

    if not ext:
        ext = content_type_to_ext.get(mime_type, "")

    if ext not in allowed_exts:
        raise HTTPException(400, "Unsupported format. Use mp4/mov")

    job_id = str(uuid.uuid4())
    tmp_path: Optional[str] = None
    total_bytes = 0

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp_path = tmp.name
            while True:
                chunk = await video_file.read(CV_UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > CV_MAX_VIDEO_BYTES:
                    raise HTTPException(413, f"Video file too large (max {CV_MAX_VIDEO_BYTES} bytes)")
                tmp.write(chunk)
    finally:
        await video_file.close()

    if total_bytes < 1_000:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(400, "Video file too small")

    if not tmp_path:
        raise HTTPException(500, "Failed to persist uploaded video")

    _create_job(job_id, priority=priority)

    await _pipeline_queue.put(
        (
            _priority_value(priority),
            time.time(),
            {
                "job_id": job_id,
                "tmp_path": tmp_path,
                "frame_skip": frame_skip,
                "enable_audio": enable_audio,
            },
        )
    )

    _set_job_progress(
        job_id,
        0,
        stage="queued",
        message=f"Job queued with priority={priority}.",
    )

    return {
        "job_id": job_id,
        "status": "queued",
        "priority": priority,
        "queue_position": _job_queue_position(job_id),
    }


@app.get("/job/{job_id}/status")
def job_status(job_id: str):
    _prune_jobs()
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    j = jobs[job_id]
    _touch_job(job_id)
    return {
        "job_id": job_id,
        "status": j["status"],
        "stage": j.get("stage", j["status"]),
        "progress": j["progress"],
        "priority": j.get("priority", "normal"),
        "queue_position": _job_queue_position(job_id) if j["status"] == "queued" else 0,
        "error": j["error"],
        "created_at": j.get("created_at"),
        "updated_at": j.get("updated_at"),
    }


@app.get("/job/{job_id}/events")
async def job_events(job_id: str):
    _prune_jobs()
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")

    async def event_stream():
        last_index = 0
        while True:
            _prune_jobs()
            job = jobs.get(job_id)
            if job is None:
                yield "data: {\"status\":\"expired\",\"message\":\"Job expired\"}\n\n"
                break

            events = job.get("events", [])
            while last_index < len(events):
                event_payload = events[last_index]
                yield f"data: {json.dumps(event_payload)}\\n\\n"
                last_index += 1

            if job.get("status") in ("completed", "failed"):
                terminal_payload = {
                    "timestamp": time.time(),
                    "stage": job.get("stage", job.get("status")),
                    "progress": job.get("progress", 0),
                    "status": job.get("status"),
                    "message": "Job finished",
                }
                yield f"data: {json.dumps(terminal_payload)}\\n\\n"
                break

            await asyncio.sleep(1)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/job/{job_id}/result")
def job_result(job_id: str):
    _prune_jobs()
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    j = jobs[job_id]
    if j["status"] != "completed":
        raise HTTPException(409, f"Job not ready: {j['status']}")
    _touch_job(job_id)
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

    tmp_path: Optional[str] = None
    total_bytes = 0

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            while True:
                chunk = await video_file.read(CV_UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > CV_MAX_VIDEO_BYTES:
                    raise HTTPException(413, f"Video file too large (max {CV_MAX_VIDEO_BYTES} bytes)")
                tmp.write(chunk)
            tmp_path = tmp.name

        if total_bytes < 1_000:
            raise HTTPException(400, "Video file too small")

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
        await video_file.close()
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/analyze/frame", response_model=SingleFrameResult)
async def analyze_frame(frame_file: UploadFile = File(...)):
    """Single frame: pose + YOLO detection."""
    content = await frame_file.read()
    await frame_file.close()
    if len(content) > CV_MAX_IMAGE_BYTES:
        raise HTTPException(413, f"Image payload too large (max {CV_MAX_IMAGE_BYTES} bytes)")
    if len(content) < 128:
        raise HTTPException(400, "Image payload too small")
    return _analyze_frame_bytes(content)


def _analyze_frame_bytes(content: bytes) -> SingleFrameResult:
    t0 = time.time()
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


@app.post("/analyze/frame-base64", response_model=SingleFrameResult)
async def analyze_frame_base64(payload: FrameBase64Request):
    """Single frame analysis for JSON base64 payloads (mobile fallback path)."""
    raw = payload.frame_base64.strip()
    if "," in raw:
        raw = raw.split(",", 1)[1]

    if not raw:
        raise HTTPException(400, "Missing frame_base64")

    max_base64_len = int(CV_MAX_IMAGE_BYTES * 1.5) + 8
    if len(raw) > max_base64_len:
        raise HTTPException(413, f"Base64 payload too large (max {CV_MAX_IMAGE_BYTES} decoded bytes)")

    try:
        content = base64.b64decode(raw, validate=True)
    except Exception:
        raise HTTPException(400, "Invalid base64 image data")

    if len(content) > CV_MAX_IMAGE_BYTES:
        raise HTTPException(413, f"Image payload too large (max {CV_MAX_IMAGE_BYTES} bytes)")

    if len(content) < 128:
        raise HTTPException(400, "Image payload too small")

    return _analyze_frame_bytes(content)


# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, workers=1)
