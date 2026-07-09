'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Monitor, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch } from '@/lib/utils'

export function DevicesSection() {
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