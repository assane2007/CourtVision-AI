'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus, SkipForward, Timer } from 'lucide-react'
import type { WorkoutPhase } from './types'
import { REST_OPTIONS, overlayVariants, countPulse, countPulseReduced } from './types'

// ─── Ready Overlay (PRÊT?) ───────────────────────────────────────────────────

interface ReadyOverlayProps {
  show: boolean
  prefersReducedMotion: boolean
}

export function ReadyOverlay({ show, prefersReducedMotion }: ReadyOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
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
  )
}

// ─── Countdown Overlay (3-2-1-GO!) ───────────────────────────────────────────

interface CountdownOverlayProps {
  phase: WorkoutPhase
  countdown: number
  showReady: boolean
  prefersReducedMotion: boolean
}

export function CountdownOverlay({
  phase,
  countdown,
  showReady,
  prefersReducedMotion,
}: CountdownOverlayProps) {
  return (
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
  )
}

// ─── Rest Overlay ────────────────────────────────────────────────────────────

interface RestOverlayProps {
  phase: WorkoutPhase
  currentSet: number
  totalSets: number
  restRemaining: number
  restDuration: number
  prefersReducedMotion: boolean
  onExtendRest: () => void
  onSkipRest: () => void
  onSetRestDuration: (n: number) => void
}

export function RestOverlay({
  phase,
  currentSet,
  totalSets,
  restRemaining,
  restDuration,
  prefersReducedMotion,
  onExtendRest,
  onSkipRest,
  onSetRestDuration,
}: RestOverlayProps) {
  return (
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
                onClick={onExtendRest}
                className="gap-1.5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-full px-4"
              >
                <Plus className="h-4 w-4" />
                +15s
              </Button>
              <Button
                size="sm"
                onClick={onSkipRest}
                className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4"
                aria-label="Passer le repos"
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
                  onClick={() => onSetRestDuration(opt)}
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
  )
}

// ─── Plan-Next Overlay ──────────────────────────────────────────────────────

interface PlanNextOverlayProps {
  phase: WorkoutPhase
  planCurrentIndex: number
  planDrillQueueLength: number
  planNextCountdown: number
  prefersReducedMotion: boolean
  getNextDrill: () => { icon: string; nameFr: string } | null
}

export function PlanNextOverlay({
  phase,
  planCurrentIndex,
  planDrillQueueLength,
  planNextCountdown,
  prefersReducedMotion,
  getNextDrill,
}: PlanNextOverlayProps) {
  const nextDrill = phase === 'plan-next' ? getNextDrill() : null

  return (
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
              Exercice {planCurrentIndex + 1} / {planDrillQueueLength}
            </p>
            <div className="w-full max-w-[200px] mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${((planCurrentIndex) / planDrillQueueLength) * 100}%` }}
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
                {nextDrill ? (
                  <>
                    <span className="text-3xl">{nextDrill.icon}</span>
                    <p className="text-white text-xl font-bold">{nextDrill.nameFr}</p>
                  </>
                ) : null}
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
  )
}