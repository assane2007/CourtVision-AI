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
} from 'lucide-react'

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
  | 'completed'
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
const AI_CHECK_COOLDOWN_MS = 10_000

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
  const avg =
    recent.reduce(
      (sum, s) =>
        sum +
        (s.posture * 0.3 +
          s.stanceWidth * 0.2 +
          s.armPosition * 0.25 +
          s.movementQuality * 0.25),
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

  // Posture: shoulders level?
  const shoulderDy = Math.abs(lShoulder.y - rShoulder.y)
  const postureScore = Math.max(0, Math.min(100, 100 - shoulderDy * 500))

  // Stance width: ankle distance
  const ankleDist = Math.abs(lAnkle.x - rAnkle.x)
  let stanceScore = 50
  if (ankleDist > 0.15 && ankleDist < 0.45) stanceScore = 90
  else if (ankleDist > 0.1 && ankleDist < 0.55) stanceScore = 70
  else if (ankleDist < 0.1) stanceScore = 30
  else stanceScore = 40

  // Arm position: depends on category
  let armScore = 70
  const avgWristY = (lWrist.y + rWrist.y) / 2
  const avgShoulderY = (lShoulder.y + rShoulder.y) / 2
  if (category === 'shooting') {
    const wristAbove = avgShoulderY - avgWristY
    armScore = Math.min(100, Math.max(0, 50 + wristAbove * 300))
  } else if (category === 'defense') {
    const wristBelow = avgWristY - avgShoulderY
    armScore = Math.min(100, Math.max(0, 50 + wristBelow * 200))
  } else if (category === 'ball_handling' || category === 'pocket_ball') {
    armScore = avgWristY > avgShoulderY ? 85 : 55
  }

  // Movement quality: velocity variance
  const velocities = tracker.velocityHistory
  let moveScore = 70
  if (velocities.length > 5) {
    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length
    const variance =
      velocities.reduce((sum, v) => sum + (v - mean) ** 2, 0) / velocities.length
    moveScore = Math.max(0, Math.min(100, 100 - variance * 10000))
  }

  const score: ScoreDetail = {
    posture: postureScore,
    stanceWidth: stanceScore,
    armPosition: armScore,
    movementQuality: moveScore,
  }

  // Feedback generation
  let feedback = ''
  const hipMidX = (lHip.x + rHip.x) / 2
  const shoulderMidX = (lShoulder.x + rShoulder.x) / 2
  const lean = hipMidX - shoulderMidX

  if (postureScore > 85 && armScore > 80) {
    feedback = FEEDBACK_MESSAGES.goodPosture
  }
  if (Math.abs(lean) > 0.04) {
    feedback = FEEDBACK_MESSAGES.leanRight
  }
  if (category === 'shooting' && avgWristY > avgShoulderY + 0.05) {
    feedback = FEEDBACK_MESSAGES.armsLow
  }
  if (ankleDist < 0.12 && category !== 'shooting') {
    feedback = FEEDBACK_MESSAGES.narrowStance
  }
  if (ankleDist > 0.5 && category !== 'finishing') {
    feedback = FEEDBACK_MESSAGES.wideStance
  }
  if (velocities.length > 3) {
    const recentSpeed = velocities.slice(-3).reduce((a, b) => a + b, 0) / 3
    if (recentSpeed < 0.001) {
      feedback = FEEDBACK_MESSAGES.tooSlow
    } else if (recentSpeed > 0.005) {
      feedback = FEEDBACK_MESSAGES.goodSpeed
    }
  }
  if (postureScore > 90 && moveScore > 80) {
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

  // Helper: compute velocity from position history
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

      // Count a "rep" for every ~0.5 total accumulated movement
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

  // Draw connections
  ctx.strokeStyle = LANDMARK_COLOR
  ctx.lineWidth = CONNECTION_WIDTH
  ctx.lineCap = 'round'

  for (const [i, j] of POSE_CONNECTIONS) {
    const a = landmarks[i]
    const b = landmarks[j]
    if (!a || !b) continue
    if ((a.visibility ?? 0) < 0.5 || (b.visibility ?? 0) < 0.5) continue

    // Mirror X coordinates
    const ax = (1 - a.x) * width
    const ay = a.y * height
    const bx = (1 - b.x) * width
    const by = b.y * height

    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  // Draw landmarks
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CameraWorkoutScreen() {
  const { selectedDrillId, goBack, navigate } = useAppStore()
  const queryClient = useQueryClient()

  // ── Refs ──────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseLandmarkerRef = useRef<unknown>(null)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const repTrackerRef = useRef<RepTracker>(createRepTracker())
  const scoresRef = useRef<ScoreDetail[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const pauseAccumRef = useRef<number>(0)
  const aiCooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef<WorkoutPhase>('loading')

  // ── State ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<WorkoutPhase>('loading')
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [reps, setReps] = useState(0)
  const [currentScore, setCurrentScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [elapsedAtEnd, setElapsedAtEnd] = useState(0)
  const [finalScore, setFinalScore] = useState(0)

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
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase('countdown')
      setCountdown(COUNTDOWN_SECONDS)
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Caméra non autorisée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.'
          : 'Impossible d\'accéder à la caméra. Vérifiez que votre appareil dispose d\'une caméra.'
      setCameraError(msg)
      setPhase('error')
    }
  }, [])

  // ── Start camera when model is loaded ─────────────────────────────────
  useEffect(() => {
    if (isModelLoaded && !isDrillLoading) {
      setupCamera()
    }
  }, [isModelLoaded, isDrillLoading, setupCamera])

  // ── Countdown logic ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          setPhase('active')
          setTimeRemaining(totalDuration)
          startTimeRef.current = Date.now()
          pauseAccumRef.current = 0
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [phase, totalDuration])

  // ── Timer logic (active phase) ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleWorkoutEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

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
          // Draw skeleton
          drawSkeleton(ctx, detectedLandmarks, canvas.width, canvas.height)

          // Rep detection
          const { rep, updatedTracker } = detectRep(
            detectedLandmarks,
            category,
            repTrackerRef.current,
            Date.now(),
          )
          repTrackerRef.current = updatedTracker

          if (rep) {
            setReps((prev) => prev + 1)
          }

          // Form scoring (every 3 frames for perf)
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

            // Keep going message after 5 reps
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

  // ── Handle workout end ────────────────────────────────────────────────
  const handleWorkoutEnd = useCallback(() => {
    if (phaseRef.current === 'completed') return

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current)

    // Stop detection loop
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    // Stop AI cooldown
    if (aiCooldownTimerRef.current) clearInterval(aiCooldownTimerRef.current)

    const elapsedSec = Math.round(
      (Date.now() - startTimeRef.current - pauseAccumRef.current) / 1000,
    )
    setElapsedAtEnd(Math.min(elapsedSec, totalDuration))

    const score = computeScore(scoresRef.current)
    setFinalScore(score)
    setPhase('completed')
  }, [totalDuration])

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (aiCooldownTimerRef.current) clearInterval(aiCooldownTimerRef.current)
    }
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handlePause = () => {
    if (phase === 'active') {
      if (timerRef.current) clearInterval(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      pausedAtRef.current = Date.now()
      setPhase('paused')
    }
  }

  const handleResume = () => {
    if (phase === 'paused') {
      pauseAccumRef.current += Date.now() - pausedAtRef.current
      setPhase('active')
    }
  }

  const handleStop = () => {
    handleWorkoutEnd()
  }

  const handleRestart = () => {
    // Reset state
    setReps(0)
    setCurrentScore(0)
    setFeedback('')
    setFinalScore(0)
    setElapsedAtEnd(0)
    setAiResult(null)
    setAiError('')
    setAiCooldownRemaining(0)
    repTrackerRef.current = createRepTracker()
    scoresRef.current = []

    // Start countdown again
    setPhase('countdown')
    setCountdown(COUNTDOWN_SECONDS)
  }

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
    navigate('train-hub')
  }

  // ── AI Form Check ─────────────────────────────────────────────────────
  const handleAIFormCheck = useCallback(async () => {
    if (aiLoading || aiCooldownRemaining > 0 || phase !== 'active') return
    if (!videoRef.current) return

    setAiLoading(true)
    setAiError('')
    setAiResult(null)

    try {
      // Capture current video frame to an offscreen canvas
      const video = videoRef.current
      const captureCanvas = document.createElement('canvas')
      captureCanvas.width = 640
      captureCanvas.height = 480
      const captureCtx = captureCanvas.getContext('2d')
      if (!captureCtx) throw new Error('Canvas context unavailable')

      // Mirror the capture to match what the user sees
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

      // Update feedback with AI response
      if (result.feedback) {
        setFeedback(result.feedback)
      }

      // Update score based on AI response if it returned a valid score
      if (typeof result.score === 'number' && result.score > 0) {
        scoresRef.current.push({
          posture: result.score,
          stanceWidth: result.score,
          armPosition: result.score,
          movementQuality: result.score,
        })
        setCurrentScore(computeScore(scoresRef.current))
      }
    } catch (err) {
      console.error('AI form check failed:', err)
      setAiError('Vérification IA indisponible. Réessayez.')
    } finally {
      setAiLoading(false)

      // Start cooldown
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

  // ── Loading state ─────────────────────────────────────────────────────
  if (phase === 'loading' || isDrillLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        <p className="text-foreground text-sm">Chargement du modèle IA...</p>
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
            if (phase === 'active' || phase === 'paused') {
              handleStop()
            }
            goBack()
          }}
          className="text-white/80 hover:text-white hover:bg-white/10 -ml-1 rounded-lg"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          {drill && <span className="text-sm">{drill.icon}</span>}
          <h1 className="text-white text-sm font-medium truncate max-w-[180px]">
            {drill?.nameFr ?? 'Exercice'}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Timer in header */}
          {(phase === 'active' || phase === 'paused') && (
            <div
              className={`font-mono text-lg font-bold tabular-nums ${
                timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}
            >
              {formatTime(timeRemaining)}
            </div>
          )}
          <button
            onClick={() => setIsMuted(!isMuted)}
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

          {/* ── Countdown Overlay ──────────────────────────────────── */}
          <AnimatePresence>
            {phase === 'countdown' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={countdown}
                    variants={countPulse}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-8xl font-black text-white drop-shadow-2xl"
                  >
                    {countdown}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>

          {/* ── Active/Paused Overlay UI ───────────────────────────── */}
          {(phase === 'active' || phase === 'paused') && (
            <>
              {/* Rep Count - top right */}
              <div className="absolute top-3 right-3 z-10 text-right">
                <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                    Répétitions
                  </p>
                  <p className="text-4xl font-black text-white tabular-nums leading-none mt-0.5">
                    {reps}
                  </p>
                  {drill && (
                    <p className="text-[10px] text-white/40 mt-1">
                      Objectif: {drill.targetReps}
                    </p>
                  )}
                </div>
              </div>

              {/* Score - top left */}
              <div
                className={`absolute top-3 left-3 z-10 border rounded-xl px-4 py-2 backdrop-blur-sm ${
                  getScoreBgColor(currentScore)
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                  Score
                </p>
                <p
                  className={`text-3xl font-black tabular-nums leading-none mt-0.5 ${getScoreColor(
                    currentScore,
                  )}`}
                >
                  {currentScore}
                </p>
                <p className="text-[10px] text-white/40 mt-1">/ 100</p>
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

          {/* ── Completion Overlay ─────────────────────────────────── */}
          <AnimatePresence>
            {phase === 'completed' && (
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
                          {reps}
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
                {/* AI Label */}
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

                {/* Feedback text */}
                {aiError ? (
                  <p className="text-red-400 text-sm text-center">{aiError}</p>
                ) : aiResult ? (
                  <p className="text-foreground text-sm text-center font-medium">
                    {aiResult.feedback}
                  </p>
                ) : null}

                {/* Issues pills */}
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

                {/* Good points pills */}
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