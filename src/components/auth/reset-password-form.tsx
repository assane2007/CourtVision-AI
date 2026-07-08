'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft, Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslation } from '@/components/providers/language-provider'

interface ResetPasswordFormProps {
  open: boolean
  onClose: () => void
}

export function ResetPasswordForm({ open, onClose }: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'email' | 'token' | 'success'>('email')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showToken, setShowToken] = useState(false)

  const resetState = useCallback(() => {
    setStep('email')
    setEmail('')
    setToken('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setShowToken(false)
  }, [])

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)
      try {
        const data = await apiFetch<{ message: string; resetToken?: string }>(
          '/api/auth/reset-password',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          },
        )
        if (data.resetToken) {
          setToken(data.resetToken)
          setStep('token')
        } else {
          // Account not found but we still show success per security best practice
          toast.success(data.message)
          onClose()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth.genericError'))
      } finally {
        setLoading(false)
      }
    },
    [email, t, onClose],
  )

  const handleConfirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      if (newPassword.length < 8) {
        setError(t('auth.passwordMinLength'))
        return
      }
      if (newPassword !== confirmPassword) {
        setError(t('auth.passwordMismatch'))
        return
      }
      setLoading(true)
      try {
        await apiFetch('/api/auth/reset-password/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        })
        setStep('success')
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth.genericError'))
      } finally {
        setLoading(false)
      }
    },
    [token, newPassword, confirmPassword, t],
  )

  const handleCopyToken = useCallback(() => {
    navigator.clipboard.writeText(token).then(() => {
      toast.success(t('auth.tokenCopied'))
    })
  }, [token, t])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="bg-background border-border sm:max-w-md">
        <AnimatePresence mode="wait">
          {/* Step 1: Email input */}
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <KeyRound className="h-5 w-5 text-orange-400" />
                  {t('auth.resetTitle')}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t('auth.resetDesc')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground">
                    {t('auth.email')}
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    placeholder={t('auth.emailPlaceholder')}
                    disabled={loading}
                    required
                    autoComplete="email"
                    className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-red-500 dark:text-red-400">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('auth.sendToken')
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Show token + new password */}
          {step === 'token' && (
            <motion.div
              key="token"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <KeyRound className="h-5 w-5 text-orange-400" />
                  {t('auth.resetTokenTitle')}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t('auth.resetTokenDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Token display */}
                <div className="space-y-2">
                  <Label className="text-foreground">{t('auth.resetTokenLabel')}</Label>
                  <div className="relative">
                    <div className="h-11 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 pr-10 flex items-center">
                      <code className="text-sm text-amber-500 dark:text-amber-300 font-mono break-all select-all">
                        {showToken ? token : token.slice(0, 4) + '••••••••••••••••••••••••••' + token.slice(-4)}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500/70 hover:text-amber-500 transition-colors"
                      tabIndex={-1}
                      aria-label={showToken ? t('auth.hideToken') : t('auth.showToken')}
                    >
                      {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="flex items-center gap-1.5 text-xs text-amber-500/70 hover:text-amber-500 transition-colors cursor-pointer"
                  >
                    <Copy className="size-3" />
                    {t('auth.copyToken')}
                  </button>
                </div>

                <div className="border-t border-border pt-4">
                  <form onSubmit={handleConfirm} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reset-new-pw" className="text-foreground">
                        {t('auth.newPassword')}
                      </Label>
                      <Input
                        id="reset-new-pw"
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          setError('')
                        }}
                        placeholder={t('auth.minCharsPlaceholder')}
                        disabled={loading}
                        required
                        className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-confirm-pw" className="text-foreground">
                        {t('auth.confirmPassword')}
                      </Label>
                      <Input
                        id="reset-confirm-pw"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setError('')
                        }}
                        placeholder={t('auth.confirmPlaceholder')}
                        disabled={loading}
                        required
                        className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                      />
                    </div>
                    {error && (
                      <p role="alert" className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep('email')}
                        className="h-11 text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                      >
                        <ArrowLeft className="size-4 mr-1.5" />
                        {t('action.back')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || !newPassword || !confirmPassword}
                        className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 dark:text-white text-foreground font-semibold transition-all cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t('auth.resetButton')
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="py-4 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{t('auth.resetSuccess')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.resetSuccessDesc')}
                </p>
              </div>
              <Button
                onClick={handleClose}
                className="h-11 px-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 dark:text-white text-foreground font-semibold transition-all cursor-pointer"
              >
                {t('auth.backToLogin')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}