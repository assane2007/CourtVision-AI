'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────
interface Props {
  category: string
  className?: string
}

// ── Category metadata ────────────────────────────────────────────────
const DEMO_META: Record<string, {
  title: string
  subtitle: string
  focus: string[]
  duration: number // seconds (simulated video length)
}> = {
  pocket_ball: {
    title: 'Dribble Bas de Poche',
    subtitle: 'Ballon bas, contrôle total',
    focus: ['Dribble sous le genou', 'Stance large', 'Yeux levés'],
    duration: 8,
  },
  shifty: {
    title: 'Démarquage',
    subtitle: 'Fakes & changements de direction',
    focus: ['Faux mouvement', 'Explosion latérale', 'Épaules trompeuses'],
    duration: 7,
  },
  ball_handling: {
    title: 'Maniement de Balle',
    subtitle: 'Figure 8, 2 ballons, contrôle',
    focus: ['Pattern en 8', 'Entre les jambes', 'Sans regarder'],
    duration: 9,
  },
  speed_change: {
    title: 'Changement de Vitesse',
    subtitle: 'Ralentir puis exploser',
    focus: ['50% → 100%', 'Arrêt complet', 'Redémarrage explosif'],
    duration: 8,
  },
  defense: {
    title: 'Posture Défensive',
    subtitle: 'Glissades latérales, mains hautes',
    focus: ['Stance basse', 'Mains actives', 'Pieds rapides'],
    duration: 10,
  },
  shooting: {
    title: 'Tir au Panier',
    subtitle: 'Forme BEEF, arc, follow-through',
    focus: ['B-Équilibre', 'E-Yeux', 'E-Coude', 'F-Suivi'],
    duration: 9,
  },
  footwork: {
    title: 'Placement de Pieds',
    subtitle: 'Pivots, jab steps, échelle',
    focus: ['Triple menace', 'Pivots', 'Pieds légers'],
    duration: 8,
  },
  finishing: {
    title: 'Finition au Panier',
    subtitle: 'Layups, floaters, renversés',
    focus: ['2 pas', 'Main haute', 'Utiliser le panneau'],
    duration: 8,
  },
  conditioning: {
    title: 'Condition Physique',
    subtitle: 'Sprints, navettes, burpees',
    focus: ['Effort maximal', 'Récupération courte', 'Endurance'],
    duration: 10,
  },
}

const DEFAULT_META = {
  title: 'Exercice',
  subtitle: 'Entraînement basket',
  focus: ['Suivez les instructions'],
  duration: 8,
}

// ── Ken Burns keyframes per category for variety ─────────────────────
const KEN_BURNS: Record<string, { from: { scale: number; x: number; y: number }; to: { scale: number; x: number; y: number } }> = {
  pocket_ball:    { from: { scale: 1.15, x: -5, y: -3 }, to: { scale: 1.25, x: 5, y: 3 } },
  shifty:         { from: { scale: 1.1, x: 8, y: 0 }, to: { scale: 1.22, x: -8, y: 2 } },
  ball_handling:  { from: { scale: 1.2, x: 0, y: -5 }, to: { scale: 1.28, x: 3, y: 5 } },
  speed_change:   { from: { scale: 1.18, x: -10, y: 0 }, to: { scale: 1.28, x: 10, y: 0 } },
  defense:        { from: { scale: 1.12, x: 3, y: 2 }, to: { scale: 1.22, x: -3, y: -2 } },
  shooting:       { from: { scale: 1.2, x: -5, y: -2 }, to: { scale: 1.3, x: 5, y: 2 } },
  footwork:       { from: { scale: 1.15, x: 0, y: 5 }, to: { scale: 1.25, x: 0, y: -5 } },
  finishing:      { from: { scale: 1.18, x: 10, y: 0 }, to: { scale: 1.28, x: -10, y: 2 } },
  conditioning:   { from: { scale: 1.12, x: -5, y: 3 }, to: { scale: 1.24, x: 5, y: -3 } },
}

const DEFAULT_KB = { from: { scale: 1.15, x: 0, y: 0 }, to: { scale: 1.25, x: 0, y: 0 } }

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export function DrillDemoAnimation({ category, className }: Props) {
  const meta = DEMO_META[category] ?? DEFAULT_META
  const kb = KEN_BURNS[category] ?? DEFAULT_KB
  const imagePath = `/drill-demos/${category}.jpg`

  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Simulate video progress
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setIsPlaying(false)
            return 0
          }
          return p + (100 / (meta.duration * 20)) // 20fps update
        })
      }, 50)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, meta.duration])

  const togglePlay = useCallback(() => {
    if (progress >= 100) setProgress(0)
    setIsPlaying((p) => !p)
  }, [progress])

  const restart = useCallback(() => {
    setProgress(0)
    setIsPlaying(true)
  }, [])

  const formatTime = (pct: number) => {
    const total = meta.duration
    const current = (pct / 100) * total
    const m = Math.floor(current / 60)
    const s = Math.floor(current % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const kbStyle = isPlaying
    ? { transform: `scale(${kb.from.scale + (kb.to.scale - kb.from.scale) * (progress / 100)}) translate(${kb.from.x + (kb.to.x - kb.from.x) * (progress / 100)}%, ${kb.from.y + (kb.to.y - kb.from.y) * (progress / 100)}%)` }
    : { transform: `scale(${1.1 + (kb.to.scale - 1.1) * Math.min(progress / 100, 1)}) translate(${kb.from.x + (kb.to.x - kb.from.x) * Math.min(progress / 100, 1)}%, ${kb.from.y + (kb.to.y - kb.from.y) * Math.min(progress / 100, 1)}%)` }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl bg-black', className)}>
      {/* ── Video frame area ────────────────────────────────────── */}
      <div className="relative w-full aspect-video overflow-hidden bg-gray-900">
        {/* Image with Ken Burns effect */}
        <div
          className="absolute inset-0 transition-transform duration-100 linear"
          style={kbStyle}
        >
          <img
            src={imagePath}
            alt={meta.title}
            loading="lazy"
            className={cn(
              'w-full h-full object-cover transition-opacity duration-500',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Loading shimmer */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-900 animate-pulse" />
        )}

        {/* Top gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* ── Top: Category badge + REC indicator ─────────────── */}
        <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                Démo
              </span>
            </span>
          </div>
          <span className="text-[10px] font-semibold text-white/50 tabular-nums">
            {formatTime(progress)} / 0:{meta.duration.toString().padStart(2, '0')}
          </span>
        </div>

        {/* ── Center: Play/Pause button (when paused) ──────────── */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer group"
              aria-label="Lire la démo"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center
                            group-hover:bg-white/30 group-active:scale-95 transition-all duration-200
                            shadow-lg shadow-black/30">
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Bottom: Title + controls ──────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          {/* Title overlay */}
          <div className="mb-2.5">
            <h3 className="text-white font-bold text-sm leading-tight drop-shadow-lg">
              {meta.title}
            </h3>
            <p className="text-white/60 text-[11px] mt-0.5">
              {meta.subtitle}
            </p>
          </div>

          {/* Progress bar */}
          <div className="relative h-5 flex items-center gap-2 group/controls">
            {/* Play/Pause small button */}
            <button
              onClick={togglePlay}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm
                         flex items-center justify-center hover:bg-white/25 active:scale-95
                         transition-all duration-150"
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3 text-white" fill="white" />
              ) : (
                <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
              )}
            </button>

            {/* Progress track */}
            <div
              className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer relative overflow-hidden
                         group-hover/controls:h-1.5 transition-all duration-200"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const pct = ((e.clientX - rect.left) / rect.width) * 100
                setProgress(Math.max(0, Math.min(100, pct)))
                setIsPlaying(true)
              }}
            >
              {/* Buffer hint */}
              <div className="absolute inset-y-0 left-0 w-1/3 bg-white/10 rounded-full" />
              {/* Progress fill */}
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.05 }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md
                           opacity-0 group-hover/controls:opacity-100 transition-opacity duration-200"
                style={{ left: `calc(${Math.min(progress, 100)}% - 6px)` }}
              />
            </div>

            {/* Restart button */}
            <button
              onClick={restart}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm
                         flex items-center justify-center hover:bg-white/20 active:scale-95
                         transition-all duration-150 opacity-0 group-hover/controls:opacity-100"
              aria-label="Recommencer"
            >
              <RotateCcw className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Focus points footer ─────────────────────────────────── */}
      <div className="px-4 py-2.5 flex flex-wrap gap-1.5 bg-black/40 backdrop-blur-sm border-t border-white/5">
        {meta.focus.map((f, i) => (
          <motion.span
            key={f}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full
                       bg-orange-500/15 text-orange-400"
          >
            <span className="w-1 h-1 rounded-full bg-orange-500" />
            {f}
          </motion.span>
        ))}
      </div>
    </div>
  )
}