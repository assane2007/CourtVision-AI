'use client'

import { Globe, Trophy, Eye } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/components/providers/language-provider'

interface PrivacySectionProps {
  saveMutation: {
    isPending: boolean
    mutate: (d: Record<string, unknown>) => void
  }
}

export function PrivacySection({ saveMutation }: PrivacySectionProps) {
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