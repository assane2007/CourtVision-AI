'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Camera,
  Bot,
  Target,
  Zap,
  BarChart3,
  Trophy,
  ArrowRight,
  UserPlus,
  ChevronRight,
} from 'lucide-react'
import type { Screen } from '@/stores/app'
import { useTranslation } from '@/components/providers/language-provider'

// ── Props ───────────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onNavigate: (screen: Screen) => void
}

// ── Animation helpers ───────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
}

// ── Basketball Court SVG ────────────────────────────────────────────────────────

function BasketballCourtGraphic() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="relative w-full max-w-md mx-auto aspect-square"
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-3xl" />

      <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl" fill="none">
        {/* Court circle */}
        <circle cx="200" cy="200" r="180" stroke="rgba(249,115,22,0.2)" strokeWidth="2" />
        <circle cx="200" cy="200" r="140" stroke="rgba(249,115,22,0.15)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="60" stroke="rgba(249,115,22,0.25)" strokeWidth="2" />

        {/* Court lines */}
        <line x1="200" y1="20" x2="200" y2="380" stroke="rgba(249,115,22,0.12)" strokeWidth="1" />
        <line x1="20" y1="200" x2="380" y2="200" stroke="rgba(249,115,22,0.12)" strokeWidth="1" />

        {/* Three-point arc */}
        <path
          d="M 80 100 A 160 160 0 0 1 320 100"
          stroke="rgba(249,115,22,0.2)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 80 300 A 160 160 0 0 0 320 300"
          stroke="rgba(249,115,22,0.2)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Animated basketball */}
        <motion.g
          animate={{
            y: [0, -8, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <circle cx="200" cy="200" r="32" fill="#f97316" />
          <circle cx="200" cy="200" r="32" fill="url(#ball-gradient)" />
          {/* Ball lines */}
          <path d="M 168 200 Q 200 185 232 200" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="none" />
          <path d="M 168 200 Q 200 215 232 200" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="none" />
          <line x1="200" y1="168" x2="200" y2="232" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
          {/* Ball highlight */}
          <ellipse cx="190" cy="190" rx="12" ry="8" fill="rgba(255,255,255,0.15)" transform="rotate(-20 190 190)" />
        </motion.g>

        {/* Orbiting dots */}
        {[
          { cx: 200, cy: 50, delay: 0 },
          { cx: 340, cy: 200, delay: 0.8 },
          { cx: 200, cy: 350, delay: 1.6 },
          { cx: 60, cy: 200, delay: 2.4 },
        ].map((dot, i) => (
          <motion.circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r="4"
            fill="#f97316"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2.5, delay: dot.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Radar sweep */}
        <motion.path
          d="M 200 200 L 200 60"
          stroke="rgba(249,115,22,0.4)"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '200px 200px' }}
        />

        <defs>
          <radialGradient id="ball-gradient" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  )
}

// ── Features Data ───────────────────────────────────────────────────────────────

const features = [
  {
    icon: Camera,
    title: 'Détection de Posture IA',
    description: 'Ta caméra analyse tes mouvements en temps réel grâce à MediaPipe pour corriger ta forme.',
  },
  {
    icon: Bot,
    title: 'Coach IA Personnalisé',
    description: 'Un assistant intelligent qui adapte les conseils et les exercices à ton niveau.',
  },
  {
    icon: Target,
    title: 'Rapport de Scouting',
    description: 'Analyse détaillée de tes performances avec des rapports visuels complets.',
  },
  {
    icon: Zap,
    title: 'Entraînement de Réaction',
    description: 'Améliore tes temps de réaction avec des exercices stimulants et progressifs.',
  },
  {
    icon: BarChart3,
    title: 'Statistiques Avancées',
    description: 'Suivi détaillé de ta progression avec graphiques et métriques claires.',
  },
  {
    icon: Trophy,
    title: 'Classement & Communauté',
    description: 'Compare-toi aux autres joueurs et défie la communauté.',
  },
]

// ── Steps Data ──────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Enregistre-toi en 30 secondes',
    description: 'Crée ton compte gratuitement et configure ton profil de joueur.',
  },
  {
    number: '02',
    title: 'Choisis ton entraînement',
    description: 'Parcours les exercices par catégorie ou suis un plan personnalisé.',
  },
  {
    number: '03',
    title: 'Suit tes progrès en temps réel',
    description: "L'IA analyse ta forme et te donne des retours instantanés pour t'améliorer.",
  },
]

// ── Stats Data ──────────────────────────────────────────────────────────────────

const stats = [
  { value: '10+', label: 'Exercices' },
  { value: '9', label: 'Catégories' },
  { value: 'IA', label: 'Analyse ta forme' },
  { value: '100%', label: 'Gratuit' },
]

// ── Main Component ──────────────────────────────────────────────────────────────

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const { t } = useTranslation()
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  const featuresInView = useInView(featuresRef, { once: true, amount: 0.15 })
  const stepsInView = useInView(stepsRef, { once: true, amount: 0.2 })
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 })
  const footerInView = useInView(footerRef, { once: true, amount: 0.3 })

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="dark min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 dark:text-gray-100 text-foreground">
      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-900 to-transparent" />
        </div>

        <div ref={heroRef} className="relative z-10 max-w-4xl mx-auto text-center pt-16 pb-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            Nouveau — Entraînement IA révolutionnaire
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Ton Coach{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              IA de Basketball
            </span>{' '}
            Personnel
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl dark:text-gray-400 text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Analyse ta posture en temps réel, suit tes progrès et reçois des
            conseils personnalisés — le tout gratuitement depuis ton téléphone.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              onClick={() => onNavigate('auth')}
              size="lg"
              className="h-13 px-8 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <UserPlus className="size-5" />
              Commencer gratuitement
            </Button>
            <Button
              onClick={scrollToFeatures}
              variant="outline"
              size="lg"
              className="h-13 px-8 text-base font-semibold rounded-xl border-border dark:text-gray-300 text-foreground/80 hover:bg-accent/60 dark:hover:text-gray-100 hover:text-foreground transition-all cursor-pointer"
            >
              Voir les fonctionnalités
              <ChevronRight className="size-5" />
            </Button>
          </motion.div>

          {/* Basketball Graphic */}
          <BasketballCourtGraphic />
        </div>
      </section>

      {/* ── FEATURES SECTION ──────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            custom={0}
            variants={fadeUp}
            className="text-center mb-14 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Tout ce dont tu as{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                besoin
              </span>
            </h2>
            <p className="dark:text-gray-400 text-muted-foreground text-lg max-w-2xl mx-auto">
              Une suite complète d&apos;outils pour améliorer ton jeu, guidée par
              l&apos;intelligence artificielle.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  animate={featuresInView ? 'visible' : 'hidden'}
                  custom={i + 1}
                  variants={fadeUp}
                >
                  <Card className="bg-card/60 border-border hover:border-orange-500/30 transition-colors duration-300 group h-full">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-500/20 transition-colors">
                        <Icon className="size-6 text-orange-400" />
                      </div>
                      <h3 className="text-lg font-semibold dark:text-gray-100 text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-sm dark:text-gray-400 text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ──────────────────────────────────────────────── */}
      <section ref={stepsRef} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative">
        {/* Subtle separator */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial="hidden"
            animate={stepsInView ? 'visible' : 'hidden'}
            custom={0}
            variants={fadeUp}
            className="text-center mb-14 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Comment ça{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                marche
              </span>
              ?
            </h2>
            <p className="dark:text-gray-400 text-muted-foreground text-lg max-w-2xl mx-auto">
              Trois étapes simples pour commencer à t&apos;améliorer.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial="hidden"
                animate={stepsInView ? 'visible' : 'hidden'}
                custom={i + 1}
                variants={fadeUp}
                className="relative text-center"
              >
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-gradient-to-r from-orange-500/40 to-orange-500/10" />
                )}

                {/* Step number circle */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-orange-400">{step.number}</span>
                </div>

                <h3 className="text-lg font-semibold dark:text-gray-100 text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-sm dark:text-gray-400 text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR SECTION ─────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            animate={statsInView ? 'visible' : 'hidden'}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                className="text-center p-6 rounded-2xl bg-muted/40 border border-border/60"
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-orange-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm dark:text-gray-400 text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <motion.div
          initial="hidden"
          animate={statsInView ? 'visible' : 'hidden'}
          custom={2}
          variants={fadeUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Prêt à monter{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              ton niveau
            </span>
            ?
          </h2>
          <p className="dark:text-gray-400 text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Rejoins des milliers de joueurs qui s&apos;entraînent plus
            intelligemment avec CourtVision AI.
          </p>
          <Button
            onClick={() => onNavigate('auth')}
            size="lg"
            className="h-13 px-8 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            {t('action.createAccount')}
            <ArrowRight className="size-5" />
          </Button>
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer ref={footerRef} className="border-t border-border/60 py-10 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={footerInView ? 'visible' : 'hidden'}
          custom={0}
          variants={fadeIn}
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CV</span>
            </div>
            <span className="text-sm dark:text-gray-400 text-muted-foreground">
              &copy; {new Date().getFullYear()} CourtVision AI. Tous droits réservés.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/api/privacy"
              className="text-sm dark:text-gray-500 text-muted-foreground hover:dark:text-gray-300 hover:text-foreground/80 transition-colors"
            >
              Politique de confidentialité
            </a>
            <a
              href="mailto:privacy@courtvision.ai"
              className="text-sm dark:text-gray-500 text-muted-foreground hover:dark:text-gray-300 hover:text-foreground/80 transition-colors"
            >
              Contact
            </a>
          </div>
        </motion.div>
      </footer>
    </div>
  )
}