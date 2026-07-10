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
  const { t, td } = useTranslation()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showBackupDialog, setShowBackupDialog] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading2fa, setLoading2fa] = useState(false)

  // 2FA setup flow state
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [setupSecret, setSetupSecret] = useState('')
  const [setupOtpauth, setSetupOtpauth] = useState('')
  const [setupVerifyCode, setSetupVerifyCode] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)

  // 2FA disable flow state
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)

  // Backup regeneration flow state
  const [backupRegenCode, setBackupRegenCode] = useState('')
  const [backupRegenLoading, setBackupRegenLoading] = useState(false)

  const handleToggle2fa = async () => {
    if (twoFactorEnabled) {
      // Show disable dialog instead of immediately disabling
      setDisableCode('')
      setShowDisableDialog(true)
      return
    }

    // Start setup flow: call /api/auth/2fa/setup to get secret + otpauth URL
    setLoading2fa(true)
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || t('settings.saveError'))
        return
      }

      setSetupSecret(data.secret)
      setSetupOtpauth(data.mockUri)
      setSetupVerifyCode('')
      setShowSetupDialog(true)
    } catch {
      toast.error(t('settings.saveError'))
    } finally {
      setLoading2fa(false)
    }
  }

  const handleSetupVerify = async () => {
    if (!setupVerifyCode || !/^\d{6}$/.test(setupVerifyCode)) {
      toast.error(td('Veuillez entrer un code à 6 chiffres', 'Please enter a 6-digit code'))
      return
    }

    setSetupLoading(true)
    try {
      const verifyRes = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: setupVerifyCode, action: 'setup' }),
      })
      const verifyData = await verifyRes.json()

      if (verifyRes.ok) {
        setTwoFactorEnabled(true)
        setBackupCodes(verifyData.backupCodes || [])
        setShowSetupDialog(false)
        toast.success(t('settings.twoFactorEnabled'))
      } else {
        toast.error(verifyData.error || td('Code invalide', 'Invalid code'))
      }
    } catch {
      toast.error(t('settings.saveError'))
    } finally {
      setSetupLoading(false)
    }
  }

  const handleDisableConfirm = async () => {
    if (!disableCode || !/^\d{6}$/.test(disableCode)) {
      toast.error(td('Veuillez entrer un code à 6 chiffres', 'Please enter a 6-digit code'))
      return
    }

    setDisableLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      })
      const data = await res.json()

      if (res.ok) {
        setTwoFactorEnabled(false)
        setBackupCodes([])
        setShowDisableDialog(false)
        toast.success(t('settings.twoFactorDisabled'))
      } else {
        toast.error(data.error || td('Code invalide', 'Invalid code'))
      }
    } catch {
      toast.error(t('settings.saveError'))
    } finally {
      setDisableLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (!backupRegenCode || !/^\d{6}$/.test(backupRegenCode)) {
      toast.error(td('Veuillez entrer un code à 6 chiffres', 'Please enter a 6-digit code'))
      return
    }

    setBackupRegenLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: backupRegenCode }),
      })
      const data = await res.json()

      if (res.ok) {
        setBackupCodes(data.codes || [])
        setBackupRegenCode('')
        toast.success(t('settings.saved'))
      } else {
        toast.error(data.error || td('Code invalide', 'Invalid code'))
      }
    } catch {
      toast.error(t('settings.saveError'))
    } finally {
      setBackupRegenLoading(false)
    }
  }

  const qrCodeUrl = setupOtpauth
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupOtpauth)}`
    : ''

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
            onClick={() => {
              setBackupRegenCode('')
              setShowBackupDialog(true)
            }}
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
            <DialogDescription>
              {td('Entrez votre mot de passe actuel et choisissez un nouveau mot de passe', 'Enter your current password and choose a new password')}
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onClose={() => setShowPasswordDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={(open) => { if (!open) setShowSetupDialog(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.enable2fa')}</DialogTitle>
            <DialogDescription>
              {td(
                'Scannez ce code QR avec votre application d\'authentification ou copiez la clé secrète',
                'Scan this QR code with your authenticator app or copy the secret key'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {qrCodeUrl && (
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48 rounded-lg border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {td('Clé secrète', 'Secret key')}
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono break-all select-all">
                  {setupSecret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(setupSecret)
                    toast.success(td('Clé copiée', 'Key copied'))
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-verify-code">
                {td('Entrez le code à 6 chiffres de votre application', 'Enter the 6-digit code from your app')}
              </Label>
              <Input
                id="setup-verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={setupVerifyCode}
                onChange={(e) => setSetupVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSetupDialog(false)}
              >
                {t('action.cancel')}
              </Button>
              <Button
                type="button"
                disabled={setupLoading || setupVerifyCode.length !== 6}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleSetupVerify}
              >
                {setupLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {td('Vérifier et activer', 'Verify and enable')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={(open) => { if (!open) setShowDisableDialog(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.disable2fa')}</DialogTitle>
            <DialogDescription>
              {td(
                'Entrez un code 2FA actuel pour confirmer la désactivation',
                'Enter a current 2FA code to confirm disabling'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">
                {td('Code 2FA', '2FA code')}
              </Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDisableDialog(false)}
              >
                {t('action.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={disableLoading || disableCode.length !== 6}
                onClick={handleDisableConfirm}
              >
                {disableLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {td('Désactiver', 'Disable')}
              </Button>
            </DialogFooter>
          </div>
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
            <div className="space-y-2">
              <Label htmlFor="backup-regen-code">
                {td('Entrez un code 2FA pour régénérer les codes de secours', 'Enter a 2FA code to regenerate backup codes')}
              </Label>
              <Input
                id="backup-regen-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={backupRegenCode}
                onChange={(e) => setBackupRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={backupRegenLoading || backupRegenCode.length !== 6}
              onClick={handleRegenerateBackupCodes}
            >
              {backupRegenLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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