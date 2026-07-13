'use client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/components/providers/language-provider';
import {
  ALL_FLAGS,
  FEATURE_LABELS,
  isFeatureEnabledClient,
  setFeatureOverride,
  type FeatureFlag,
} from '@/lib/feature-flags';

export function DeveloperSection() {
  const { t } = useTranslation()

  return (
    <>
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
            checked={isFeatureEnabledClient(flag)}
            onCheckedChange={(checked) => {
              setFeatureOverride(flag, checked)
              toast.success(`${FEATURE_LABELS[flag]} ${checked ? t('settings.activated') : t('settings.disabled')}`)
            }}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
      ))}
    </>
  )
}