'use client'

import { useState, useCallback, useMemo } from 'react'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Eye, EyeOff, Dribbble } from 'lucide-react'

import { useAppStore } from '@/stores/app'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

/* ── Floating basketball config ──────────────────────────────────── */
const floatingBasketballs = [
  { id: 1, size: '1.25rem', x: '8%', y: '12%', duration: 6, opacity: 0.15 },
  { id: 2, size: '2.5rem', x: '88%', y: '18%', duration: 8, opacity: 0.18 },
  { id: 3, size: '3rem', x: '5%', y: '78%', duration: 10, opacity: 0.2 },
  { id: 4, size: '1.75rem', x: '90%', y: '75%', duration: 7, opacity: 0.25 },
] as const

/* ── Confetti particles config ───────────────────────────────────── */
const confettiParticles = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2
  const distance = 80 + Math.random() * 100
  return {
    id: i,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#f97316' : '#fbbf24',
    size: 6 + Math.random() * 6,
  }
})

/* ── Half-court SVG component ────────────────────────────────────── */
function CourtLinesSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer boundary */}
      <rect
        x="100" y="50" width="800" height="900"
        stroke="white" strokeWidth="2" opacity="0.06"
      />
      {/* Half-court line */}
      <line
        x1="100" y1="500" x2="900" y2="500"
        stroke="white" strokeWidth="2" opacity="0.06"
      />
      {/* Center circle */}
      <circle
        cx="500" cy="500" r="60"
        stroke="white" strokeWidth="2" opacity="0.06"
      />
      {/* Center small circle */}
      <circle
        cx="500" cy="500" r="6"
        fill="white" opacity="0.06"
      />
      {/* Top key / paint */}
      <rect
        x="350" y="50" width="300" height="190"
        stroke="white" strokeWidth="2" opacity="0.06"
      />
      {/* Top free-throw circle */}
      <circle
        cx="500" cy="240" r="60"
        stroke="white" strokeWidth="2" opacity="0.05"
        strokeDasharray="0 94 188 94"
      />
      {/* Top three-point arc */}
      <path
        d="M 170 50 L 170 240 Q 170 440 500 440 Q 830 440 830 240 L 830 50"
        stroke="white" strokeWidth="2" opacity="0.06"
      />
      {/* Top basket / hoop */}
      <circle
        cx="500" cy="100" r="22"
        stroke="white" strokeWidth="2" opacity="0.05"
      />
      <line
        x1="440" y1="60" x2="560" y2="60"
        stroke="white" strokeWidth="3" opacity="0.05"
      />
      {/* Top restricted area arc */}
      <path
        d="M 460 50 A 40 40 0 0 1 540 50"
        stroke="white" strokeWidth="1.5" opacity="0.05"
      />
      {/* Bottom key / paint */}
      <rect
        x="350" y="760" width="300" height="190"
        stroke="white" strokeWidth="2" opacity="0.06"
      />
      {/* Bottom free-throw circle */}
      <circle
        cx="500" cy="760" r="60"
        stroke="white" strokeWidth="2" opacity="0.05"
        strokeDasharray="0 94 188 94"
      />
      {/* Bottom three-point arc */}
      <path
        d="M 170 950 L 170 760 Q 170 560 500 560 Q 830 560 830 760 L 830 950"
        stroke="white" strokeWidth="2" opacity="0.06"
      />
      {/* Bottom basket / hoop */}
      <circle
        cx="500" cy="900" r="22"
        stroke="white" strokeWidth="2" opacity="0.05"
      />
      <line
        x1="440" y1="940" x2="560" y2="940"
        stroke="white" strokeWidth="3" opacity="0.05"
      />
      {/* Bottom restricted area arc */}
      <path
        d="M 460 950 A 40 40 0 0 0 540 950"
        stroke="white" strokeWidth="1.5" opacity="0.05"
      />
      {/* Subtle orange tint overlay lines */}
      <rect
        x="100" y="50" width="800" height="900"
        stroke="#f97316" strokeWidth="1" opacity="0.04"
      />
    </svg>
  )
}

/* ── Confetti burst component ────────────────────────────────────── */
function ConfettiBurst({ onDone }: { onDone: () => void }) {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
      {confettiParticles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' as const }}
          onAnimationComplete={p.id === 0 ? onDone : undefined}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  )
}

/* ── Main Auth Screen ────────────────────────────────────────────── */
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

  // ── Success animation state ──────────────────────────────────────
  const [showConfetti, setShowConfetti] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(false)

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
          setPendingNavigation(true)
          setShowConfetti(true)
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
          throw new Error(body.error ?? 'Erreur lors de la création du compte.')
        }

        // Auto-login after successful signup
        const result = await signIn('credentials', {
          email: signupEmail,
          password: signupPassword,
          redirect: false,
        })

        if (result?.ok) {
          setPendingNavigation(true)
          setShowConfetti(true)
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

  const handleConfettiDone = useCallback(() => {
    setShowConfetti(false)
    if (pendingNavigation) {
      navigate('home')
    }
  }, [pendingNavigation, navigate])

  // ── Shared password field builder ────────────────────────────────
  const renderPasswordField = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggle: () => void,
    disabled: boolean,
    placeholder: string,
    showForgotLink = false,
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
      {showForgotLink && (
        <div className="text-right pt-1">
          <button
            type="button"
            className="text-xs text-orange-400/60 hover:text-orange-400/90 transition-colors cursor-pointer"
          >
            Mot de passe oublié ?
          </button>
        </div>
      )}
    </div>
  )

  // Memoize floating basketballs to avoid re-renders
  const floatingBalls = useMemo(() => floatingBasketballs, [])

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3d0f] p-4">
      {/* ── Basketball court lines SVG background ──────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <CourtLinesSVG />
      </div>

      {/* ── Decorative ambient orbs ────────────────────────────── */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-amber-500/10 blur-3xl z-0" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 size-[28rem] rounded-full bg-green-500/8 blur-3xl z-0" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[40rem] rounded-full bg-orange-600/5 blur-3xl z-0" />

      {/* ── Floating basketballs ───────────────────────────────── */}
      {floatingBalls.map((ball) => (
        <motion.span
          key={ball.id}
          className="absolute pointer-events-none select-none z-[1]"
          style={{ left: ball.x, top: ball.y, fontSize: ball.size, opacity: ball.opacity }}
          animate={{ y: [-20, 20, -20] }}
          transition={{
            duration: ball.duration,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          }}
          aria-hidden
        >
          🏀
        </motion.span>
      ))}

      {/* ── Confetti animation overlay ─────────────────────────── */}
      <AnimatePresence>
        {showConfetti && <ConfettiBurst onDone={handleConfettiDone} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="relative bg-white/[0.08] backdrop-blur-xl border-white/20 shadow-2xl shadow-black/30 py-0 gap-0 overflow-hidden shadow-[0_0_80px_rgba(249,115,22,0.15)]">
          {/* ── Orange gradient top line ──────────────────────────── */}
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-amber-400" />

          {/* ── Logo / Header ─────────────────────────────────────── */}
          <CardHeader className="flex flex-col items-center gap-3 pt-8 pb-2 px-6">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Dribbble className="size-7 text-white" strokeWidth={1.8} />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-white">🏀 CourtVision </span>
                <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
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
                    true,
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
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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