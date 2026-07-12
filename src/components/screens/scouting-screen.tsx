'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Activity,
  Crosshair,
  Footprints,
  Shield,
  Wind,
  Zap,
  Dumbbell,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch, formatLocaleDate } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { getLevelInfo, getLevelColor } from '@/lib/xp'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import type { TranslationKey } from '@/lib/i18n'
import { BottomNav } from '@/components/shared/bottom-nav'

// ── Types ──────────────────────────────────────────────────────────────────

interface ScoutingCategory {
  name: string
  key: string
  avgScore: number
  totalReps: number
  totalSessions: number
  trend: 'up' | 'down' | 'stable'
  lastScores: number[]
  estimated?: boolean
}

interface ScoutingData {
  player: {
    name: string
    level: number
    xp: number
    xpLevel: number
  }
  categories: ScoutingCategory[]
  overallGrade: string
  overallScore: number
  totalWorkouts: number
  totalReps: number
  lastActive: string | null
  levelAvg: number
  hasEstimatedCategories?: boolean
}

// ── Category icons & colors ────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, typeof Crosshair> = {
  shooting: Crosshair,
  dribble: Zap,
  vitesse: Wind,
  defense: Shield,
  placement: Footprints,
  endurance: Activity,
}

const CATEGORY_EMOJIS: Record<string, string> = {
  shooting: '🎯',
  dribble: '🤹',
  vitesse: '⚡',
  defense: '🛡️',
  placement: '🦶',
  endurance: '💪',
}

const CATEGORY_FR: Record<string, string> = {
  shooting: 'scouting.shooting',
  dribble: 'scouting.ballHandling',
  vitesse: 'scouting.speed',
  defense: 'scouting.defense',
  placement: 'scouting.footwork',
  endurance: 'scouting.conditioning',
}

// ── Grade config ───────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  S: { bg: 'bg-amber-400/20', ring: 'ring-amber-400', text: 'text-amber-400' },
  A: { bg: 'bg-emerald-400/20', ring: 'ring-emerald-400', text: 'text-emerald-400' },
  B: { bg: 'bg-cyan-400/20', ring: 'ring-cyan-400', text: 'text-cyan-400' },
  C: { bg: 'bg-orange-400/20', ring: 'ring-orange-400', text: 'text-orange-400' },
  D: { bg: 'bg-red-400/20', ring: 'ring-red-400', text: 'text-red-400' },
  F: { bg: 'bg-gray-400/20', ring: 'ring-gray-400', text: 'text-gray-400' },
}

// ── Radar chart component ──────────────────────────────────────────────────

const RADAR_SIZE = 300
const CENTER = RADAR_SIZE / 2
const MAX_RADIUS = 120
const LABEL_RADIUS = MAX_RADIUS + 28

function RadarChart({ categories }: { categories: ScoutingCategory[] }) {
  const { t, td } = useTranslation()
  const hasEstimated = categories.some((c) => c.estimated)

  const axes = categories.map((c) => ({
    label: c.name,
    value: Math.min(100, Math.max(0, c.avgScore)),
    estimated: !!c.estimated,
  }))

  const angleStep = (2 * Math.PI) / axes.length
  // Start from top (-PI/2)
  const getPoint = (index: number, radius: number) => {
    const angle = -Math.PI / 2 + index * angleStep
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle),
    }
  }

  // Grid rings (20%, 40%, 60%, 80%, 100%)
  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0]

  // Full data polygon points (real + estimated)
  const dataPoints = axes.map((axis, i) => {
    const r = (axis.value / 100) * MAX_RADIUS
    const pt = getPoint(i, r)
    return `${pt.x},${pt.y}`
  })

  // Axis line points
  const axisLines = axes.map((_, i) => {
    const pt = getPoint(i, MAX_RADIUS)
    return `${CENTER},${CENTER} ${pt.x},${pt.y}`
  })

  // Label positions
  const labelPositions = axes.map((axis, i) => {
    const pt = getPoint(i, LABEL_RADIUS)
    return { ...pt, label: axis.label, value: axis.value, estimated: axis.estimated }
  })

  return (
    <svg
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      className="w-full h-full max-w-[320px] max-h-[320px] mx-auto"
      role="img"
      aria-label={t('scouting.radarLabel')}
    >
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(251, 191, 36)" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="radarGradientEstimated" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="rgb(251, 191, 36)" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(249, 115, 22)" />
          <stop offset="100%" stopColor="rgb(251, 191, 36)" />
        </linearGradient>
      </defs>

      {/* Grid rings */}
      {gridRings.map((ring, i) => {
        const points = axes.map((_, j) => {
          const pt = getPoint(j, MAX_RADIUS * ring)
          return `${pt.x},${pt.y}`
        }).join(' ')
        return (
          <polygon
            key={`grid-${i}`}
            points={points}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        )
      })}

      {/* Axis lines */}
      {axisLines.map((pts, i) => (
        <line
          key={`axis-${i}`}
          x1={CENTER}
          y1={CENTER}
          x2={parseFloat(pts.split(' ')[1].split(',')[0])}
          y2={parseFloat(pts.split(' ')[1].split(',')[1])}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
      ))}

      {/* Data polygon */}
      {dataPoints.join(' ') && (
        <polygon
          points={dataPoints.join(' ')}
          fill={hasEstimated ? 'url(#radarGradientEstimated)' : 'url(#radarGradient)'}
          stroke="url(#radarStroke)"
          strokeWidth={hasEstimated ? 2 : 2.5}
          strokeDasharray={hasEstimated ? '6 4' : undefined}
          strokeLinejoin="round"
        />
      )}

      {/* Data points (dots) */}
      {axes.map((axis, i) => {
        const r = (axis.value / 100) * MAX_RADIUS
        const pt = getPoint(i, r)
        return (
          <circle
            key={`dot-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={4}
            fill={axis.estimated ? 'transparent' : 'rgb(249, 115, 22)'}
            stroke="rgb(249, 115, 22)"
            strokeWidth={axis.estimated ? 2 : 2}
            strokeDasharray={axis.estimated ? '3 2' : undefined}
          />
        )
      })}

      {/* Labels */}
      {labelPositions.map((lp, i) => {
        const isTop = i === 0
        const isBottom = i === Math.floor(axes.length / 2)
        const isRight = i > 0 && i < Math.floor(axes.length / 2)
        const isLeft = i > Math.floor(axes.length / 2) && i < axes.length

        let anchor: 'start' | 'middle' | 'end' = 'middle'
        let dy = 0
        let estDy = 0
        if (isTop) {
          dy = -6
          estDy = -16
        } else if (isBottom) {
          dy = 14
          estDy = 24
        } else if (isRight) {
          anchor = 'start'
          dy = 5
          estDy = 15
        } else if (isLeft) {
          anchor = 'end'
          dy = 5
          estDy = 15
        }

        return (
          <g key={`label-group-${i}`}>
            <text
              x={lp.x}
              y={lp.y + dy}
              textAnchor={anchor}
              className={cn(
                'text-[11px] font-semibold',
                lp.estimated ? 'fill-muted-foreground' : 'fill-foreground',
              )}
            >
              {lp.label}
            </text>
            {lp.estimated && (
              <text
                x={lp.x}
                y={lp.y + estDy}
                textAnchor={anchor}
                className="fill-muted-foreground/60 text-[9px]"
                fontStyle="italic"
              >
                {td('(estimé)', '(estimated)')}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── AI Scouting text generator (client-side templates) ─────────────────────

function generateScoutingText(
  playerName: string,
  categories: ScoutingCategory[],
  overallScore: number,
  overallGrade: string,
  t: (key: TranslationKey) => string,
  td: (fr: string, en: string) => string,
): {
  strengths: string
  improvements: string
  profile: string
  recommendation: string
} {
  // Sort categories by score
  const sorted = [...categories].sort((a, b) => b.avgScore - a.avgScore)
  const topCategories = sorted.filter((c) => c.avgScore > 0).slice(0, 3)
  const bottomCategories = [...sorted].filter((c) => c.avgScore > 0).reverse().slice(0, 2)

  // If no data at all
  if (sorted.every((c) => c.avgScore === 0)) {
    return {
      strengths: t('scouting.insufficientData'),
      improvements: t('scouting.startTrainingForAnalysis'),
      profile: td(`${playerName} est un nouveau joueur sur CourtVision AI. Aucune session d\'entraînement n\'a encore été complétée, ce qui ne permet pas de générer un profil détaillé.`, `${playerName} is a new player on CourtVision AI. No training session has been completed yet, so a detailed profile cannot be generated.`),
      recommendation: t('scouting.recommendationMinSessions'),
    }
  }

  // ── Strengths ───────────────────────────────────────────────────────
  const strengthLines = topCategories.map((cat) => {
    const catFr = CATEGORY_FR[cat.key] ?? cat.name
    if (cat.avgScore >= 80) {
      return td(`Excellente maîtrise en ${catFr.toLowerCase()} avec un score moyen remarquable de ${cat.avgScore}/100 — c\'est un atout compétitif majeur.`, `Excellent mastery in ${catFr.toLowerCase()} with a remarkable average score of ${cat.avgScore}/100 — a major competitive asset.`)
    }
    if (cat.avgScore >= 65) {
      return `Bonne base technique en ${catFr.toLowerCase()} (${cat.avgScore}/100), montre de solides fondamentaux.`
    }
    return td(`${catFr} est le point le plus développé actuellement (${cat.avgScore}/100), avec une marge de progression intéressante.`, `${catFr} is the most developed area currently (${cat.avgScore}/100), with interesting room for improvement.`)
  })

  const strengths =
    strengthLines.length > 0
      ? strengthLines.join(' ')
      : t('scouting.insufficientData')

  // ── Improvements ────────────────────────────────────────────────────
  const improvementLines = bottomCategories.map((cat) => {
    const catFr = CATEGORY_FR[cat.key] ?? cat.name
    if (cat.avgScore < 30) {
      return td(`${catFr} (${cat.avgScore}/100) nécessite un travail significatif et régulier — c\'est la priorité absolue.`, `${catFr} (${cat.avgScore}/100) requires significant and regular work — this is the top priority.`)
    }
    if (cat.avgScore < 50) {
      return td(`${catFr} (${cat.avgScore}/100) reste en dessous du niveau attendu — des drills ciblés sont recommandés.`, `${catFr} (${cat.avgScore}/100) remains below the expected level — targeted drills are recommended.`)
    }
    return td(`${catFr} (${cat.avgScore}/100) peut encore progresser pour atteindre un niveau compétitif.`, `${catFr} (${cat.avgScore}/100) can still improve to reach a competitive level.`)
  })

  const improvements =
    improvementLines.length > 0
      ? improvementLines.join(' ')
      : t('scouting.goodLevel')

  // ── Drill recommendations per weak category ─────────────────────────
  const drillRecs: Record<string, string> = {
    shooting: 'drills BEEF, One Motion Shot et Catches & Shoot',
    dribble: 'drills de balle de poche, crossovers et figure-8',
    vitesse: 'drills de changement de vitesse, sprints et stop-and-go',
    defense: td('drills de glissade défensive, closeout et reaction defense', 'defensive slide drills, closeout and reaction defense'),
    placement: 'drills de footwork, jab steps et pivot series',
    endurance: td('drills de condition physique, Tabata et circuits haute intensité', 'conditioning drills, Tabata and high-intensity circuits'),
  }

  // ── Profile ─────────────────────────────────────────────────────────
  const topKey = topCategories[0]?.key ?? ''
  const topFr = CATEGORY_FR[topKey] ?? 'basketteur'
  const topScore = topCategories[0]?.avgScore ?? 0
  const filledCount = categories.filter((c) => c.avgScore > 0).length

  let profile = ''
  if (filledCount <= 2) {
    profile = td(`${playerName} est un joueur en développement avec des aptitudes prometteuses. Les données actuelles couvrent ${filledCount} catégorie${filledCount > 1 ? 's' : ''} sur 6 — continuez à varier vos entraînements pour un profil plus complet.`, `${playerName} is a developing player with promising abilities. Current data covers ${filledCount} categor${filledCount > 1 ? 'ies' : 'y'} out of 6 — keep varying your training for a more complete profile.`)
  } else if (overallScore >= 75) {
    profile = td(`${playerName} présente un profil de joueur complet et compétitif avec des aptitudes supérieures en ${topFr.toLowerCase()} (score moyen : ${topScore}/100). La polyvalence est un atout clé de ce profil. Le score global de ${overallScore}/100 place ce joueur dans le haut du panier.`, `${playerName} has a complete and competitive player profile with superior abilities in ${topFr.toLowerCase()} (average score: ${topScore}/100). Versatility is a key asset of this profile. The overall score of ${overallScore}/100 places this player at the top.`)
  } else if (overallScore >= 55) {
    profile = td(`${playerName} présente un profil équilibré avec un point fort notable en ${topFr.toLowerCase()} (${topScore}/100). Le joueur montre de bonnes bases dans l\'ensemble des catégories avec un score global de ${overallScore}/100.`, `${playerName} has a balanced profile with a notable strength in ${topFr.toLowerCase()} (${topScore}/100). The player shows solid fundamentals across all categories with an overall score of ${overallScore}/100.`)
  } else if (overallScore >= 35) {
    profile = td(`${playerName} est un joueur en progression constante. Le point fort actuel se situe en ${topFr.toLowerCase()} (${topScore}/100). Le score global de ${overallScore}/100 indique un potentiel de développement important avec un entraînement régulier.`, `${playerName} is a player in constant progression. The current strength is in ${topFr.toLowerCase()} (${topScore}/100). The overall score of ${overallScore}/100 indicates significant development potential with regular training.`)
  } else {
    profile = td(`${playerName} est en phase de construction de ses fondamentaux. Le meilleur score se situe en ${topFr.toLowerCase()} (${topScore}/100). Un travail régulier et structuré permettra une progression rapide.`, `${playerName} is in the process of building fundamentals. The best score is in ${topFr.toLowerCase()} (${topScore}/100). Regular and structured work will enable rapid progression.`)
  }

  // ── Recommendation ──────────────────────────────────────────────────
  const weakKey = bottomCategories[0]?.key ?? ''
  const weakFr = CATEGORY_FR[weakKey] ?? 'fondamentaux'
  const weakScore = bottomCategories[0]?.avgScore ?? 0
  const rec = drillRecs[weakKey] ?? td('drills fondamentaux variés', 'varied fundamental drills')

  let recommendation = ''
  if (bottomCategories.length > 0 && weakScore < 50) {
    recommendation = td(`Focus prioritaire sur ${weakFr.toLowerCase()} (${weakScore}/100) — recommandé : ${rec}. Visez 3 sessions hebdomadaires dans cette catégorie avec une progression progressive de la difficulté.`, `Priority focus on ${weakFr.toLowerCase()} (${weakScore}/100) — recommended: ${rec}. Aim for 3 weekly sessions in this category with gradual difficulty progression.`)
  } else if (bottomCategories.length > 0) {
    recommendation = td(`Continuez à travailler ${weakFr.toLowerCase()} pour élever votre plancher (${weakScore}/100 → objectif 70+). ${rec} sont de bons choix pour progresser.`, `Keep working on ${weakFr.toLowerCase()} to raise your floor (${weakScore}/100 → target 70+). ${rec} are good choices to progress.`)
  } else {
    recommendation = t('scouting.maintainTraining')
  }

  if (overallScore >= 70) {
    recommendation += td(' Passez aux drills avancés pour continuer à progresser et ne pas stagner.', ' Move on to advanced drills to keep progressing and avoid plateauing.')
  }

  return { strengths, improvements, profile, recommendation }
}

// ── Main component ─────────────────────────────────────────────────────────

export function ScoutingScreen() {
  const { t, td, language } = useTranslation()
  const goBack = useAppStore((s) => s.goBack)
  const navigate = useAppStore((s) => s.navigate)

  const { data, isLoading, isError } = useQuery<ScoutingData>({
    queryKey: ['scouting'],
    queryFn: () => apiFetch<ScoutingData>('/api/scouting'),
    staleTime: 1000 * 60 * 5,
  })

  const scoutingText = useMemo(() => {
    if (!data) return null
    return generateScoutingText(
      data.player.name,
      data.categories,
      data.overallScore,
      data.overallGrade,
      t,
      td,
    )
  }, [data, t, td])

  const gradeColor = GRADE_COLORS[data?.overallGrade ?? 'F'] ?? GRADE_COLORS.F

  const levelInfo = data ? getLevelInfo(data.player.xp) : null

  const lastActiveFormatted = data?.lastActive
    ? formatLocaleDate(data.lastActive, language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const initials = data?.player.name
    ? data.player.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??'

  return (
    <SwipeToGoBack className="min-h-screen bg-background pb-24">
      <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-4">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border hover:bg-muted transition-colors"
            aria-label={t('scouting.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <h1 className="text-lg font-bold">{t('scouting.title')}</h1>
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : isError || !data ? (
          <ErrorState />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* ── Section 1: Player Identity Card ───────────────────── */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg dark:shadow-black/20 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-5">
                    {/* Avatar with level badge */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg dark:shadow-black/20">
                        {initials}
                      </div>
                      <div
                        className={cn(
                          'absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-xs font-bold',
                          getLevelColor(data.player.level),
                          levelInfo
                            ? 'bg-gradient-to-br from-orange-500/30 to-amber-500/30'
                            : 'bg-muted',
                        )}
                      >
                        {data.player.level}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold truncate">
                        {data.player.name}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {levelInfo?.levelTitle ?? `${td('Niveau', 'Level')} ${data.player.level}`}
                      </p>

                      {/* XP progress */}
                      {levelInfo && !levelInfo.isMaxLevel && (
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>XP</span>
                            <span>
                              {levelInfo.xpInCurrentLevel}/
                              {levelInfo.xpNeededForNextLevel}
                            </span>
                          </div>
                          <Progress
                            value={levelInfo.progress * 100}
                            className="h-1.5"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Last updated */}
                  {lastActiveFormatted && (
                    <p className="text-xs text-muted-foreground mt-4 text-right">
                      {td('Dernière mise à jour :', 'Last updated:')} {lastActiveFormatted}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Motivational banner for new users ──────────────────── */}
            {data.hasEstimatedCategories && (
              <motion.div variants={itemVariants}>
                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                      {td('Profil estimé', 'Estimated profile')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {td('Complète des séances pour débloquer tes vraies stats !', 'Complete sessions to unlock your real stats!')}
                    </p>
                  </div>
                  {data.totalWorkouts === 0 && (
                    <button
                      onClick={() => navigate('train-hub')}
                      className="flex-shrink-0 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5"
                    >
                      <Dumbbell className="h-3.5 w-3.5" />
                      {td("S'entraîner", 'Train')}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            <div className="contents">
            {/* ── Section 2: Radar Chart — ADN Basketteur ──────────── */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg dark:shadow-black/20">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    {td('ADN Basketteur', 'Basketball DNA')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-6">
                  <div className="w-full" style={{ minHeight: 280 }}>
                    <RadarChart categories={data.categories} />
                  </div>
                  {/* Score labels below radar */}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                    {data.categories.map((cat) => (
                      <span
                        key={cat.key}
                        className={cn(
                          'text-xs',
                          cat.estimated ? 'text-muted-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {cat.name}:{' '}
                        <span className={cn(
                          'font-semibold',
                          cat.estimated ? 'text-muted-foreground' : 'text-foreground',
                        )}>
                          {cat.avgScore}
                        </span>
                        {cat.estimated && (
                          <span className="italic text-muted-foreground/50 ml-0.5">(est.)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Section 3: Overall Grade ─────────────────────────── */}
            <motion.div variants={itemVariants}>
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'flex h-24 w-24 items-center justify-center rounded-full ring-4 shadow-xl dark:shadow-black/20',
                      gradeColor.bg,
                      gradeColor.ring,
                    )}
                  >
                    <span
                      className={cn(
                        'text-4xl font-black',
                        gradeColor.text,
                      )}
                    >
                      {data.overallGrade}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.overallScore}</p>
                    <p className="text-xs text-muted-foreground">{t('scouting.scoreOutOf100')}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Section 4: AI Scouting Text Analysis ─────────────── */}
            {scoutingText && (
              <motion.div variants={itemVariants} className="space-y-4">
                <Card className="border-0 shadow-lg dark:shadow-black/20">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-orange-500" />
                      {td('Analyse Scout IA', 'AI Scout Analysis')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-6 space-y-5">
                    {/* Points Forts */}
                    <div>
                      <h3 className="text-sm font-bold text-emerald-500 mb-1.5 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        {td('Points Forts', 'Strengths')}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {scoutingText.strengths}
                      </p>
                    </div>

                    {/* Axes d'Amélioration */}
                    <div>
                      <h3 className="text-sm font-bold text-orange-500 mb-1.5 flex items-center gap-1.5">
                        <TrendingDown className="h-4 w-4" />
                        {td("Axes d'Amélioration", 'Areas for Improvement')}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {scoutingText.improvements}
                      </p>
                    </div>

                    {/* Profil de Joueur */}
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-orange-500" />
                        {td('Profil de Joueur', 'Player Profile')}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {scoutingText.profile}
                      </p>
                    </div>

                    {/* Recommandation */}
                    <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4">
                      <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1.5 flex items-center gap-1.5">
                        <Trophy className="h-4 w-4" />
                        {td('Recommandation', 'Recommendation')}
                      </h3>
                      <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
                        {scoutingText.recommendation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Section 5: Category Breakdown Cards ───────────────── */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg dark:shadow-black/20">
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-base font-bold">
                    {td('Détail par Catégorie', 'Category Breakdown')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.categories.map((cat) => (
                      <CategoryCard key={cat.key} category={cat} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Section 6: Comparison ─────────────────────────────── */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg dark:shadow-black/20">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold mb-3">
                    {td('Comparaison au niveau', 'Comparison at level')} {data.player.level}
                  </h3>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{t('scouting.averageLevel')}</span>
                        <span className="font-semibold">{data.levelAvg}</span>
                      </div>
                      <Progress value={data.levelAvg} className="h-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{t('scouting.yourScore')}</span>
                        <span className="font-bold text-orange-500">
                          {data.overallScore}
                        </span>
                      </div>
                      <Progress
                        value={data.overallScore}
                        className="h-2"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    {data.overallScore >= data.levelAvg ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20 gap-1.5 px-3 py-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {td('Au-dessus de la moyenne', 'Above average')}
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25 hover:bg-orange-500/20 gap-1.5 px-3 py-1.5">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {td('En dessous de la moyenne', 'Below average')}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Footer stats ──────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pb-4">
                <span>{data.totalWorkouts} {td('séances', 'sessions')}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span>{data.totalReps} {td('répétitions', 'repetitions')}</span>
              </div>
            </motion.div>
            </div>
          </motion.div>
        )}
      </div>
      <BottomNav />
    </SwipeToGoBack>
  )
}

// ── Category breakdown card ─────────────────────────────────────────────────

function CategoryCard({ category }: { category: ScoutingCategory }) {
  const { td } = useTranslation()
  const _Icon = CATEGORY_ICONS[category.key] ?? Activity
  const emoji = CATEGORY_EMOJIS[category.key] ?? '🏀'

  const TrendIcon =
    category.trend === 'up'
      ? TrendingUp
      : category.trend === 'down'
        ? TrendingDown
        : Minus
  const trendColor =
    category.trend === 'up'
      ? 'text-emerald-500'
      : category.trend === 'down'
        ? 'text-red-500'
        : 'text-muted-foreground'

  return (
    <div className={cn(
      'rounded-xl border bg-card p-3.5 space-y-2.5',
      category.estimated
        ? 'border-dashed border-orange-500/30 bg-orange-500/[0.03]'
        : 'border-border/60',
    )}>
      {/* Header: emoji + name + trend + estimated badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{emoji}</span>
          <span className="text-xs font-semibold truncate">
            {CATEGORY_FR[category.key] ?? category.name}
          </span>
          {category.estimated && (
            <span className="text-[9px] italic text-orange-500/70 bg-orange-500/10 px-1.5 py-0.5 rounded-md">
              {td('estimé', 'estimated')}
            </span>
          )}
        </div>
        <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1">
        <span className={cn(
          'text-2xl font-black tabular-nums',
          category.estimated && 'text-muted-foreground',
        )}>
          {Math.round(category.avgScore)}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>

      {/* Mini progress bar */}
      <Progress value={category.avgScore} className="h-1" />

      {/* Stats line */}
      {category.totalReps > 0 ? (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{category.totalReps} reps</span>
          <span className="w-0.5 h-0.5 rounded-full bg-current" />
          <span>{category.totalSessions} sessions</span>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/50 italic">
          {td('Aucune donnée encore', 'No data yet')}
        </p>
      )}
    </div>
  )
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Identity card skeleton */}
      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <div className="h-1.5 bg-muted" />
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar chart skeleton */}
      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <CardHeader className="pb-2 pt-5 px-5">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="px-5 pb-6 flex justify-center">
          <Skeleton className="h-[300px] w-[300px] rounded-full" />
        </CardContent>
      </Card>

      {/* Grade skeleton */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* Text analysis skeleton */}
      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <CardHeader className="pb-2 pt-5 px-5">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="px-5 pb-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Category breakdown skeleton */}
      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <CardHeader className="pb-2 pt-5 px-5">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="px-5 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Error state ─────────────────────────────────────────────────────────────

function ErrorState() {
  const { t } = useTranslation()
  const goBack = useAppStore((s) => s.goBack)

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
        <Shield className="h-8 w-8 text-red-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="font-bold text-lg">{t('error.loadFailed')}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t('error.serverError')}
        </p>
      </div>
      <button
        onClick={goBack}
        className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
      >
        {t('action.back')}
      </button>
    </div>
  )
}

export default ScoutingScreen