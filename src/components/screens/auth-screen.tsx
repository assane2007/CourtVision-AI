'use client'

import { useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Loader2, Eye, EyeOff, Dribbble } from 'lucide-react'

import { useAppStore } from '@/stores/app'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function AuthScreen() {
  const navigate = useAppStore((s) => s.navigate)

  // ── Login state ──────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // ── Signup state ─────────────────────────────────────────────────
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  // ── Handlers ─────────────────────────────────────────────────────
  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLoginError('')
      setLoginLoading(true)

      try {
        const result = await signIn('credentials', {
          email: loginEmail,
          password: loginPassword,
          redirect: false,
        })

        if (result?.ok) {
          navigate('home')
        } else {
          setLoginError('Email ou mot de passe incorrect.')
        }
      } catch {
        setLoginError('Une erreur réseau est survenue. Veuillez réessayer.')
      } finally {
        setLoginLoading(false)
      }
    },
    [loginEmail, loginPassword, navigate],
  )

  const handleSignup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSignupError('')
      setSignupLoading(true)

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: signupEmail,
            password: signupPassword,
            name: signupName,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? 'Erreur lors de la création du compte.')
        }

        // Auto-login after successful signup
        const result = await signIn('credentials', {
          email: signupEmail,
          password: signupPassword,
          redirect: false,
        })

        if (result?.ok) {
          navigate('home')
        } else {
          setSignupError('Compte créé mais la connexion a échoué. Veuillez vous connecter manuellement.')
        }
      } catch (err) {
        setSignupError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      } finally {
        setSignupLoading(false)
      }
    },
    [signupName, signupEmail, signupPassword, navigate],
  )

  // ── Shared password field builder ────────────────────────────────
  const renderPasswordField = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggle: () => void,
    disabled: boolean,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/80">
        Mot de passe
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required
          className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 pr-10 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3d0f] p-4">
      {/* Decorative ambient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 size-[28rem] rounded-full bg-green-500/8 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[40rem] rounded-full bg-orange-600/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-white/[0.08] backdrop-blur-xl border-white/20 shadow-2xl shadow-black/30 py-0 gap-0 overflow-hidden">
          {/* ── Logo / Header ─────────────────────────────────────── */}
          <CardHeader className="flex flex-col items-center gap-3 pt-8 pb-2 px-6">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Dribbble className="size-7 text-white" strokeWidth={1.8} />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                CourtVision{' '}
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  AI
                </span>
              </h1>
              <p className="text-sm text-white/50 font-medium">
                Entraînement Basketball Intelligent
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-8 pt-2">
            <Tabs defaultValue="login" className="w-full">
              {/* ── Tab bar ───────────────────────────────────────── */}
              <TabsList className="w-full h-11 bg-white/[0.06] p-1 mb-6 rounded-lg">
                <TabsTrigger
                  value="login"
                  className="flex-1 h-full rounded-md text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/20 text-white/60 transition-all"
                >
                  Connexion
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 h-full rounded-md text-sm font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/20 text-white/60 transition-all"
                >
                  Inscription
                </TabsTrigger>
              </TabsList>

              {/* ── LOGIN TAB ──────────────────────────────────────── */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white/80">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value)
                        setLoginError('')
                      }}
                      placeholder="vous@exemple.com"
                      disabled={loginLoading}
                      required
                      autoComplete="email"
                      className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                    />
                  </div>

                  {renderPasswordField(
                    'login-password',
                    loginPassword,
                    (v) => {
                      setLoginPassword(v)
                      setLoginError('')
                    },
                    showLoginPassword,
                    () => setShowLoginPassword((p) => !p),
                    loginLoading,
                    'Votre mot de passe',
                  )}

                  {loginError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-400 font-medium"
                    >
                      {loginError}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Connexion en cours…
                      </>
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── SIGNUP TAB ─────────────────────────────────────── */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-white/80">
                      Nom complet
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value)
                        setSignupError('')
                      }}
                      placeholder="Jean Dupont"
                      disabled={signupLoading}
                      required
                      autoComplete="name"
                      className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white/80">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value)
                        setSignupError('')
                      }}
                      placeholder="vous@exemple.com"
                      disabled={signupLoading}
                      required
                      autoComplete="email"
                      className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/40 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/30"
                    />
                  </div>

                  {renderPasswordField(
                    'signup-password',
                    signupPassword,
                    (v) => {
                      setSignupPassword(v)
                      setSignupError('')
                    },
                    showSignupPassword,
                    () => setShowSignupPassword((p) => !p),
                    signupLoading,
                    'Choisir un mot de passe',
                  )}

                  {signupError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-400 font-medium"
                    >
                      {signupError}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    {signupLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Création du compte…
                      </>
                    ) : (
                      'Créer un compte'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* ── Footer note ──────────────────────────────────────── */}
            <p className="mt-6 text-center text-xs text-white/30 leading-relaxed">
              En continuant, vous acceptez nos conditions d&apos;utilisation
              <br />
              et notre politique de confidentialité.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}