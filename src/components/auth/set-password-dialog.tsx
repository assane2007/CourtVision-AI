'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'
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
import { useTranslation } from '@/components/providers/language-provider'

interface SetPasswordDialogProps {
  open: boolean
  onClose: () => void
}

export function SetPasswordDialog({ open, onClose }: SetPasswordDialogProps) {
  const { t } = useTranslation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const resetState = useCallback(() => {
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    setShowPassword(false)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (newPassword.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth/reset-password/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || t('auth.genericError'))
          return
        }

        setSuccess(true)
      } catch {
        setError(t('auth.genericError'))
      } finally {
        setLoading(false)
      }
    },
    [newPassword, confirmPassword, t],
  )

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="bg-background border-border sm:max-w-md">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <KeyRound className="h-5 w-5 text-orange-400" />
                  {t('auth.setPassword')}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t('auth.setPasswordDesc')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pw" className="text-foreground">
                    {t('auth.setPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                      disabled={loading}
                      required
                      className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-10 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-pw" className="text-foreground">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError('')
                    }}
                    placeholder="Confirmer"
                    disabled={loading}
                    required
                    className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-500 dark:text-red-400">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 dark:text-white text-foreground font-semibold transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('action.save')
                  )}
                </Button>
              </form>
            </motion.div>
          ) : (
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
                <h3 className="text-lg font-bold text-foreground">{t('auth.passwordUpdated')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.passwordUpdatedDesc')}
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