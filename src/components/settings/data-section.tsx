'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Shield, Trash2, Loader2, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch, cn } from '@/lib/utils'

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

export { ExportDataButtons, PrivacyLink, DeleteAccountButton }