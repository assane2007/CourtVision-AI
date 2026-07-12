'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Flame,
  RefreshCw,
  TrendingUp,
  Calendar,
  Activity,
  Trophy,
  BarChart3,
  Dumbbell,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useAppStore } from '@/stores/app'
import { BottomNav } from '@/components/shared/bottom-nav'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'
import { AnimatedNumber } from '@/components/shared/animated-number'
import { CATEGORY_META, getCategoryLabel } from '@/lib/constants'
import { apiFetch, formatLocaleDate } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { useTranslation } from '@/components/providers/language-provider'

// ── Day name mapping ────────────────────────────────────────────────
const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDayLabel(dateStr: string, lang: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const days = lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_FR
  return days[date.getDay()]
}

// ── Custom tooltip for bar chart ────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg dark:shadow-black/20 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name} : <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Types ───────────────────────────────────────────────────────────
interface DailyStat {
  date: string
  sessions: number
  reps: number
  score: number
}

interface CategoryStat {
  category: string
  drills: number
  avgScore: number
}

interface SessionEntry {
  id: string
  startedAt: string
  totalScore: number
  totalReps: number
  totalDrills: number
  drills: Array<{ drill: { nameFr: string } }>
}

// ── Component ───────────────────────────────────────────────────────
interface StatsResponse {
  totalSessions: number
  totalReps: number
  avgScore: number
  weekSessions: number
  dailyStats: DailyStat[]
  categories: CategoryStat[]
  currentStreak?: number
  bestStreak?: number
}

export function StatsScreen() {
  const navigate = useAppStore(s => s.navigate)
  const { t, td, language } = useTranslation()

  // ── Fetch stats ─────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: () => apiFetch<StatsResponse>('/api/stats'),
  })

  // ── Fetch recent sessions with pagination ───────────────────────
  const [sessionPage, setSessionPage] = useState(1)
  const { data: sessionsData, isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useQuery<{
    sessions: SessionEntry[]
    total?: number
    hasMore?: boolean
  }>({
    queryKey: ['sessions', 'page', sessionPage],
    queryFn: () => apiFetch(`/api/sessions?page=${sessionPage}&limit=20`),
  })

  const allSessions: SessionEntry[] = sessionsData?.sessions ?? []
  const totalSessionsCount = sessionsData?.total
  const hasMoreSessions = sessionsData?.hasMore ?? false
  const dailyStats: DailyStat[] = stats?.dailyStats ?? []
  const categories: CategoryStat[] = stats?.categories ?? []

  if (statsLoading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-5 w-52" />
          </div>
        </header>
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    )
  }

  if (statsError || sessionsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchSessions() }}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          {t('action.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh
        queryKeys={[['stats'], ['sessions']]}
      >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.header
          variants={itemVariants}
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
        >
          <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center h-14 px-4">
            <TrendingUp className="h-5 w-5 text-orange-500 mr-2.5" />
            <h1 className="text-base font-semibold">{t('stats.title')}</h1>
          </div>
        </motion.header>

        <div className="px-4 pt-5 space-y-5">
          {/* ── Overview Cards ────────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <StatCard
              icon={<Flame className="h-5 w-5 text-orange-500" />}
              value={stats?.totalSessions ?? 0}
              label={t('stats.totalSessions')}
              color="orange"
            />
            <StatCard
              icon={<Activity className="h-5 w-5 text-emerald-500" />}
              value={stats?.totalReps ?? 0}
              label={t('stats.repetitions')}
              color="emerald"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-sky-500" />}
              value={stats?.avgScore ? `${stats.avgScore}` : '0'}
              label={t('stats.averageScore')}
              color="sky"
            />
            <StatCard
              icon={<Calendar className="h-5 w-5 text-violet-500" />}
              value={stats?.weekSessions ?? 0}
              label={t('stats.sessionsPerWeek')}
              color="violet"
            />
          </motion.div>

          {/* ── Records Link Card ──────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card
              className="border-0 shadow-md dark:shadow-black/20 cursor-pointer group hover:shadow-lg dark:hover:shadow-black/30 transition-shadow"
              onClick={() => navigate('records')}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{t('stats.viewRecords')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('stats.recordsDesc')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0" />
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Weekly Activity Chart ─────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  {t('stats.weeklyActivity')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-5">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyStats.map((d: DailyStat) => ({
                        ...d,
                        day: getDayLabel(d.date, language),
                        sessions: d.sessions,
                      }))}
                      margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="sessions"
                        name={td('Séances', 'Sessions')}
                        fill="#f97316"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Category Performance ──────────────────────────────── */}
          {categories.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-orange-500" />
                    {t('stats.categoryPerformance')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {categories.map((cat: CategoryStat, idx: number) => {
                    const meta = CATEGORY_META[cat.category]
                    const progress = Math.min(cat.avgScore, 100)
                    const scoreColor =
                      cat.avgScore >= 70
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : cat.avgScore >= 40
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-500 dark:text-red-400'
                    return (
                      <motion.div
                        key={cat.category}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05, duration: 0.3 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{meta?.icon ?? '🏀'}</span>
                            <span className="text-sm font-medium">
                              {meta?.label ?? getCategoryLabel(cat.category) ?? cat.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {cat.drills} {td(cat.drills > 1 ? 'exercices' : 'exercice', cat.drills > 1 ? 'drills' : 'drill')}
                            </span>
                            <span className={`text-sm font-bold ${scoreColor}`}>
                              {cat.avgScore}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ delay: 0.4 + idx * 0.05, duration: 0.6, ease: 'easeOut' as const }}
                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${meta?.color ?? 'from-orange-500 to-amber-500'}`}
                          />
                        </div>
                      </motion.div>
                    )
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Recent Sessions Table ─────────────────────────────── */}
          {allSessions.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                <CardHeader className="pb-2 px-5 pt-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      {t('stats.recentSessions')}
                    </CardTitle>
                    {totalSessionsCount !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {allSessions.length}/{totalSessionsCount}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold text-muted-foreground">{t('stats.dateLabel')}</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">{t('stats.exercisesLabel')}</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground text-right">{t('workout.score')}</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground text-right">{t('stats.repsLabel')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allSessions.map((session: SessionEntry) => {
                          const date = new Date(session.startedAt)
                          const dateStr = formatLocaleDate(date, language, {
                            day: 'numeric',
                            month: 'short',
                          })
                          const drillNames = session.drills
                            ?.slice(0, 2)
                            .map((d) => d.drill.nameFr)
                            .join(', ') ?? '—'
                          const extra = session.drills?.length > 2 ? ` +${session.drills.length - 2}` : ''
                          return (
                            <TableRow key={session.id}>
                              <TableCell className="text-xs font-medium py-2.5">{dateStr}</TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2.5 max-w-[120px] truncate">
                                {drillNames}{extra}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-right py-2.5">
                                <span className={
                                  session.totalScore >= 7
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : session.totalScore >= 4
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-500 dark:text-red-400'
                                }>
                                  {session.totalScore.toFixed(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-right text-muted-foreground py-2.5">
                                {session.totalReps}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {hasMoreSessions && (
                    <div className="px-5 pb-4 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSessionPage((p) => p + 1)}
                        className="w-full"
                      >
                        <ChevronDown className="h-4 w-4 mr-1" />
                        {t('action.loadMore')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Empty state ───────────────────────────────────────── */}
          {!statsLoading && stats?.totalSessions === 0 && (
            <motion.div
              variants={itemVariants}
              className="py-12 flex flex-col items-center"
            >
              {/* Basketball court illustration */}
              <div className="relative w-56 h-40 mb-6">
                <svg viewBox="0 0 240 160" className="w-full h-full drop-shadow-lg">
                  {/* Court floor */}
                  <rect x="10" y="10" width="220" height="140" rx="8" fill="#f97316" opacity="0.1" />
                  <rect x="12" y="12" width="216" height="136" rx="6" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.3" />
                  {/* Half-court line */}
                  <line x1="120" y1="12" x2="120" y2="148" stroke="#f97316" strokeWidth="1" opacity="0.25" />
                  {/* Center circle */}
                  <circle cx="120" cy="80" r="22" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.25" />
                  <circle cx="120" cy="80" r="3" fill="#f97316" opacity="0.35" />
                  {/* Left key / paint */}
                  <rect x="12" y="48" width="48" height="64" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.25" />
                  <circle cx="60" cy="80" r="12" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.2" strokeDasharray="3 3" />
                  {/* Right key / paint */}
                  <rect x="180" y="48" width="48" height="64" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.25" />
                  <circle cx="180" cy="80" r="12" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.2" strokeDasharray="3 3" />
                  {/* Basketballs */}
                  <circle cx="36" cy="80" r="7" fill="#f97316" opacity="0.18" />
                  <circle cx="204" cy="80" r="7" fill="#f97316" opacity="0.18" />
                  {/* Three-point arcs (simplified) */}
                  <path d="M 12 38 Q 80 20 12 38" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.15" />
                  <path d="M 228 38 Q 160 20 228 38" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.15" />
                </svg>
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-4xl"
                >
                  🏀
                </motion.div>
              </div>
              <h3 className="font-semibold text-lg mb-1">{t('empty.noData')}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
                {td('Commencez votre premier entraînement pour suivre votre progression et voir vos statistiques.', 'Start your first workout to track your progress and see your statistics.')}
              </p>
              <Button
                onClick={() => navigate('train-hub')}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 shadow-lg dark:shadow-black/20 shadow-orange-500/25 rounded-full"
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                {td("Commencer l'entraînement", 'Start workout')}
              </Button>
            </motion.div>
          )}

          <div className="h-2" />
        </div>
      </motion.div>
      </PullToRefresh>

      <BottomNav />
    </div>
  )
}

// ── Stat Card Sub-component ─────────────────────────────────────────
function StatCard({
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
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
    sky: 'bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20',
    violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20',
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(value as string)
  const isNumeric = !isNaN(numericValue) && typeof value !== 'string'

  return (
    <Card className={`border ${colorMap[color] ?? colorMap.orange}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div>
          {isNumeric ? (
            <p className="text-2xl font-bold leading-tight">
              <AnimatedNumber value={numericValue} />
            </p>
          ) : (
            <p className="text-2xl font-bold leading-tight">{value}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default StatsScreen
