'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Zap,
  RotateCcw,
  ChevronLeft,
  Trophy,
  Target,
  Brain,
  Timer,
  CheckCircle2,
  XCircle,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { useAppStore } from '@/stores/app'
import { apiFetch } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────────

type GameMode = 'direction' | 'color' | 'shot_clock' | 'reflex'
type GamePhase = 'idle' | 'countdown' | 'playing' | 'feedback' | 'results'

interface RoundResult {
  reactionMs: number
  correct: boolean
}

interface HistoryEntry {
  id: string
  type: string
  avgMs: number
  accuracy: number
  bestMs: number
  rounds: number
  createdAt: string
}

interface PersonalBests {
  [key: string]: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MODES: { id: GameMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'direction',
    label: 'Direction Rapide',
    icon: <Target className="h-4 w-4" />,
    description: 'Suis la flèche le plus vite possible',
  },
  {
    id: 'color',
    label: 'Couleur & Action',
    icon: <Brain className="h-4 w-4" />,
    description: 'Vert = tape, Rouge = arrête !',
  },
  {
    id: 'shot_clock',
    label: 'Shot Clock',
    icon: <Timer className="h-4 w-4" />,
    description: 'Prends la bonne décision sous pression',
  },
  {
    id: 'reflex',
    label: 'Reflexe Joueur',
    icon: <Zap className="h-4 w-4" />,
    description: 'Attrape les cibles avant qu\'elles disparaissent',
  },
]

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const
type Direction = (typeof DIRECTIONS)[number]

const ACTIONS = ['TIR', 'DRIBBLE', 'PASSE', 'DÉFENSE'] as const

const ARROW_ICONS: Record<Direction, React.ReactNode> = {
  up: <ArrowUp className="h-20 w-20 sm:h-28 sm:w-28" />,
  down: <ArrowDown className="h-20 w-20 sm:h-28 sm:w-28" />,
  left: <ArrowLeft className="h-20 w-20 sm:h-28 sm:w-28" />,
  right: <ArrowRight className="h-20 w-20 sm:h-28 sm:w-28" />,
}

const SHOT_CLOCK_SCENARIOS = [
  {
    situation: '8 sec restant, score = -2, ouvert à 3pts',
    choices: ['TIRER', 'PÉNÉTRER'],
    correct: 0,
    explanation: 'Ouvert à 3pts avec 8 secondes, c\'est le tir idéal !',
  },
  {
    situation: '2 sec restant, score = +1, balle en main',
    choices: ['TIRER', 'PASSE RAPIDE'],
    correct: 1,
    explanation: '2 secondes seulement, une passe rapide est plus sûre.',
  },
  {
    situation: '14 sec restant, score = -5, défenseur proche',
    choices: ['PÉNÉTRER', 'DÉCROCHER'],
    correct: 1,
    explanation: '14 secondes, prends ton temps et décroche pour une meilleure position.',
  },
  {
    situation: '5 sec restant, score = -3, 1 contre 1',
    choices: ['TIRER À 3PTS', 'PÉNÉTRER'],
    correct: 0,
    explanation: 'Tu es à -3, il faut un 3pts. Pas le choix !',
  },
  {
    situation: '18 sec restant, score = +4, passeur libre',
    choices: ['TIRER', 'PASSE'],
    correct: 1,
    explanation: 'Tu as l\'avantage, fais circuler pour la meilleure option.',
  },
  {
    situation: '3 sec restant, score = -1, côté gauche',
    choices: ['PÉNÉTRER DROITE', 'CROISER GAUCHE'],
    correct: 1,
    explanation: '3 secondes et tu es déjà côté gauche, croise pour créer de l\'espace.',
  },
  {
    situation: '10 sec restant, score = -8, lancer franc accordé',
    choices: ['LANCER RAPIDE', 'TEMPS MORT'],
    correct: 0,
    explanation: 'Lancer franc accordé : prends les points gratuits rapidement.',
  },
  {
    situation: '6 sec restant, score = +2, fast break 2 contre 1',
    choices: ['TIRER EN COURSE', 'PASSE POUR LAY-UP'],
    correct: 1,
    explanation: '2 contre 1 en fast break, la passe garantit un panier facile.',
  },
]

function getRating(avgMs: number, accuracy: number): { label: string; emoji: string; color: string } {
  const score = avgMs * (accuracy / 100)
  if (score < 300 && accuracy >= 80) return { label: 'Éclair', emoji: '⚡', color: 'text-orange-400' }
  if (score < 450 && accuracy >= 65) return { label: 'Rapide', emoji: '🏃', color: 'text-green-400' }
  if (score < 650) return { label: 'Moyen', emoji: '👍', color: 'text-yellow-400' }
  return { label: 'Lent', emoji: '🐌', color: 'text-red-400' }
}

function formatType(type: string): string {
  const map: Record<string, string> = {
    direction: 'Direction',
    color: 'Couleur',
    shot_clock: 'Shot Clock',
    reflex: 'Reflexe',
  }
  return map[type] || type
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReactionTrainerScreen() {
  const goBack = useAppStore((s) => s.goBack)
  const queryClient = useQueryClient()

  // Game state
  const [mode, setMode] = useState<GameMode>('direction')
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [currentRound, setCurrentRound] = useState(0)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  // Direction mode state
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null)
  const [directionAppearedAt, setDirectionAppearedAt] = useState(0)

  // Color mode state
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [actionColor, setActionColor] = useState<'green' | 'red'>('green')
  const [actionAppearedAt, setActionAppearedAt] = useState(0)
  const [colorFeedback, setColorFeedback] = useState<'correct' | 'wrong' | 'miss' | null>(null)

  // Shot clock mode state
  const [currentScenario, setCurrentScenario] = useState<typeof SHOT_CLOCK_SCENARIOS[0] | null>(null)
  const [shotClockCountdown, setShotClockCountdown] = useState(3)
  const [shotClockChosen, setShotClockChosen] = useState<number | null>(null)
  const [scenarioAppearedAt, setScenarioAppearedAt] = useState(0)
  const shotClockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reflex mode state
  const [targets, setTargets] = useState<{ id: number; x: number; y: number; appearedAt: number }[]>([])
  const [reflexHits, setReflexHits] = useState(0)
  const [reflexMisses, setReflexMisses] = useState(0)
  const [reflexTimeLeft, setReflexTimeLeft] = useState(30)
  const reflexTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const targetSpawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const targetIdRef = useRef(0)

  // Countdown
  const [countdownNum, setCountdownNum] = useState(3)

  // Refs for cleanup
  const gameActiveRef = useRef(false)
  const allTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const allIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

  // Fetch history
  const { data: historyData } = useQuery<{ history: HistoryEntry[]; personalBests: PersonalBests }>({
    queryKey: ['reaction-history'],
    queryFn: () => apiFetch('/api/reaction'),
  })

  // Save result mutation
  const saveMutation = useMutation({
    mutationFn: (data: { type: string; rounds: RoundResult[] }) =>
      apiFetch('/api/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reaction-history'] })
    },
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gameActiveRef.current = false
      allTimersRef.current.forEach(clearTimeout)
      allIntervalsRef.current.forEach(clearInterval)
      if (shotClockTimerRef.current) clearInterval(shotClockTimerRef.current)
      if (reflexTimerRef.current) clearInterval(reflexTimerRef.current)
      if (targetSpawnTimerRef.current) clearInterval(targetSpawnTimerRef.current)
    }
  }, [])

  // ─── Game Control ──────────────────────────────────────────────────────────

  // Use refs to break circular dependencies between callbacks
  const finishGameRef = useRef<() => void>(() => {})
  const startDirectionRoundRef = useRef<() => void>(() => {})
  const startColorRoundRef = useRef<() => void>(() => {})
  const startShotClockRoundRef = useRef<() => void>(() => {})
  const startReflexModeRef = useRef<() => void>(() => {})

  const resetGame = useCallback(() => {
    gameActiveRef.current = false
    allTimersRef.current.forEach(clearTimeout)
    allTimersRef.current = []
    if (shotClockTimerRef.current) clearInterval(shotClockTimerRef.current)
    if (reflexTimerRef.current) clearInterval(reflexTimerRef.current)
    if (targetSpawnTimerRef.current) clearInterval(targetSpawnTimerRef.current)

    setPhase('idle')
    setCurrentRound(0)
    setRounds([])
    setStreak(0)
    setBestStreak(0)
    setActiveDirection(null)
    setActiveAction(null)
    setActionColor('green')
    setColorFeedback(null)
    setCurrentScenario(null)
    setShotClockCountdown(3)
    setShotClockChosen(null)
    setTargets([])
    setReflexHits(0)
    setReflexMisses(0)
    setReflexTimeLeft(30)
    setCountdownNum(3)
  }, [])

  const finishGame = useCallback(() => {
    gameActiveRef.current = false
    allTimersRef.current.forEach(clearTimeout)
    allTimersRef.current = []
    setPhase('results')

    // Use the current rounds via ref to avoid stale closure
    setRounds(currentRounds => {
      if (currentRounds.length > 0) {
        saveMutation.mutate({ type: mode, rounds: currentRounds })
      }
      return currentRounds
    })
  }, [mode, saveMutation])

  // Keep finishGameRef updated
  useEffect(() => {
    finishGameRef.current = finishGame
  }, [finishGame])

  const startGame = useCallback(() => {
    resetGame()
    setPhase('countdown')
    setCountdownNum(3)

    const t1 = setTimeout(() => setCountdownNum(2), 800)
    const t2 = setTimeout(() => setCountdownNum(1), 1600)
    const t3 = setTimeout(() => {
      setPhase('playing')
      gameActiveRef.current = true
      setCurrentRound(1)

      if (mode === 'direction') startDirectionRoundRef.current()
      else if (mode === 'color') startColorRoundRef.current()
      else if (mode === 'shot_clock') startShotClockRoundRef.current()
      else if (mode === 'reflex') startReflexModeRef.current()
    }, 2400)
    allTimersRef.current.push(t1, t2, t3)
  }, [mode, resetGame])

  // ─── Mode 1: Direction Rapide ─────────────────────────────────────────────

  const startDirectionRound = useCallback(() => {
    if (!gameActiveRef.current) return

    setActiveDirection(null)
    const delay = 1000 + Math.random() * 2000
    const t = setTimeout(() => {
      if (!gameActiveRef.current) return
      const dir = DIRECTIONS[Math.floor(Math.random() * 4)]
      setActiveDirection(dir)
      setDirectionAppearedAt(performance.now())
    }, delay)
    allTimersRef.current.push(t)
  }, [])

  useEffect(() => { startDirectionRoundRef.current = startDirectionRound }, [startDirectionRound])

  const handleDirectionResponse = useCallback((selected: Direction) => {
    if (!gameActiveRef.current || !activeDirection) return

    const reactionMs = Math.round(performance.now() - directionAppearedAt)
    const correct = selected === activeDirection

    setRounds(prev => [...prev, { reactionMs, correct }])
    if (correct) {
      setStreak(s => {
        const ns = s + 1
        setBestStreak(b => Math.max(b, ns))
        return ns
      })
    } else {
      setStreak(0)
    }

    setActiveDirection(null)

    setCurrentRound(prev => {
      const nextRound = prev + 1
      if (nextRound > 10) {
        finishGameRef.current()
      } else {
        const t = setTimeout(() => startDirectionRoundRef.current(), 500)
        allTimersRef.current.push(t)
      }
      return nextRound
    })
  }, [activeDirection, directionAppearedAt])

  // ─── Mode 2: Couleur & Action ─────────────────────────────────────────────

  const startColorRound = useCallback(() => {
    if (!gameActiveRef.current) return

    setActiveAction(null)
    setColorFeedback(null)
    const delay = 1000 + Math.random() * 2000
    const t = setTimeout(() => {
      if (!gameActiveRef.current) return
      const action = ACTIONS[Math.floor(Math.random() * 4)]
      const color = Math.random() > 0.4 ? 'green' : 'red'
      setActiveAction(action)
      setActionColor(color)
      setActionAppearedAt(performance.now())
    }, delay)
    allTimersRef.current.push(t)
  }, [])

  useEffect(() => { startColorRoundRef.current = startColorRound }, [startColorRound])

  const handleColorTap = useCallback(() => {
    if (!gameActiveRef.current || !activeAction) return

    const reactionMs = Math.round(performance.now() - actionAppearedAt)
    const isGreen = actionColor === 'green'

    if (isGreen) {
      setRounds(prev => [...prev, { reactionMs, correct: true }])
      setStreak(s => {
        const ns = s + 1
        setBestStreak(b => Math.max(b, ns))
        return ns
      })
      setColorFeedback('correct')
    } else {
      setRounds(prev => [...prev, { reactionMs, correct: false }])
      setStreak(0)
      setColorFeedback('wrong')
    }

    setCurrentRound(prev => {
      const nextRound = prev + 1
      if (nextRound > 10) {
        finishGameRef.current()
      } else {
        const t = setTimeout(() => startColorRoundRef.current(), 700)
        allTimersRef.current.push(t)
      }
      return nextRound
    })
  }, [activeAction, actionColor, actionAppearedAt])

  // ─── Mode 3: Shot Clock Decision ──────────────────────────────────────────

  const startShotClockRound = useCallback(() => {
    if (!gameActiveRef.current) return

    const idx = Math.floor(Math.random() * SHOT_CLOCK_SCENARIOS.length)
    setCurrentScenario(SHOT_CLOCK_SCENARIOS[idx])
    setShotClockChosen(null)
    setScenarioAppearedAt(performance.now())
    setShotClockCountdown(3)

    const timer = setInterval(() => {
      setShotClockCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setRounds(r => [...r, { reactionMs: 3000, correct: false }])
          setStreak(0)

          setCurrentRound(prev => {
            const nextRound = prev + 1
            if (nextRound > 8) {
              finishGameRef.current()
            } else {
              const t = setTimeout(() => startShotClockRoundRef.current(), 1200)
              allTimersRef.current.push(t)
            }
            return nextRound
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    shotClockTimerRef.current = timer
    allIntervalsRef.current.push(timer)
  }, [])

  useEffect(() => { startShotClockRoundRef.current = startShotClockRound }, [startShotClockRound])

  const handleShotClockChoice = useCallback((choiceIndex: number) => {
    if (!gameActiveRef.current || !currentScenario || shotClockChosen !== null) return

    const reactionMs = Math.round(performance.now() - scenarioAppearedAt)
    const correct = choiceIndex === currentScenario.correct

    setShotClockChosen(choiceIndex)
    setRounds(prev => [...prev, { reactionMs, correct }])

    if (correct) {
      setStreak(s => {
        const ns = s + 1
        setBestStreak(b => Math.max(b, ns))
        return ns
      })
    } else {
      setStreak(0)
    }

    if (shotClockTimerRef.current) clearInterval(shotClockTimerRef.current)

    setCurrentRound(prev => {
      const nextRound = prev + 1
      const t = setTimeout(() => {
        if (nextRound > 8) {
          finishGameRef.current()
        } else {
          startShotClockRoundRef.current()
        }
      }, 1500)
      allTimersRef.current.push(t)
      return nextRound
    })
  }, [currentScenario, shotClockChosen, scenarioAppearedAt])

  // ─── Mode 4: Reflexe Joueur ───────────────────────────────────────────────

  const spawnTarget = useCallback(() => {
    if (!gameActiveRef.current) return

    const id = ++targetIdRef.current
    const x = 10 + Math.random() * 80
    const y = 10 + Math.random() * 80
    const appearedAt = performance.now()

    setTargets(prev => [...prev, { id, x, y, appearedAt }])

    const expireTimer = setTimeout(() => {
      if (!gameActiveRef.current) return
      setTargets(prev => {
        const stillThere = prev.find(t => t.id === id)
        if (stillThere) {
          setReflexMisses(m => m + 1)
        }
        return prev.filter(t => t.id !== id)
      })
    }, 1500)

    allTimersRef.current.push(expireTimer)
  }, [])

  const startReflexMode = useCallback(() => {
    setReflexTimeLeft(30)
    setReflexHits(0)
    setReflexMisses(0)
    setTargets([])

    const gameTimer = setInterval(() => {
      setReflexTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimer)
          finishGameRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    reflexTimerRef.current = gameTimer
    allIntervalsRef.current.push(gameTimer)

    const spawnTimer = setInterval(() => {
      if (!gameActiveRef.current) return
      spawnTarget()
    }, 800)
    targetSpawnTimerRef.current = spawnTimer
    allIntervalsRef.current.push(spawnTimer)

    spawnTarget()
  }, [spawnTarget])

  useEffect(() => { startReflexModeRef.current = startReflexMode }, [startReflexMode])

  const handleTargetTap = useCallback((targetId: number, appearedAt: number) => {
    if (!gameActiveRef.current) return

    const reactionMs = Math.round(performance.now() - appearedAt)
    setRounds(prev => [...prev, { reactionMs, correct: true }])
    setReflexHits(h => h + 1)
    setTargets(prev => prev.filter(t => t.id !== targetId))
  }, [])

  // ─── Computed ──────────────────────────────────────────────────────────────

  const avgMs = rounds.length > 0
    ? Math.round(rounds.reduce((s, r) => s + r.reactionMs, 0) / rounds.length)
    : 0

  const accuracy = rounds.length > 0
    ? Math.round((rounds.filter(r => r.correct).length / rounds.length) * 100)
    : 0

  const bestMs = rounds.length > 0
    ? Math.min(...rounds.map(r => r.reactionMs))
    : 0

  const rating = getRating(avgMs, accuracy)
  const history = historyData?.history ?? []
  const personalBests = historyData?.personalBests ?? {}

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SwipeToGoBack>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={goBack}
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">
                <Zap className="inline h-4 w-4 text-orange-500 mr-1" />
                Entraînement Cognitif
              </h1>
              <p className="text-xs text-muted-foreground">Teste tes réflexes de basketteur</p>
            </div>
            {personalBests[mode] && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                <Trophy className="h-3 w-3 mr-1 text-orange-500" />
                {personalBests[mode]}ms
              </Badge>
            )}
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { if (phase === 'idle') { setMode(m.id) } }}
                disabled={phase !== 'idle'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  mode === m.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Mode description */}
          <p className="text-center text-sm text-muted-foreground">
            {MODES.find(m => m.id === mode)?.description}
          </p>

          {/* ─── Game Area ──────────────────────────────────────────────────── */}
          <Card className="overflow-hidden border-border/50">
            <CardContent className="p-0">
              <div className="relative min-h-[300px] sm:min-h-[350px] flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">

                {/* ─── Idle State ─────────────────────────────────────────── */}
                {phase === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 p-6 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
                      {MODES.find(m => m.id === mode)?.icon && (
                        <div className="text-orange-500 scale-150">
                          {MODES.find(m => m.id === mode)!.icon}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {MODES.find(m => m.id === mode)?.label}
                      </h2>
                      <p className="text-sm text-zinc-400 mt-1">
                        {mode === 'direction' && '10 rounds — Suis les flèches le plus vite possible'}
                        {mode === 'color' && '10 rounds — Tape vert, arrête rouge'}
                        {mode === 'shot_clock' && '8 situations — Décide en 3 secondes'}
                        {mode === 'reflex' && '30 secondes — Tape le plus de cibles'}
                      </p>
                    </div>
                    <Button
                      onClick={startGame}
                      className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-orange-500/25"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Commencer
                    </Button>
                  </motion.div>
                )}

                {/* ─── Countdown ─────────────────────────────────────────── */}
                {phase === 'countdown' && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={countdownNum}
                      initial={{ opacity: 0, scale: 2 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.3 }}
                      className="text-8xl font-black text-orange-500"
                    >
                      {countdownNum}
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* ─── Playing: Direction Mode ────────────────────────────── */}
                {phase === 'playing' && mode === 'direction' && (
                  <div className="flex flex-col items-center gap-4 p-6 w-full">
                    {/* Score bar */}
                    <div className="w-full flex items-center justify-between text-sm text-zinc-400">
                      <span>Round {currentRound}/10</span>
                      <div className="flex items-center gap-2">
                        {streak > 0 && (
                          <span className="text-orange-400 font-medium">
                            <Flame className="inline h-3 w-3 mr-0.5" />
                            {streak}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow area */}
                    <div
                      className="flex-1 w-full flex items-center justify-center min-h-[200px] cursor-pointer select-none"
                      onClick={() => handleDirectionResponse(activeDirection || 'up')}
                    >
                      <AnimatePresence mode="wait">
                        {activeDirection ? (
                          <motion.div
                            key={activeDirection}
                            initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 1.2 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="text-white"
                          >
                            {ARROW_ICONS[activeDirection]}
                          </motion.div>
                        ) : (
                          <motion.div
                            key="waiting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-zinc-600 text-lg"
                          >
                            Prépare-toi...
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Direction buttons */}
                    <div className="grid grid-cols-3 gap-2 w-full max-w-[200px] mx-auto">
                      <div />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDirectionResponse('up')}
                        className="flex items-center justify-center h-14 rounded-xl bg-white/10 hover:bg-white/20 active:bg-orange-500/50 transition-colors"
                        aria-label="Haut"
                      >
                        <ArrowUp className="h-6 w-6 text-white" />
                      </motion.button>
                      <div />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDirectionResponse('left')}
                        className="flex items-center justify-center h-14 rounded-xl bg-white/10 hover:bg-white/20 active:bg-orange-500/50 transition-colors"
                        aria-label="Gauche"
                      >
                        <ArrowLeft className="h-6 w-6 text-white" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDirectionResponse('down')}
                        className="flex items-center justify-center h-14 rounded-xl bg-white/10 hover:bg-white/20 active:bg-orange-500/50 transition-colors"
                        aria-label="Bas"
                      >
                        <ArrowDown className="h-6 w-6 text-white" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDirectionResponse('right')}
                        className="flex items-center justify-center h-14 rounded-xl bg-white/10 hover:bg-white/20 active:bg-orange-500/50 transition-colors"
                        aria-label="Droite"
                      >
                        <ArrowRight className="h-6 w-6 text-white" />
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ─── Playing: Color & Action Mode ───────────────────────── */}
                {phase === 'playing' && mode === 'color' && (
                  <div className="flex flex-col items-center gap-4 p-6 w-full">
                    {/* Score bar */}
                    <div className="w-full flex items-center justify-between text-sm text-zinc-400">
                      <span>Round {currentRound}/10</span>
                      {streak > 0 && (
                        <span className="text-orange-400 font-medium">
                          <Flame className="inline h-3 w-3 mr-0.5" />
                          {streak}
                        </span>
                      )}
                    </div>

                    {/* Action area */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleColorTap}
                      className={`flex-1 w-full min-h-[200px] rounded-2xl flex flex-col items-center justify-center transition-colors duration-200 ${
                        activeAction
                          ? actionColor === 'green'
                            ? 'bg-green-500 cursor-pointer'
                            : 'bg-red-500 cursor-pointer'
                          : 'bg-zinc-800'
                      }`}
                      disabled={!activeAction}
                    >
                      <AnimatePresence mode="wait">
                        {activeAction ? (
                          <motion.div
                            key={`${activeAction}-${actionColor}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.3 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="text-center"
                          >
                            <span className="text-4xl sm:text-5xl font-black text-white tracking-wider">
                              {activeAction}
                            </span>
                            <p className="text-white/70 text-sm mt-2 font-medium">
                              {actionColor === 'green' ? 'Tape !' : 'N\'APPUIE PAS !'}
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="waiting-color"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-zinc-500 text-lg"
                          >
                            Prépare-toi...
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    {/* Color feedback */}
                    <AnimatePresence>
                      {colorFeedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                            colorFeedback === 'correct'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {colorFeedback === 'correct' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Bonne réaction !
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              Piège ! Ne tape pas le rouge.
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ─── Playing: Shot Clock Decision ───────────────────────── */}
                {phase === 'playing' && mode === 'shot_clock' && currentScenario && (
                  <div className="flex flex-col items-center gap-4 p-6 w-full">
                    {/* Score bar */}
                    <div className="w-full flex items-center justify-between text-sm text-zinc-400">
                      <span>Situation {currentRound}/8</span>
                      {streak > 0 && (
                        <span className="text-orange-400 font-medium">
                          <Flame className="inline h-3 w-3 mr-0.5" />
                          {streak}
                        </span>
                      )}
                    </div>

                    {/* Countdown timer */}
                    <div className="flex items-center gap-2">
                      <motion.div
                        key={shotClockCountdown}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          shotClockCountdown > 2
                            ? 'bg-green-500 text-white'
                            : shotClockCountdown > 1
                              ? 'bg-yellow-500 text-white'
                              : 'bg-red-500 text-white'
                        }`}
                      >
                        {shotClockCountdown}
                      </motion.div>
                      <span className="text-zinc-400 text-sm">secondes</span>
                    </div>

                    {/* Situation */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <p className="text-sm text-orange-400 font-medium mb-1">SITUATION DE JEU</p>
                      <p className="text-white text-lg font-semibold px-4">
                        {currentScenario.situation}
                      </p>
                    </motion.div>

                    {/* Choices */}
                    <div className="flex gap-3 w-full max-w-sm">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleShotClockChoice(0)}
                        disabled={shotClockChosen !== null}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all ${
                          shotClockChosen === null
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                            : shotClockChosen === 0 && 0 === currentScenario.correct
                              ? 'bg-green-500 text-white ring-2 ring-green-400'
                              : shotClockChosen === 0
                                ? 'bg-red-500/50 text-white ring-2 ring-red-400'
                                : 0 === currentScenario.correct
                                  ? 'bg-green-500/30 text-green-400 ring-2 ring-green-400/50'
                                  : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {currentScenario.choices[0]}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleShotClockChoice(1)}
                        disabled={shotClockChosen !== null}
                        className={`flex-1 py-4 px-4 rounded-xl font-bold text-sm transition-all ${
                          shotClockChosen === null
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                            : shotClockChosen === 1 && 1 === currentScenario.correct
                              ? 'bg-green-500 text-white ring-2 ring-green-400'
                              : shotClockChosen === 1
                                ? 'bg-red-500/50 text-white ring-2 ring-red-400'
                                : 1 === currentScenario.correct
                                  ? 'bg-green-500/30 text-green-400 ring-2 ring-green-400/50'
                                  : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {currentScenario.choices[1]}
                      </motion.button>
                    </div>

                    {/* Explanation after choice */}
                    <AnimatePresence>
                      {shotClockChosen !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`text-center px-4 py-2 rounded-xl text-sm ${
                            shotClockChosen === currentScenario.correct
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          <p className="font-semibold">
                            {shotClockChosen === currentScenario.correct ? '✓ Bon choix !' : '✗ Mauvais choix'}
                          </p>
                          <p className="mt-1 text-xs opacity-80">{currentScenario.explanation}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ─── Playing: Reflex Mode ────────────────────────────────── */}
                {phase === 'playing' && mode === 'reflex' && (
                  <div className="relative w-full h-full min-h-[300px] sm:min-h-[350px] overflow-hidden">
                    {/* Timer display */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-3">
                      <span className="text-2xl font-black text-white bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm">
                        {reflexTimeLeft}s
                      </span>
                      <span className="text-sm text-white/80 bg-black/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                        {reflexHits} touches
                      </span>
                    </div>

                    {/* Streak */}
                    {streak > 0 && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="text-sm text-orange-400 font-medium bg-black/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                          <Flame className="inline h-3 w-3 mr-0.5" />
                          {streak}
                        </span>
                      </div>
                    )}

                    {/* Targets */}
                    <AnimatePresence>
                      {targets.map((target) => (
                        <motion.button
                          key={target.id}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{
                            position: 'absolute',
                            left: `${target.x}%`,
                            top: `${target.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          onClick={() => handleTargetTap(target.id, target.appearedAt)}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/40 cursor-pointer hover:scale-110 active:scale-90 transition-transform flex items-center justify-center"
                          aria-label="Cible"
                        >
                          <div className="w-4 h-4 rounded-full bg-white/80" />
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── Live Stats (during play) ───────────────────────────────────── */}
          {phase === 'playing' && rounds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              <div className="text-center bg-card rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground">Temps moyen</p>
                <p className="text-xl font-bold text-orange-500">{avgMs}<span className="text-xs text-muted-foreground ml-0.5">ms</span></p>
              </div>
              <div className="text-center bg-card rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground">Précision</p>
                <p className="text-xl font-bold text-white">{accuracy}<span className="text-xs text-muted-foreground ml-0.5">%</span></p>
              </div>
              <div className="text-center bg-card rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground">Série</p>
                <p className="text-xl font-bold text-amber-400">
                  <Flame className="inline h-4 w-4" />
                  {streak}
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── Results Card ───────────────────────────────────────────────── */}
          {phase === 'results' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-4"
            >
              <Card className="overflow-hidden border-border/50">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
                  >
                    <span className="text-5xl">{rating.emoji}</span>
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className={`text-2xl font-black mt-2 ${rating.color}`}
                  >
                    {rating.label}
                  </motion.h2>
                  <p className="text-white/80 text-sm mt-1">
                    {MODES.find(m => m.id === mode)?.label}
                  </p>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Temps moyen</p>
                      <p className="text-2xl font-bold text-orange-500">{avgMs}<span className="text-sm text-muted-foreground ml-1">ms</span></p>
                    </div>
                    <div className="text-center bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Meilleur</p>
                      <p className="text-2xl font-bold text-green-500">{bestMs}<span className="text-sm text-muted-foreground ml-1">ms</span></p>
                    </div>
                    <div className="text-center bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Précision</p>
                      <p className="text-2xl font-bold text-white">{accuracy}<span className="text-sm text-muted-foreground ml-1">%</span></p>
                    </div>
                    <div className="text-center bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Meilleure série</p>
                      <p className="text-2xl font-bold text-amber-400">{bestStreak}</p>
                    </div>
                  </div>

                  {mode === 'reflex' && (
                    <div className="text-center bg-muted/50 rounded-xl p-3 mb-4">
                      <p className="text-xs text-muted-foreground">Cibles touchées</p>
                      <p className="text-2xl font-bold text-orange-500">{reflexHits} <span className="text-sm text-muted-foreground">/ {reflexHits + reflexMisses}</span></p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={startGame}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rejouer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={goBack}
                      className="flex-1 rounded-xl"
                    >
                      Retour
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── History ────────────────────────────────────────────────────── */}
          {phase !== 'playing' && phase !== 'countdown' && history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Historique récent
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {history.slice(0, 10).map((entry) => {
                  const r = getRating(entry.avgMs, entry.accuracy)
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/50"
                    >
                      <span className="text-xl">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{formatType(entry.type)}</span>
                          <Badge variant="secondary" className="text-xs">{entry.rounds} tours</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-500">{entry.avgMs}ms</p>
                        <p className="text-xs text-muted-foreground">{entry.accuracy}%</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Bottom spacer for mobile */}
          <div className="h-4" />
        </div>
      </div>
    </SwipeToGoBack>
  )
}