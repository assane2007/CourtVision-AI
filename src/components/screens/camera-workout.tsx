'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAppStore } from '@/stores/app'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Camera,
  Loader2,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { apiFetch } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import {
  initAudio,
  toggleMute as toggleAudioMute,
  setMuted as setAudioMuted,
  playSound,
  destroyAudio,
} from '@/lib/audio'

// ─── Module Imports ─────────────────────────────────────────────────────────

import type {
  Drill,
  WorkoutPhase,
  RepTracker,
  ScoreDetail,
  AIFormCheckResult,
  Landmark,
} from '@/components/workout/types'
import {
  COUNTDOWN_SECONDS,
  COUNTDOWN_READY_MS,
  HALF_WARNING_THRESHOLD,
  DEFAULT_SETS,
  DEFAULT_REST_SEC,
  FEEDBACK_MESSAGES,
  overlayVariants,
} from '@/components/workout/types'
import {
  createRepTracker,
  computeScore,
  analyzeForm,
  detectRep,
  drawSkeleton,
} from '@/components/workout/scoring'
import { useMediaPipe } from '@/components/workout/use-media-pipe'
import { useCamera } from '@/components/workout/use-camera'
import { PoseCanvas } from '@/components/workout/pose-canvas'
import {
  CircularTimer,
  ActiveOverlay,
  CompletionOverlay,
} from '@/components/workout/score-display'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BottomPanel } from '@/components/workout/control-bar'
import {
  ReadyOverlay,
  CountdownOverlay,
  RestOverlay,
  PlanNextOverlay,
} from '@/components/workout/countdown-overlay'

// ─── Component ───────────────────────────────────────────────────────────────

export default function CameraWorkoutScreen() {
  const { t } = useTranslation()
  const {
    selectedDrillId,
    goBack,
    navigate,
    planDrillQueue,
    planCurrentIndex,
    planResults,
    advancePlanDrill,
    setWorkoutResult,
    clearPlanExecution,
    selectDrill,
  } = useAppStore()
  const isPlanMode = planDrillQueue.length > 0
  const queryClient = useQueryClient()

  // Check for reduced-motion preference
  const prefersReducedMotion = useReducedMotion() ?? false

  // ── Refs ──────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
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

  // ── Hooks ─────────────────────────────────────────────────────────────
  const { poseLandmarkerRef, isModelLoaded, error: mpError } = useMediaPipe()
  const { streamRef, cameraError: camError, startCamera, stopCamera } = useCamera(videoRef)

  const cameraError = camError || mpError

  // ── State ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<WorkoutPhase>('loading')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [showReady, setShowReady] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [reps, setReps] = useState(0)
  const [currentScore, setCurrentScore] = useState(0)
  const [feedback, setFeedback] = useState('')
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

  // Plan-next countdown state
  const [planNextCountdown, setPlanNextCountdown] = useState(3)
  const planNextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Sync MediaPipe error to phase
  useEffect(() => {
    if (mpError) {
      setPhase('error')
    }
  }, [mpError])

  // Sync camera error to phase
  useEffect(() => {
    if (camError && phase === 'loading') {
      setPhase('error')
    }
  }, [camError, phase])

  // ── Fetch drill ───────────────────────────────────────────────────────
  interface DrillsResponse { drills: Drill[]; favoriteIds: string[]; total: number }
  const { data, isLoading: isDrillLoading } = useQuery<DrillsResponse>({
    queryKey: ['drills'],
    queryFn: () => apiFetch('/api/drills'),
  })

  const drill: Drill | undefined = data?.drills?.find(
    (d: Drill) => d.id === selectedDrillId,
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
      apiFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // Refs for use in timer intervals (avoids stale closures)
  const handleWorkoutEndRef = useRef(handleWorkoutEnd)
  handleWorkoutEndRef.current = handleWorkoutEnd
  const startNextSetRef = useRef(startNextSet)
  startNextSetRef.current = startNextSet

  // ── Setup camera and start workout flow ──────────────────────────────
  const setupCameraAndStart = useCallback(async () => {
    try {
      await startCamera()
      // Show "PRÊT?" first, then start countdown
      setShowReady(true)
      ensureAudioInit()
      playSound('countdown-tick') // Audio cue for ready
      setTimeout(() => {
        setShowReady(false)
        setPhase('countdown')
        setCountdown(COUNTDOWN_SECONDS)
      }, COUNTDOWN_READY_MS)
    } catch {
      setPhase('error')
    }
  }, [startCamera, ensureAudioInit])

  // ── Start camera as soon as drill is loaded (don't wait for MediaPipe) ─
  const cameraStartedRef = useRef(false)
  useEffect(() => {
    if (!isDrillLoading && !cameraStartedRef.current) {
      cameraStartedRef.current = true
      setupCameraAndStart()
    }
  }, [isDrillLoading, setupCameraAndStart])

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
          setTimeout(() => handleWorkoutEndRef.current(), 500)
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
          startNextSetRef.current()
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

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (restTimerRef.current) clearInterval(restTimerRef.current)
      if (restPulseTimerRef.current) clearInterval(restPulseTimerRef.current)
      if (aiCooldownTimerRef.current) clearInterval(aiCooldownTimerRef.current)
      if (planNextTimerRef.current) clearInterval(planNextTimerRef.current)
      // Dispose MediaPipe PoseLandmarker to free GPU/WASM memory
      const pl = poseLandmarkerRef.current as { close?: () => void } | null
      pl?.close?.()
      destroyAudio()
    }
  }, [stopCamera, poseLandmarkerRef])

  // ── Auto-transition in plan mode when drill completes ────────────────
  const handlePlanDrillCompleteRef = useRef<() => void>(() => {})

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

      const result: AIFormCheckResult = await apiFetch('/api/ai/form-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          drillName: drill?.nameFr ?? drill?.name ?? 'Exercice',
          category: drill?.category ?? 'ball_handling',
          drillInstructions: drill?.instructionsFr ?? drill?.instructions ?? '',
        }),
      })
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
      if (process.env.NODE_ENV === 'development') console.error('AI form check failed:', err)
      setAiError(t('error.serverError'))
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
          <Button onClick={setupCameraAndStart} className="bg-orange-500 hover:bg-orange-600 text-white">
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
            aria-label="Flux de la caméra"
          />

          {/* Skeleton Canvas */}
          <PoseCanvas canvasRef={canvasRef} />

          {/* MediaPipe loading indicator */}
          {!isModelLoaded && (phase as string) !== 'error' && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5">
              <Loader2 className="h-3.5 w-3.5 text-orange-400 animate-spin" />
              <span className="text-[11px] text-white/80">Modèle IA en cours...</span>
            </div>
          )}

          {/* ── PRÊT? & Countdown Overlays ─────────────────────────── */}
          <ReadyOverlay show={showReady} prefersReducedMotion={prefersReducedMotion} />
          <CountdownOverlay
            phase={phase}
            countdown={countdown}
            showReady={showReady}
            prefersReducedMotion={prefersReducedMotion}
          />

          {/* ── Active/Paused Overlay UI ───────────────────────────── */}
          {(phase === 'active' || phase === 'paused') && (
            <ActiveOverlay
              phase={phase}
              currentScore={currentScore}
              displayReps={displayReps}
              targetReps={targetReps}
              repFloatKey={repFloatKey}
              timeRemaining={timeRemaining}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}

          {/* ── Rest Overlay ───────────────────────────────────────── */}
          <RestOverlay
            phase={phase}
            currentSet={currentSet}
            totalSets={totalSets}
            restRemaining={restRemaining}
            restDuration={restDuration}
            prefersReducedMotion={prefersReducedMotion}
            onExtendRest={handleExtendRest}
            onSkipRest={handleSkipRest}
            onSetRestDuration={setRestDuration}
          />

          {/* ── Plan-Next Transition Overlay ───────────────────────── */}
          <PlanNextOverlay
            phase={phase}
            planCurrentIndex={planCurrentIndex}
            planDrillQueueLength={planDrillQueue.length}
            planNextCountdown={planNextCountdown}
            prefersReducedMotion={prefersReducedMotion}
            getNextDrill={() => {
              const nextDrill = planDrillQueue[planCurrentIndex]
              return nextDrill ? { icon: nextDrill.icon, nameFr: nextDrill.nameFr } : null
            }}
          />

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
                <CompletionOverlay
                  drill={drill}
                  totalSets={totalSets}
                  finalScore={finalScore}
                  displayReps={displayReps}
                  elapsedAtEnd={elapsedAtEnd}
                  totalDuration={totalDuration}
                  timeRemaining={timeRemaining}
                  isSavePending={saveMutation.isPending}
                  onSave={handleSave}
                  onRestart={handleRestart}
                  onBack={handleBackToHub}
                />
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
      <BottomPanel
        phase={phase}
        showReady={showReady}
        totalSets={totalSets}
        restDuration={restDuration}
        progressPercent={progressPercent}
        feedback={feedback}
        aiResult={aiResult}
        aiError={aiError}
        aiLoading={aiLoading}
        aiCooldownRemaining={aiCooldownRemaining}
        onSetTotalSets={setTotalSets}
        onSetRestDuration={setRestDuration}
        onEnsureAudioInit={ensureAudioInit}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onAICheck={handleAIFormCheck}
      />
      {(phase !== 'active' && phase !== 'countdown' && phase !== 'rest') && <BottomNav />}
    </div>
  )
}