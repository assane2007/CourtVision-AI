'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Home,
  Dumbbell,
  BarChart3,
  User,
  Flame,
  TrendingUp,
  Calendar,
  Activity,
  Trophy,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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

// ── Day name mapping ────────────────────────────────────────────────
const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return dayNames[date.getDay()]
}

// ── Category label map ──────────────────────────────────────────────
const categoryLabels: Record<string, string> = {
  pocket_ball: 'Ballon de Poche',
  shifty: 'Déplacements',
  ball_handling: 'Maniement de Balle',
  speed_change: 'Changement de Vitesse',
  defense: 'Défense',
  shooting: 'Tir',
  footwork: 'Travail des Pieds',
  finishing: 'Finition',
  conditioning: 'Condition Physique',
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
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
export function StatsScreen() {
  const { currentScreen, navigate } = useAppStore()

  // ── Fetch stats ─────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
  })

  // ── Fetch recent sessions ───────────────────────────────────────
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetch('/api/sessions').then((r) => r.json()),
  })

  const recentSessions: SessionEntry[] = sessions?.slice?.(0, 10) ?? []
  const dailyStats: DailyStat[] = stats?.dailyStats ?? []
  const categories: CategoryStat[] = stats?.categories ?? []

  // ── Loading skeleton ────────────────────────────────────────────
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
        <BottomNavBar currentScreen={currentScreen} navigate={navigate} />
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

          {/* ── Weekly Activity Chart ─────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-md">
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
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-orange-500" />
                    Performance par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {categories.map((cat: CategoryStat, idx: number) => {
                    const progress = Math.min((cat.avgScore / 10) * 100, 100)
                    return (
                      <motion.div
                        key={cat.category}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05, duration: 0.3 }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">
                            {categoryLabels[cat.category] ?? cat.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {cat.drills} exercice{cat.drills > 1 ? 's' : ''}
                            </span>
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {cat.avgScore}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={progress} className="h-2" />
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
              <Card className="border-0 shadow-md">
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
                                    ? 'text-emerald-600'
                                    : session.totalScore >= 4
                                      ? 'text-amber-600'
                                      : 'text-red-500'
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
              className="py-16 text-center"
            >
              <div className="text-5xl mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-1">Aucune donnée</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez votre premier entraînement pour voir vos statistiques.
              </p>
              <Button
                onClick={() => navigate('train-hub')}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Commencer l&apos;entraînement
              </Button>
            </motion.div>
          )}

          <div className="h-2" />
        </div>
      </motion.div>

      <BottomNavBar currentScreen={currentScreen} navigate={navigate} />
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
    orange: 'bg-orange-50 border-orange-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    sky: 'bg-sky-50 border-sky-100',
    violet: 'bg-violet-50 border-violet-100',
  }

  return (
    <Card className={`border ${colorMap[color] ?? colorMap.orange}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Reusable Bottom Nav Bar ─────────────────────────────────────────
function BottomNavBar({
  currentScreen,
  navigate,
}: {
  currentScreen: string
  navigate: (screen: 'home' | 'train-hub' | 'stats' | 'profile') => void
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {[
          { icon: Home, label: 'Accueil', screen: 'home' as const },
          { icon: Dumbbell, label: 'Training', screen: 'train-hub' as const },
          { icon: BarChart3, label: 'Stats', screen: 'stats' as const },
          { icon: User, label: 'Profil', screen: 'profile' as const },
        ].map((tab) => (
          <button
            key={tab.screen}
            onClick={() => navigate(tab.screen)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              currentScreen === tab.screen
                ? 'text-orange-500'
                : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}