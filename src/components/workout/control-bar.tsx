'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pause, Play, Square, Loader2, Sparkles, Timer } from 'lucide-react'
import type { WorkoutPhase, AIFormCheckResult } from './types'
import { REST_OPTIONS } from './types'
import { getScoreColor } from './scoring'
import { useTranslation } from '@/components/providers/language-provider'

// ─── Pre-Workout Config (sets & rest) ────────────────────────────────────────

interface PreWorkoutConfigProps {
  phase: WorkoutPhase
  showReady: boolean
  totalSets: number
  restDuration: number
  onSetTotalSets: (n: number) => void
  onSetRestDuration: (n: number) => void
  onEnsureAudioInit: () => void
}

export function PreWorkoutConfig({
  phase,
  showReady,
  totalSets,
  restDuration,
  onSetTotalSets,
  onSetRestDuration,
  onEnsureAudioInit,
}: PreWorkoutConfigProps) {
  const { td } = useTranslation()
  if (phase !== 'countdown' && phase !== 'loading' && !showReady) return null

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{td('Séries:', 'Sets:')}</span>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            onClick={() => {
              onEnsureAudioInit()
              onSetTotalSets(n)
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
        <span className="text-xs text-muted-foreground">{td('Repos:', 'Rest:')}</span>
        {REST_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onEnsureAudioInit()
              onSetRestDuration(opt)
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
  )
}

// ─── AI Feedback Area ───────────────────────────────────────────────────────

interface AIFeedbackProps {
  aiResult: AIFormCheckResult | null
  aiError: string
  phase: WorkoutPhase
}

export function AIFeedback({ aiResult, aiError, phase }: AIFeedbackProps) {
  const { td } = useTranslation()
  if ((phase !== 'active' && phase !== 'paused') || (!aiResult && !aiError)) return null

  return (
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
            {td('Vérification IA', 'AI Check')}
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
  )
}

// ─── Local Feedback ──────────────────────────────────────────────────────────

interface LocalFeedbackProps {
  feedback: string
  phase: WorkoutPhase
  aiResult: AIFormCheckResult | null
  aiError: string
}

export function LocalFeedback({ feedback, phase, aiResult, aiError }: LocalFeedbackProps) {
  if (!feedback || aiResult || aiError || (phase !== 'active' && phase !== 'paused')) return null

  return (
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
  )
}

// ─── AI Check Button ─────────────────────────────────────────────────────────

interface AICheckButtonProps {
  phase: WorkoutPhase
  aiLoading: boolean
  aiCooldownRemaining: number
  onCheck: () => void
}

export function AICheckButton({ phase, aiLoading, aiCooldownRemaining, onCheck }: AICheckButtonProps) {
  const { td } = useTranslation()
  if (phase !== 'active' && phase !== 'paused') return null

  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={onCheck}
        disabled={aiLoading || aiCooldownRemaining > 0 || phase === 'paused'}
        className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 disabled:opacity-50 disabled:hover:bg-transparent rounded-full px-4"
        aria-label={td('Vérification IA du geste', 'AI form check')}
      >
        {aiLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {aiLoading ? (
          td('Analyse en cours...', 'Analyzing...')
        ) : aiCooldownRemaining > 0 ? (
          <span className="tabular-nums">{td('Réessayer dans', 'Retry in')} {aiCooldownRemaining}s</span>
        ) : (
          td('Vérification IA', 'AI Check')
        )}
      </Button>
    </div>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

interface ProgressBarProps {
  phase: WorkoutPhase
  progressPercent: number
}

export function ProgressBar({ phase, progressPercent }: ProgressBarProps) {
  const { td } = useTranslation()
  if (phase !== 'active' && phase !== 'paused') return null

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{td('Progression', 'Progress')}</span>
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
  )
}

// ─── Workout Controls ────────────────────────────────────────────────────────

interface WorkoutControlsProps {
  phase: WorkoutPhase
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export function WorkoutControls({ phase, onPause, onResume, onStop }: WorkoutControlsProps) {
  const { td } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Stop button */}
      {(phase === 'active' || phase === 'paused') && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onStop}
          className="h-12 w-12 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
          aria-label={td("Arrêter l'entraînement", 'Stop workout')}
        >
          <Square className="h-5 w-5" />
        </Button>
      )}

      {/* Pause / Resume */}
      {phase === 'active' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onPause}
          className="h-14 w-14 rounded-full bg-primary/10 text-foreground hover:bg-primary/20 transition-colors border border-border"
          aria-label={td('Pause', 'Pause')}
        >
          <Pause className="h-6 w-6" />
        </Button>
      )}

      {phase === 'paused' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onResume}
          className="h-14 w-14 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
          aria-label={td('Reprendre', 'Resume')}
        >
          <Play className="h-6 w-6 ml-0.5" />
        </Button>
      )}

      {/* Camera indicator */}
      {phase === 'active' && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span>{td('EN DIRECT', 'LIVE')}</span>
        </div>
      )}

      {phase === 'paused' && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
          <Pause className="h-3 w-3" />
          <span>{td('PAUSE', 'PAUSE')}</span>
        </div>
      )}
    </div>
  )
}

// ─── Bottom Panel (composition) ──────────────────────────────────────────────

interface BottomPanelProps {
  phase: WorkoutPhase
  showReady: boolean
  totalSets: number
  restDuration: number
  progressPercent: number
  feedback: string
  aiResult: AIFormCheckResult | null
  aiError: string
  aiLoading: boolean
  aiCooldownRemaining: number
  onSetTotalSets: (n: number) => void
  onSetRestDuration: (n: number) => void
  onEnsureAudioInit: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onAICheck: () => void
}

export function BottomPanel({
  phase,
  showReady,
  totalSets,
  restDuration,
  progressPercent,
  feedback,
  aiResult,
  aiError,
  aiLoading,
  aiCooldownRemaining,
  onSetTotalSets,
  onSetRestDuration,
  onEnsureAudioInit,
  onPause,
  onResume,
  onStop,
  onAICheck,
}: BottomPanelProps) {
  return (
    <div className="bg-background border-t border-border px-4 py-3 space-y-3">
      <PreWorkoutConfig
        phase={phase}
        showReady={showReady}
        totalSets={totalSets}
        restDuration={restDuration}
        onSetTotalSets={onSetTotalSets}
        onSetRestDuration={onSetRestDuration}
        onEnsureAudioInit={onEnsureAudioInit}
      />

      <AnimatePresence mode="wait">
        <AIFeedback key="ai" aiResult={aiResult} aiError={aiError} phase={phase} />
        <LocalFeedback key="local" feedback={feedback} phase={phase} aiResult={aiResult} aiError={aiError} />
      </AnimatePresence>

      <AICheckButton
        phase={phase}
        aiLoading={aiLoading}
        aiCooldownRemaining={aiCooldownRemaining}
        onCheck={onAICheck}
      />

      <ProgressBar phase={phase} progressPercent={progressPercent} />

      <WorkoutControls
        phase={phase}
        onPause={onPause}
        onResume={onResume}
        onStop={onStop}
      />
    </div>
  )
}