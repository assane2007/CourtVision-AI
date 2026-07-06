'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy,
  Search,
  ArrowLeft,
  Dumbbell,
  Target,
  Flame,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores/app'
import { BottomNav } from '@/components/shared/bottom-nav'
import { CATEGORIES_LIST, CATEGORY_META, getCategoryMeta } from '@/lib/constants'
import { apiFetch, formatDuration } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'

interface DrillRecord {
  drillId: string
  drillName: string
  drillNameFr: string
  drillCategory: string
  drillIcon: string
  drillDifficulty: string
  bestScore: number
  bestReps: number
  fastestTimeMs: number
  totalSessions: number
  lastCompleted: string
  scoreTrend: number[]
  avgScore: number
  isNewRecord: boolean
  avgDurationMs: number
}

interface RecordsSummary {
  totalDrills: number
  avgPersonalBest: number
  mostImprovedDrill: DrillRecord | null
  totalTrainingMs: number
}

interface RecordsResponse {
  records: DrillRecord[]
  summary: RecordsSummary
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

function getCategoryColor(category: string): string {
  const meta = CATEGORY_META[category]
  if (!meta) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20'
  // Extract colors from gradient
  const colorMap: Record<string, string> = {
    pocket_ball: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    shifty: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    ball_handling: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    speed_change: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    defense: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
    shooting: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
    footwork: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20',
    finishing: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
    conditioning: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20',
  }
  return colorMap[category] ?? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20'
}

// ── Mini Sparkline SVG ──────────────────────────────────────────────────────

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null

  const w = 80
  const h = 28
  const padding = 4
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1

  const points = scores.map((s, i) => {
    const x = padding + (i / (scores.length - 1)) * (w - padding * 2)
    const y = h - padding - ((s - min) / range) * (h - padding * 2)
    return `${x},${y}`
  })

  const linePoints = points.join(' ')
  const areaPoints = `${padding},${h - padding} ${linePoints} ${w - padding},${h - padding}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-7" fill="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline
        points={linePoints}
        stroke="#f97316"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Last point dot */}
      {points.length > 0 && (() => {
        const lastPoint = points[points.length - 1]
        const [cx, cy] = lastPoint.split(',')
        return (
          <circle
            cx={cx}
            cy={cy}
            r="2.5"
            fill="#f97316"
            stroke="white"
            strokeWidth="1.5"
          />
        )
      })()}
    </svg>
  )
}

// ── Trend Indicator ─────────────────────────────────────────────────────────

function TrendIndicator({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null

  const last = scores[scores.length - 1]
  const prev = scores[scores.length - 2]
  const improved = last > prev

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        improved
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-500 dark:text-red-400'
      }`}
    >
      {improved ? '↑' : '↓'}{' '}
      {improved ? 'Amélioration' : 'Baisse'}
    </span>
  )
}

// ── Record Card ─────────────────────────────────────────────────────────────

function RecordCard({ record, index }: { record: DrillRecord; index: number }) {
  const catMeta = getCategoryMeta(record.drillCategory)
  if (!catMeta) return null
  const catColor = getCategoryColor(record.drillCategory)

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-0 dark:border-border/50 shadow-md overflow-hidden">
        <CardContent className="p-4">
          {/* Top row: icon + name + category + PR badge */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
              {record.drillIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold truncate">{record.drillNameFr}</h3>
                {record.isNewRecord && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 h-5 shrink-0">
                    👑 Nouveau record !
                  </Badge>
                )}
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 border ${catColor} h-5 mt-1`}
              >
                {catMeta.icon} {catMeta.label}
              </Badge>
            </div>
          </div>

          {/* Best Score + Sparkline */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tabular-nums text-foreground">
                {record.bestScore}
              </span>
              <span className="text-xs text-muted-foreground font-medium">/ 10</span>
              <span className="ml-1 text-lg">👑</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Sparkline scores={record.scoreTrend} />
              <TrendIndicator scores={record.scoreTrend} />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span>{record.totalSessions} séance{record.totalSessions > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              <span>Max {record.bestReps} rép.</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-sky-500" />
              <span>Moy. {formatDuration(record.avgDurationMs)}</span>
            </div>
          </div>

          {/* Last completed */}
          <div className="mt-2 text-[11px] text-muted-foreground/70">
            Dernière fois : {formatDate(record.lastCompleted)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  const { navigate } = useAppStore()

  return (
    <motion.div
      variants={itemVariants}
      className="py-12 flex flex-col items-center px-4"
    >
      {/* Basketball illustration */}
      <div className="relative w-56 h-40 mb-6">
        <svg viewBox="0 0 240 160" className="w-full h-full drop-shadow-lg">
          {/* Trophy shape */}
          <rect x="90" y="20" width="60" height="70" rx="8" fill="#f97316" opacity="0.12" />
          <rect x="95" y="25" width="50" height="60" rx="5" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.3" />
          {/* Trophy handles */}
          <path d="M 90 35 Q 65 35 65 55 Q 65 75 90 75" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.25" />
          <path d="M 150 35 Q 175 35 175 55 Q 175 75 150 75" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.25" />
          {/* Trophy base */}
          <rect x="100" y="90" width="40" height="10" rx="2" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.3" />
          <rect x="85" y="100" width="70" height="8" rx="3" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.25" />
          {/* Star on trophy */}
          <polygon points="120,40 124,52 137,52 127,59 130,71 120,64 110,71 113,59 103,52 116,52" fill="#f97316" opacity="0.2" />
          {/* Basketball */}
          <circle cx="60" cy="120" r="12" fill="#f97316" fillOpacity="0.1" stroke="#f97316" strokeWidth="1" opacity="0.2" />
          <line x1="60" y1="108" x2="60" y2="132" stroke="#f97316" strokeWidth="0.8" opacity="0.2" />
          <path d="M 48 120 Q 60 112 72 120" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.2" />
          <path d="M 48 120 Q 60 128 72 120" fill="none" stroke="#f97316" strokeWidth="0.8" opacity="0.2" />
        </svg>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-4xl"
        >
          🏆
        </motion.div>
      </div>
      <h3 className="font-semibold text-lg mb-1">Aucun record</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px] text-center">
        Commencez votre premier entraînement pour voir vos records !
      </p>
      <Button
        onClick={() => navigate('train-hub')}
        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 shadow-lg shadow-orange-500/25 rounded-full"
      >
        <Dumbbell className="h-4 w-4 mr-2" />
        Commencer l&apos;entraînement
      </Button>
    </motion.div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function RecordsScreen() {
  const { goBack } = useAppStore()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Fetch records ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<RecordsResponse>({
    queryKey: ['records'],
    queryFn: () => apiFetch<RecordsResponse>('/api/records'),
  })

  const records = data?.records ?? []
  const summary = data?.summary

  // ── Filter records ────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let filtered = records
    if (activeCategory !== 'all') {
      filtered = filtered.filter(r => r.drillCategory === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.drillNameFr.toLowerCase().includes(q) ||
        r.drillName.toLowerCase().includes(q),
      )
    }
    return filtered
  }, [records, activeCategory, searchQuery])

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
          <Skeleton className="h-10 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="flex gap-2 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  // ── Empty state (no records at all) ───────────────────────────────────
  if (records.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-lg mx-auto"
        >
          <motion.header
            variants={itemVariants}
            className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
          >
            <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
              <button
                type="button"
                onClick={goBack}
                className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Trophy className="h-5 w-5 text-orange-500" />
              <h1 className="text-base font-semibold">Records Personnels</h1>
            </div>
          </motion.header>
          <EmptyState />
        </motion.div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          variants={itemVariants}
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
        >
          <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
            <button
              type="button"
              onClick={goBack}
              className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Trophy className="h-5 w-5 text-orange-500" />
            <h1 className="text-base font-semibold">Records Personnels</h1>
          </div>
        </motion.header>

        <div className="px-4 pt-5 space-y-5">
          {/* ── Search Bar ───────────────────────────────────────────── */}
          <motion.div variants={itemVariants} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un exercice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-orange-500/50"
            />
          </motion.div>

          {/* ── Summary Cards ────────────────────────────────────────── */}
          {summary && (
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
              <SummaryCard
                icon={<Dumbbell className="h-5 w-5 text-orange-500" />}
                value={summary.totalDrills}
                label="Exercices tentés"
                color="orange"
              />
              <SummaryCard
                icon={<Trophy className="h-5 w-5 text-amber-500" />}
                value={summary.avgPersonalBest}
                label="Moy. des records"
                color="amber"
              />
              <SummaryCard
                icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                value={summary.mostImprovedDrill?.drillNameFr ?? '—'}
                label="Plus grand progrès"
                color="emerald"
              />
              <SummaryCard
                icon={<Clock className="h-5 w-5 text-sky-500" />}
                value={formatDuration(summary.totalTrainingMs)}
                label="Temps d&apos;entraînement"
                color="sky"
              />
            </motion.div>
          )}

          {/* ── Category Tabs ────────────────────────────────────────── */}
          <motion.div variants={itemVariants} role="tablist" aria-label="Catégories" className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {CATEGORIES_LIST.map((cat) => (
              <button
                key={cat.key}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-medium transition-colors border min-h-[44px] flex items-center ${
                  activeCategory === cat.key
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </motion.div>

          {/* ── Records List ─────────────────────────────────────────── */}
          {filteredRecords.length > 0 ? (
            <motion.div variants={itemVariants} className="space-y-3">
              {filteredRecords.map((record, i) => (
                <RecordCard key={record.drillId} record={record} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="py-10 text-center"
            >
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Aucun exercice trouvé pour cette recherche.'
                  : 'Aucun record dans cette catégorie.'}
              </p>
            </motion.div>
          )}

          <div className="h-2" />
        </div>
      </motion.div>

      <BottomNav />
    </div>
  )
}

// ── Summary Card Sub-component ──────────────────────────────────────────────

function SummaryCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: number | string
  label: string
  color: string
}) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
    sky: 'bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20',
  }

  return (
    <Card className={`border ${colorMap[color] ?? colorMap.orange}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="min-w-0">
          <p className={`text-lg font-bold leading-tight truncate ${
            typeof value === 'string' && value.length > 10 ? 'text-sm' : ''
          }`}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default RecordsScreen