'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Target,
  Timer,
  Volume2,
  Vibrate,
  Languages,
  Info,
  Dumbbell,
  Bell,
  Flame,
  Trophy,
  Swords,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch, cn } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'

// -─ Types -----------------------------------

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
}

interface WeeklyStats {
  weekSessions: number
  weekReps: number
}

// -─ Constants ---------------------------------

const REST_OPTIONS = [
  { value: '10', label: '10 s' },
  { value: '15', label: '15 s' },
  { value: '30', label: '30 s' },
  { value: '45', label: '45 s' },
  { value: '60', label: '60 s' },
  { value: '90', label: '90 s' },
  { value: '120', label: '120 s' },
]

const DEFAULT_SETTINGS: UserSettings = {
  weeklyGoalSessions: 3,
  weeklyGoalReps: 50,
  preferredRestSec: 15,
  soundEnabled: true,
  hapticsEnabled: true,
  language: 'fr',
  notifStreak: true,
  notifChallenge: true,
  notifAchievement: true,
}

// -─ Component ---------------------------------

export function SettingsScreen() {
  const goBack = useAppStore((s) => s.goBack)
  const queryClient = useQueryClient()

  // Fetch settings
  const {
    data: settingsData,
    isLoading: settingsLoading,
  } = useQuery<{ settings: UserSettings }>({
    queryKey: ['settings'],
    queryFn: () => apiFetch('/api/settings'),
    staleTime: 60_000,
  })

  // Fetch weekly stats for progress display
  const { data: statsData } = useQuery<{
    weekSessions: number
    weekReps: number
    totalReps: number
  }>({
    queryKey: ['stats', 'week'],
    queryFn: () => apiFetch('/api/stats?days=7'),
    staleTime: 30_000,
  })

  const settings = settingsData?.settings ?? DEFAULT_SETTINGS
  const weekSessions = statsData?.weekSessions ?? 0
  const weekReps = statsData?.weekReps ?? 0

  // Mutation for saving settings
  const saveMutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) =>
      apiFetch<{ settings: UserSettings }>('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      toast.success('Paramètres sauvegardés')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Erreur lors de la sauvegarde')
    },
  })

  // Handlers — each saves immediately
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

  const handleRestChange = (val: string) => {
    const v = parseInt(val, 10)
    if (v !== settings.preferredRestSec) {
      saveMutation.mutate({ preferredRestSec: v })
    }
  }

  const handleSoundToggle = (checked: boolean) => {
    saveMutation.mutate({ soundEnabled: checked })
  }

  const handleHapticsToggle = (checked: boolean) => {
    saveMutation.mutate({ hapticsEnabled: checked })
  }

  const handleLanguageChange = (val: string) => {
    if (val !== settings.language) {
      saveMutation.mutate({ language: val as 'fr' | 'en' })
    }
  }

  const sessionProgress = settings.weeklyGoalSessions > 0
    ? Math.min((weekSessions / settings.weeklyGoalSessions) * 100, 100)
    : 0

  const repsProgress = settings.weeklyGoalReps > 0
    ? Math.min((weekReps / settings.weeklyGoalReps) * 100, 100)
    : 0

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Paramètres</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-8">
        {settingsLoading ? (
          <SettingsSkeleton />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* -─ Objectifs Hebdomadaires ---------------- */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Target className="h-4 w-4 text-orange-500" />
                    </div>
                    Objectifs Hebdomadaires
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  {/* Séances par semaine */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Séances par semaine
                      </Label>
                      <span className="text-sm font-bold text-orange-500 tabular-nums">
                        {settings.weeklyGoalSessions}
                      </span>
                    </div>
                    <Slider
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
                      <Label className="text-sm font-medium">
                        Répétitions par semaine
                      </Label>
                      <span className="text-sm font-bold text-orange-500 tabular-nums">
                        {settings.weeklyGoalReps}
                      </span>
                    </div>
                    <Slider
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
              </Card>
            </motion.div>

            {/* -─ Entraînement ---------------------─ */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Dumbbell className="h-4 w-4 text-orange-500" />
                    </div>
                    Entraînement
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Durée de repos entre les séries
                    </Label>
                    <Select
                      value={String(settings.preferredRestSec)}
                      onValueChange={handleRestChange}
                      disabled={saveMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <Timer className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {REST_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Préférences ---------------------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Volume2 className="h-4 w-4 text-orange-500" />
                    </div>
                    Préférences
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-5">
                  {/* Sons toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sound-toggle" className="text-sm font-medium cursor-pointer">
                        Sons
                      </Label>
                    </div>
                    <Switch
                      id="sound-toggle"
                      checked={settings.soundEnabled}
                      onCheckedChange={handleSoundToggle}
                      disabled={saveMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  <Separator />

                  {/* Vibrations toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Vibrate className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="haptics-toggle" className="text-sm font-medium cursor-pointer">
                        Vibrations
                      </Label>
                    </div>
                    <Switch
                      id="haptics-toggle"
                      checked={settings.hapticsEnabled}
                      onCheckedChange={handleHapticsToggle}
                      disabled={saveMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  <Separator />

                  {/* Langue select */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">
                        Langue
                      </Label>
                    </div>
                    <Select
                      value={settings.language}
                      onValueChange={handleLanguageChange}
                      disabled={saveMutation.isPending}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notifications */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Bell className="h-4 w-4 text-orange-500" />
                    </div>
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-5">
                  {/* Rappels de série */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Flame className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notif-streak" className="text-sm font-medium cursor-pointer">
                        Rappels de série
                      </Label>
                    </div>
                    <Switch
                      id="notif-streak"
                      checked={settings.notifStreak}
                      onCheckedChange={(checked) => saveMutation.mutate({ notifStreak: checked })}
                      disabled={saveMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  <Separator />

                  {/* Mises à jour des défis */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Swords className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notif-challenge" className="text-sm font-medium cursor-pointer">
                        Mises à jour des défis
                      </Label>
                    </div>
                    <Switch
                      id="notif-challenge"
                      checked={settings.notifChallenge}
                      onCheckedChange={(checked) => saveMutation.mutate({ notifChallenge: checked })}
                      disabled={saveMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  <Separator />

                  {/* Succès */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notif-achievement" className="text-sm font-medium cursor-pointer">
                        Succès
                      </Label>
                    </div>
                    <Switch
                      id="notif-achievement"
                      checked={settings.notifAchievement}
                      onCheckedChange={(checked) => saveMutation.mutate({ notifAchievement: checked })}
                      disabled={saveMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Infos ------------------------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">CourtVision AI</span>
                    <span className="text-xs">v0.2.0</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Développé avec ❤️ pour les passionnés de basket
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </main>
    </SwipeToGoBack>
  )
}

// -─ Loading Skeleton -----------------------------─

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Objectifs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-6 w-full rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-6 w-full rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Entraînement */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-full rounded-md" />
        </CardContent>
      </Card>

      {/* Préférences */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Infos */}
      <Card>
        <CardContent className="pt-0 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsScreen