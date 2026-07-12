'use client'

import { useRef, useState, type FormEvent } from 'react'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Camera,
  Brain,
  TrendingUp,
  BarChart3,
  Target,
  Trophy,
  Zap,
  Mic,
  Dumbbell,
  Star,
  ArrowRight,
  UserPlus,
  ChevronRight,
  Check,
  Sparkles,
  Instagram,
  Twitter,
  Youtube,
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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

// ── Animated Basketball Hero Visual ─────────────────────────────────────────────

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="relative w-full max-w-md mx-auto aspect-square"
    >
      <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-3xl" />
      <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl" fill="none">
        <circle cx="200" cy="200" r="180" stroke="rgba(249,115,22,0.2)" strokeWidth="2" />
        <circle cx="200" cy="200" r="140" stroke="rgba(249,115,22,0.15)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="60" stroke="rgba(249,115,22,0.25)" strokeWidth="2" />
        <line x1="200" y1="20" x2="200" y2="380" stroke="rgba(249,115,22,0.12)" strokeWidth="1" />
        <line x1="20" y1="200" x2="380" y2="200" stroke="rgba(249,115,22,0.12)" strokeWidth="1" />
        <path d="M 80 100 A 160 160 0 0 1 320 100" stroke="rgba(249,115,22,0.2)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 80 300 A 160 160 0 0 0 320 300" stroke="rgba(249,115,22,0.2)" strokeWidth="1.5" strokeLinecap="round" />
        <motion.g animate={{ y: [0, -8, 0], rotate: [0, 10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <circle cx="200" cy="200" r="32" fill="#f97316" />
          <circle cx="200" cy="200" r="32" fill="url(#ball-gradient)" />
          <path d="M 168 200 Q 200 185 232 200" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="none" />
          <path d="M 168 200 Q 200 215 232 200" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="none" />
          <line x1="200" y1="168" x2="200" y2="232" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
          <ellipse cx="190" cy="190" rx="12" ry="8" fill="rgba(255,255,255,0.15)" transform="rotate(-20 190 190)" />
        </motion.g>
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

// ── Star Rating ─────────────────────────────────────────────────────────────────

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="size-4 fill-orange-400 text-orange-400" />
      ))}
    </div>
  )
}

// ── Section Wrapper ─────────────────────────────────────────────────────────────

function SectionDivider() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-3/4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}

// ── Features Data ───────────────────────────────────────────────────────────────

const features = [
  { icon: Camera, titleKey: 'landing.feature1.title' as const, descKey: 'landing.feature1.description' as const },
  { icon: Brain, titleKey: 'landing.feature2.title' as const, descKey: 'landing.feature2.description' as const },
  { icon: Target, titleKey: 'landing.feature3.title' as const, descKey: 'landing.feature3.description' as const },
  { icon: Zap, titleKey: 'landing.feature4.title' as const, descKey: 'landing.feature4.description' as const },
  { icon: BarChart3, titleKey: 'landing.feature5.title' as const, descKey: 'landing.feature5.description' as const },
  { icon: Trophy, titleKey: 'landing.feature6.title' as const, descKey: 'landing.feature6.description' as const },
  { icon: Dumbbell, titleKey: 'landing.feature7.title' as const, descKey: 'landing.feature7.description' as const },
  { icon: Mic, titleKey: 'landing.feature8.title' as const, descKey: 'landing.feature8.description' as const },
]

// ── Steps Data ──────────────────────────────────────────────────────────────────

const steps = [
  { number: '01', icon: Camera, titleKey: 'landing.step1.title' as const, descKey: 'landing.step1.description' as const },
  { number: '02', icon: Brain, titleKey: 'landing.step2.title' as const, descKey: 'landing.step2.description' as const },
  { number: '03', icon: TrendingUp, titleKey: 'landing.step3.title' as const, descKey: 'landing.step3.description' as const },
]

// ── Testimonials Data ───────────────────────────────────────────────────────────

const testimonials = [
  {
    nameKey: 'landing.testimonial1.name' as const,
    roleKey: 'landing.testimonial1.role' as const,
    quoteKey: 'landing.testimonial1.quote' as const,
    initials: 'MD',
    rating: 5,
  },
  {
    nameKey: 'landing.testimonial2.name' as const,
    roleKey: 'landing.testimonial2.role' as const,
    quoteKey: 'landing.testimonial2.quote' as const,
    initials: 'LM',
    rating: 5,
  },
  {
    nameKey: 'landing.testimonial3.name' as const,
    roleKey: 'landing.testimonial3.role' as const,
    quoteKey: 'landing.testimonial3.quote' as const,
    initials: 'TB',
    rating: 4,
  },
]

// ── Main Component ──────────────────────────────────────────────────────────────

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const { t, td } = useTranslation()
  const [email, setEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  // Section refs for scroll-triggered animations
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)
  const finalCtaRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  const featuresInView = useInView(featuresRef, { once: true, amount: 0.1 })
  const stepsInView = useInView(stepsRef, { once: true, amount: 0.2 })
  const testimonialsInView = useInView(testimonialsRef, { once: true, amount: 0.15 })
  const pricingInView = useInView(pricingRef, { once: true, amount: 0.2 })
  const finalCtaInView = useInView(finalCtaRef, { once: true, amount: 0.3 })
  const footerInView = useInView(footerRef, { once: true, amount: 0.3 })

  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  const scrollToPricing = () => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    // Store email and call signup
    fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => { /* best-effort */ })
    setEmailSubmitted(true)
    setTimeout(() => onNavigate('auth'), 800)
  }

  const freeFeatures = [
    td('Détection de posture IA', 'AI posture detection'),
    td('5 exercices par catégorie', '5 exercises per category'),
    td('Statistiques de base', 'Basic statistics'),
    td('Classement communautaire', 'Community leaderboard'),
  ]

  const proFeatures = [
    td('Tout le plan Gratuit +', 'Everything in Free +'),
    td('Plans d\'entraînement IA', 'AI workout plans'),
    td('Coach vocal en temps réel', 'Real-time voice coach'),
    td('Rapports de scouting avancés', 'Advanced scouting reports'),
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* ═══════════════════ HERO SECTION ═══════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent" />
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
            {t('landing.badge')}
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            {t('landing.heroTitle1')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
              {t('landing.heroTitleHighlight')}
            </span>{' '}
            {t('landing.heroTitle2')}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t('landing.heroSubtitle')}
          </motion.p>

          {/* Dual CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Button
              onClick={() => onNavigate('auth')}
              size="lg"
              className="h-13 px-8 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <UserPlus className="size-5" />
              {t('landing.ctaPrimary')}
            </Button>
            <Button
              onClick={scrollToFeatures}
              variant="outline"
              size="lg"
              className="h-13 px-8 text-base font-semibold rounded-xl border-border text-foreground/80 hover:bg-accent/60 hover:text-foreground transition-all cursor-pointer"
            >
              {t('landing.demo')}
              <ChevronRight className="size-5" />
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-3 mb-16"
          >
            <div className="flex -space-x-2">
              {['MD', 'LM', 'TB', 'AK'].map((initials, i) => (
                <Avatar key={i} className="size-8 border-2 border-background">
                  <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground font-medium">{t('landing.socialProof')}</span>
          </motion.div>

          {/* Basketball Graphic */}
          <HeroVisual />
        </div>
      </section>

      {/* ═══════════════════ FEATURES SECTION ═══════════════════════════════════ */}
      <section ref={featuresRef} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            custom={0}
            variants={fadeUp}
            className="text-center mb-14 sm:mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/20">
              <Sparkles className="size-3 mr-1" />
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t('landing.featuresTitle1')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                {t('landing.featuresTitleHighlight')}
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.titleKey}
                  initial="hidden"
                  animate={featuresInView ? 'visible' : 'hidden'}
                  custom={i + 1}
                  variants={scaleIn}
                >
                  <Card className="bg-card/60 border-border hover:border-orange-500/30 transition-colors duration-300 group h-full">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-500/20 transition-colors">
                        <Icon className="size-6 text-orange-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t(feature.descKey)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ═══════════════════ HOW IT WORKS ═══════════════════════════════════════ */}
      <section ref={stepsRef} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            animate={stepsInView ? 'visible' : 'hidden'}
            custom={0}
            variants={fadeUp}
            className="text-center mb-14 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t('landing.stepsTitle1')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                {t('landing.stepsTitleHighlight')}
              </span>
              ?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.stepsSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-14 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-orange-500/40 via-orange-500/20 to-orange-500/40" />

            {steps.map((step, i) => {
              const StepIcon = step.icon
              return (
                <motion.div
                  key={step.number}
                  initial="hidden"
                  animate={stepsInView ? 'visible' : 'hidden'}
                  custom={i + 1}
                  variants={fadeUp}
                  className="relative text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6 relative z-10">
                    <StepIcon className="size-8 text-orange-400" />
                  </div>
                  <div className="text-xs font-bold text-orange-500/60 uppercase tracking-widest mb-2">
                    {td('Étape', 'Step')} {step.number}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {t(step.descKey)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ═══════════════════ TESTIMONIALS ═══════════════════════════════════════ */}
      <section ref={testimonialsRef} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            animate={testimonialsInView ? 'visible' : 'hidden'}
            custom={0}
            variants={fadeUp}
            className="text-center mb-14 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t('landing.testimonialsTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.testimonialsSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.nameKey}
                initial="hidden"
                animate={testimonialsInView ? 'visible' : 'hidden'}
                custom={i + 1}
                variants={scaleIn}
              >
                <Card className="bg-card/60 border-border hover:border-orange-500/20 transition-colors duration-300 h-full">
                  <CardContent className="p-6 flex flex-col gap-5 h-full">
                    <StarRating count={testimonial.rating} />
                    <blockquote className="text-muted-foreground leading-relaxed flex-1 text-sm sm:text-base">
                      &ldquo;{t(testimonial.quoteKey)}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-orange-500/15 text-orange-400 font-semibold text-sm">
                          {testimonial.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{t(testimonial.nameKey)}</p>
                        <p className="text-xs text-muted-foreground">{t(testimonial.roleKey)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ═══════════════════ PRICING TEASER ════════════════════════════════════ */}
      <section ref={pricingRef} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            animate={pricingInView ? 'visible' : 'hidden'}
            custom={0}
            variants={fadeUp}
            className="text-center mb-12 sm:mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('landing.pricingTitle')}
            </h2>
            <p className="text-muted-foreground text-lg">{t('landing.pricingSubtitle')}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Free Plan */}
            <motion.div
              initial="hidden"
              animate={pricingInView ? 'visible' : 'hidden'}
              custom={1}
              variants={scaleIn}
            >
              <Card className="bg-card/60 border-border h-full">
                <CardContent className="p-6 sm:p-8 flex flex-col gap-5 h-full">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{t('landing.pricingFree')}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">0€</span>
                      <span className="text-muted-foreground text-sm">/mois</span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-3 flex-1">
                    {freeFeatures.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="size-4 text-orange-400 shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => onNavigate('auth')}
                    variant="outline"
                    className="w-full rounded-xl font-semibold cursor-pointer"
                    size="lg"
                  >
                    {t('landing.ctaPrimary')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial="hidden"
              animate={pricingInView ? 'visible' : 'hidden'}
              custom={2}
              variants={scaleIn}
            >
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30 h-full relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white border-0 px-3">
                  <Sparkles className="size-3 mr-1" />
                  Populaire
                </Badge>
                <CardContent className="p-6 sm:p-8 flex flex-col gap-5 h-full">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{t('landing.pricingPro')}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">9,99€</span>
                      <span className="text-muted-foreground text-sm">/mois</span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-3 flex-1">
                    {proFeatures.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="size-4 text-orange-400 shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={scrollToPricing}
                    className="w-full rounded-xl font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 cursor-pointer"
                    size="lg"
                  >
                    {t('landing.pricingCta')}
                    <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ════════════════════════════════════════ */}
      <section ref={finalCtaRef} className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-orange-500/[0.03] to-background pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate={finalCtaInView ? 'visible' : 'hidden'}
            custom={0}
            variants={fadeUp}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t('landing.finalCtaTitle')}
            </h2>
            <p className="text-muted-foreground text-lg mb-10">
              {t('landing.finalCtaSubtitle')}
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleEmailSubmit}
            initial="hidden"
            animate={finalCtaInView ? 'visible' : 'hidden'}
            custom={1}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('landing.finalCtaPlaceholder')}
              className="h-12 rounded-xl bg-card border-border text-foreground px-4"
              disabled={emailSubmitted}
            />
            <Button
              type="submit"
              size="lg"
              disabled={emailSubmitted}
              className="h-12 px-6 w-full sm:w-auto rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-70"
            >
              {emailSubmitted ? (
                <Check className="size-5" />
              ) : (
                <>
                  {t('landing.finalCtaButton')}
                  <ArrowRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          </motion.form>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════════════════════════════ */}
      <footer ref={footerRef} className="border-t border-border/60 py-10 px-4 sm:px-6 lg:px-8 mt-auto">
        <motion.div
          initial="hidden"
          animate={footerInView ? 'visible' : 'hidden'}
          custom={0}
          variants={fadeIn}
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CV</span>
            </div>
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} CourtVision AI. {t('landing.copyright')}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('landing.terms')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('landing.privacy')}
            </button>
            <a
              href="mailto:contact@courtvision.ai"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('landing.contact')}
            </a>
          </div>

          <div className="flex items-center gap-3">
            {[
              { Icon: Instagram, label: 'Instagram' },
              { Icon: Twitter, label: 'Twitter' },
              { Icon: Youtube, label: 'YouTube' },
            ].map(({ Icon, label }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </motion.div>
      </footer>
    </div>
  )
}