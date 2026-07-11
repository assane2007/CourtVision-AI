'use client'

import { Flame, Swords, Trophy, MessageSquare, Users, Radio } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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

interface NotificationsSectionProps {
  settings: UserSettings
  saveMutation: SaveMutationProps
}

export function NotificationsSection({ settings, saveMutation }: NotificationsSectionProps) {
  const { t } = useTranslation()

  return (
    <>
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
    </>
  )
}