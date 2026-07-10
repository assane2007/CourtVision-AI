'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Target,
  Dumbbell,
  Volume2,
  Bell,
  Flame,
  Shield,
  RefreshCw,
  Lock,
  Smartphone,
  Eye,
  FlaskConical,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { BottomNav } from '@/components/shared/bottom-nav'
import { apiFetch } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import { containerVariants, itemVariants } from '@/lib/animations'
import { WeeklyGoalsSection } from '@/components/settings/weekly-goals-section'
import { TrainingSection, PreferencesSection } from '@/components/settings/preferences-section'
import { NotificationsSection } from '@/components/settings/notifications-section'
import { PrivacySection } from '@/components/settings/privacy-section'
import { SecuritySection } from '@/components/settings/security-section'
import { DevicesSection } from '@/components/settings/devices-section'
import { DeveloperSection } from '@/components/settings/developer-section'
import { BillingSection } from '@/components/settings/billing-section'
import { ExportDataButtons, PrivacyLink, DeleteAccountButton } from '@/components/settings/data-section'
import { SettingsSkeleton } from '@/components/settings/settings-skeleton'

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
  [key: string]: unknown
}

// -─ Constants ---------------------------------

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

// -─ Section Card Wrapper -----------------------

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className={title ? undefined : 'overflow-hidden'}>
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                <Icon className="h-4 w-4 text-orange-500" />
              </div>
              {title}
            </CardTitle>
          </CardHeader>
        )}
        {children}
      </Card>
    </motion.div>
  )
}

// -─ Component ---------------------------------

export function SettingsScreen() {
  const goBack = useAppStore((s) => s.goBack)
  const queryClient = useQueryClient()
  const { t, td, setLanguage: setI18nLanguage } = useTranslation()

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

  // Fetch player for subscription status
  const { data: playerData } = useQuery<{ subscriptionStatus: string }>({
    queryKey: ['player'],
    queryFn: () => apiFetch('/api/player'),
    staleTime: 60_000,
  })
  const subscriptionStatus = playerData?.subscriptionStatus ?? 'free'

  // Map subscription status to i18n key
  const planLabel = (key: string) => {
    if (key === 'pro') return t('pricing.pro')
    if (key === 'elite') return t('pricing.elite')
    return t('pricing.free')
  }

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

  // Handler for language change (needs i18n sync)
  const handleLanguageChange = (val: string) => {
    if (val !== settings.language) {
      saveMutation.mutate({ language: val as 'fr' | 'en' })
      // Immediately sync the i18n provider so UI updates without refetch
      setI18nLanguage(val as 'fr' | 'en')
    }
  }

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
            {/* Weekly Goals */}
            <SectionCard icon={Target} title={t('settings.weeklyGoals')}>
              <WeeklyGoalsSection settings={settings} saveMutation={saveMutation} weekSessions={weekSessions} weekReps={weekReps} />
            </SectionCard>

            {/* Training */}
            <SectionCard icon={Dumbbell} title={t('settings.training')}>
              <TrainingSection settings={settings} saveMutation={saveMutation} />
            </SectionCard>

            {/* Preferences */}
            <SectionCard icon={Volume2} title={t('settings.preferences')}>
              <PreferencesSection settings={settings} saveMutation={saveMutation} onLanguageChange={handleLanguageChange} />
            </SectionCard>

            {/* Notifications */}
            <SectionCard icon={Bell} title={t('settings.notifications')}>
              <CardContent className="pt-0 space-y-5">
                <NotificationsSection settings={settings} saveMutation={saveMutation} />
              </CardContent>
            </SectionCard>

            {/* Privacy */}
            <SectionCard icon={Eye} title={t('core.privacy')}>
              <CardContent className="pt-0 space-y-5">
                <PrivacySection
                  saveMutation={saveMutation}
                  profilePublic={settings.profilePublic !== false}
                  showOnLeaderboard={settings.showOnLeaderboard !== false}
                  showActivity={settings.showActivity !== false}
                />
              </CardContent>
            </SectionCard>

            {/* Security */}
            <SectionCard icon={Lock} title={t('core.security')}>
              <CardContent className="pt-0 space-y-4">
                <SecuritySection />
              </CardContent>
            </SectionCard>

            {/* Devices */}
            <SectionCard icon={Smartphone} title={t('core.devices')}>
              <CardContent className="pt-0 space-y-4">
                <DevicesSection />
              </CardContent>
            </SectionCard>

            {/* Experimental Features */}
            <SectionCard icon={FlaskConical} title={t('settings.experimentalFeatures')}>
              <CardContent className="pt-0 space-y-4">
                <DeveloperSection />
              </CardContent>
            </SectionCard>

            {/* Billing */}
            <SectionCard icon={Flame} title={t('settings.billing')}>
              <BillingSection subscriptionStatus={subscriptionStatus} planLabel={planLabel} />
            </SectionCard>

            {/* Data & GDPR */}
            <SectionCard icon={Shield} title={t('settings.dataPrivacy')}>
              <CardContent className="pt-0 space-y-3">
                <ExportDataButtons />
                <Separator />
                <PrivacyLink />
                <Separator />
                <DeleteAccountButton />
              </CardContent>
            </SectionCard>

            {/* Info */}
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

export default SettingsScreen