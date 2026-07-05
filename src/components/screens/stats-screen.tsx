'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Flame,
  TrendingUp,
  Calendar,
  Activity,
  Trophy,
  BarChart3,
  Dumbbell,
  ChevronRight,
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
import { apiFetch } from '@/lib/utils'

// ── Day name mapping ────────────────────────────────────────────────
const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return dayNames[date.getDay()]
}

// ── Animation variants ──────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
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
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
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
  const { currentScreen, navigate } = useAppStore()

  // ── Fetch stats ─────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: () => apiFetch<StatsResponse>('/api/stats'),
  })

  // ── Fetch recent sessions ───────────────────────────────────────
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{ sessions: SessionEntry[] }>({
    queryKey: ['sessions'],
    queryFn: () => apiFetch<{ sessions: SessionEntry[] }>('/api/sessions'),
  })

  const recentSessions: SessionEntry[] = sessionsData?.sessions?.slice(0, 10) ?? []
  const dailyStats: DailyStat[] = stats?.dailyStats ?? []
  const categories: CategoryStat[] = stats?.categories ?? []

  // ── Loading skeleton ────────────────────────────────────────────
  // Suppress unused variable lint (currentScreen is available for future use)
  void currentScreen

  if (statsLoading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-lg mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-5 w-52" />
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh
        queryKeys={[['stats'], ['sessions']]}
      >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.header
          variants={itemVariants}
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
        >
          <div className="max-w-lg mx-auto flex items-center h-14 px-4">
            <TrendingUp className="h-5 w-5 text-orange-500 mr-2.5" />
            <h1 className="text-base font-semibold">Statistiques &amp; Progression</h1>
          </div>
        </motion.header>

        <div className="px-4 pt-5 space-y-5">
          {/* ── Overview Cards ────────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-3"
          >
            <StatCard
              icon={<Flame className="h-5 w-5 text-orange-500" />}
              value={stats?.totalSessions ?? 0}
              label="Séances Totales"
              color="orange"
            />
            <StatCard
              icon={<Activity className="h-5 w-5 text-emerald-500" />}
              value={stats?.totalReps ?? 0}
              label="Répétitions"
              color="emerald"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-sky-500" />}
              value={stats?.avgScore ? `${stats.avgScore}` : '0'}
              label="Score Moyen"
              color="sky"
            />
            <StatCard
              icon={<Calendar className="h-5 w-5 text-violet-500" />}
              value={stats?.weekSessions ?? 0}
              label="Séances / Semaine"
              color="violet"
            />
          </motion.div>

          {/* ── Records Link Card ──────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card
              className="border-0 shadow-md cursor-pointer group hover:shadow-lg transition-shadow"
              onClick={() => navigate('records')}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">Voir mes records personnels</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Meilleurs scores, tendances et progrès
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0" />
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Weekly Activity Chart ─────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  Activité Hebdomadaire
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-5">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyStats.map((d: DailyStat) => ({
                        ...d,
                        day: getDayLabel(d.date),
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
                        name="Séances"
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
              <Card className="border-0 dark:border-border/50 shadow-md">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-orange-500" />
                    Performance par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {categories.map((cat: CategoryStat, idx: number) => {
                    const meta = CATEGORY_META[cat.category]
                    const progress = Math.min((cat.avgScore / 10) * 100, 100)
                    const scoreColor =
                      cat.avgScore >= 7
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : cat.avgScore >= 4
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
                              {cat.drills} exercice{cat.drills > 1 ? 's' : ''}
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
          {recentSessions.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-0 dark:border-border/50 shadow-md">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    Séances Récentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Exercices</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground text-right">Score</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground text-right">Rép.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentSessions.map((session: SessionEntry) => {
                          const date = new Date(session.startedAt)
                          const dateStr = date.toLocaleDateString('fr-FR', {
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
              <h3 className="font-semibold text-lg mb-1">Aucune donnée</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
                Commencez votre premier entraînement pour suivre votre progression et voir vos statistiques.
              </p>
              <Button
                onClick={() => navigate('train-hub')}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 shadow-lg shadow-orange-500/25 rounded-full"
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Commencer l&apos;entraînement
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
