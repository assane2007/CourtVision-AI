'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { isFeatureEnabled, type FeatureFlag, FEATURE_LABELS } from '@/lib/feature-flags'
import { useTranslation } from '@/components/providers/language-provider'
import { useAppStore } from '@/stores/app'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Crown, Check } from 'lucide-react'

interface FeatureGateProps {
  flag: FeatureFlag
  children: React.ReactNode
  fallback?: React.ReactNode
}

/** Map each feature flag to a description translation key */
const FLAG_DESC_KEYS: Record<string, string> = {
  scouting: 'paywall.scoutingDesc',
  ai_coach: 'paywall.aiCoachDesc',
  reaction_trainer: 'paywall.reactionTrainerDesc',
}

/**
 * Conditionally renders children based on a feature flag.
 * When a feature is gated (disabled), shows a paywall modal directing the user to pricing.
 */
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const [dismissed, setDismissed] = useState(false)
  const [storageTick, setStorageTick] = useState(0)
  const { t } = useTranslation()
  const navigate = useAppStore(s => s.navigate)

  // Re-compute on storage changes (e.g., toggled in settings from another tab)
  const onStorage = useCallback(() => setStorageTick(tick => tick + 1), [])
  useEffect(() => {
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [onStorage])

  const enabled = useMemo(() => isFeatureEnabled(flag), [flag, storageTick])
  const shouldShowPaywall = !enabled && !dismissed

  const handleViewPlans = useCallback(() => {
    setDismissed(true)
    navigate('pricing')
  }, [navigate])

  const handleLater = useCallback(() => {
    setDismissed(true)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setDismissed(true)
  }, [])

  const descKey = FLAG_DESC_KEYS[flag]

  const paywall = (
    <Dialog open={shouldShowPaywall} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-5 w-5 text-orange-500" />
            <DialogTitle>{t('paywall.title')}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {descKey ? t(descKey as 'paywall.scoutingDesc') : `${FEATURE_LABELS[flag]} nécessite un abonnement Pro.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm font-medium mb-3">{t('paywall.proIncludes')}</p>
          <ul className="space-y-2">
            {(['paywall.proInclude1', 'paywall.proInclude2', 'paywall.proInclude3', 'paywall.proInclude4'] as const).map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleViewPlans}
            className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto min-h-[44px]"
          >
            <Crown className="h-4 w-4 mr-2" />
            {t('paywall.viewPlans')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLater}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {t('paywall.later')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (!enabled) return <>{fallback}{paywall}</>
  return <>{children}</>
}