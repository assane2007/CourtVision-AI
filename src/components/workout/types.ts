// ─── Types ───────────────────────────────────────────────────────────────────

export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export type WorkoutPhase =
  | 'loading'
  | 'countdown'
  | 'active'
  | 'paused'
  | 'rest'
  | 'completed'
  | 'plan-next'
  | 'error'

export interface Drill {
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

export interface RepTracker {
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

export interface ScoreDetail {
  posture: number
  stanceWidth: number
  armPosition: number
  movementQuality: number
}

export interface AIFormCheckResult {
  score: number
  feedback: string
  issues: string[]
  goodPoints: string[]
}

// ─── MediaPipe Pose Connections ──────────────────────────────────────────────

export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
]

// ─── Constants ───────────────────────────────────────────────────────────────

export const REP_DEBOUNCE_MS = 500
export const LANDMARK_COLOR = '#f97316'
export const LANDMARK_RADIUS = 5
export const CONNECTION_WIDTH = 3
export const COUNTDOWN_SECONDS = 3
export const COUNTDOWN_READY_MS = 800
export const AI_CHECK_COOLDOWN_MS = 10_000
export const HALF_WARNING_THRESHOLD = 0.5
export const REST_OPTIONS = [10, 15, 30, 60] as const
export const DEFAULT_REST_SEC = 15
export const DEFAULT_SETS = 1

export const FEEDBACK_MESSAGES = {
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
} as const

export const SCORE_COLORS: Record<string, string> = {
  green: 'text-emerald-400',
  orange: 'text-orange-400',
  red: 'text-red-400',
}

export const SCORE_BG_COLORS: Record<string, string> = {
  green: 'bg-emerald-500/20 border-emerald-500/30',
  orange: 'bg-orange-500/20 border-orange-500/30',
  red: 'bg-red-500/20 border-red-500/30',
}

// ─── Animation Variants ──────────────────────────────────────────────────────

export const overlayVariants = {
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

export const countPulse = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: [0.5, 1.2, 1],
    opacity: [0, 1, 1],
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
  exit: { scale: 1.5, opacity: 0, transition: { duration: 0.3 } },
}

export const countPulseReduced = {
  initial: { scale: 1, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.05 } },
}