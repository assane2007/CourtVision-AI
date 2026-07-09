'use client'

import { Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { useAppStore } from '@/stores/app'
import { useTranslation } from '@/components/providers/language-provider'

interface BillingSectionProps {
  subscriptionStatus: string
  planLabel: (key: string) => string
}

export function BillingSection({ subscriptionStatus, planLabel }: BillingSectionProps) {
  const { t } = useTranslation()

  return (
    <CardContent className="pt-0 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t('settings.currentPlan')}</p>
          <p className="text-xs text-muted-foreground">{planLabel(subscriptionStatus)}</p>
        </div>
        <Badge variant={subscriptionStatus !== 'free' ? 'default' : 'secondary'} className="text-xs">{planLabel(subscriptionStatus)}</Badge>
      </div>
      {subscriptionStatus === 'free' && (
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          onClick={() => useAppStore.getState().navigate('pricing')}
        >
          <Flame className="h-4 w-4 mr-2" />
          {t('settings.viewOffers')}
        </Button>
      )}
    </CardContent>
  )
}