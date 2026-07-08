'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAppStore, type WorkoutResult, type WorkoutDrillResult } from '@/stores/app'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Target, Flame, Trophy, RotateCcw, Home, Share2, Star, Crown, Play } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { CATEGORY_META } from '@/lib/constants'
import { apiFetch } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import type { TranslationKey } from '@/lib/i18n'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BottomNav } from '@/components/shared/bottom-nav'
import { ScoreReplay } from '@/components/workout/score-replay'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ConfettiParticle {
  id: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  velocityX: number
  velocityY: number
  rotationSpeed: number
  shape: 'circle' | 'rect' | 'triangle'
}

interface GradeInfo {
  label: string
  emoji: string
  color: string
  glow: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getGrade(score: number): GradeInfo {
  if (score > 80) return { label: 'EXCELLENT', emoji: '🏆', color: 'text-amber-400', glow: 'shadow-amber-500/40' }
  if (score > 60) return { label: 'TRÈS BIEN', emoji: '🔥', color: 'text-orange-400', glow: 'shadow-orange-500/40' }
  if (score > 40) return { label: 'BIEN', emoji: '💪', color: 'text-emerald-400', glow: 'shadow-emerald-500/40' }
  return { label: 'À AMÉLIORER', emoji: '📈', color: 'text-sky-400', glow: 'shadow-sky-500/40' }
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

function formatDuration(totalSec: number): string {
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}min ${sec.toString().padStart(2, '0')}s`
}

function generateConfetti(count: number): ConfettiParticle[] {
  const colors = ['#f97316', '#f59e0b', '#fbbf24', '#ffffff', '#fed7aa', '#fb923c', '#fdba74']
  const shapes: ConfettiParticle['shape'][] = ['circle', 'rect', 'triangle']

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 30,
    y: 40 + (Math.random() - 0.5) * 20,
    size: 4 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    velocityX: (Math.random() - 0.5) * 15,
    velocityY: -(5 + Math.random() * 12),
    rotationSpeed: (Math.random() - 0.5) * 720,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  }))
}

// ─── Court SVG Pattern ────────────────────────────────────────────────────────

function CourtLinesSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="100" y="50" width="800" height="900" stroke="white" strokeWidth="2" opacity="0.04" />
      <line x1="100" y1="500" x2="900" y2="500" stroke="white" strokeWidth="2" opacity="0.04" />
      <circle cx="500" cy="500" r="60" stroke="white" strokeWidth="2" opacity="0.04" />
      <circle cx="500" cy="500" r="6" fill="white" opacity="0.04" />
      <rect x="350" y="50" width="300" height="190" stroke="white" strokeWidth="2" opacity="0.04" />
      <circle cx="500" cy="240" r="60" stroke="white" strokeWidth="2" opacity="0.03" strokeDasharray="0 94 188 94" />
      <path d="M 170 50 L 170 240 Q 170 440 500 440 Q 830 440 830 240 L 830 50" stroke="white" strokeWidth="2" opacity="0.04" />
      <circle cx="500" cy="100" r="22" stroke="white" strokeWidth="2" opacity="0.03" />
      <line x1="440" y1="60" x2="560" y2="60" stroke="white" strokeWidth="3" opacity="0.03" />
      <rect x="350" y="760" width="300" height="190" stroke="white" strokeWidth="2" opacity="0.04" />
      <circle cx="500" cy="760" r="60" stroke="white" strokeWidth="2" opacity="0.03" strokeDasharray="0 94 188 94" />
      <path d="M 170 950 L 170 760 Q 170 560 500 560 Q 830 560 830 760 L 830 950" stroke="white" strokeWidth="2" opacity="0.04" />
      <circle cx="500" cy="900" r="22" stroke="white" strokeWidth="2" opacity="0.03" />
      <line x1="440" y1="940" x2="560" y2="940" stroke="white" strokeWidth="3" opacity="0.03" />
    </svg>
  )
}

// ─── Confetti Component ───────────────────────────────────────────────────────

function ConfettiExplosion() {
  const prefersReducedMotion = useReducedMotion()
  const particles = useMemo(() => generateConfetti(55), [])

  if (prefersReducedMotion) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          initial={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 0 }}
          animate={{
            opacity: [1, 1, 1, 0],
            y: [0, p.velocityY * 8, p.velocityY * 20],
            x: [0, p.velocityX * 3, p.velocityX * 8],
            rotate: [0, p.rotationSpeed * 0.5, p.rotationSpeed],
            scale: [0, 1.2, 0.6],
          }}
          transition={{
            duration: 2.5 + Math.random() * 1,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: Math.random() * 0.3,
          }}
        >
          {p.shape === 'circle' && (
            <div
              className="rounded-full"
              style={{ width: p.size, height: p.size, backgroundColor: p.color }}
            />
          )}
          {p.shape === 'rect' && (
            <div
              style={{
                width: p.size * 1.5,
                height: p.size * 0.6,
                backgroundColor: p.color,
                borderRadius: 1,
              }}
            />
          )}
          {p.shape === 'triangle' && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${p.size / 2}px solid transparent`,
                borderRight: `${p.size / 2}px solid transparent`,
                borderBottom: `${p.size}px solid ${p.color}`,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}

// ─── Animated Score Circle ────────────────────────────────────────────────────

function useCountUp(target: number, enabled: boolean): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) {
      // Use rAF to avoid synchronous setState in effect (React 19 lint rule)
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    const duration = 1800
    const start = performance.now()
    const from = 0

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (target - from) * eased)
      setValue(current)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, enabled])

  return value
}

function ScoreCircle({ score, grade: _grade }: { score: number; grade: GradeInfo }) {
  const prefersReducedMotion = useReducedMotion()
  const displayScore = useCountUp(score, !prefersReducedMotion)
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (displayScore / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <motion.svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        className="-rotate-90"
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Background track */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        {/* Animated progress */}
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={prefersReducedMotion ? { strokeDashoffset } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Center content */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <span className="text-4xl font-black text-white tabular-nums">{displayScore}</span>
        <span className="text-xs text-white/40 uppercase tracking-widest mt-0.5">sur 100</span>
      </motion.div>
    </div>
  )
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({
  icon,
  label,
  value,
  subValue,
  delay,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  delay: number
}) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold text-white tabular-nums leading-tight">{value}</p>
            {subValue && <p className="text-xs text-white/50">{subValue}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Mini Bar Chart (score per drill) ─────────────────────────────────────────

function DrillScoreChart({ drills, t }: { drills: WorkoutDrillResult[]; t: (key: TranslationKey) => string }) {
  const prefersReducedMotion = useReducedMotion()
  const maxScore = Math.max(...drills.map((d) => d.score), 1)

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }}
    >
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-orange-400" />
            <p className="text-xs text-white/40 uppercase tracking-wider">{t('summary.scorePerExercise')}</p>
          </div>
          <div className="flex items-end gap-2 h-20">
            {drills.map((drill, i) => (
              <div key={drill.drillId} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-white/70 tabular-nums">{drill.score}</span>
                <motion.div
                  className="w-full rounded-t-md min-h-[4px]"
                  style={{ backgroundColor: drill.score >= 80 ? '#34d399' : drill.score >= 60 ? '#fbbf24' : drill.score >= 40 ? '#f97316' : '#f87171' }}
                  initial={prefersReducedMotion ? { height: `${(drill.score / maxScore) * 100}%` } : { height: '4px' }}
                  animate={{ height: `${(drill.score / maxScore) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.7 + i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
                <span className="text-[9px] text-white/30 text-center leading-tight truncate w-full">
                  {drill.drillIcon}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Drill Breakdown Card ─────────────────────────────────────────────────────

function DrillBreakdownCard({ drill, delay }: { drill: WorkoutDrillResult; delay: number }) {
  const prefersReducedMotion = useReducedMotion()
  const catMeta = CATEGORY_META[drill.drillCategory]
  const icon = catMeta?.icon ?? drill.drillIcon

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-white truncate pr-2">{drill.drillNameFr}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {drill.isPersonalBest && (
                  <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30 h-4">
                    🏅 Record
                  </Badge>
                )}
                <span className="text-sm font-bold text-white tabular-nums w-8 text-right">{drill.score}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${getScoreBarColor(drill.score)}`}
                  initial={prefersReducedMotion ? { width: `${drill.score}%` } : { width: '0%' }}
                  animate={{ width: `${drill.score}%` }}
                  transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
              <span className="text-[10px] text-white/40 tabular-nums shrink-0">
                {drill.reps} rép.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Share Function ───────────────────────────────────────────────────────────

async function shareWorkout(result: WorkoutResult, t: (key: TranslationKey) => string) {
  const sessionId = result.sessionId
  let text: string

  try {
    // Try to get richer share text from API
    if (sessionId) {
      const res = await apiFetch<{ shareText: string; shareUrl: string }>('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, includeScreenshot: false }),
      })
      text = res.shareText
    } else {
      text = [
        `🏀 CourtVision AI`,
        `Score: ${result.totalScore}%`,
        `Reps: ${result.totalReps}`,
      ].join('\n')
    }
  } catch {
    // Fallback if API fails
    const bestDrill = result.drills.reduce(
      (best, d) => (d.score > best.score ? d : best),
      result.drills[0],
    )
    text = [
      `🏀 CourtVision AI`,
      `Score: ${result.totalScore}%`,
      `Reps: ${result.totalReps}`,
      `Exercice: ${bestDrill?.drillNameFr ?? 'N/A'}`,
    ].join('\n')
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: t('summary.shareTitle'),
        text,
      })
    } catch (err) {
      // User cancelled or error — fallback to clipboard
      if ((err as DOMException).name !== 'AbortError') {
        await navigator.clipboard.writeText(text)
        toast.success(t('summary.copySuccess'))
      }
    }
  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    toast.success(t('summary.copySuccess'))
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ── Types for records API ──────────────────────────────────────────────
interface DrillRecord {
  drillId: string
  drillNameFr: string
  bestScore: number
}

interface RecordsResponse {
  records: DrillRecord[]
}

// ── PR Banner Component ──────────────────────────────────────────────────
function PRBanner({ drillNames }: { drillNames: string[] }) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 200 }}
      className="mb-6 px-4"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5" />
        <div className="relative px-4 py-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-300">
              🏆 NOUVEAU RECORD PERSONNEL !
            </p>
            <p className="text-xs text-amber-200/70 mt-0.5 truncate">
              {drillNames.length === 1
                ? `Nouveau record sur ${drillNames[0]} !`
                : `Records battus : ${drillNames.join(', ')}`}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function WorkoutSummaryScreen() {
  const { t } = useTranslation()
  const { workoutResult, navigate, setWorkoutResult, selectDrill } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const [replayOpen, setReplayOpen] = useState(false)

  const grade = useMemo(() => getGrade(workoutResult?.totalScore ?? 0), [workoutResult?.totalScore])

  const calories = useMemo(() => {
    if (!workoutResult) return 0
    return Math.round(
      workoutResult.totalReps * 8 + workoutResult.totalDurationSec * 0.5,
    )
  }, [workoutResult])

  const bestDrill = useMemo(() => {
    if (!workoutResult?.drills.length) return null
    return workoutResult.drills.reduce(
      (best, d) => (d.score > best.score ? d : best),
      workoutResult.drills[0],
    )
  }, [workoutResult])

  const handleRestart = useCallback(() => {
    if (workoutResult?.drills[0]?.drillId) {
      selectDrill(workoutResult.drills[0].drillId)
    }
    setWorkoutResult(null)
    navigate('camera-workout')
  }, [workoutResult, selectDrill, setWorkoutResult, navigate])

  const handleHome = useCallback(() => {
    setWorkoutResult(null)
    navigate('home')
  }, [setWorkoutResult, navigate])

  const handleShare = useCallback(() => {
    if (workoutResult) shareWorkout(workoutResult, t)
  }, [workoutResult, t])

  // ── PR Detection: fetch existing records and compare ──────────────
  const { data: recordsData } = useQuery<RecordsResponse>({
    queryKey: ['records-pr-check'],
    queryFn: () => apiFetch<RecordsResponse>('/api/records'),
    staleTime: 0,
  })

  const newPRDrillNames = useMemo(() => {
    if (!recordsData?.records || !workoutResult) return []
    const prMap = new Map(recordsData.records.map(r => [r.drillId, r.bestScore]))
    const names: string[] = []
    for (const drill of workoutResult.drills) {
      const prev = prMap.get(drill.drillId)
      // If no previous record, it's a new record; if score > previous, it's a PR
      if (prev === undefined || drill.score > prev) {
        names.push(drill.drillNameFr)
      }
    }
    return names
  }, [recordsData, workoutResult])

  // Safety: redirect if no result
  useEffect(() => {
    if (!workoutResult) {
      navigate('home')
    }
  }, [workoutResult, navigate])

  if (!workoutResult) {
    return null
  }

  const drills = workoutResult.drills

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background */}
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 relative pb-24">
        <CourtLinesSVG />

        {/* Confetti */}
        <ConfettiExplosion />

        {/* Content */}
        <div className="relative z-20 px-4 pt-8 pb-32 pb-safe max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto">
          {/* ── PR Celebration Banner ───────────────────────────────── */}
          {newPRDrillNames.length > 0 && <PRBanner drillNames={newPRDrillNames} />}

          {/* ── Hero Section ────────────────────────────────────────── */}
          <motion.div
            className="flex flex-col items-center text-center mb-8"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Celebration Emoji */}
            <motion.div
              className="text-6xl mb-4"
              initial={prefersReducedMotion ? {} : { y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
            >
              {grade.emoji}
            </motion.div>

            {/* Score Circle */}
            <ScoreCircle score={workoutResult.totalScore} grade={grade} />

            {/* Grade Label */}
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.4 }}
              className="mt-4"
            >
              <span className={`text-sm font-bold tracking-[0.25em] uppercase ${grade.color}`}>
                {grade.label}
              </span>
            </motion.div>

            {/* Stars */}
            <motion.div
              className="flex gap-1 mt-3"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={prefersReducedMotion ? { scale: 1 } : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.1, type: 'spring', stiffness: 300 }}
                >
                  <Star
                    className={`h-6 w-6 ${
                      i < Math.ceil(workoutResult.totalScore / 20)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-white/15'
                    }`}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Stats Breakdown ─────────────────────────────────────── */}
          <div className="space-y-3 mb-6">
            <StatsCard
              icon={<Clock className="h-5 w-5 text-orange-400" />}
              label={t('summary.totalTime')}
              value={formatDuration(workoutResult.totalDurationSec)}
              delay={0.3}
            />
            <StatsCard
              icon={<Target className="h-5 w-5 text-orange-400" />}
              label={t('summary.totalReps')}
              value={workoutResult.totalReps}
              subValue={
                drills.length > 1
                  ? `Moy. ${Math.round(workoutResult.totalReps / drills.length)} par exercice`
                  : undefined
              }
              delay={0.4}
            />
            {drills.length > 1 && (
              <DrillScoreChart drills={drills} t={t} />
            )}
            {bestDrill && (
              <StatsCard
                icon={<Trophy className="h-5 w-5 text-amber-400" />}
                label={t('summary.bestExercise')}
                value={bestDrill.drillNameFr}
                subValue={`${t('workout.score')}: ${bestDrill.score} — ${bestDrill.reps} ${t('common.reps')}`}
                delay={drills.length > 1 ? 0.65 : 0.5}
              />
            )}
            <StatsCard
              icon={<Flame className="h-5 w-5 text-red-400" />}
              label={t('summary.estimatedCalories')}
              value={`${calories} kcal`}
              subValue={`${workoutResult.totalReps} rép × 8 + ${formatDuration(workoutResult.totalDurationSec)} × 0.5`}
              delay={drills.length > 1 ? 0.75 : 0.6}
            />
          </div>

          {/* ── Drill-by-Drill Breakdown ────────────────────────────── */}
          {drills.length > 1 && (
            <motion.div
              className="mb-6"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85, ease: 'easeOut' }}
            >
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 px-1">
                {t('summary.drillResults')}
              </h3>
              <div className="space-y-2">
                {drills.map((drill, i) => (
                  <DrillBreakdownCard
                    key={drill.drillId}
                    drill={drill}
                    delay={0.9 + i * 0.1}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Sticky Bottom Actions ──────────────────────────────────── */}
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-30 pb-safe"
          initial={prefersReducedMotion ? { y: 0 } : { y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 1.5, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent pt-8 pb-4 px-4">
            <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto space-y-2.5">
              <Button
                onClick={handleRestart}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refaire l&apos;entraînement
              </Button>
              {/* Replay button */}
              <Button
                variant="outline"
                onClick={() => setReplayOpen(true)}
                className="w-full h-11 border-white/15 text-white hover:bg-white/10 rounded-xl"
              >
                <Play className="h-4 w-4 mr-2" />
                Rejouer 🎬
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="outline"
                  onClick={handleHome}
                  className="h-11 border-white/15 text-white hover:bg-white/10 rounded-xl"
                >
                  <Home className="h-4 w-4 mr-2" />
                  {t('summary.backToHome')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="h-11 border-white/15 text-white hover:bg-white/10 rounded-xl"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Replay Sheet ──────────────────────────────────── */}
        <Sheet open={replayOpen} onOpenChange={setReplayOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl bg-gray-950 border-white/10 p-0">
            <SheetHeader className="pt-3 pb-0 px-5">
              <SheetTitle className="text-white text-sm font-semibold text-center">
                🎬 Rejouer l&apos;entraînement
              </SheetTitle>
            </SheetHeader>
            <div className="h-[calc(85vh-52px)] overflow-hidden">
              {workoutResult && (
                <ScoreReplay
                  drills={workoutResult.drills}
                  totalScore={workoutResult.totalScore}
                  totalReps={workoutResult.totalReps}
                  totalDurationSec={workoutResult.totalDurationSec}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <BottomNav />
    </div>
  )
}