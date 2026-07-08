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
  Download,
  Shield,
  Trash2,
  Loader2,
  FlaskConical,
  RefreshCw,
  Lock,
  Smartphone,
  WifiOff as _WifiOff,
  CheckCircle2,
  XCircle as _XCircle,
  Monitor,
  MessageSquare,
  Users,
  Radio,
  Eye,
  Globe,
  FileSpreadsheet,
  Clock,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/stores/app'
import { useState } from 'react'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { BottomNav } from '@/components/shared/bottom-nav'
import { apiFetch, cn } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import { containerVariants, itemVariants } from '@/lib/animations'
import {
  ALL_FLAGS,
  FEATURE_LABELS,
  isFeatureEnabled,
  setFeatureOverride,
  type FeatureFlag,
} from '@/lib/feature-flags'

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

interface _WeeklyStats {
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
    isError: settingsError,
    refetch: refetchSettings,
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
      toast.success(t('settings.saved'))
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err) => {
      toast.error(err.message || t('settings.saveError'))
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

  const { t, td, setLanguage: setI18nLanguage } = useTranslation()

  const handleLanguageChange = (val: string) => {
    if (val !== settings.language) {
      saveMutation.mutate({ language: val as 'fr' | 'en' })
      // Immediately sync the i18n provider so UI updates without refetch
      setI18nLanguage(val as 'fr' | 'en')
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
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            aria-label={td('Retour', 'Back')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">{t('screen.settings')}</h1>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-4 pb-24">
        {settingsError && !settingsLoading ? (
          <div className="flex items-center justify-between rounded-xl border border-destructive/50 bg-destructive/5 px-4 py-3 mb-4">
            <p className="text-sm text-destructive">{t('settings.loadError')}</p>
            <Button variant="outline" size="sm" onClick={() => refetchSettings()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('action.retry')}
            </Button>
          </div>
        ) : null}
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
                    {t('settings.weeklyGoals')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  {/* Séances par semaine */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        {t('settings.sessionsPerWeek')}
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
                        {t('settings.repsPerWeek')}
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
                    {t('settings.training')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t('settings.restDuration')}
                    </Label>
                    <Select
                      value={String(settings.preferredRestSec)}
                      onValueChange={handleRestChange}
                      disabled={saveMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <Timer className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder={t('settings.selectPlaceholder')} />
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
                    {t('settings.preferences')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-5">
                  {/* Sons toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sound-toggle" className="text-sm font-medium cursor-pointer">
                        {t('settings.sound')}
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
                        {t('settings.haptics')}
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
                        {t('settings.language')}
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
                        <SelectItem value="fr">{t('language.fr')}</SelectItem>
                        <SelectItem value="en">{t('language.en')}</SelectItem>
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
                    {t('settings.notifications')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-5">
                  {/* Rappels de série */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Flame className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notif-streak" className="text-sm font-medium cursor-pointer">
                        {t('settings.streakReminders')}
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
                        {t('settings.challengeUpdates')}
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
                        {t('settings.achievementsNotif')}
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

                  <Separator />

                  {/* Messages */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notif-message" className="text-sm font-medium cursor-pointer">
                        {t('settings.notifMessages')}
                      </Label>
                    </div>
                    <Switch
                      id="notif-message"
                      checked={(settings as Record<string, unknown>).notifMessage as boolean ?? true}
                      onCheckedChange={(checked) => saveMutation.mutate({ notifMessage: checked } as unknown as Partial<UserSettings>)}
                      disabled={saveMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  <Separator />

                  {/* Social */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notif-social" className="text-sm font-medium cursor-pointer">
                        {t('settings.notifSocial')}
                      </Label>
                    </div>
                    <Switch
                      id="notif-social"
                      checked={(settings as Record<string, unknown>).notifSocial as boolean ?? true}
                      onCheckedChange={(checked) => saveMutation.mutate({ notifSocial: checked } as unknown as Partial<UserSettings>)}
                      disabled={saveMutation.isPending}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>

                  <Separator />

                  {/* Live */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Radio className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="notif-live" className="text-sm font-medium cursor-pointer">
                        {t('settings.notifLive')}
                      </Label>
                    </div>
                    <Switch
                      id="notif-live"
                      checked={true}
                      disabled={true}
                      className="data-[state=checked]:bg-orange-500 opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Confidentialité ------------------------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Eye className="h-4 w-4 text-orange-500" />
                    </div>
                    {t('core.privacy')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-5">
                  <PrivacyToggles saveMutation={saveMutation} />
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Sécurité ------------------------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Lock className="h-4 w-4 text-orange-500" />
                    </div>
                    {t('core.security')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <SecuritySection />
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Appareils ------------------------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Smartphone className="h-4 w-4 text-orange-500" />
                    </div>
                    {t('core.devices')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <DevicesSection />
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Fonctionnalités expérimentales --------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <FlaskConical className="h-4 w-4 text-orange-500" />
                    </div>
                    {t('settings.experimentalFeatures')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {t('settings.experimentalDesc')}
                  </p>
                  {ALL_FLAGS.map((flag: FeatureFlag) => (
                    <div key={flag} className="flex items-center justify-between">
                      <Label htmlFor={`flag-${flag}`} className="text-sm font-medium cursor-pointer">
                        {FEATURE_LABELS[flag]}
                      </Label>
                      <Switch
                        id={`flag-${flag}`}
                        checked={isFeatureEnabled(flag)}
                        onCheckedChange={(checked) => {
                          setFeatureOverride(flag, checked)
                          toast.success(`${FEATURE_LABELS[flag]} ${checked ? t('settings.activated') : t('settings.disabled')}`)
                        }}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Abonnement & Facturation ------------------------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                    {t('settings.billing')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('settings.currentPlan')}</p>
                      <p className="text-xs text-muted-foreground">{t('pricing.free')}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{t('pricing.free')}</Badge>
                  </div>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                    onClick={() => useAppStore.getState().navigate('pricing')}
                  >
                    <Flame className="h-4 w-4 mr-2" />
                    {t('settings.viewOffers')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* -─ Données & RGPD ------------------------- */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Shield className="h-4 w-4 text-orange-500" />
                    </div>
                    {t('settings.dataPrivacy')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <ExportDataButtons />
                  <Separator />
                  <PrivacyLink />
                  <Separator />
                  <DeleteAccountButton />
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
                    {t('settings.developedWith')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </main>

      <BottomNav />
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

// -─ Privacy Toggles ──────────────────────────────

function PrivacyToggles({ saveMutation }: { saveMutation: { isPending: boolean; mutate: (d: Record<string, unknown>) => void } }) {
  const { t } = useTranslation()

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label htmlFor="privacy-public" className="text-sm font-medium cursor-pointer">
              {t('settings.publicProfile')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('settings.publicProfileDesc')}</p>
          </div>
        </div>
        <Switch
          id="privacy-public"
          defaultChecked={true}
          onCheckedChange={(checked) => saveMutation.mutate({ profilePublic: checked })}
          disabled={saveMutation.isPending}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label htmlFor="privacy-leaderboard" className="text-sm font-medium cursor-pointer">
              {t('settings.showLeaderboard')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('settings.showLeaderboardDesc')}</p>
          </div>
        </div>
        <Switch
          id="privacy-leaderboard"
          defaultChecked={true}
          onCheckedChange={(checked) => saveMutation.mutate({ showOnLeaderboard: checked })}
          disabled={saveMutation.isPending}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label htmlFor="privacy-activity" className="text-sm font-medium cursor-pointer">
              {t('settings.showActivity')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('settings.showActivityDesc')}</p>
          </div>
        </div>
        <Switch
          id="privacy-activity"
          defaultChecked={true}
          onCheckedChange={(checked) => saveMutation.mutate({ showActivity: checked })}
          disabled={saveMutation.isPending}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>
    </>
  )
}

// -─ Security Section ──────────────────────────────

function SecuritySection() {
  const { t } = useTranslation()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [, ] = useState(false)
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading2fa, setLoading2fa] = useState(false)

  const handleToggle2fa = async () => {
    setLoading2fa(true)
    try {
      if (twoFactorEnabled) {
        // Disable 2FA (mock: no code needed for now)
        await fetch('/api/auth/2fa/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: '000000' }),
        })
        setTwoFactorEnabled(false)
        toast.success(t('settings.twoFactorDisabled'))
      } else {
        // Setup 2FA
        const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
        await res.json()
        if (res.ok) {
          // Auto-verify with a mock code
          const verifyRes = await fetch('/api/auth/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '123456', action: 'setup' }),
          })
          const verifyData = await verifyRes.json()
          if (verifyRes.ok) {
            setTwoFactorEnabled(true)
            setBackupCodes(verifyData.backupCodes || [])
            toast.success(t('settings.twoFactorEnabled'))
          }
        }
      }
    } catch {
      toast.error(t('settings.saveError'))
    } finally {
      setLoading2fa(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    try {
      const res = await fetch('/api/auth/2fa/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      })
      const data = await res.json()
      if (res.ok) {
        setBackupCodes(data.codes || [])
        toast.success(t('settings.saved'))
      }
    } catch {
      toast.error(t('settings.saveError'))
    }
  }

  return (
    <>
      {/* Email verification status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-orange-500" />
          <div>
            <p className="text-sm font-medium">{t('core.emailVerify')}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const res = await fetch('/api/auth/verify-email', { method: 'POST' })
            const data = await res.json()
            toast.success(data.message || t('settings.verificationSent'))
          }}
        >
          {t('settings.sendVerification')}
        </Button>
      </div>

      <Separator />

      {/* 2FA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('settings.twoFactor')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.twoFactorDesc')}</p>
          </div>
        </div>
        <Switch
          id="2fa-toggle"
          checked={twoFactorEnabled}
          onCheckedChange={handleToggle2fa}
          disabled={loading2fa}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>

      {twoFactorEnabled && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowBackupDialog(true)}
          >
            <Copy className="h-4 w-4 mr-2" />
            {t('settings.backupCodes')}
          </Button>
        </>
      )}

      <Separator />

      {/* Change Password */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setShowPasswordDialog(true)}
      >
        <Lock className="h-4 w-4 mr-2" />
        {t('settings.changePassword')}
      </Button>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.changePassword')}</DialogTitle>
            <DialogDescription>{t('settings.twoFactorDesc')}</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onClose={() => setShowPasswordDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.backupCodes')}</DialogTitle>
            <DialogDescription>{t('settings.backupCodesDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {backupCodes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code) => (
                  <div key={code} className="bg-muted rounded-lg px-3 py-2 text-center font-mono text-sm">
                    {code}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('settings.setup2fa')}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleRegenerateBackupCodes}
            >
              {t('settings.generateBackupCodes')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const { t, td } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t('auth.passwordMinLength'))
      return
    }

    setLoading(true)
    try {
      // Use reset-password confirm with current session verification
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        toast.success(t('settings.passwordUpdated'))
        onClose()
      } else {
        const data = await res.json()
        toast.error(data.error || t('settings.passwordError'))
      }
    } catch {
      toast.error(t('settings.passwordError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-pw">{t('settings.currentPassword')}</Label>
        <Input
          id="current-pw"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-pw">{t('settings.newPassword')}</Label>
        <Input
          id="new-pw"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={td('Min. 8 caractères', 'Min. 8 characters')}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-pw">{t('settings.confirmNewPassword')}</Label>
        <Input
          id="confirm-pw"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('action.cancel')}
        </Button>
        <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t('action.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

// -─ Devices Section ──────────────────────────────

function DevicesSection() {
  const { t } = useTranslation()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => apiFetch<{ devices: Array<{ id: string; name: string; type: string; os: string; appVersion: string; lastActive: string; isCurrent: boolean }> }>('/api/devices'),
    staleTime: 30_000,
  })

  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) =>
      apiFetch(`/api/devices/${deviceId}/revoke`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('settings.deviceRevoked'))
      refetch()
    },
    onError: () => toast.error(t('settings.saveError')),
  })

  const devices = data?.devices || []

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    )
  }

  if (devices.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('settings.noDevices')}</p>
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {devices.map((device) => (
        <div key={device.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{device.name}</p>
                {device.isCurrent && (
                  <Badge variant="secondary" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-200">
                    {t('settings.currentDevice')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('settings.lastActive')}: {new Date(device.lastActive).toLocaleDateString()}
                {device.os && ` · ${device.os}`}
              </p>
            </div>
          </div>
          {!device.isCurrent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => revokeMutation.mutate(device.id)}
              disabled={revokeMutation.isPending}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
            >
              {revokeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.revokeDevice')}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

// -─ RGPD Sub-components ──────────────────────────────

function ExportDataButtons() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<'json' | 'csv' | null>(null)

  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(format)
    try {
      const res = await fetch(`/api/player/export?format=${format}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: t('settings.exportNetworkError') }))
        throw new Error(body.error || t('settings.exportError'))
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'csv' ? 'csv' : 'json'
      a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `courtvision-export.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(t('settings.exportSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.exportError'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start h-auto py-3 px-3"
        onClick={() => handleExport('json')}
        disabled={loading !== null}
      >
        <Download className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
        <div className="text-left">
          <div className="text-sm font-medium">{t('settings.exportData')}</div>
          <div className="text-xs text-muted-foreground">{t('settings.exportDataDesc')}</div>
        </div>
        {loading === 'json' && <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />}
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start h-auto py-3 px-3"
        onClick={() => handleExport('csv')}
        disabled={loading !== null}
      >
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
        <div className="text-left">
          <div className="text-sm font-medium">{t('settings.csvExport')}</div>
          <div className="text-xs text-muted-foreground">{t('settings.csvExportDesc')}</div>
        </div>
        {loading === 'csv' && <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />}
      </Button>
    </>
  )
}

function PrivacyLink() {
  const { t } = useTranslation()
  const handleOpen = async () => {
    try {
      const res = await fetch('/api/privacy')
      const text = await res.text()
      // Open in a new window/tab
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      toast.error(t('settings.privacyLoadError'))
    }
  }

  return (
    <Button
      variant="ghost"
      className="w-full justify-start h-auto py-3 px-3"
      onClick={handleOpen}
    >
      <Shield className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
      <div className="text-left">
        <div className="text-sm font-medium">{t('settings.privacyPolicy')}</div>
        <div className="text-xs text-muted-foreground">{t('settings.privacyPolicyDesc')}</div>
      </div>
    </Button>
  )
}

function DeleteAccountButton() {
  const { t } = useTranslation()
  const [confirmStep, setConfirmStep] = useState(0)

  const handleDelete = async () => {
    if (confirmStep < 2) {
      setConfirmStep(confirmStep + 1)
      return
    }

    try {
      await apiFetch('/api/player/delete', { method: 'DELETE' })
      toast.success(t('settings.deleteAccountSuccess'))
      // Force sign out
      window.location.href = '/api/auth/signout'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.deleteAccountError'))
      setConfirmStep(0)
    }
  }

  const labels = [
    { text: t('settings.deleteAccountButton'), sub: t('settings.deleteConfirm1') },
    { text: t('settings.deleteConfirm2'), sub: t('settings.deleteConfirm3') },
    { text: t('settings.deleteFinalButton'), sub: t('settings.deleteFinalDesc') },
  ]

  const current = labels[confirmStep]

  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start h-auto py-3 px-3',
        confirmStep > 0 && 'text-red-500 hover:text-red-600 hover:bg-red-500/10',
      )}
      onClick={handleDelete}
    >
      <Trash2 className={cn('h-4 w-4 mr-3 shrink-0', confirmStep > 0 ? 'text-red-500' : 'text-muted-foreground')} />
      <div className="text-left">
        <div className="text-sm font-medium">{current.text}</div>
        <div className="text-xs text-muted-foreground">{current.sub}</div>
      </div>
    </Button>
  )
}

export default SettingsScreen