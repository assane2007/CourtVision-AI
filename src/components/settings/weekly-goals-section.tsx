'use client'

import { CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/components/providers/language-provider'

interface UserSettings {
  weeklyGoalSessions: number
  weeklyGoalReps: number
  preferredRestSec: number
  soundEnabled: boolean
  hapticsEnabled: boolean
  language: 'fr' | 'en'
  notifStreak: boolean
  notifChallenge: boolean
  notifAchievement: boolean
  [key: string]: unknown
}

interface SaveMutationProps {
  isPending: boolean
  mutate: (d: Partial<UserSettings>) => unknown
}

interface WeeklyGoalsSectionProps {
  settings: UserSettings
  saveMutation: SaveMutationProps
  weekSessions: number
  weekReps: number
}

export function WeeklyGoalsSection({ settings, saveMutation, weekSessions, weekReps }: WeeklyGoalsSectionProps) {
  const { t } = useTranslation()

  const sessionProgress = settings.weeklyGoalSessions > 0
    ? Math.min((weekSessions / settings.weeklyGoalSessions) * 100, 100)
    : 0

  const repsProgress = settings.weeklyGoalReps > 0
    ? Math.min((weekReps / settings.weeklyGoalReps) * 100, 100)
    : 0

  const handleWeeklyGoalSessions = (value: number[]) => {
    const v = value[0]
    if (v !== settings.weeklyGoalSessions) {
      saveMutation.mutate({ weeklyGoalSessions: v })
    }
  }

  const handleWeeklyGoalReps = (value: number[]) => {
    const v = value[0]
    if (v !== settings.weeklyGoalReps) {
      saveMutation.mutate({ weeklyGoalReps: v })
    }
  }

  return (
    <CardContent className="space-y-6 pt-0">
      {/* Séances par semaine */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="weekly-goal-sessions" className="text-sm font-medium">
            {t('settings.sessionsPerWeek')}
          </Label>
          <span className="text-sm font-bold text-orange-500 tabular-nums">
            {settings.weeklyGoalSessions}
          </span>
        </div>
        <Slider
          id="weekly-goal-sessions"
          value={[settings.weeklyGoalSessions]}
          onValueChange={handleWeeklyGoalSessions}
          min={1}
          max={14}
          step={1}
          disabled={saveMutation.isPending}
          className="[&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:border-orange-500"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>1</span>
          <div className="flex items-center gap-2">
            <Progress
              value={sessionProgress}
              className="h-1.5 w-20 [&>[data-slot=progress-indicator]]:bg-orange-500"
            />
            <span className="tabular-nums">
              {weekSessions}/{settings.weeklyGoalSessions}
            </span>
          </div>
          <span>14</span>
        </div>
      </div>

      <Separator />

      {/* Répétitions par semaine */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="weekly-goal-reps" className="text-sm font-medium">
            {t('settings.repsPerWeek')}
          </Label>
          <span className="text-sm font-bold text-orange-500 tabular-nums">
            {settings.weeklyGoalReps}
          </span>
        </div>
        <Slider
          id="weekly-goal-reps"
          value={[settings.weeklyGoalReps]}
          onValueChange={handleWeeklyGoalReps}
          min={10}
          max={500}
          step={10}
          disabled={saveMutation.isPending}
          className="[&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:border-orange-500"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>10</span>
          <div className="flex items-center gap-2">
            <Progress
              value={repsProgress}
              className="h-1.5 w-20 [&>[data-slot=progress-indicator]]:bg-orange-500"
            />
            <span className="tabular-nums">
              {weekReps}/{settings.weeklyGoalReps}
            </span>
          </div>
          <span>500</span>
        </div>
      </div>
    </CardContent>
  )
}