'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dribbble } from 'lucide-react'

import { useAppStore } from '@/stores/app'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTranslation } from '@/components/providers/language-provider'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { SetPasswordDialog } from '@/components/auth/set-password-dialog'

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
    size: `${6 + Math.random() * 6}px`,
  }
})

/* ── Court Lines SVG Background ──────────────────────────────────── */
function CourtLinesSVG() {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className="absolute inset-0 w-full h-full opacity-[0.03]"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {/* Outer boundary */}
      <rect
        x="100" y="50" width="800" height="900"
        stroke="white" strokeWidth="3" fill="none" opacity="0.08"
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
  const { t } = useTranslation()
  const navigate = useAppStore((s) => s.navigate)

  // ── Success animation state ──────────────────────────────────────
  const [showConfetti, setShowConfetti] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(false)

  // ── Password reset dialog state ───────────────────────────────────
  const [resetOpen, setResetOpen] = useState(false)
  // Detect recovery flow from URL (reset_password=1)
  const [setPasswordOpen, setSetPasswordOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const isRecovery = params.get('reset_password') === '1'
      if (isRecovery) {
        window.history.replaceState({}, '', '/')
      }
      return isRecovery
    }
    return false
  })

  const handleAuthSuccess = useCallback(() => {
    setPendingNavigation(true)
    setShowConfetti(true)
  }, [])

  const handleConfettiDone = useCallback(() => {
    setShowConfetti(false)
    if (pendingNavigation) {
      navigate('home')
    }
  }, [pendingNavigation, navigate])

  // Memoize floating basketballs to avoid re-renders
  const floatingBalls = useMemo(() => floatingBasketballs, [])

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3d0f] dark:from-background dark:via-background dark:to-background p-4">
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
        className="relative z-10 w-full max-w-md md:max-w-lg lg:max-w-xl"
      >
        <Card className="relative bg-card/80 backdrop-blur-xl border-border shadow-lg py-0 gap-0 overflow-hidden shadow-[0_0_80px_rgba(249,115,22,0.15)]">
          {/* ── Orange gradient top line ──────────────────────────── */}
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-amber-400" />

          {/* ── Logo / Header ─────────────────────────────────────── */}
          <CardHeader className="flex flex-col items-center gap-3 pt-8 pb-2 px-6">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Dribbble className="size-7 text-foreground" strokeWidth={1.8} />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-foreground">🏀 CourtVision </span>
                <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  AI
                </span>
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                {t('auth.subtitle')}
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-6 md:px-8 pb-8 pt-2">
            <Tabs defaultValue="login" className="w-full">
              {/* ── Tab bar ───────────────────────────────────────── */}
              <TabsList className="w-full h-11 bg-muted/50 p-1 mb-6 rounded-lg">
                <TabsTrigger
                  value="login"
                  className="flex-1 h-full rounded-md text-sm md:text-base font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/20 text-muted-foreground transition-all"
                >
                  {t('action.signIn')}
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="flex-1 h-full rounded-md text-sm md:text-base font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/20 text-muted-foreground transition-all"
                >
                  {t('action.signUp')}
                </TabsTrigger>
              </TabsList>

              {/* ── LOGIN TAB ──────────────────────────────────────── */}
              <TabsContent value="login">
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onForgotPassword={() => setResetOpen(true)}
                />
              </TabsContent>

              {/* ── SIGNUP TAB ─────────────────────────────────────── */}
              <TabsContent value="signup">
                <SignupForm onSuccess={handleAuthSuccess} />
              </TabsContent>
            </Tabs>

            {/* ── Footer note ──────────────────────────────────────── */}
            <p className="mt-6 text-center text-xs text-muted-foreground/70 leading-relaxed">
              {t('auth.termsText')}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Password Reset Dialog ──────────────────────────────────── */}
      <ResetPasswordForm
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      />

      {/* ── Set Password Dialog (after recovery link) ──────────────── */}
      <SetPasswordDialog
        open={setPasswordOpen}
        onClose={() => setSetPasswordOpen(false)}
      />
    </div>
  )
}