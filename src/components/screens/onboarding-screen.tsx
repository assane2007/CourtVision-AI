'use client'

import { useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Target,
  Shield,
  Dumbbell,
  Crosshair,
  Hand,
  Activity,
  ArrowLeft,
  ChevronRight,
  Zap,
  User,
  Trophy,
  Star,
  CircleDot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app'
import { apiFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslation } from '@/components/providers/language-provider'

// ─── Types ───────────────────────────────────────────────────────────────────

type Position = 'guard' | 'forward' | 'center' | 'all_around'
type Level = 'beginner' | 'intermediate' | 'advanced' | 'elite'
type Goal = 'shooting' | 'ball_handling' | 'defense' | 'conditioning' | 'general'

interface OptionCard<T extends string> {
  value: T
  title: string
  description: string
  icon: React.ReactNode
}

// ─── Data ────────────────────────────────────────────────────────────────────

const positionOptions: OptionCard<Position>[] = [
  {
    value: 'guard',
    title: 'Meneur',
    description: 'Meneur de jeu, passes et vision du terrain',
    icon: <Target className="h-6 w-6" />,
  },
  {
    value: 'forward',
    title: 'Ailier',
    description: 'Polyvalent, scoring et création depuis l\'aile',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    value: 'center',
    title: 'Pivot',
    description: 'Poste bas, rebonds et protection du cercle',
    icon: <Shield className="h-6 w-6" />,
  },
  {
    value: 'all_around',
    title: 'Polyvalent',
    description: 'Capable de jouer à tous les postes',
    icon: <Star className="h-6 w-6" />,
  },
]

const levelOptions: OptionCard<Level>[] = [
  {
    value: 'beginner',
    title: 'Débutant',
    description: 'Je découvre le basketball',
    icon: <CircleDot className="h-6 w-6" />,
  },
  {
    value: 'intermediate',
    title: 'Intermédiaire',
    description: 'J\'ai quelques années d\'expérience',
    icon: <Activity className="h-6 w-6" />,
  },
  {
    value: 'advanced',
    title: 'Avancé',
    description: 'Compétitif avec de solides fondamentaux',
    icon: <Trophy className="h-6 w-6" />,
  },
  {
    value: 'elite',
    title: 'Élite',
    description: 'Niveau académique ou professionnel',
    icon: <Star className="h-6 w-6" />,
  },
]

const goalOptions: OptionCard<Goal>[] = [
  {
    value: 'shooting',
    title: 'Tir',
    description: 'Précision et routine de tir',
    icon: <Crosshair className="h-6 w-6" />,
  },
  {
    value: 'ball_handling',
    title: 'Dribble',
    description: 'Contrôle de balle et déplacements',
    icon: <Hand className="h-6 w-6" />,
  },
  {
    value: 'defense',
    title: 'Défense',
    description: 'Placement, anticipation et intensité',
    icon: <Shield className="h-6 w-6" />,
  },
  {
    value: 'conditioning',
    title: 'Condition Physique',
    description: 'Endurance, explosivité et agilité',
    icon: <Dumbbell className="h-6 w-6" />,
  },
  {
    value: 'general',
    title: 'Global',
    description: 'Développement complet de toutes les compétences',
    icon: <User className="h-6 w-6" />,
  },
]

// ─── Step metadata ───────────────────────────────────────────────────────────

const stepTitles = [
  'Quel est ton poste ?',
  'Quel est ton niveau ?',
  'Quel est ton objectif principal ?',
]

const stepSubtitles = [
  'Sélectionne le poste qui correspond le mieux à ton style de jeu',
  'Sois honnête pour qu\'on puisse adapter ton programme',
  'Choisis la compétence sur laquelle tu veux progresser',
]

// ─── Animation variants ──────────────────────────────────────────────────────

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)',
  }),
}

const dotVariants: Variants = {
  inactive: {
    scale: 1,
    backgroundColor: 'hsl(var(--muted-foreground))',
  },
  active: {
    scale: 1.3,
    backgroundColor: '#f97316',
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t, td } = useTranslation()
  const navigate = useAppStore((s) => s.navigate)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [position, setPosition] = useState<Position | null>(null)
  const [level, setLevel] = useState<Level | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)

  const canProceed = () => {
    if (step === 0) return position !== null
    if (step === 1) return level !== null
    if (step === 2) return goal !== null
    return false
  }

  const goNext = () => {
    if (step < 2) {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }

  const goBack = () => {
    if (step > 0) {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }

  const handleComplete = async () => {
    if (!position || !level || !goal) return
    setIsSubmitting(true)

    try {
      await apiFetch('/api/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position,
          level,
          goals: goal,
          onboarding: true,
        }),
      })
    } catch {
      // Notify user that preferences weren't saved, but still proceed
      toast.error('Erreur de sauvegarde. Vos préférences seront sauvegardées plus tard.')
    } finally {
      setIsSubmitting(false)
      navigate('home')
    }
  }

  const renderCard = <T extends string>(option: OptionCard<T>, selected: T | null, onSelect: (v: T) => void) => {
    const isSelected = selected === option.value
    return (
      <motion.button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={isSelected}
        tabIndex={0}
        aria-label={option.title}
        onClick={() => onSelect(option.value)}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className={`
          relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center
          transition-colors duration-200 cursor-pointer select-none w-full
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
          ${
            isSelected
              ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
              : 'border-border bg-muted hover:bg-muted/80'
          }
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Selected ring glow */}
        {isSelected && (
          <motion.div
            layoutId="selected-ring"
            className="absolute inset-0 rounded-2xl border-2 border-orange-500 pointer-events-none"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        {/* Icon container */}
        <div
          className={`
            flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200
            ${
              isSelected
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-muted/80 text-muted-foreground'
            }
          `}
        >
          {option.icon}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold transition-colors duration-200 text-foreground">
          {option.title}
        </h3>

        {/* Description */}
        <p className="text-xs leading-relaxed text-muted-foreground">{option.description}</p>
      </motion.button>
    )
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div role="radiogroup" aria-label="Poste" className="grid grid-cols-2 gap-3 sm:gap-4">
            {positionOptions.map((opt) => renderCard(opt, position, setPosition))}
          </div>
        )
      case 1:
        return (
          <div role="radiogroup" aria-label="Niveau" className="grid grid-cols-2 gap-3 sm:gap-4">
            {levelOptions.map((opt) => renderCard(opt, level, setLevel))}
          </div>
        )
      case 2:
        return (
          <div role="radiogroup" aria-label="Objectif principal" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {goalOptions.map((opt) => renderCard(opt, goal, setGoal))}
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-background px-4 py-10">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/5 blur-[120px]" />
      {/* Basketball court background */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full text-border opacity-[0.15]" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <rect x="20" y="20" width="360" height="760" rx="12" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="200" cy="400" r="60" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="20" y1="400" x2="380" y2="400" stroke="currentColor" strokeWidth="1"/>
        <rect x="130" y="20" width="140" height="90" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="200" cy="110" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      </svg>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8">
        {/* Progress bar + dots */}
        <div className="w-full space-y-2">
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' as const }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Étape {step + 1} sur 3
            </span>
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  variants={dotVariants}
                  animate={i === step ? 'active' : 'inactive'}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="h-2 w-2 rounded-full"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step header */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {stepTitles[step]}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {stepSubtitles[step]}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Step content with slide transition */}
        <div className="relative w-full min-h-[260px] sm:min-h-[280px]">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
                filter: { duration: 0.2 },
              }}
              className="absolute inset-0"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex w-full items-center justify-between gap-4">
          {/* Back button (hidden on step 0) */}
          <AnimatePresence>
            {step > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label={t('action.back')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('action.back')}</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer to push the next button right when back is hidden */}
          {step === 0 && <div />}

          {/* Next / Start button */}
          <motion.div
            whileHover={canProceed() ? { scale: 1.03 } : {}}
            whileTap={canProceed() ? { scale: 0.97 } : {}}
          >
            <Button
              size="lg"
              onClick={step < 2 ? goNext : handleComplete}
              disabled={!canProceed() || isSubmitting}
              className="ml-auto"
            >
              {isSubmitting ? (
                <motion.div
                  className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-foreground"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : step < 2 ? (
                <>
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                t('action.start')
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}