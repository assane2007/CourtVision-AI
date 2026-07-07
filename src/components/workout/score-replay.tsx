'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Sparkles, Trophy, Clock, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { WorkoutDrillResult } from '@/stores/app'
import { getGaugeColor, getGaugeTrackColor, getStarCount, formatTime } from './scoring'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScoreReplayProps {
  drills: WorkoutDrillResult[]
  totalScore: number
  totalReps: number
  totalDurationSec: number
}

type Speed = 0.5 | 1 | 2

type ReplayPhase = 'intro' | 'drill' | 'final' | 'done'

// ─── Constants ─────────────────────────────────────────────────────────────────

const DRILL_DURATION_MS = 3000  // Time per drill in replay
const INTRO_DURATION_MS = 1500
const FINAL_DURATION_MS = 2500
const SPEED_OPTIONS: { label: string; value: Speed }[] = [
  { label: '0,5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDurationShort(totalSec: number): string {
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}min ${sec.toString().padStart(2, '0')}`
}

function getGradeEmoji(score: number): string {
  if (score > 80) return '🏆'
  if (score > 60) return '🔥'
  if (score > 40) return '💪'
  return '📈'
}

function getGradeLabel(score: number): string {
  if (score > 80) return 'EXCELLENT'
  if (score > 60) return 'TRÈS BIEN'
  if (score > 40) return 'BIEN'
  return 'À AMÉLIORER'
}

function getGradeColor(score: number): string {
  if (score > 80) return 'text-amber-400'
  if (score > 60) return 'text-orange-400'
  if (score > 40) return 'text-emerald-400'
  return 'text-sky-400'
}

// ─── Mini Score Gauge (SVG semi-circle) ────────────────────────────────────────

function MiniScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = Math.PI * radius

  const progress = Math.min(1, Math.max(0, score / 100))
  const dashOffset = circumference * (1 - progress)
  const color = getGaugeColor(score)
  const trackColor = getGaugeTrackColor(score)

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      <path
        d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <motion.path
        d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 0.8, ease: 'easeOut' as const }}
      />
      <motion.text
        x={center}
        y={center - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ fontSize: '28px', fontWeight: 900, fill: color }}
      >
        {score}
      </motion.text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.35)"
        style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em' }}
      >
        SCORE
      </text>
    </svg>
  )
}

// ─── Celebration Particles ─────────────────────────────────────────────────────

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  vx: number
  vy: number
}

function CelebrationBurst() {
  const particles = useMemo(() => {
    const colors = ['#f97316', '#fbbf24', '#ffffff', '#fed7aa', '#fb923c', '#f59e0b']
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 45 + (Math.random() - 0.5) * 10,
      size: 3 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vx: (Math.random() - 0.5) * 12,
      vy: -(3 + Math.random() * 10),
    }))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [1, 1, 0],
            x: [0, p.vx * 4, p.vx * 10],
            y: [0, p.vy * 6, p.vy * 16],
            scale: [0, 1.2, 0.4],
          }}
          transition={{
            duration: 2,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: Math.random() * 0.2,
          }}
        />
      ))}
    </div>
  )
}

// ─── Drill Step Card ───────────────────────────────────────────────────────────

function DrillStepCard({ drill, progress }: { drill: WorkoutDrillResult; progress: number }) {
  const displayScore = Math.round(drill.score * Math.min(1, progress))
  const displayReps = Math.round(drill.reps * Math.min(1, progress))

  return (
    <motion.div
      key={drill.drillId}
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' as const }}
      className="flex flex-col items-center text-center"
    >
      {/* Drill icon */}
      <motion.div
        className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-4"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
      >
        {drill.drillIcon}
      </motion.div>

      {/* Drill name */}
      <motion.p
        className="text-lg font-bold text-white mb-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {drill.drillNameFr}
      </motion.p>

      {/* Duration */}
      <motion.div
        className="flex items-center gap-1.5 text-white/40 text-xs mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Clock className="h-3.5 w-3.5" />
        {formatDurationShort(drill.durationSec)}
      </motion.div>

      {/* Score gauge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <MiniScoreGauge score={displayScore} size={130} />
      </motion.div>

      {/* Reps + target */}
      <motion.div
        className="flex items-center gap-4 mt-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex flex-col items-center">
          <Target className="h-4 w-4 text-orange-400 mb-1" />
          <p className="text-2xl font-black text-white tabular-nums">{displayReps}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">
            Répétitions
          </p>
        </div>
        {drill.targetReps > 0 && (
          <div className="w-px h-10 bg-white/10" />
        )}
        {drill.targetReps > 0 && (
          <div className="flex flex-col items-center">
            <div className="h-4 mb-1" /> {/* spacer for alignment */}
            <p className="text-2xl font-black text-white/50 tabular-nums">{drill.targetReps}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Objectif
            </p>
          </div>
        )}
      </motion.div>

      {/* Personal best badge */}
      {drill.isPersonalBest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
        >
          <Badge className="mt-3 text-xs px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30">
            🏅 Nouveau record personnel
          </Badge>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ScoreReplay({ drills, totalScore, totalReps, totalDurationSec }: ScoreReplayProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeed] = useState<Speed>(1)
  const [phase, setPhase] = useState<ReplayPhase>('intro')
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0)
  const [drillProgress, setDrillProgress] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)

  const animFrameRef = useRef<number>(0)
  const lastTimestampRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  // Snapshot of mutable state needed inside the rAF loop
  const stateSnapshotRef = useRef({ elapsedMs: 0, currentDrillIndex: 0 })

  // Total replay duration
  const totalReplayMs = useMemo(() => {
    return INTRO_DURATION_MS + (drills.length * DRILL_DURATION_MS) + FINAL_DURATION_MS
  }, [drills.length])

  // Calculate overall progress (0-1) for timeline
  const overallProgress = useMemo(() => {
    if (phase === 'intro') {
      return 0
    }
    if (phase === 'drill') {
      const drillStart = INTRO_DURATION_MS + currentDrillIndex * DRILL_DURATION_MS
      return drillStart / totalReplayMs
    }
    if (phase === 'final' || phase === 'done') {
      return (INTRO_DURATION_MS + drills.length * DRILL_DURATION_MS) / totalReplayMs
    }
    return 0
  }, [phase, currentDrillIndex, totalReplayMs, drills.length])

  // Animation loop effect
  useEffect(() => {
    if (!isPlaying || phase === 'done') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      return
    }

    lastTimestampRef.current = 0
    stateSnapshotRef.current = { elapsedMs, currentDrillIndex }

    function tick(timestamp: number) {
      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }

      const deltaMs = (timestamp - lastTimestampRef.current) * speed
      lastTimestampRef.current = timestamp

      // Update snapshot via functional state update pattern
      stateSnapshotRef.current.elapsedMs += deltaMs
      setElapsedMs(stateSnapshotRef.current.elapsedMs)

      const t = stateSnapshotRef.current.elapsedMs
      const snap = stateSnapshotRef.current

      if (t < INTRO_DURATION_MS) {
        setPhase('intro')
      } else if (t < INTRO_DURATION_MS + drills.length * DRILL_DURATION_MS) {
        const drillElapsed = t - INTRO_DURATION_MS
        const idx = Math.min(Math.floor(drillElapsed / DRILL_DURATION_MS), drills.length - 1)
        const withinDrill = (drillElapsed - idx * DRILL_DURATION_MS) / DRILL_DURATION_MS

        if (idx !== snap.currentDrillIndex) {
          snap.currentDrillIndex = idx
          setCurrentDrillIndex(idx)
        }
        setPhase('drill')
        setDrillProgress(withinDrill)
      } else if (t < totalReplayMs) {
        setPhase('final')
        setDrillProgress(1)
      } else {
        setPhase('done')
        setDrillProgress(1)
        setIsPlaying(false)
        return
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, phase, speed, totalReplayMs, drills.length, elapsedMs, currentDrillIndex])

  // Restart handler
  const handleRestart = useCallback(() => {
    setPhase('intro')
    setCurrentDrillIndex(0)
    setDrillProgress(0)
    setElapsedMs(0)
    setIsPlaying(true)
  }, [])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (phase === 'done') {
      handleRestart()
    } else {
      setIsPlaying(prev => !prev)
    }
  }, [phase, handleRestart])

  // Next/previous drill
  const goToDrill = useCallback((direction: -1 | 1) => {
    const newIdx = Math.max(0, Math.min(drills.length - 1, currentDrillIndex + direction))
    if (newIdx === currentDrillIndex) return

    const targetElapsed = INTRO_DURATION_MS + newIdx * DRILL_DURATION_MS
    setElapsedMs(targetElapsed)
    setCurrentDrillIndex(newIdx)
    setDrillProgress(0)
    setPhase('drill')
  }, [currentDrillIndex, drills.length])

  // Cycle speed
  const cycleSpeed = useCallback(() => {
    setSpeed(prev => {
      const idx = SPEED_OPTIONS.findIndex(s => s.value === prev)
      const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
      return next.value
    })
  }, [])

  const currentDrill = drills[currentDrillIndex]

  // No drills placeholder
  if (drills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-white/40 text-sm">
        Aucune donnée de mouvement enregistrée
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* ── Main Content Area ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ── Intro Phase ──────────────────────────────────────── */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                className="text-6xl mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                🏀
              </motion.div>
              <motion.p
                className="text-xl font-bold text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Rejouer l&apos;entraînement
              </motion.p>
              <motion.p
                className="text-sm text-white/40 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {drills.length} exercice{drills.length > 1 ? 's' : ''} · {formatDurationShort(totalDurationSec)}
              </motion.p>
              <motion.div
                className="mt-6 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <Sparkles className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-white/30">Préparation...</span>
              </motion.div>
            </motion.div>
          )}

          {/* ── Drill Phase ──────────────────────────────────────── */}
          {phase === 'drill' && currentDrill && (
            <DrillStepCard
              key={`drill-${currentDrill.drillId}`}
              drill={currentDrill}
              progress={drillProgress}
            />
          )}

          {/* ── Final Phase ──────────────────────────────────────── */}
          {(phase === 'final' || phase === 'done') && (
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center relative"
            >
              {/* Celebration particles */}
              {phase === 'final' && <CelebrationBurst />}

              {/* Trophy emoji */}
              <motion.div
                className="text-6xl mb-3"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                {getGradeEmoji(totalScore)}
              </motion.div>

              {/* Grade label */}
              <motion.p
                className={`text-sm font-bold tracking-[0.25em] uppercase ${getGradeColor(totalScore)}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {getGradeLabel(totalScore)}
              </motion.p>

              {/* Final score gauge */}
              <motion.div
                className="mt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <MiniScoreGauge score={totalScore} size={150} />
              </motion.div>

              {/* Final stats */}
              <motion.div
                className="grid grid-cols-2 gap-4 mt-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="bg-white/5 rounded-xl px-5 py-3 border border-white/10">
                  <Target className="h-4 w-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-xl font-black text-white tabular-nums">{totalReps}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Répétitions</p>
                </div>
                <div className="bg-white/5 rounded-xl px-5 py-3 border border-white/10">
                  <Clock className="h-4 w-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-xl font-black text-white tabular-nums">{formatDurationShort(totalDurationSec)}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Durée</p>
                </div>
              </motion.div>

              {/* Stars */}
              <motion.div
                className="flex gap-1.5 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.1, type: 'spring', stiffness: 300 }}
                  >
                    <Trophy
                      className={`h-5 w-5 ${
                        i < getStarCount(totalScore)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-white/15'
                      }`}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Controls ────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        {/* Drill indicator (during drill phase) */}
        {phase === 'drill' && (
          <motion.div
            className="flex items-center justify-center gap-1.5 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {drills.map((d, i) => (
              <motion.div
                key={d.drillId}
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: i === currentDrillIndex ? '#f97316' : i < currentDrillIndex ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                }}
                animate={i === currentDrillIndex ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const }}
              />
            ))}
          </motion.div>
        )}

        {/* Timeline bar */}
        <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
            animate={{ width: `${Math.min(100, overallProgress * 100 + (phase === 'final' || phase === 'done' ? 100 - overallProgress * 100 : 0))}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
              onClick={() => goToDrill(-1)}
              disabled={currentDrillIndex === 0 || phase === 'intro'}
              aria-label="Exercice précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
              onClick={() => goToDrill(1)}
              disabled={currentDrillIndex >= drills.length - 1 || phase !== 'drill'}
              aria-label="Exercice suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Play / Pause */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          {/* Speed + Restart */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-[11px] font-bold text-white/40 hover:text-white hover:bg-white/10"
              onClick={cycleSpeed}
              aria-label="Vitesse"
            >
              {SPEED_OPTIONS.find(s => s.value === speed)?.label}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
              onClick={handleRestart}
              aria-label="Recommencer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}