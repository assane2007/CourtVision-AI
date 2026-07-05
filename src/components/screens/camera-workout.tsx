'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Camera,
  Pause,
  Play,
  Square,
  RotateCcw,
  Save,
  Star,
  Volume2,
  VolumeX,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Plus,
  SkipForward,
  Timer,
} from 'lucide-react'
import {
  initAudio,
  toggleMute as toggleAudioMute,
  isAudioMuted as getAudioMuted,
  setMuted as setAudioMuted,
  playSound,
  destroyAudio,
} from '@/lib/audio'

// ─── Types ───────────────────────────────────────────────────────────────────

// Load MediaPipe via script tag (Turbopack doesn't support dynamic URL imports)
async function loadMediaPipe() {
  const win = window as unknown as Record<string, unknown>
  if (win.__mediapipe_vision__) return win.__mediapipe_vision__ as typeof import('@mediapipe/tasks-vision')

  return new Promise<typeof import('@mediapipe/tasks-vision')>((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.textContent = `
      import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/+esm').then(mod => {
        window.__mediapipe_vision__ = mod;
        window.__mediapipe_vision_ready__ = true;
        window.dispatchEvent(new Event('mediapipe-ready'));
      }).catch(err => {
        window.__mediapipe_vision_err__ = err;
        window.dispatchEvent(new Event('mediapipe-error'));
      });
    `
    document.head.appendChild(script)

    function onReady() {
      window.removeEventListener('mediapipe-ready', onReady)
      window.removeEventListener('mediapipe-error', onError)
      resolve(win.__mediapipe_vision__ as typeof import('@mediapipe/tasks-vision'))
    }
    function onError() {
      window.removeEventListener('mediapipe-ready', onReady)
      window.removeEventListener('mediapipe-error', onError)
      reject(win.__mediapipe_vision_err__ || new Error('Failed to load MediaPipe'))
    }
    window.addEventListener('mediapipe-ready', onReady)
    window.addEventListener('mediapipe-error', onError)
  })
}

interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

type WorkoutPhase =
  | 'loading'
  | 'countdown'
  | 'active'
  | 'paused'
  | 'rest'
  | 'completed'
  | 'plan-next'
  | 'error'

interface Drill {
  id: string
  name: string
  nameFr: string
  category: string
  difficulty: string
  description: string
  descriptionFr: string
  instructions: string
  instructionsFr: string
  durationSec: number
  targetReps: number
  icon: string
}

interface RepTracker {
  lastPos: number
  direction: 'up' | 'down' | 'left' | 'right' | 'none'
  lastRepTime: number
  peakPositions: number[]
  troughPositions: number[]
  sampleCount: number
  totalMovement: number
  lastXPos: number
  lastYPos: number
  lastHipY: number
  lastWristY: number
  lastAnkleLX: number
  lastAnkleRX: number
  velocityHistory: number[]
}

interface ScoreDetail {
  posture: number
  stanceWidth: number
  armPosition: number
  movementQuality: number
}

interface AIFormCheckResult {
  score: number
  feedback: string
  issues: string[]
  goodPoints: string[]
}

// ─── MediaPipe Pose Connections ──────────────────────────────────────────────

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
]

// ─── Constants ───────────────────────────────────────────────────────────────

const REP_DEBOUNCE_MS = 500
const LANDMARK_COLOR = '#f97316'
const LANDMARK_RADIUS = 5
const CONNECTION_WIDTH = 3
const COUNTDOWN_SECONDS = 3
const COUNTDOWN_READY_MS = 800
const AI_CHECK_COOLDOWN_MS = 10_000
const HALF_WARNING_THRESHOLD = 0.5
const REST_OPTIONS = [10, 15, 30, 60] as const
const DEFAULT_REST_SEC = 15
const DEFAULT_SETS = 1

const FEEDBACK_MESSAGES = {
  goodPosture: 'Bonne posture! ✅',
  leanRight: 'Restez droit! 📐',
  leanLeft: 'Restez droit! 📐',
  tooSlow: 'Plus vite! ⚡',
  goodSpeed: 'Excellent rythme! 🔥',
  armsLow: 'Montez les bras! 💪',
  keepGoing: 'Continuez comme ça! 🎯',
  greatForm: 'Superbe forme! 💯',
  narrowStance: 'Écartez les pieds! 🦶',
  wideStance: 'Resserrez la garde! 🛡️',
}

const SCORE_COLORS: Record<string, string> = {
  green: 'text-emerald-400',
  orange: 'text-orange-400',
  red: 'text-red-400',
}

const SCORE_BG_COLORS: Record<string, string> = {
  green: 'bg-emerald-500/20 border-emerald-500/30',
  orange: 'bg-orange-500/20 border-orange-500/30',
  red: 'bg-red-500/20 border-red-500/30',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.green
  if (score >= 50) return SCORE_COLORS.orange
  return SCORE_COLORS.red
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return SCORE_BG_COLORS.green
  if (score >= 50) return SCORE_BG_COLORS.orange
  return SCORE_BG_COLORS.red
}

function getGaugeColor(score: number): string {
  if (score >= 80) return '#34d399'  // emerald-400
  if (score >= 60) return '#4ade80'  // green-400
  if (score >= 30) return '#fbbf24'  // amber-400
  return '#f87171'                    // red-400
}

function getGaugeTrackColor(score: number): string {
  if (score >= 80) return '#34d39933'
  if (score >= 60) return '#4ade8033'
  if (score >= 30) return '#fbbf2433'
  return '#f8717133'
}

function getStarCount(score: number): number {
  if (score >= 90) return 5
  if (score >= 75) return 4
  if (score >= 60) return 3
  if (score >= 40) return 2
  return 1
}

function createRepTracker(): RepTracker {
  return {
    lastPos: 0,
    direction: 'none',
    lastRepTime: 0,
    peakPositions: [],
    troughPositions: [],
    sampleCount: 0,
    totalMovement: 0,
    lastXPos: 0,
    lastYPos: 0,
    lastHipY: 0,
    lastWristY: 0,
    lastAnkleLX: 0,
    lastAnkleRX: 0,
    velocityHistory: [],
  }
}

function computeScore(scores: ScoreDetail[]): number {
  if (scores.length === 0) return 0
  const recent = scores.slice(-10)

  // Movement is a prerequisite: if average movement is near 0, score = 0
  const avgMovement = recent.reduce((s, d) => s + d.movementQuality, 0) / recent.length
  if (avgMovement < 10) return 0

  // Movement quality is the dominant factor (55%), form is secondary (45%)
  const avg =
    recent.reduce(
      (sum, s) =>
        sum +
        (s.movementQuality * 0.55 +
          s.posture * 0.15 +
          s.stanceWidth * 0.08 +
          s.armPosition * 0.22),
      0,
    ) / recent.length
  return Math.round(Math.min(100, Math.max(0, avg)))
}

function analyzeForm(
  landmarks: Landmark[],
  category: string,
  tracker: RepTracker,
): { score: ScoreDetail; feedback: string } {
  const lShoulder = landmarks[11]
  const rShoulder = landmarks[12]
  const lAnkle = landmarks[27]
  const rAnkle = landmarks[28]
  const lWrist = landmarks[15]
  const rWrist = landmarks[16]
  const lHip = landmarks[23]
  const rHip = landmarks[24]

  // ── 1. Posture: shoulders level? (0-100, baseline ~60) ──
  const shoulderDy = Math.abs(lShoulder.y - rShoulder.y)
  const postureScore = Math.max(0, Math.min(100, 90 - shoulderDy * 600))

  // ── 2. Stance width: ankle distance (0-100, baseline ~30) ──
  const ankleDist = Math.abs(lAnkle.x - rAnkle.x)
  let stanceScore = 30
  if (ankleDist > 0.15 && ankleDist < 0.45) stanceScore = 85
  else if (ankleDist > 0.1 && ankleDist < 0.55) stanceScore = 60
  else if (ankleDist < 0.1) stanceScore = 15
  else stanceScore = 20

  // ── 3. Arm position: depends on category (0-100, baseline ~30) ──
  let armScore = 30
  const avgWristY = (lWrist.y + rWrist.y) / 2
  const avgShoulderY = (lShoulder.y + rShoulder.y) / 2
  if (category === 'shooting') {
    const wristAbove = avgShoulderY - avgWristY
    armScore = Math.min(100, Math.max(0, 30 + wristAbove * 400))
  } else if (category === 'defense') {
    const wristBelow = avgWristY - avgShoulderY
    armScore = Math.min(100, Math.max(0, 30 + wristBelow * 300))
  } else if (category === 'ball_handling' || category === 'pocket_ball') {
    armScore = avgWristY > avgShoulderY ? 60 : 25
  }

  // ── 4. Movement quality (DOMINANT: 50% weight) (0-100, baseline 0) ──
  const velocities = tracker.velocityHistory
  let moveScore = 0
  if (velocities.length > 3) {
    const recent = velocities.slice(-10)
    const avgSpeed = recent.reduce((a, b) => a + b, 0) / recent.length

    if (avgSpeed < 0.001) {
      moveScore = 0
    } else if (avgSpeed < 0.002) {
      moveScore = 15
    } else if (avgSpeed < 0.008) {
      moveScore = Math.min(95, 40 + (avgSpeed - 0.002) * 15000)
    } else {
      moveScore = Math.max(30, 95 - (avgSpeed - 0.008) * 5000)
    }

    if (recent.length > 5) {
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length
      const variance =
        recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length
      const variancePenalty = Math.min(30, variance * 50000)
      moveScore = Math.max(0, moveScore - variancePenalty)
    }
  }

  const score: ScoreDetail = {
    posture: postureScore,
    stanceWidth: stanceScore,
    armPosition: armScore,
    movementQuality: moveScore,
  }

  // ── Feedback generation ──
  let feedback = ''
  const hipMidX = (lHip.x + rHip.x) / 2
  const shoulderMidX = (lShoulder.x + rShoulder.x) / 2
  const lean = hipMidX - shoulderMidX

  if (velocities.length > 3) {
    const recentSpeed = velocities.slice(-5).reduce((a, b) => a + b, 0) / 5
    if (recentSpeed < 0.001) {
      feedback = FEEDBACK_MESSAGES.tooSlow
    }
  }
  if (!feedback && Math.abs(lean) > 0.04) {
    feedback = FEEDBACK_MESSAGES.leanRight
  }
  if (!feedback && category === 'shooting' && avgWristY > avgShoulderY + 0.05) {
    feedback = FEEDBACK_MESSAGES.armsLow
  }
  if (!feedback && ankleDist < 0.12 && category !== 'shooting') {
    feedback = FEEDBACK_MESSAGES.narrowStance
  }
  if (!feedback && ankleDist > 0.5 && category !== 'finishing') {
    feedback = FEEDBACK_MESSAGES.wideStance
  }
  if (!feedback && velocities.length > 5) {
    const recentSpeed = velocities.slice(-3).reduce((a, b) => a + b, 0) / 3
    if (recentSpeed > 0.003 && recentSpeed < 0.008) {
      feedback = FEEDBACK_MESSAGES.goodSpeed
    }
  }
  if (!feedback && postureScore > 80 && moveScore > 70) {
    feedback = FEEDBACK_MESSAGES.goodPosture
  }
  if (!feedback && postureScore > 90 && moveScore > 80) {
    feedback = FEEDBACK_MESSAGES.greatForm
  }

  return { score, feedback }
}

function detectRep(
  landmarks: Landmark[],
  category: string,
  tracker: RepTracker,
  now: number,
): { rep: boolean; updatedTracker: RepTracker } {
  const t = { ...tracker }
  t.sampleCount++

  let repDetected = false

  const computeVelocity = (current: number, last: number): number =>
    Math.abs(current - last)

  switch (category) {
    case 'pocket_ball':
    case 'ball_handling': {
      const wristY = (landmarks[15].y + landmarks[16].y) / 2
      const velocity = computeVelocity(wristY, t.lastWristY)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'up' && wristY > t.lastWristY + 0.01) {
          t.direction = 'down'
        } else if (t.direction === 'down' && wristY < t.lastWristY - 0.01) {
          t.direction = 'up'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = wristY > t.lastWristY ? 'down' : 'up'
      }
      t.lastWristY = wristY
      break
    }
    case 'shifty':
    case 'speed_change': {
      const hipX = (landmarks[23].x + landmarks[24].x) / 2
      const velocity = computeVelocity(hipX, t.lastXPos)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'right' && hipX < t.lastXPos - 0.015) {
          t.direction = 'left'
        } else if (t.direction === 'left' && hipX > t.lastXPos + 0.015) {
          t.direction = 'right'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = hipX > t.lastXPos ? 'right' : 'left'
      }
      t.lastXPos = hipX
      break
    }
    case 'defense': {
      const hipX = (landmarks[23].x + landmarks[24].x) / 2
      const velocity = computeVelocity(hipX, t.lastXPos)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'right' && hipX < t.lastXPos - 0.02) {
          t.direction = 'left'
        } else if (t.direction === 'left' && hipX > t.lastXPos + 0.02) {
          t.direction = 'right'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = hipX > t.lastXPos ? 'right' : 'left'
      }
      t.lastXPos = hipX
      break
    }
    case 'shooting': {
      const wristY = Math.min(landmarks[15].y, landmarks[16].y)
      const velocity = computeVelocity(wristY, t.lastWristY)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'down' && wristY < t.lastWristY - 0.02) {
          t.direction = 'up'
        } else if (t.direction === 'up' && wristY > t.lastWristY + 0.02) {
          t.direction = 'down'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = wristY > t.lastWristY ? 'down' : 'up'
      }
      t.lastWristY = wristY
      break
    }
    case 'footwork': {
      const lAnkleX = landmarks[27].x
      const rAnkleX = landmarks[28].x
      const footShift = Math.abs(lAnkleX - t.lastAnkleLX) + Math.abs(rAnkleX - t.lastAnkleRX)
      const velocity = footShift
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5 && footShift > 0.03) {
        if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
          repDetected = true
          t.lastRepTime = now
        }
      }
      t.lastAnkleLX = lAnkleX
      t.lastAnkleRX = rAnkleX
      break
    }
    case 'finishing': {
      const hipY = (landmarks[23].y + landmarks[24].y) / 2
      const velocity = computeVelocity(hipY, t.lastHipY)
      t.velocityHistory.push(velocity)
      if (t.velocityHistory.length > 20) t.velocityHistory.shift()

      if (t.sampleCount > 5) {
        if (t.direction === 'down' && hipY < t.lastHipY - 0.03) {
          t.direction = 'up'
        } else if (t.direction === 'up' && hipY > t.lastHipY + 0.02) {
          t.direction = 'down'
          if (now - t.lastRepTime > REP_DEBOUNCE_MS) {
            repDetected = true
            t.lastRepTime = now
          }
        }
        if (t.direction === 'none') t.direction = hipY > t.lastHipY ? 'down' : 'up'
      }
      t.lastHipY = hipY
      break
    }
    case 'conditioning': {
      const hipX = (landmarks[23].x + landmarks[24].x) / 2
      const hipY = (landmarks[23].y + landmarks[24].y) / 2
      const dx = computeVelocity(hipX, t.lastXPos)
      const dy = computeVelocity(hipY, t.lastYPos)
      const speed = Math.sqrt(dx * dx + dy * dy)
      t.totalMovement += speed

      if (t.velocityHistory.length > 20) t.velocityHistory.shift()
      t.velocityHistory.push(speed)

      if (t.totalMovement > 0.5 && now - t.lastRepTime > REP_DEBOUNCE_MS * 2) {
        repDetected = true
        t.lastRepTime = now
        t.totalMovement = 0
      }
      t.lastXPos = hipX
      t.lastYPos = hipY
      break
    }
  }

  return { rep: repDetected, updatedTracker: t }
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height)
  if (!landmarks || landmarks.length < 33) return

  ctx.strokeStyle = LANDMARK_COLOR
  ctx.lineWidth = CONNECTION_WIDTH
  ctx.lineCap = 'round'

  for (const [i, j] of POSE_CONNECTIONS) {
    const a = landmarks[i]
    const b = landmarks[j]
    if (!a || !b) continue
    if ((a.visibility ?? 0) < 0.5 || (b.visibility ?? 0) < 0.5) continue

    const ax = (1 - a.x) * width
    const ay = a.y * height
    const bx = (1 - b.x) * width
    const by = b.y * height

    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    if (!lm) continue
    if ((lm.visibility ?? 0) < 0.5) continue

    const x = (1 - lm.x) * width
    const y = lm.y * height

    ctx.beginPath()
    ctx.arc(x, y, LANDMARK_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = LANDMARK_COLOR
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

const countPulse = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: [0.5, 1.2, 1],
    opacity: [0, 1, 1],
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
  exit: { scale: 1.5, opacity: 0, transition: { duration: 0.3 } },
}

// Reduced-motion variants (instant, no scale)
const countPulseReduced = {
  initial: { scale: 1, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.05 } },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Semi-circular gauge for live score display. */
function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = Math.PI * radius // semi-circle

  // Score as a fraction of the semi-circle (0 = left, 1 = right)
  const progress = Math.min(1, Math.max(0, score / 100))
  const dashOffset = circumference * (1 - progress)

  const color = getGaugeColor(score)
  const trackColor = getGaugeTrackColor(score)

  return (
    <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
      {/* Track (background arc) */}
      <path
        d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Progress arc */}
      <motion.path
        d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 0.5, ease: 'easeOut' as const }}
      />
      {/* Score text */}
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-current"
        style={{ fontSize: '18px', fontWeight: 900, color }}
      >
        {score}
      </text>
      <text
        x={center}
        y={center + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white/40"
        style={{ fontSize: '8px', fontWeight: 600 }}
      >
        SCORE
      </text>
    </svg>
  )
}

/** Circular progress timer for the workout duration. */
function CircularTimer({
  remaining,
  total,
  size = 72,
}: {
  remaining: number
  total: number
  size?: number
}) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  const progress = total > 0 ? remaining / total : 0
  const dashOffset = circumference * (1 - progress)

  const isUrgent = remaining <= 10
  const color = isUrgent ? '#f87171' : '#ffffff'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.5, ease: 'easeOut' as const }}
        />
      </svg>
      {/* Time text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-mono text-sm font-bold tabular-nums ${isUrgent ? 'text-red-400' : 'text-white'}`}
        >
          {formatTime(remaining)}
        </span>
      </div>
    </div>
  )
}

/** Floating +1 animation for rep detection. */
function FloatingRep() {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.3 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' as const }}
      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none"
    >
      <span className="text-2xl font-black text-emerald-400 drop-shadow-lg">+1</span>
    </motion.div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CameraWorkoutScreen() {
  const { selectedDrillId, goBack, navigate, planDrillQueue, planCurrentIndex, planResults, advancePlanDrill, setWorkoutResult, clearPlanExecution, selectDrill } = useAppStore()
  const isPlanMode = planDrillQueue.length > 0
  const queryClient = useQueryClient()

  // Check for reduced-motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  // ── Refs ──────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseLandmarkerRef = useRef<unknown>(null)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restPulseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const repTrackerRef = useRef<RepTracker>(createRepTracker())
  const scoresRef = useRef<ScoreDetail[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const pauseAccumRef = useRef<number>(0)
  const aiCooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef<WorkoutPhase>('loading')
  const halfTimeFiredRef = useRef(false)
  const audioInitRef = useRef(false)
  const totalRepsAcrossSetsRef = useRef(0)
  const totalScoreAccumRef = useRef<ScoreDetail[]>([])

  // ── State ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<WorkoutPhase>('loading')
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [showReady, setShowReady] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [reps, setReps] = useState(0)
  const [currentScore, setCurrentScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [isMuted, setIsMuted] = useState(true)
  const [elapsedAtEnd, setElapsedAtEnd] = useState(0)
  const [finalScore, setFinalScore] = useState(0)

  // Rest / set tracking
  const [currentSet, setCurrentSet] = useState(1)
  const [totalSets, setTotalSets] = useState(DEFAULT_SETS)
  const [restDuration, setRestDuration] = useState(DEFAULT_REST_SEC)
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST_SEC)

  // Rep animation
  const [repFloatKey, setRepFloatKey] = useState(0)

  // AI form check state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiCooldownRemaining, setAiCooldownRemaining] = useState(0)
  const [aiResult, setAiResult] = useState<AIFormCheckResult | null>(null)
  const [aiError, setAiError] = useState('')

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // ── Fetch drill ───────────────────────────────────────────────────────
  const { data, isLoading: isDrillLoading } = useQuery({
    queryKey: ['drills'],
    queryFn: () => fetch('/api/drills').then((r) => r.json()),
  })

  const drill: Drill | undefined = data?.drills?.find(
    (d: { id: string }) => d.id === selectedDrillId,
  )

  const totalDuration = drill?.durationSec ?? 60

  // ── Save session mutation ─────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: {
      drillId: string
      reps: number
      score: number
      durationSec: number
    }) =>
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to save session')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Session sauvegardée! 🎉', {
        description: `${reps} répétitions enregistrées`,
      })
    },
    onError: () => {
      toast.error('Erreur de sauvegarde', {
        description: 'Impossible de sauvegarder la session',
      })
    },
  })

  // ── Audio init on first interaction ──────────────────────────────────
  const ensureAudioInit = useCallback(() => {
    if (!audioInitRef.current) {
      audioInitRef.current = true
      initAudio()
      setAudioMuted(isMuted)
    }
  }, [isMuted])

  // Sync mute state to audio engine
  useEffect(() => {
    if (audioInitRef.current) {
      setAudioMuted(isMuted)
    }
  }, [isMuted])

  // ── Load MediaPipe ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function initMediaPipe() {
      try {
        const vision = await loadMediaPipe()
        if (cancelled) return

        const { PoseLandmarker, FilesetResolver } = vision

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        )
        if (cancelled) return

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          },
        )

        if (!cancelled) {
          setIsModelLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('MediaPipe failed to load:', err)
          setCameraError(
            'Impossible de charger le modèle de détection de pose. Vérifiez votre connexion internet et réessayez.',
          )
          setPhase('error')
        }
      }
    }

    initMediaPipe()

    return () => {
      cancelled = true
    }
  }, [])

  // ── Camera setup ──────────────────────────────────────────────────────
  const setupCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        setCameraError('Élément vidéo introuvable.')
        setPhase('error')
        return
      }

      video.srcObject = stream
      video.setAttribute('playsinline', '')
      video.muted = true

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Erreur de chargement vidéo'))
        setTimeout(() => reject(new Error('Timeout vidéo')), 10000)
      })

      try {
        await video.play()
      } catch (playErr) {
        console.warn('video.play() failed, retrying...', playErr)
        await new Promise((r) => setTimeout(r, 300))
        try {
          await video.play()
        } catch {
          setCameraError('Impossible de démarrer la vidéo. Réessayez.')
          stream.getTracks().forEach((t) => t.stop())
          setPhase('error')
          return
        }
      }

      // Show "PRÊT?" first, then start countdown
      setShowReady(true)
      ensureAudioInit()
      playSound('countdown-tick') // Audio cue for ready
      setTimeout(() => {
        setShowReady(false)
        setPhase('countdown')
        setCountdown(COUNTDOWN_SECONDS)
      }, COUNTDOWN_READY_MS)
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Caméra non autorisée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'Aucune caméra détectée sur cet appareil.'
            : err instanceof DOMException && err.name === 'NotReadableError'
              ? 'La caméra est déjà utilisée par une autre application.'
              : 'Impossible d\'accéder à la caméra. Vérifiez que votre appareil dispose d\'une caméra.'
      setCameraError(msg)
      setPhase('error')
    }
  }, [ensureAudioInit])

  // ── Start camera as soon as drill is loaded (don't wait for MediaPipe) ─
  const cameraStartedRef = useRef(false)
  useEffect(() => {
    if (!isDrillLoading && !cameraStartedRef.current) {
      cameraStartedRef.current = true
      setupCamera()
    }
  }, [isDrillLoading, setupCamera])

  // ── Countdown logic (3-2-1 with audio cues) ──────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return

    // Play tick for the initial countdown value
    if (countdown === COUNTDOWN_SECONDS) {
      playSound('countdown-tick')
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          // Play GO sound
          playSound('countdown-go')
          // Brief delay to let the GO sound play, then start
          setTimeout(() => {
            setPhase('active')
            setTimeRemaining(totalDuration)
            startTimeRef.current = Date.now()
            pauseAccumRef.current = 0
            halfTimeFiredRef.current = false
          }, 300)
          return 0
        }
        // Play tick for next number
        playSound('countdown-tick')
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [phase, totalDuration, countdown])

  // ── Timer logic (active phase) with half-time warning ────────────────
  useEffect(() => {
    if (phase !== 'active') return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          // Play time-up sound
          playSound('time-up')
          // Small delay then end
          setTimeout(() => handleWorkoutEnd(), 500)
          return 0
        }

        // Half-time warning
        const newRemaining = prev - 1
        const elapsed = totalDuration - newRemaining
        if (
          !halfTimeFiredRef.current &&
          elapsed >= totalDuration * HALF_WARNING_THRESHOLD
        ) {
          halfTimeFiredRef.current = true
          playSound('half-warning')
        }

        return newRemaining
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, totalDuration])

  // ── Rest timer logic ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'rest') return

    // Play rest pulse every 2 seconds
    playSound('rest-pulse')
    restPulseTimerRef.current = setInterval(() => {
      playSound('rest-pulse')
    }, 2000)

    restTimerRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current)
          if (restPulseTimerRef.current) clearInterval(restPulseTimerRef.current)
          // Start next set
          startNextSet()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current)
      if (restPulseTimerRef.current) clearInterval(restPulseTimerRef.current)
    }
  }, [phase])

  // ── Detection loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return
    if (!videoRef.current || !canvasRef.current || !poseLandmarkerRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const category = drill?.category ?? 'ball_handling'
    let lastFeedbackUpdate = 0

    function detect() {
      if (phaseRef.current !== 'active') return

      const poseLandmarker = poseLandmarkerRef.current as {
        detect: (input: HTMLVideoElement, timestamp: number) => {
          landmarks: Landmark[][]
        }
      }

      if (video.readyState >= 2) {
        const timestamp = performance.now()
        let results: { landmarks: Landmark[][] } = { landmarks: [] }

        try {
          results = poseLandmarker.detect(video, timestamp)
        } catch {
          // Silently retry on detection errors
        }

        const detectedLandmarks = results.landmarks?.[0]

        if (detectedLandmarks && detectedLandmarks.length >= 33) {
          drawSkeleton(ctx!, detectedLandmarks, canvas.width, canvas.height)

          const { rep, updatedTracker } = detectRep(
            detectedLandmarks,
            category,
            repTrackerRef.current,
            Date.now(),
          )
          repTrackerRef.current = updatedTracker

          if (rep) {
            setReps((prev) => prev + 1)
            // Trigger +1 floating animation
            setRepFloatKey((k) => k + 1)
            // Play rep ding
            playSound('rep-ding')
          }

          if (updatedTracker.sampleCount % 3 === 0) {
            const { score, feedback: fb } = analyzeForm(
              detectedLandmarks,
              category,
              updatedTracker,
            )
            scoresRef.current.push(score)
            if (scoresRef.current.length > 30) {
              scoresRef.current = scoresRef.current.slice(-30)
            }
            setCurrentScore(computeScore(scoresRef.current))

            const now = Date.now()
            if (now - lastFeedbackUpdate > 2000 && fb) {
              setFeedback(fb)
              lastFeedbackUpdate = now
            }

            if (rep && updatedTracker.sampleCount > 15) {
              setFeedback(FEEDBACK_MESSAGES.keepGoing)
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [phase, drill?.category])

  // ── Start next set (after rest) ──────────────────────────────────────
  const startNextSet = useCallback(() => {
    setCurrentSet((prev) => prev + 1)
    setReps(0)
    setCurrentScore(0)
    setFeedback('')
    setRepFloatKey(0)
    repTrackerRef.current = createRepTracker()
    scoresRef.current = []
    halfTimeFiredRef.current = false

    // Start countdown for next set
    setShowReady(false)
    setPhase('countdown')
    setCountdown(COUNTDOWN_SECONDS)
  }, [])

  // ── Handle workout end (single set or final set) ─────────────────────
  const handleWorkoutEnd = useCallback(() => {
    if (phaseRef.current === 'completed') return

    if (timerRef.current) clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (aiCooldownTimerRef.current) clearInterval(aiCooldownTimerRef.current)

    const elapsedSec = Math.round(
      (Date.now() - startTimeRef.current - pauseAccumRef.current) / 1000,
    )
    setElapsedAtEnd(Math.min(elapsedSec, totalDuration))

    // Accumulate across sets
    totalRepsAcrossSetsRef.current += reps
    totalScoreAccumRef.current.push(...scoresRef.current)

    // If more sets remain, enter rest phase instead of completed
    if (currentSet < totalSets) {
      setPhase('rest')
      setRestRemaining(restDuration)
      return
    }

    const score = computeScore(totalScoreAccumRef.current)
    setFinalScore(score)
    setPhase('completed')
  }, [totalDuration, currentSet, totalSets, reps, restDuration])

  // ── Rest controls ────────────────────────────────────────────────────
  const handleExtendRest = useCallback(() => {
    setRestRemaining((prev) => prev + 15)
  }, [])

  const handleSkipRest = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    if (restPulseTimerRef.current) clearInterval(restPulseTimerRef.current)
    startNextSet()
  }, [startNextSet])

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (restTimerRef.current) clearInterval(restTimerRef.current)
      if (restPulseTimerRef.current) clearInterval(restPulseTimerRef.current)
      if (aiCooldownTimerRef.current) clearInterval(aiCooldownTimerRef.current)
      if (planNextTimerRef.current) clearInterval(planNextTimerRef.current)
      destroyAudio()
    }
  }, [])

  // ── Auto-transition in plan mode when drill completes ────────────────
  const handlePlanDrillCompleteRef = useRef<() => void>(() => {})
  // Will be assigned below after the callback is defined

  useEffect(() => {
    if (phase === 'completed' && isPlanMode) {
      handlePlanDrillCompleteRef.current()
    }
  }, [phase, isPlanMode])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handlePause = () => {
    if (phase === 'active') {
      ensureAudioInit()
      if (timerRef.current) clearInterval(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      pausedAtRef.current = Date.now()
      setPhase('paused')
    }
  }

  const handleResume = () => {
    if (phase === 'paused') {
      ensureAudioInit()
      pauseAccumRef.current += Date.now() - pausedAtRef.current
      setPhase('active')
    }
  }

  const handleStop = () => {
    ensureAudioInit()
    handleWorkoutEnd()
  }

  const handleRestart = () => {
    ensureAudioInit()
    // Reset all state
    setReps(0)
    setCurrentScore(0)
    setFeedback('')
    setFinalScore(0)
    setElapsedAtEnd(0)
    setAiResult(null)
    setAiError('')
    setAiCooldownRemaining(0)
    setCurrentSet(1)
    totalRepsAcrossSetsRef.current = 0
    totalScoreAccumRef.current = []
    repTrackerRef.current = createRepTracker()
    scoresRef.current = []
    halfTimeFiredRef.current = false
    setRepFloatKey(0)

    // Start countdown again (with PRÊT?)
    setShowReady(true)
    playSound('countdown-tick')
    setTimeout(() => {
      setShowReady(false)
      setPhase('countdown')
      setCountdown(COUNTDOWN_SECONDS)
    }, COUNTDOWN_READY_MS)
  }

  // Plan-next countdown state
  const [planNextCountdown, setPlanNextCountdown] = useState(3)
  const planNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Plan execution: handle drill completion in plan mode ────────────
  const handlePlanDrillComplete = useCallback(() => {
    if (!drill) return
    const elapsed = elapsedAtEnd || totalDuration - timeRemaining
    const totalRepsNow = totalSets > 1 ? totalRepsAcrossSetsRef.current + reps : reps

    // Save individual session
    saveMutation.mutate({
      drillId: drill.id,
      reps: totalRepsNow,
      score: finalScore,
      durationSec: elapsed,
    })

    // Record result for plan
    advancePlanDrill({
      drillId: drill.id,
      drillName: drill.name,
      drillNameFr: drill.nameFr,
      drillCategory: drill.category,
      drillIcon: drill.icon,
      reps: totalRepsNow,
      score: finalScore,
      durationSec: elapsed,
      targetReps: drill.targetReps,
    })

    const nextIndex = planCurrentIndex + 1
    if (nextIndex >= planDrillQueue.length) {
      // Plan finished — aggregate results and navigate to summary
      const allResults = [...planResults, {
        drillId: drill.id,
        drillName: drill.name,
        drillNameFr: drill.nameFr,
        drillCategory: drill.category,
        drillIcon: drill.icon,
        reps: totalRepsNow,
        score: finalScore,
        durationSec: elapsed,
        targetReps: drill.targetReps,
      }]
      const totalRepsSum = allResults.reduce((s, r) => s + r.reps, 0)
      const totalDurationSum = allResults.reduce((s, r) => s + r.durationSec, 0)
      const totalScoreAvg = Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length)

      setWorkoutResult({
        drills: allResults,
        totalReps: totalRepsSum,
        totalScore: totalScoreAvg,
        totalDurationSec: totalDurationSum,
      })
      clearPlanExecution()
      navigate('workout-summary')
    } else {
      // More drills remain — show plan-next transition
      setPhase('plan-next')
      setPlanNextCountdown(3)
    }
  }, [drill, elapsedAtEnd, totalDuration, timeRemaining, totalSets, reps, finalScore, planCurrentIndex, planDrillQueue, planResults, advancePlanDrill, setWorkoutResult, clearPlanExecution, navigate, saveMutation])

  // Assign to ref so the useEffect above can call it
  handlePlanDrillCompleteRef.current = handlePlanDrillComplete

  // ── Plan-next countdown timer ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'plan-next') return

    planNextTimerRef.current = setInterval(() => {
      setPlanNextCountdown((prev) => {
        if (prev <= 1) {
          if (planNextTimerRef.current) clearInterval(planNextTimerRef.current)
          // Transition to next drill
          const nextIndex = useAppStore.getState().planCurrentIndex
          const queue = useAppStore.getState().planDrillQueue
          if (nextIndex < queue.length) {
            const nextDrill = queue[nextIndex]
            selectDrill(nextDrill.drillId)
          }
          // Reset all workout state
          setReps(0)
          setCurrentScore(0)
          setFeedback('')
          setFinalScore(0)
          setElapsedAtEnd(0)
          setAiResult(null)
          setAiError('')
          setAiCooldownRemaining(0)
          setCurrentSet(1)
          totalRepsAcrossSetsRef.current = 0
          totalScoreAccumRef.current = []
          repTrackerRef.current = createRepTracker()
          scoresRef.current = []
          halfTimeFiredRef.current = false
          setRepFloatKey(0)
          setPhase('countdown')
          setCountdown(COUNTDOWN_SECONDS)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (planNextTimerRef.current) clearInterval(planNextTimerRef.current)
    }
  }, [phase, selectDrill])

  const handleSave = () => {
    if (!drill) return
    saveMutation.mutate({
      drillId: drill.id,
      reps,
      score: finalScore,
      durationSec: elapsedAtEnd || totalDuration - timeRemaining,
    })
  }

  const handleBackToHub = () => {
    if (isPlanMode) {
      clearPlanExecution()
    }
    navigate('train-hub')
  }

  const handleMuteToggle = () => {
    ensureAudioInit()
    const newMuted = toggleAudioMute()
    setIsMuted(newMuted)
  }

  // ── AI Form Check ─────────────────────────────────────────────────────
  const handleAIFormCheck = useCallback(async () => {
    if (aiLoading || aiCooldownRemaining > 0 || phase !== 'active') return
    if (!videoRef.current) return

    setAiLoading(true)
    setAiError('')
    setAiResult(null)

    try {
      const video = videoRef.current
      const captureCanvas = document.createElement('canvas')
      captureCanvas.width = 640
      captureCanvas.height = 480
      const captureCtx = captureCanvas.getContext('2d')
      if (!captureCtx) throw new Error('Canvas context unavailable')

      captureCtx.translate(640, 0)
      captureCtx.scale(-1, 1)
      captureCtx.drawImage(video, 0, 0, 640, 480)
      captureCanvasRef.current = captureCanvas

      const imageBase64 = captureCanvas.toDataURL('image/jpeg', 0.8)

      const response = await fetch('/api/ai/form-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          drillName: drill?.nameFr ?? drill?.name ?? 'Exercice',
          category: drill?.category ?? 'ball_handling',
          drillInstructions: drill?.instructionsFr ?? drill?.instructions ?? '',
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur serveur')
      }

      const result: AIFormCheckResult = await response.json()
      setAiResult(result)

      if (result.feedback) {
        setFeedback(result.feedback)
      }

      if (typeof result.score === 'number' && result.score > 0) {
        scoresRef.current.push({
          posture: Math.min(90, result.score * 0.8),
          stanceWidth: 50,
          armPosition: Math.min(90, result.score * 0.7),
          movementQuality: result.score,
        })
        setCurrentScore(computeScore(scoresRef.current))
      }
    } catch (err) {
      console.error('AI form check failed:', err)
      setAiError('Vérification IA indisponible. Réessayez.')
    } finally {
      setAiLoading(false)

      setAiCooldownRemaining(10)
      if (aiCooldownTimerRef.current) clearInterval(aiCooldownTimerRef.current)
      aiCooldownTimerRef.current = setInterval(() => {
        setAiCooldownRemaining((prev) => {
          if (prev <= 1) {
            if (aiCooldownTimerRef.current) clearInterval(aiCooldownTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }, [aiLoading, aiCooldownRemaining, phase, drill])

  // ── Derived values ────────────────────────────────────────────────────
  const progressPercent = totalDuration > 0
    ? ((totalDuration - timeRemaining) / totalDuration) * 100
    : 0

  const displayReps = totalSets > 1 ? totalRepsAcrossSetsRef.current + reps : reps
  const targetReps = drill?.targetReps ?? 10

  // ── Loading state ─────────────────────────────────────────────────────
  if (isDrillLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        <p className="text-foreground text-sm">Chargement de l&apos;exercice...</p>
        <Skeleton className="h-3 w-48" />
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-foreground text-lg font-semibold">Erreur</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">{cameraError}</p>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={goBack} className="text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Button onClick={setupCamera} className="bg-orange-500 hover:bg-orange-600 text-white">
            <RotateCcw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="relative z-30 flex items-center justify-between h-12 px-3 bg-black/90 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            ensureAudioInit()
            if (phase === 'active' || phase === 'paused') {
              handleStop()
            }
            if (isPlanMode) clearPlanExecution()
            goBack()
          }}
          className="text-white/80 hover:text-white hover:bg-white/10 -ml-1 rounded-lg"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          {drill && <span className="text-sm">{drill.icon}</span>}
          <h1 className="text-white text-sm font-medium truncate max-w-[140px]">
            {drill?.nameFr ?? 'Exercice'}
          </h1>
          {totalSets > 1 && (
            <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-500/30 bg-orange-500/10 px-1.5 py-0">
              S{currentSet}/{totalSets}
            </Badge>
          )}
          {isPlanMode && (
            <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-500/30 bg-sky-500/10 px-1.5 py-0">
              {planCurrentIndex + 1}/{planDrillQueue.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Circular Timer in header */}
          {(phase === 'active' || phase === 'paused') && (
            <CircularTimer remaining={timeRemaining} total={totalDuration} size={44} />
          )}
          <button
            onClick={handleMuteToggle}
            className="text-white/60 hover:text-white ml-1 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* ── Video Area ───────────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        <div className="relative w-full max-w-2xl" style={{ aspectRatio: '4/3' }}>
          {/* Video */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
          />

          {/* Skeleton Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* MediaPipe loading indicator */}
          {!isModelLoaded && (phase as string) !== 'error' && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5">
              <Loader2 className="h-3.5 w-3.5 text-orange-400 animate-spin" />
              <span className="text-[11px] text-white/80">Modèle IA en cours...</span>
            </div>
          )}

          {/* ── PRÊT? Overlay (before countdown) ────────────────────── */}
          <AnimatePresence>
            {showReady && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
              >
                <motion.div
                  initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: prefersReducedMotion ? 0.05 : 0.5, ease: 'easeOut' as const }}
                  className="text-center"
                >
                  <p className="text-6xl font-black text-white drop-shadow-2xl tracking-tight">
                    PRÊT?
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Countdown Overlay (3-2-1-GO!) ──────────────────────── */}
          <AnimatePresence>
            {phase === 'countdown' && !showReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                <AnimatePresence mode="wait">
                  {countdown > 0 ? (
                    <motion.div
                      key={countdown}
                      variants={prefersReducedMotion ? countPulseReduced : countPulse}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="text-8xl font-black text-white drop-shadow-2xl"
                    >
                      {countdown}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="go"
                      initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      transition={{ duration: prefersReducedMotion ? 0.05 : 0.4, ease: 'easeOut' as const }}
                      className="text-7xl font-black text-orange-400 drop-shadow-2xl"
                    >
                      GO!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>

          {/* ── Active/Paused Overlay UI ───────────────────────────── */}
          {(phase === 'active' || phase === 'paused') && (
            <>
              {/* Score Gauge — left side */}
              <div className="absolute bottom-4 left-3 z-10">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl px-2 pt-2 pb-1 border border-white/10">
                  <ScoreGauge score={currentScore} size={88} />
                </div>
              </div>

              {/* Target Reps — right side top */}
              <div className="absolute top-3 right-3 z-10 text-right">
                <div className="bg-black/40 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                    Objectif
                  </p>
                  <p className="text-sm font-bold text-white tabular-nums leading-none mt-0.5">
                    {Math.min(displayReps, targetReps)}/{targetReps}
                  </p>
                </div>
              </div>

              {/* Rep Counter — center bottom (large) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-center">
                <div className="relative">
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/10">
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                      Répétitions
                    </p>
                    <motion.p
                      key={displayReps}
                      initial={prefersReducedMotion ? {} : { scale: 1.3, color: '#34d399' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: prefersReducedMotion ? 0.05 : 0.3 }}
                      className="text-5xl font-black text-white tabular-nums leading-none mt-0.5"
                    >
                      {displayReps}
                    </motion.p>
                  </div>
                  {/* Floating +1 */}
                  <AnimatePresence>
                    {repFloatKey > 0 && (
                      <FloatingRep key={repFloatKey} />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Paused Overlay */}
              {phase === 'paused' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-15">
                  <div className="text-center">
                    <Pause className="h-16 w-16 text-white/80 mx-auto mb-3" />
                    <p className="text-white text-xl font-bold">En Pause</p>
                    <p className="text-white/50 text-sm mt-1">
                      {formatTime(timeRemaining)} restant
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Rest Overlay ───────────────────────────────────────── */}
          <AnimatePresence>
            {phase === 'rest' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20"
              >
                <div className="text-center space-y-6">
                  {/* Rest label */}
                  <motion.div
                    initial={prefersReducedMotion ? {} : { y: -10 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-white/60 text-sm font-medium uppercase tracking-widest">
                      Pause Repos
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      Série {currentSet}/{totalSets} terminée
                    </p>
                  </motion.div>

                  {/* Rest timer circle */}
                  <div className="flex justify-center">
                    <div className="bg-black/50 backdrop-blur-md rounded-full p-4 border border-white/10">
                      <motion.p
                        key={restRemaining}
                        initial={prefersReducedMotion ? {} : { scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-6xl font-black text-white tabular-nums"
                      >
                        {restRemaining}
                      </motion.p>
                      <p className="text-white/40 text-xs text-center mt-1">secondes</p>
                    </div>
                  </div>

                  {/* Rest controls */}
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExtendRest}
                      className="gap-1.5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-full px-4"
                    >
                      <Plus className="h-4 w-4" />
                      +15s
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSkipRest}
                      className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4"
                    >
                      <SkipForward className="h-4 w-4" />
                      Passer
                    </Button>
                  </div>

                  {/* Rest duration selector */}
                  <div className="flex items-center justify-center gap-2">
                    <Timer className="h-3 w-3 text-white/40" />
                    <span className="text-white/40 text-[11px]">Durée repos:</span>
                    {REST_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setRestDuration(opt)}
                        className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                          restDuration === opt
                            ? 'bg-orange-500/30 text-orange-400 border border-orange-500/40'
                            : 'text-white/40 hover:text-white/60 border border-white/10'
                        }`}
                      >
                        {opt}s
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Plan-Next Transition Overlay ──────────────────────────── */}
          <AnimatePresence>
            {phase === 'plan-next' && (
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-md"
              >
                <div className="text-center space-y-4">
                  {/* Progress indicator */}
                  <p className="text-white/50 text-sm font-medium uppercase tracking-widest">
                    Exercice {planCurrentIndex + 1} / {planDrillQueue.length}
                  </p>
                  <div className="w-full max-w-[200px] mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${((planCurrentIndex) / planDrillQueue.length) * 100}%` }}
                    />
                  </div>

                  {/* "NEXT" label */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-2">Suivant</p>
                    <div className="flex items-center justify-center gap-3">
                      {(() => {
                        const nextDrill = planDrillQueue[planCurrentIndex]
                        return nextDrill ? (
                          <>
                            <span className="text-3xl">{nextDrill.icon}</span>
                            <p className="text-white text-xl font-bold">{nextDrill.nameFr}</p>
                          </>
                        ) : null
                      })()}
                    </div>
                  </motion.div>

                  {/* Countdown */}
                  <motion.div
                    key={planNextCountdown}
                    initial={prefersReducedMotion ? {} : { scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-20 h-20 mx-auto rounded-full bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center"
                  >
                    <span className="text-4xl font-black text-orange-400 tabular-nums">
                      {planNextCountdown}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Completion Overlay ─────────────────────────────────── */}
          <AnimatePresence>
            {phase === 'completed' && !isPlanMode && (
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-md"
              >
                <Card className="w-[90%] max-w-sm bg-gray-900 border-gray-700 text-white shadow-2xl">
                  <CardContent className="p-6 space-y-5">
                    {/* Header */}
                    <div className="text-center">
                      <div className="text-3xl mb-2">🏆</div>
                      <h2 className="text-xl font-bold">Session Terminée!</h2>
                      {drill && (
                        <p className="text-white/50 text-sm mt-1">
                          {drill.nameFr}
                          {totalSets > 1 && <span className="text-white/30"> · {totalSets} séries</span>}
                        </p>
                      )}
                    </div>

                    {/* Stars */}
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-7 w-7 transition-colors ${
                            i < getStarCount(finalScore)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-orange-400 tabular-nums">
                          {displayReps}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                          Réps
                        </p>
                      </div>
                      <div
                        className={`rounded-xl p-3 text-center border ${getScoreBgColor(
                          finalScore,
                        )}`}
                      >
                        <p
                          className={`text-2xl font-black tabular-nums ${getScoreColor(
                            finalScore,
                          )}`}
                        >
                          {finalScore}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                          Score
                        </p>
                      </div>
                      <div className="bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-white tabular-nums">
                          {formatTime(elapsedAtEnd || totalDuration - timeRemaining)}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                          Durée
                        </p>
                      </div>
                    </div>

                    {/* Form badge */}
                    <div className="flex justify-center">
                      <Badge
                        className={`text-xs font-semibold px-3 py-1 ${
                          finalScore >= 80
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : finalScore >= 50
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        {finalScore >= 80
                          ? 'Excellente forme'
                          : finalScore >= 50
                            ? 'Bonne forme'
                            : 'À améliorer'}
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2.5 pt-1">
                      <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25"
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Sauvegarder
                      </Button>
                      <div className="grid grid-cols-2 gap-2.5">
                        <Button
                          variant="outline"
                          onClick={handleRestart}
                          className="h-11 border-gray-600 text-white hover:bg-gray-800 rounded-xl"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Refaire
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleBackToHub}
                          className="h-11 border-gray-600 text-white hover:bg-gray-800 rounded-xl"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Retour
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Camera off placeholder if no stream */}
        {!streamRef.current && phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3">
            <Camera className="h-12 w-12" />
            <p className="text-sm">Initialisation de la caméra...</p>
          </div>
        )}
      </div>

      {/* ── Bottom Panel ────────────────────────────────────────────── */}
      <div className="bg-background border-t border-border px-4 py-3 space-y-3">
        {/* Sets & Rest Config (visible before workout starts or during countdown) */}
        {(phase === 'countdown' || phase === 'loading' || showReady) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Séries:</span>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    ensureAudioInit()
                    setTotalSets(n)
                  }}
                  disabled={phase !== 'countdown' && phase !== 'loading' && !showReady}
                  className={`text-xs w-7 h-7 rounded-full transition-colors ${
                    totalSets === n
                      ? 'bg-orange-500 text-white font-bold'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  } disabled:opacity-50`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Repos:</span>
              {REST_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    ensureAudioInit()
                    setRestDuration(opt)
                  }}
                  className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                    restDuration === opt
                      ? 'bg-orange-500/20 text-orange-500 font-semibold border border-orange-500/30'
                      : 'text-muted-foreground border border-border hover:bg-muted'
                  }`}
                >
                  {opt}s
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Feedback Area */}
        <AnimatePresence mode="wait">
          {(aiResult || aiError) && (phase === 'active' || phase === 'paused') && (
            <motion.div
              key={aiResult?.feedback ?? aiError}
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-border px-4 py-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Vérification IA
                  </span>
                  {aiResult && (
                    <span
                      className={`ml-auto text-sm font-bold tabular-nums ${getScoreColor(aiResult.score)}`}
                    >
                      {aiResult.score}/100
                    </span>
                  )}
                </div>

                {aiError ? (
                  <p className="text-red-400 text-sm text-center">{aiError}</p>
                ) : aiResult ? (
                  <p className="text-foreground text-sm text-center font-medium">
                    {aiResult.feedback}
                  </p>
                ) : null}

                {aiResult?.issues && aiResult.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {aiResult.issues.map((issue, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[11px] bg-red-500/10 text-red-400 border-red-500/20"
                      >
                        {issue}
                      </Badge>
                    ))}
                  </div>
                )}

                {aiResult?.goodPoints && aiResult.goodPoints.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {aiResult.goodPoints.map((point, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      >
                        {point}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Local feedback (when no AI result) */}
          {feedback && !aiResult && !aiError && (phase === 'active' || phase === 'paused') && (
            <motion.div
              key={feedback}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border border-border px-4 py-2.5"
            >
              <p className="text-foreground text-sm font-medium text-center">
                {feedback}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Check Button */}
        {(phase === 'active' || phase === 'paused') && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIFormCheck}
              disabled={aiLoading || aiCooldownRemaining > 0 || phase === 'paused'}
              className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 disabled:opacity-50 disabled:hover:bg-transparent rounded-full px-4"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiLoading ? (
                'Analyse en cours...'
              ) : aiCooldownRemaining > 0 ? (
                <span className="tabular-nums">Réessayer dans {aiCooldownRemaining}s</span>
              ) : (
                'Vérification IA'
              )}
            </Button>
          </div>
        )}

        {/* Progress Bar */}
        {(phase === 'active' || phase === 'paused') && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Progression</span>
              <span className="tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' as const }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Stop button */}
          {(phase === 'active' || phase === 'paused') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStop}
              className="h-12 w-12 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
              aria-label="Arrêter"
            >
              <Square className="h-5 w-5" />
            </Button>
          )}

          {/* Pause / Resume */}
          {phase === 'active' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePause}
              className="h-14 w-14 rounded-full bg-primary/10 text-foreground hover:bg-primary/20 transition-colors border border-border"
              aria-label="Pause"
            >
              <Pause className="h-6 w-6" />
            </Button>
          )}

          {phase === 'paused' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResume}
              className="h-14 w-14 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
              aria-label="Reprendre"
            >
              <Play className="h-6 w-6 ml-0.5" />
            </Button>
          )}

          {/* Camera indicator */}
          {phase === 'active' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>EN DIRECT</span>
            </div>
          )}

          {phase === 'paused' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
              <Pause className="h-3 w-3" />
              <span>PAUSE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}