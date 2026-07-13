'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  Crosshair,
  Dumbbell,
  Trophy,
  PartyPopper,
  ChevronRight,
  ArrowLeft,
  Volleyball,
  User,
  Target,
  Brain,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/stores/app';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { useTranslation } from '@/components/providers/language-provider';
import { apiFetch } from '@/lib/utils';
import { toast } from 'sonner';
import type { TranslationKey } from '@/lib/i18n';

// ─── Types ───────────────────────────────────────────────────────────────────

type BballPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro'
type WizardGoal = 'shooting' | 'conditioning' | 'game_understanding' | 'match_prep'

interface WizardData {
  step: number
  name: string
  position: BballPosition | null
  level: ExperienceLevel | null
  goals: WizardGoal[]
  age: number
  heightCm: number
  weightKg: number
}

const STORAGE_KEY = 'cv-onboarding'

const defaultData: WizardData = {
  step: 0,
  name: '',
  position: null,
  level: null,
  goals: [],
  age: 18,
  heightCm: 175,
  weightKg: 70,
}

function loadData(): WizardData {
  if (typeof window === 'undefined') return { ...defaultData }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultData, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...defaultData }
}

function saveData(data: WizardData) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

function clearData() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// ─── Options data ────────────────────────────────────────────────────────────

interface PosOption {
  value: BballPosition
  key: TranslationKey
  icon: React.ReactNode
  color: string
}

const positionOptions: PosOption[] = [
  { value: 'PG', key: 'onboarding.posPG', icon: <Target className="h-5 w-5" />, color: 'text-orange-400' },
  { value: 'SG', key: 'onboarding.posSG', icon: <Crosshair className="h-5 w-5" />, color: 'text-red-400' },
  { value: 'SF', key: 'onboarding.posSF', icon: <User className="h-5 w-5" />, color: 'text-emerald-400' },
  { value: 'PF', key: 'onboarding.posPF', icon: <Dumbbell className="h-5 w-5" />, color: 'text-amber-400' },
  { value: 'C', key: 'onboarding.posC', icon: <Trophy className="h-5 w-5" />, color: 'text-violet-400' },
]

interface LevelOption {
  value: ExperienceLevel
  key: TranslationKey
  descKey: TranslationKey
}

const levelOptions: LevelOption[] = [
  { value: 'beginner', key: 'difficulty.beginner', descKey: 'onboarding.lvlBeginnerDesc' },
  { value: 'intermediate', key: 'difficulty.intermediate', descKey: 'onboarding.lvlIntermediateDesc' },
  { value: 'advanced', key: 'difficulty.advanced', descKey: 'onboarding.lvlAdvancedDesc' },
  { value: 'pro', key: 'onboarding.lvlPro', descKey: 'onboarding.lvlEliteDesc' },
]

interface GoalOption {
  value: WizardGoal
  key: TranslationKey
  descKey: TranslationKey
  icon: React.ReactNode
}

const goalOptions: GoalOption[] = [
  { value: 'shooting', key: 'onboarding.goalImproveShooting', descKey: 'onboarding.goalImproveShootingDesc', icon: <Crosshair className="h-5 w-5" /> },
  { value: 'conditioning', key: 'onboarding.goalGetInShape', descKey: 'onboarding.goalGetInShapeDesc', icon: <Dumbbell className="h-5 w-5" /> },
  { value: 'game_understanding', key: 'onboarding.goalUnderstandGame', descKey: 'onboarding.goalUnderstandGameDesc', icon: <Brain className="h-5 w-5" /> },
  { value: 'match_prep', key: 'onboarding.goalMatchPrep', descKey: 'onboarding.goalMatchPrepDesc', icon: <Flame className="h-5 w-5" /> },
]

// ─── Animation ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7

const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 280 : -280, opacity: 0, scale: 0.96 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -280 : 280, opacity: 0, scale: 0.96 }),
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useAppStore((s) => s.navigate)
  const nameRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState<WizardData>(loadData)
  const [direction, setDirection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [goalsError, setGoalsError] = useState(false)

  // Persist on every change
  const update = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => {
      const next = { ...prev, ...patch }
      saveData(next)
      return next
    })
  }, [])

  // Restore step on reload
  useEffect(() => {
    nameRef.current?.focus()
  }, [data.step])

  // ── Validation ─────────────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (data.step) {
      case 1: return data.name.trim().length > 0 && data.position !== null && data.level !== null
      case 5: return data.goals.length > 0
      default: return true
    }
  }

  const validateStep = (): boolean => {
    if (data.step === 1) {
      if (!data.name.trim()) { setNameError(true); return false }
      setNameError(false)
    }
    if (data.step === 5 && data.goals.length === 0) {
      setGoalsError(true)
      return false
    }
    setGoalsError(false)
    return true
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    if (!validateStep()) return
    if (data.step < TOTAL_STEPS - 1) {
      setDirection(1)
      update({ step: data.step + 1 })
    }
  }

  const goBack = () => {
    if (data.step > 0) {
      setDirection(-1)
      setNameError(false)
      setGoalsError(false)
      update({ step: data.step - 1 })
    }
  }

  const skip = () => {
    clearData()
    navigate('home')
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  // Generate skill values based on experience level with ±5 variance
  const generateSkills = (level: ExperienceLevel) => {
    const baseRange: Record<ExperienceLevel, [number, number]> = {
      beginner: [20, 30],
      intermediate: [35, 50],
      advanced: [55, 70],
      pro: [75, 90],
    }
    const [lo, hi] = baseRange[level]
    // Deterministic pseudo-random variance based on player name hash
    const hash = data.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const v = (i: number) => ((hash * (i + 7) * 31) % 11) - 5 // -5 to +5
    const clamp = (n: number) => Math.max(0, Math.min(100, n))
    const randInRange = (i: number) => clamp(lo + Math.floor(((hash * (i + 3) * 17) % (hi - lo + 1))))
    return {
      shooting: clamp(randInRange(0) + (data.goals.includes('shooting') ? 10 : 0) + v(0)),
      handling: clamp(randInRange(1) + v(1)),
      finishing: clamp(randInRange(2) + v(2)),
      defense: clamp(randInRange(3) + v(3)),
      iq: clamp(randInRange(4) + (data.goals.includes('game_understanding') ? 10 : 0) + v(4)),
    }
  }

  const handleComplete = async () => {
    if (!data.position || !data.level || data.goals.length === 0) return
    setIsSubmitting(true)

    const levelMap: Record<string, number> = { beginner: 0, intermediate: 2, advanced: 4, pro: 6 }
    const skills = generateSkills(data.level)

    try {
      await apiFetch('/api/player/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim() || user?.name || user?.email?.split('@')[0] || 'Player',
          email: user?.email || '',
          age: data.age,
          position: data.position,
          heightCm: data.heightCm,
          weightKg: data.weightKg,
          yearsExp: levelMap[data.level] ?? 0,
          ...skills,
        }),
      })
    } catch {
      toast.error(t('onboarding.saveError'))
    } finally {
      clearData()
      setIsSubmitting(false)
      navigate('home')
    }
  }

  // ── Keyboard nav ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && data.step < 6) {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.step, data.name, data.position, data.level, data.goals])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const progressPct = ((data.step + 1) / TOTAL_STEPS) * 100
  const posLabel = positionOptions.find((p) => p.value === data.position)

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-background px-4 py-8 sm:py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/5 blur-[120px]" />
      {/* Court background */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full text-border opacity-[0.12]" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <rect x="20" y="20" width="360" height="760" rx="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="200" cy="400" r="60" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="20" y1="400" x2="380" y2="400" stroke="currentColor" strokeWidth="1" />
        <rect x="130" y="20" width="140" height="90" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="200" cy="110" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 sm:gap-8">
        {/* ── Step indicator (dots with numbers) ──────────────────────────── */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={() => {
                    if (i < data.step) { setDirection(-1); update({ step: i }) }
                  }}
                  aria-label={`${t('onboarding.step')} ${i + 1}`}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 min-h-[44px] min-w-[44px] ${
                    i < data.step
                      ? 'bg-orange-500 text-white cursor-pointer'
                      : i === data.step
                        ? 'bg-orange-500/15 text-orange-500 ring-2 ring-orange-500' :'bg-muted text-muted-foreground'
                  }`}
                  whileHover={i < data.step ? { scale: 1.1 } : {}}
                  whileTap={i < data.step ? { scale: 0.95 } : {}}
                >
                  {i < data.step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </motion.button>
                {i < TOTAL_STEPS - 1 && (
                  <div className={`h-0.5 w-4 sm:w-8 rounded-full transition-colors duration-300 ${i < data.step ? 'bg-orange-500' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <Progress value={progressPct} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-orange-500 [&>[data-slot=progress-indicator]]:to-amber-400" />
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
            {t('onboarding.step')} {data.step + 1}/{TOTAL_STEPS}
          </p>
        </div>

        {/* ── Step content ────────────────────────────────────────────────── */}
        <div className="relative w-full min-h-[320px] sm:min-h-[360px]">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={data.step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 }, scale: { duration: 0.2 } }}
              className="absolute inset-0 flex flex-col"
            >
              {renderStep(data, update, t, nameRef, nameError, setNameError, goalsError, setGoalsError, posLabel, isSubmitting)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Navigation buttons ──────────────────────────────────────────── */}
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex-1">
            {data.step > 0 && data.step < 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="text-muted-foreground hover:text-foreground hover:bg-muted min-h-[44px]"
                aria-label={t('action.back')}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t('action.back')}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Skip — visible on steps 0-2 */}
            {data.step < 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skip}
                className="text-muted-foreground hover:text-foreground hover:bg-muted min-h-[44px]"
              >
                {t('onboarding.skip')}
              </Button>
            )}

            {data.step < 6 && (
              <Button
                size="lg"
                onClick={goNext}
                disabled={!canProceed()}
                className="min-h-[44px] bg-orange-500 text-white hover:bg-orange-600"
              >
                {t('onboarding.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {data.step === 6 && (
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="min-h-[44px] bg-orange-500 text-white hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <motion.div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                ) : (
                  <>
                    {t('onboarding.goToDashboard')}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step renderers ───────────────────────────────────────────────────────────

function renderStep(
  data: WizardData,
  update: (p: Partial<WizardData>) => void,
  t: (k: TranslationKey) => string,
  nameRef: React.RefObject<HTMLInputElement | null>,
  nameError: boolean,
  setNameError: (v: boolean) => void,
  goalsError: boolean,
  setGoalsError: (v: boolean) => void,
  posLabel: PosOption | undefined,
  isSubmitting: boolean,
) {
  switch (data.step) {
    case 0: return <StepWelcome t={t} />
    case 1: return <StepProfile data={data} update={update} t={t} nameRef={nameRef} nameError={nameError} setNameError={setNameError} />
    case 2: return <StepAge data={data} update={update} t={t} />
    case 3: return <StepHeight data={data} update={update} t={t} />
    case 4: return <StepWeight data={data} update={update} t={t} />
    case 5: return <StepGoals data={data} update={update} t={t} goalsError={goalsError} setGoalsError={setGoalsError} />
    case 6: return <StepSummary data={data} t={t} posLabel={posLabel} isSubmitting={isSubmitting} />
  }
}

// ─── Step 0: Welcome ─────────────────────────────────────────────────────────

function StepWelcome({ t }: { t: (k: TranslationKey) => string }) {
  const features = [
    { icon: <Target className="h-6 w-6 text-orange-400" />, title: t('profile.goalShooting'), desc: t('onboarding.goalImproveShootingDesc') },
    { icon: <Dumbbell className="h-6 w-6 text-emerald-400" />, title: t('onboarding.goalGetInShape'), desc: t('onboarding.goalGetInShapeDesc') },
    { icon: <Brain className="h-6 w-6 text-violet-400" />, title: t('onboarding.goalUnderstandGame'), desc: t('onboarding.goalUnderstandGameDesc') },
  ]

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500/10 shadow-lg shadow-orange-500/10"
      >
        <Volleyball className="h-10 w-10 text-orange-500" />
      </motion.div>

      <motion.h1
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        {t('onboarding.welcome')}
      </motion.h1>
      <motion.p custom={1} variants={fadeUp} initial="hidden" animate="visible" className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {t('onboarding.welcomeDesc')}
      </motion.p>

      <div className="mt-2 w-full space-y-3">
        {features.map((f, i) => (
          <motion.div
            key={i}
            custom={i + 2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <Card className="border-border/50 bg-muted/30 backdrop-blur-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background">
                  {f.icon}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────

function StepProfile({
  data, update, t, nameRef, nameError, setNameError,
}: {
  data: WizardData
  update: (p: Partial<WizardData>) => void
  t: (k: TranslationKey) => string
  nameRef: React.RefObject<HTMLInputElement | null>
  nameError: boolean
  setNameError: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('onboarding.profileTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.profileDesc')}</p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="onb-name" className="text-sm font-medium text-foreground">{t('onboarding.nameLabel')}</label>
        <Input
          ref={nameRef}
          id="onb-name"
          type="text"
          value={data.name}
          onChange={(e) => { update({ name: e.target.value }); if (e.target.value.trim()) setNameError(false) }}
          placeholder={t('onboarding.namePlaceholder')}
          aria-invalid={nameError}
          className={`min-h-[44px] ${nameError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {nameError && <p className="text-xs text-red-500">{t('onboarding.nameRequired')}</p>}
      </div>

      {/* Position select */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t('onboarding.positionSummary')}</p>
        <div className="grid grid-cols-5 gap-2">
          {positionOptions.map((opt) => {
            const active = data.position === opt.value
            return (
              <motion.button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t(opt.key)}
                onClick={() => update({ position: opt.value })}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors duration-200 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  active ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-500/10' : 'border-border bg-muted hover:bg-muted/80'
                }`}
              >
                <span className={active ? 'text-orange-400' : 'text-muted-foreground'}>{opt.icon}</span>
                <span className={`text-[10px] font-semibold leading-tight ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {opt.value}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Experience level */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t('onboarding.levelSummary')}</p>
        <div className="grid grid-cols-2 gap-2">
          {levelOptions.map((opt) => {
            const active = data.level === opt.value
            return (
              <motion.button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ level: opt.value })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`rounded-xl border p-3 text-left transition-colors duration-200 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  active ? 'border-orange-500 bg-orange-500/10' : 'border-border bg-muted hover:bg-muted/80'
                }`}
              >
                <p className={`text-sm font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{t(opt.key)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Age ──────────────────────────────────────────────────────────────

function StepAge({
  data, update,
}: {
  data: WizardData
  update: (p: Partial<WizardData>) => void
}) {
  const { td } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{td('Quel âge as-tu ?', 'How old are you?')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{td('Pour personnaliser ton programme', 'To personalize your program')}</p>
      </div>
      <div className="flex flex-col items-center gap-6 py-4">
        <span className="text-5xl font-black text-orange-500 tabular-nums">{data.age}</span>
        <input
          type="range"
          min={10}
          max={60}
          value={data.age}
          onChange={(e) => update({ age: Number(e.target.value) })}
          className="w-full max-w-xs accent-orange-500 h-2"
          aria-label={td('Âge', 'Age')}
        />
        <div className="flex justify-between w-full max-w-xs text-xs text-muted-foreground">
          <span>10</span>
          <span>60</span>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Height ───────────────────────────────────────────────────────────

function StepHeight({
  data, update,
}: {
  data: WizardData
  update: (p: Partial<WizardData>) => void
}) {
  const { td } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{td('Quelle est ta taille ?', 'What is your height?')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{td('En centimètres', 'In centimeters')}</p>
      </div>
      <div className="flex flex-col items-center gap-6 py-4">
        <span className="text-5xl font-black text-orange-500 tabular-nums">{data.heightCm}<span className="text-2xl text-muted-foreground ml-1">cm</span></span>
        <input
          type="range"
          min={120}
          max={220}
          value={data.heightCm}
          onChange={(e) => update({ heightCm: Number(e.target.value) })}
          className="w-full max-w-xs accent-orange-500 h-2"
          aria-label={td('Taille', 'Height')}
        />
        <div className="flex justify-between w-full max-w-xs text-xs text-muted-foreground">
          <span>120 cm</span>
          <span>220 cm</span>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Weight ───────────────────────────────────────────────────────────

function StepWeight({
  data, update,
}: {
  data: WizardData
  update: (p: Partial<WizardData>) => void
}) {
  const { td } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{td('Quel est ton poids ?', 'What is your weight?')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{td('En kilogrammes', 'In kilograms')}</p>
      </div>
      <div className="flex flex-col items-center gap-6 py-4">
        <span className="text-5xl font-black text-orange-500 tabular-nums">{data.weightKg}<span className="text-2xl text-muted-foreground ml-1">kg</span></span>
        <input
          type="range"
          min={30}
          max={150}
          value={data.weightKg}
          onChange={(e) => update({ weightKg: Number(e.target.value) })}
          className="w-full max-w-xs accent-orange-500 h-2"
          aria-label={td('Poids', 'Weight')}
        />
        <div className="flex justify-between w-full max-w-xs text-xs text-muted-foreground">
          <span>30 kg</span>
          <span>150 kg</span>
        </div>
      </div>
    </div>
  )
}

// ─── Step 5: Goals ────────────────────────────────────────────────────────────

function StepGoals({
  data, update, t, goalsError, setGoalsError,
}: {
  data: WizardData
  update: (p: Partial<WizardData>) => void
  t: (k: TranslationKey) => string
  goalsError: boolean
  setGoalsError: (v: boolean) => void
}) {
  const toggle = (g: WizardGoal) => {
    update({ goals: data.goals.includes(g) ? data.goals.filter((x) => x !== g) : [...data.goals, g] })
    if (!data.goals.includes(g) || data.goals.length > 1) setGoalsError(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('onboarding.goalsTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.goalsDesc')}</p>
      </div>

      <div className="space-y-3">
        {goalOptions.map((opt) => {
          const checked = data.goals.includes(opt.value)
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors duration-200 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                checked ? 'border-orange-500 bg-orange-500/10' : 'border-border bg-muted hover:bg-muted/80'
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${checked ? 'bg-orange-500/20 text-orange-400' : 'bg-background text-muted-foreground'}`}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>{t(opt.key)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
              </div>
              <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} aria-label={t(opt.key)} className="pointer-events-none" />
            </motion.button>
          )
        })}
      </div>

      {goalsError && <p className="text-center text-xs text-red-500">{t('onboarding.goalsMin')}</p>}
    </div>
  )
}

// ─── Step 6: Summary ─────────────────────────────────────────────────────────

function StepSummary({
  data, t, posLabel, isSubmitting,
}: {
  data: WizardData
  t: (k: TranslationKey) => string
  posLabel: PosOption | undefined
  isSubmitting: boolean
}) {
  const lvl = levelOptions.find((l) => l.value === data.level)

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Celebration animation */}
      {!isSubmitting && (
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="relative"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10 shadow-lg shadow-orange-500/10">
            <PartyPopper className="h-10 w-10 text-orange-500" />
          </div>
          {/* Sparkles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-orange-400"
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i * Math.PI) / 3) * 50,
                y: Math.sin((i * Math.PI) / 3) * 50,
              }}
              transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      )}

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        {t('onboarding.summaryTitle')}
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-sm text-muted-foreground">
        {t('onboarding.summaryDesc')}
      </motion.p>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full"
      >
        <Card className="border-border/50 bg-muted/30 backdrop-blur-sm">
          <CardContent className="space-y-4 p-5">
            {/* Name */}
            <SummaryRow label={t('onboarding.nameSummary')} value={data.name.trim() || '—'} />
            {/* Position */}
            <SummaryRow
              label={t('onboarding.positionSummary')}
              value={posLabel ? t(posLabel.key) : '—'}
            />
            {/* Level */}
            <SummaryRow
              label={t('onboarding.levelSummary')}
              value={lvl ? t(lvl.key) : '—'}
            />
            {/* Goals */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t('onboarding.goalsSummary')}</p>
              <div className="flex flex-wrap gap-1.5">
                {goalOptions
                  .filter((g) => data.goals.includes(g.value))
                  .map((g) => (
                    <span key={g.value} className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-500">
                      {t(g.key)}
                    </span>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Summary row helper ──────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}