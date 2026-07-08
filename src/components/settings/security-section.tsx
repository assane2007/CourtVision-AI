'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Lock, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTranslation } from '@/components/providers/language-provider'

export function SecuritySection() {
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
            <Label htmlFor="2fa-toggle" className="text-sm font-medium">{t('settings.twoFactor')}</Label>
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