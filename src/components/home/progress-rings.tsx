'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/components/providers/language-provider';

// ---------------------------------------------------------------------------
// Animated circular progress ring with gradient stroke
// ---------------------------------------------------------------------------
interface ProgressRingProps {
  value: number // 0–100
  size?: number
  strokeWidth?: number
  centerText: string
  labelKey: 'stats.averageScore' | 'stats.streakDays' | 'stats.weekGoalLabel'
  delay?: number
  gradientId: string
}

export function ProgressRing({
  value,
  size = 88,
  strokeWidth = 7,
  centerText,
  labelKey,
  delay = 0,
  gradientId,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const { t } = useTranslation()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedValue / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, delay * 1000)
    return () => clearTimeout(timer)
  }, [value, delay])

  const label = t(labelKey)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="progressbar" aria-valuenow={Math.round(animatedValue)} aria-valuemin={0} aria-valuemax={100}>
          <title>{label}: {Math.round(animatedValue)}%</title>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/50 dark:text-muted/30"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none tabular-nums">{centerText}</span>
        </div>
      </div>
      <span className="sr-only">{label}: {Math.round(animatedValue)}%</span>
      <span className="text-[11px] font-medium text-muted-foreground leading-tight text-center" aria-hidden="true">
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ring group for the home screen
// ---------------------------------------------------------------------------
interface ProgressRingsProps {
  weeklyGoalProgress: number // 0–100
  avgScore: number // 0–100
  currentStreak: number
}

export function ProgressRings({
  weeklyGoalProgress,
  avgScore,
  currentStreak,
}: ProgressRingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.1 }}
      className="rounded-2xl border bg-card p-5"
    >
      <div className="flex items-center justify-around">
        <ProgressRing
          value={weeklyGoalProgress}
          centerText={`${Math.round(weeklyGoalProgress)}%`}
          labelKey="stats.weekGoalLabel"
          gradientId="ring-weekly"
          delay={0.2}
        />
        <ProgressRing
          value={avgScore}
          centerText={`${Math.round(avgScore)}`}
          labelKey="stats.averageScore"
          gradientId="ring-score"
          delay={0.4}
        />
        <ProgressRing
          value={Math.min(currentStreak * 20, 100)} // cap visual at 100%
          centerText={`${currentStreak}`}
          labelKey="stats.streakDays"
          gradientId="ring-streak"
          delay={0.6}
        />
      </div>
    </motion.div>
  )
}