'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'

interface SignupFormProps {
  onSuccess: () => void
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { t } = useTranslation()
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

    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      })

      // Auto-login after successful signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        onSuccess()
      } else {
        setError(t('auth.signupCreatedError'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signup-name" className="text-foreground">
          {t('auth.fullName')}
        </Label>
        <Input
          id="signup-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          placeholder={t('auth.namePlaceholder')}
          disabled={loading}
          required
          autoComplete="name"
          className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email" className="text-foreground">
          {t('auth.email')}
        </Label>
        <Input
          id="signup-email"
          name="email"
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
          aria-describedby="signup-error"
          aria-invalid={!!error}
          className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
        />
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="signup-password" className="text-foreground">
          {t('auth.password')}
        </Label>
        <div className="relative">
          <Input
            id="signup-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            placeholder={t('auth.signupPasswordPlaceholder')}
            disabled={loading}
            required
            className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-10 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p
          id="signup-error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500 dark:text-red-400 font-medium"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t('auth.signupLoading')}
          </>
        ) : (
          t('action.createAccount')
        )}
      </Button>
    </form>
  )
}