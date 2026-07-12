'use client';
import { Timer, Volume2, Vibrate, Languages } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/components/providers/language-provider';

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

const REST_OPTIONS = [
  { value: '10', label: '10 s' },
  { value: '15', label: '15 s' },
  { value: '30', label: '30 s' },
  { value: '45', label: '45 s' },
  { value: '60', label: '60 s' },
  { value: '90', label: '90 s' },
  { value: '120', label: '120 s' },
]

interface SaveMutationProps {
  isPending: boolean
  mutate: (d: Partial<UserSettings>) => unknown
}

interface TrainingSectionProps {
  settings: UserSettings
  saveMutation: SaveMutationProps
}

export function TrainingSection({ settings, saveMutation }: TrainingSectionProps) {
  const { t } = useTranslation()

  const handleRestChange = (val: string) => {
    const v = parseInt(val, 10)
    if (v !== settings.preferredRestSec) {
      saveMutation.mutate({ preferredRestSec: v })
    }
  }

  return (
    <CardContent className="pt-0">
      <div className="space-y-2">
        <Label htmlFor="rest-duration-select" className="text-sm font-medium">
          {t('settings.restDuration')}
        </Label>
        <Select
          value={String(settings.preferredRestSec)}
          onValueChange={handleRestChange}
          disabled={saveMutation.isPending}
        >
          <SelectTrigger id="rest-duration-select" className="w-full">
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
  )
}

interface PreferencesSectionProps {
  settings: UserSettings
  saveMutation: SaveMutationProps
  onLanguageChange: (val: string) => void
}

export function PreferencesSection({ settings, saveMutation, onLanguageChange }: PreferencesSectionProps) {
  const { t } = useTranslation()

  const handleSoundToggle = (checked: boolean) => {
    saveMutation.mutate({ soundEnabled: checked })
  }

  const handleHapticsToggle = (checked: boolean) => {
    saveMutation.mutate({ hapticsEnabled: checked })
  }

  return (
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
          <Label htmlFor="language-select" className="text-sm font-medium">
            {t('settings.language')}
          </Label>
        </div>
        <Select
          value={settings.language}
          onValueChange={onLanguageChange}
          disabled={saveMutation.isPending}
        >
          <SelectTrigger id="language-select" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">{t('language.fr')}</SelectItem>
            <SelectItem value="en">{t('language.en')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  )
}