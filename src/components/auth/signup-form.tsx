'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/components/providers/language-provider';

interface SignupFormProps {
  onSuccess: () => void
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { t } = useTranslation()
  const { signUp, signIn } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Sign up via Supabase (creates user, sends confirmation if enabled)
    const { error: signUpError } = await signUp(email, password, name)

    if (signUpError) {
      setError(signUpError)
      setLoading(false)
      return
    }

    // 2. Auto-login after successful signup
    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      // Signup succeeded but auto-login failed (e.g. email confirmation required)
      setError(signInError)
      setLoading(false)
      return
    }

    onSuccess()
    setLoading(false)
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      if (!supabase) {
        setError('Authentication is not configured')
        return
      }
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/supabase/callback`,
        },
      })
    } catch {
      setError(t('auth.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Google OAuth Button */}
      <Button
        type="button" variant="outline" onClick={handleGoogleSignUp} disabled={loading}
        className="w-full h-11 text-sm font-medium border-border bg-muted/30 hover:bg-muted/60 text-foreground transition-all cursor-pointer"
      >
        <svg className="size-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {t('auth.continueWithGoogle')}
      </Button>

      <div className="relative flex items-center">
        <Separator className="flex-1" />
        <span className="px-3 text-xs text-muted-foreground">{t('auth.orContinueWith')}</span>
        <Separator className="flex-1" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-name" className="text-foreground">{t('auth.fullName')}</Label>
        <Input
          id="signup-name" name="name" type="text"
          value={name} onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder={t('auth.namePlaceholder')} disabled={loading} required autoComplete="name"
          className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-foreground">{t('auth.email')}</Label>
        <Input
          id="signup-email" name="email" type="email"
          value={email} onChange={(e) => { setEmail(e.target.value); setError('') }}
          placeholder={t('auth.emailPlaceholder')} disabled={loading} required
          autoComplete="email" aria-describedby="signup-error" aria-invalid={!!error}
          className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-foreground">{t('auth.password')}</Label>
        <div className="relative">
          <Input
            id="signup-password" name="password"
            type={showPassword ? 'text' : 'password'}
            value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder={t('auth.signupPasswordPlaceholder')} disabled={loading} required
            className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-10 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
          />
          <button
            type="button" onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p id="signup-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500 dark:text-red-400 font-medium" role="alert">
          {error}
        </motion.p>
      )}

      <Button type="submit" disabled={loading}
        className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer">
        {loading ? (<><Loader2 className="size-4 animate-spin" />{t('auth.signupLoading')}</>) : t('action.createAccount')}
      </Button>
    </form>
  )
}