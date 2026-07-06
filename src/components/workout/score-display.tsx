'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Save, RotateCcw, ArrowLeft, Loader2, ShieldCheck, Pause } from 'lucide-react'
import type { Drill, WorkoutPhase, AIFormCheckResult } from './types'
import { getGaugeColor, getGaugeTrackColor, getStarCount, getScoreColor, getScoreBgColor, formatTime } from './scoring'

// ─── ScoreGauge ──────────────────────────────────────────────────────────────

export function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = Math.PI * radius // semi-circle

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

// ─── CircularTimer ───────────────────────────────────────────────────────────

export function CircularTimer({
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

// ─── FloatingRep ─────────────────────────────────────────────────────────────

export function FloatingRep() {
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

// ─── ActiveOverlay (score gauge, target reps, rep counter, paused) ──────────

interface ActiveOverlayProps {
  phase: WorkoutPhase
  currentScore: number
  displayReps: number
  targetReps: number
  repFloatKey: number
  timeRemaining: number
  prefersReducedMotion: boolean
}

export function ActiveOverlay({
  phase,
  currentScore,
  displayReps,
  targetReps,
  repFloatKey,
  timeRemaining,
  prefersReducedMotion,
}: ActiveOverlayProps) {
  return (
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
  )
}

// ─── CompletionOverlay ───────────────────────────────────────────────────────

interface CompletionOverlayProps {
  drill: Drill | undefined
  totalSets: number
  finalScore: number
  displayReps: number
  elapsedAtEnd: number
  totalDuration: number
  timeRemaining: number
  isSavePending: boolean
  onSave: () => void
  onRestart: () => void
  onBack: () => void
}

export function CompletionOverlay({
  drill,
  totalSets,
  finalScore,
  displayReps,
  elapsedAtEnd,
  totalDuration,
  timeRemaining,
  isSavePending,
  onSave,
  onRestart,
  onBack,
}: CompletionOverlayProps) {
  return (
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
            onClick={onSave}
            disabled={isSavePending}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25"
            aria-label="Sauvegarder"
          >
            {isSavePending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              onClick={onRestart}
              className="h-11 border-gray-600 text-white hover:bg-gray-800 rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refaire
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="h-11 border-gray-600 text-white hover:bg-gray-800 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}