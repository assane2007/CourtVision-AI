'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Target, Dumbbell, Star, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────
interface Quest {
  id: string
  title: string
  description: string
  progress: number
  target: number
  completed: boolean
  xpReward: number
}

interface QuestsResponse {
  daily: Quest[]
  weekly: Quest[]
}

// ── Quest icon mapping ──────────────────────────────────────────────
function getQuestIcon(id: string) {
  switch (id) {
    case 'session_today':
      return <Target className="h-4 w-4" />
    case 'reps_20':
      return <Dumbbell className="h-4 w-4" />
    case 'score_80':
      return <Star className="h-4 w-4" />
    case 'sessions_3_week':
      return <Flame className="h-4 w-4" />
    default:
      return <Circle className="h-4 w-4" />
  }
}

// ── Quest Row Component ─────────────────────────────────────────────
function QuestRow({ quest, index }: { quest: Quest; index: number }) {
  const pct = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-colors',
        quest.completed
          ? 'bg-orange-500/5 opacity-70' :'bg-muted/30 hover:bg-muted/50'
      )}
    >
      {/* Icon / Check */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          quest.completed
            ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400' :'bg-orange-500/10 text-orange-500 dark:text-orange-400'
        )}
      >
        {quest.completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          getQuestIcon(quest.id)
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'text-xs font-semibold truncate',
              quest.completed && 'line-through text-muted-foreground'
            )}
          >
            {quest.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: index * 0.08 + 0.2, duration: 0.5, ease: 'easeOut' as const }}
              className={cn(
                'h-full rounded-full',
                quest.completed
                  ? 'bg-emerald-500 dark:bg-emerald-400' :'bg-gradient-to-r from-orange-500 to-amber-500'
              )}
            />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {quest.progress}/{quest.target}
          </span>
        </div>
      </div>

      {/* XP Badge */}
      <Badge
        variant="secondary"
        className={cn(
          'text-[10px] px-1.5 py-0 shrink-0 font-medium border-0',
          quest.completed
            ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' :'bg-orange-500/10 text-orange-500 dark:text-orange-400'
        )}
      >
        +{quest.xpReward} XP
      </Badge>
    </motion.div>
  )
}

// ── Quest Widget ────────────────────────────────────────────────────
export function QuestWidget() {
  const { data, isLoading } = useQuery<QuestsResponse>({
    queryKey: ['quests'],
    queryFn: () => apiFetch<QuestsResponse>('/api/quests'),
    staleTime: 30_000,
  })

  const dailyQuests = data?.daily ?? []
  const completedCount = dailyQuests.filter(q => q.completed).length
  const allDailyCompleted = dailyQuests.length > 0 && completedCount === dailyQuests.length

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border bg-card/80 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <h3 className="text-sm font-bold">Quêtes</h3>
          {allDailyCompleted && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs"
            >
              ✅
            </motion.span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {completedCount}/{dailyQuests.length} complétées
        </span>
      </div>

      {/* Daily progress bar */}
      <div className="px-4 pb-2">
        <Progress
          value={dailyQuests.length > 0 ? (completedCount / dailyQuests.length) * 100 : 0}
          className="h-1.5 bg-muted"
        />
      </div>

      {/* Quest list */}
      <div className="px-3 pb-3 space-y-2 max-h-64 overflow-y-auto">
        {dailyQuests.slice(0, 3).map((quest, i) => (
          <QuestRow key={quest.id} quest={quest} index={i} />
        ))}
      </div>
    </motion.div>
  )
}