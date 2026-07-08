'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, PartyPopper, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'

// ---------------------------------------------------------------------------
// Challenge definitions (rotate by ISO week number)
// ---------------------------------------------------------------------------
interface ChallengeDef {
  id: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  target: number
  unit: string
  unitEn: string
  type: 'sessions' | 'score' | 'streak' | 'drills'
  icon: string
}

const CHALLENGES: ChallengeDef[] = [
  { id: 'c1', title: 'Marathon de Tir', titleEn: 'Shooting Marathon', description: 'Complétez 5 exercices de tir', descriptionEn: 'Complete 5 shooting drills', target: 5, unit: 'exercices', unitEn: 'drills', type: 'drills', icon: '🎯' },
  { id: 'c2', title: 'Précision Élite', titleEn: 'Elite Accuracy', description: 'Obtenez 80%+ sur 3 exercices', descriptionEn: 'Get 80%+ on 3 drills', target: 3, unit: 'exercices > 80%', unitEn: 'drills > 80%', type: 'score', icon: '🏆' },
  { id: 'c3', title: 'Régularité', titleEn: 'Consistency', description: 'Entraînez-vous 4 jours cette semaine', descriptionEn: 'Train 4 days this week', target: 4, unit: 'jours', unitEn: 'days', type: 'streak', icon: '📅' },
  { id: 'c4', title: 'Centurion', titleEn: 'Centurion', description: 'Atteignez 100 répétitions cette semaine', descriptionEn: 'Reach 100 reps this week', target: 100, unit: 'répétitions', unitEn: 'reps', type: 'drills', icon: '💪' },
  { id: 'c5', title: 'Polyvalence', titleEn: 'Versatility', description: 'Entraînez-vous dans 3 catégories différentes', descriptionEn: 'Train in 3 different categories', target: 3, unit: 'catégories', unitEn: 'categories', type: 'sessions', icon: '🔄' },
  { id: 'c6', title: 'Série de 5 Jours', titleEn: '5-Day Streak', description: 'Maintenez une série de 5 jours consécutifs', descriptionEn: 'Maintain a 5-day consecutive streak', target: 5, unit: 'jours consécutifs', unitEn: 'consecutive days', type: 'streak', icon: '🔥' },
  { id: 'c7', title: 'Score Parfait', titleEn: 'Perfect Score', description: 'Obtenez 90%+ sur 2 exercices', descriptionEn: 'Get 90%+ on 2 drills', target: 2, unit: 'exercices > 90%', unitEn: 'drills > 90%', type: 'score', icon: '⭐' },
  { id: 'c8', title: 'Volume Sérieux', titleEn: 'Serious Volume', description: 'Complétez 3 séances cette semaine', descriptionEn: 'Complete 3 sessions this week', target: 3, unit: 'séances', unitEn: 'sessions', type: 'sessions', icon: '🏋️' },
]

function getChallengeForWeek(): ChallengeDef {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const diffDays = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const weekNumber = Math.ceil((diffDays + startOfYear.getDay() + 1) / 7)
  return CHALLENGES[weekNumber % CHALLENGES.length]
}

function getWeekKey(): string {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const diffDays = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const weekNumber = Math.ceil((diffDays + startOfYear.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${weekNumber}`
}

function readStoredChallenge(weekKey: string): boolean {
  try {
    return localStorage.getItem(`cv_challenge_${weekKey}`) === 'true'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Confetti particles (memoized, no setState in effect)
// ---------------------------------------------------------------------------
interface Particle {
  id: number
  x: number
  y: number
  color: string
  rotation: number
  scale: number
}

const CONFETTI_COLORS = ['#f97316', '#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

function ConfettiBurst({ show }: { show: boolean }) {
  const particles = useMemo<Particle[]>(() => {
    if (!show) return []
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 200,
      y: -(Math.random() * 150 + 50),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
      scale: Math.random() * 0.5 + 0.5,
    }))
  }, [show])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {show &&
          particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: p.x,
                y: p.y,
                rotate: p.rotation,
                scale: p.scale,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
          ))}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface WeeklyChallengeProps {
  weekSessions: number
  currentStreak: number
  totalDrillsThisWeek?: number
  highScoreDrillsCount?: number
  perfectScoreDrillsCount?: number
}

export function WeeklyChallenge({
  weekSessions,
  currentStreak,
  totalDrillsThisWeek = 0,
  highScoreDrillsCount = 0,
  perfectScoreDrillsCount = 0,
}: WeeklyChallengeProps) {
  const { td } = useTranslation()
  const challenge = getChallengeForWeek()
  const weekKey = getWeekKey()
  const storageKey = `cv_challenge_${weekKey}`

  // Initialize from localStorage (lazy initializer — no effect needed)
  const [wasStoredComplete] = useState(() => readStoredChallenge(weekKey))

  // Confetti: use a key counter to trigger remount-based animation
  const [confettiKey, setConfettiKey] = useState(0)
  const showConfetti = confettiKey > 0

  // Calculate current progress (pure derivation)
  const currentProgress = useMemo(() => {
    switch (challenge.type) {
      case 'sessions':
        return weekSessions
      case 'streak':
        return currentStreak
      case 'drills':
        return totalDrillsThisWeek
      case 'score':
        return challenge.id === 'c7' ? perfectScoreDrillsCount : highScoreDrillsCount
      default:
        return 0
    }
  }, [challenge, weekSessions, currentStreak, totalDrillsThisWeek, highScoreDrillsCount, perfectScoreDrillsCount])

  const percentage = Math.min((currentProgress / challenge.target) * 100, 100)
  const isNowComplete = currentProgress >= challenge.target

  // Completed is true if stored OR currently achieved
  const completed = wasStoredComplete || isNowComplete

  // Persist to localStorage and trigger confetti when freshly completed (not from storage)
  const prevCompleteRef = useRef(wasStoredComplete)
  useEffect(() => {
    if (isNowComplete && !prevCompleteRef.current) {
      // Freshly completed — trigger confetti via key change and persist
      // Using setTimeout callback to satisfy react-hooks/set-state-in-effect rule
      const t = setTimeout(() => {
        setConfettiKey((k) => k + 1)
      }, 0)
      try {
        localStorage.setItem(storageKey, 'true')
      } catch {
        // localStorage unavailable
      }
      const timer = setTimeout(() => setConfettiKey(0), 2500)
      return () => {
        clearTimeout(t)
        clearTimeout(timer)
      }
    }
    prevCompleteRef.current = isNowComplete
  }, [isNowComplete, storageKey])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
    >
      <Card className={cn(
        'relative overflow-hidden border-2 transition-colors',
        completed
          ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20'
          : 'border-orange-500/20',
      )}>
        {showConfetti && <ConfettiBurst key={confettiKey} show />}

        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-base',
              completed ? 'bg-orange-500 text-white' : 'bg-orange-500/15',
            )}>
              {completed ? <Check className="h-4 w-4" /> : <Trophy className="h-4 w-4 text-orange-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {completed ? td('DÉFI RELEVÉ ! 🎉', 'CHALLENGE COMPLETE! 🎉') : td('Défi de la Semaine', 'Weekly Challenge')}
              </CardTitle>
            </div>
            <span className="text-lg flex-shrink-0">{challenge.icon}</span>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-4">
          <p className="text-xs text-muted-foreground mb-1 font-medium">{td(challenge.title, challenge.titleEn)}</p>
          <p className="text-sm text-foreground/80 mb-3">{td(challenge.description, challenge.descriptionEn)}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium tabular-nums">
                {Math.min(currentProgress, challenge.target)}/{challenge.target} {td(challenge.unit, challenge.unitEn)}
              </span>
              <span className={cn(
                'font-semibold tabular-nums',
                completed ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground',
              )}>
                {Math.round(percentage)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.min(currentProgress, challenge.target)}
              aria-valuemin={0}
              aria-valuemax={challenge.target}
              aria-label={`${td('Défi de la semaine', 'Weekly challenge')}: ${Math.min(currentProgress, challenge.target)}/${challenge.target} ${td('accompli', 'completed')}`}
            >
              <Progress
                value={percentage}
                className={cn(
                'h-2.5',
                completed && '[&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-orange-500 [&>[data-slot=progress-indicator]]:to-amber-400',
              )}
            />
            </div>
          </div>

          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-2"
            >
              <PartyPopper className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                {td('Excellent travail ! Revenez la semaine prochaine.', 'Great job! Come back next week.')}
              </span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}