'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/language-provider';

interface ResetPasswordFormProps {
  open: boolean
  onClose: () => void
}

export function ResetPasswordForm({ open, onClose }: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const resetState = useCallback(() => {
    setEmail('')
    setError('')
    setSent(false)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || t('auth.genericError'))
          return
        }

        // Always show success even if account not found (prevents email enumeration)
        setSent(true)
      } catch {
        setError(t('auth.genericError'))
      } finally {
        setLoading(false)
      }
    },
    [email, t],
  )

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="bg-background border-border sm:max-w-md">
        <AnimatePresence mode="wait">
          {!sent ? (
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
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                    t('auth.sendResetEmail')
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
                <h3 className="text-lg font-bold text-foreground">{t('auth.resetEmailSent')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.resetEmailSentDesc')}
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