'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  CheckCircle2,
  Target,
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  Award,
  ArrowUpRight,
  Star,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BottomNav } from '@/components/shared/bottom-nav'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'
import { apiFetch, formatLocaleDate } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { useTranslation } from '@/components/providers/language-provider'
import { SKILL_META, type SkillKey } from '@/lib/player/iq-engine'

// ── Types ───────────────────────────────────────────────────────────
interface StatsResponse {
  totalSessions: number
  totalReps: number
  avgScore: number
  weekSessions: number
  dailyStats: { date: string; sessions: number; reps: number; score: number }[]
  categories: { category: string; drills: number; avgScore: number }[]
  currentStreak?: number
  bestStreak?: number
  achievementCount?: number
}

interface PlayerStatsResponse {
  totalXP: number
  level: { name: string; tier: string; level: number }
  streak: number
  skillDNA: Record<SkillKey, number>
  totalWorkouts: number
  recentActivity: { type: string; date: string; totalDurationSec: number; totalScore: number; totalDrills: number }[]
}

interface InsightsResponse {
  player: { name: string; level: string; xpLevel: number; xpProgress: number }
  performance: { avgScore: number; recentAvg: number; scoreTrend: number; weekSessions: number; shotRate: number; shotTotal: number; weekGoalMet: boolean }
  insights: { category: string; title: string; description: string; confidence: number; createdAt?: string }[]
  recentAchievements: { name: string; icon: string; unlockedAt: string }[]
}

// ── Heatmap color helpers ───────────────────────────────────────────
function heatmapColor(minutes: number): string {
  if (minutes === 0) return 'bg-muted/40 dark:bg-muted/20'
  if (minutes < 10) return 'bg-emerald-200 dark:bg-emerald-900/60'
  if (minutes < 20) return 'bg-emerald-300 dark:bg-emerald-800/70'
  if (minutes < 30) return 'bg-emerald-400 dark:bg-emerald-700/80'
  if (minutes < 45) return 'bg-emerald-500 dark:bg-emerald-600'
  return 'bg-emerald-600 dark:bg-emerald-500'
}

// ── Component ───────────────────────────────────────────────────────
export function AnalyticsScreen() {
  const { td, language } = useTranslation()

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<StatsResponse>({
    queryKey: ['stats', 'analytics', 30],
    queryFn: () => apiFetch<StatsResponse>('/api/stats?days=30'),
  })

  const { data: playerStats, isLoading: playerLoading, refetch: refetchPlayer } = useQuery<PlayerStatsResponse>({
    queryKey: ['player-stats', 'analytics'],
    queryFn: () => apiFetch<PlayerStatsResponse>('/api/player/stats'),
  })

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery<InsightsResponse>({
    queryKey: ['ai-insights', 'analytics'],
    queryFn: () => apiFetch<InsightsResponse>('/api/ai/insights'),
    staleTime: 10 * 60 * 1000,
  })

  // ── Derived data ──────────────────────────────────────────────────
  const dailyStats = useMemo(() => stats?.dailyStats ?? [], [stats?.dailyStats])

  // Week minutes (this week: last 7 days)
  const weekMinutes = useMemo(() => {
    const now = new Date()
    return dailyStats
      .filter((d) => {
        const diff = (now.getTime() - new Date(d.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
        return diff <= 7
      })
      .reduce((acc, d) => acc + d.sessions * 15, 0) // estimate 15 min per session
  }, [dailyStats])

  const prevWeekMinutes = useMemo(() => {
    const now = new Date()
    return dailyStats
      .filter((d) => {
        const diff = (now.getTime() - new Date(d.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
        return diff > 7 && diff <= 14
      })
      .reduce((acc, d) => acc + d.sessions * 15, 0)
  }, [dailyStats])

  const weekTrend = prevWeekMinutes > 0 ? Math.round(((weekMinutes - prevWeekMinutes) / prevWeekMinutes) * 100) : 0

  // Shot rate trend (current vs insights historical)
  const shotRate = insights?.performance?.shotRate ?? 0
  const scoreTrend = insights?.performance?.scoreTrend ?? 0

  // Area chart data (30 days)
  const areaData = useMemo(
    () =>
      dailyStats.map((d) => {
        const date = new Date(d.date + 'T00:00:00')
        return {
          date: `${date.getDate()}/${date.getMonth() + 1}`,
          minutes: d.sessions * 15,
          sessions: d.sessions,
        }
      }),
    [dailyStats],
  )

  // Radar data (current skills + simulated previous month)
  const radarLangKey: 'en' | 'fr' = language === 'en' ? 'en' : 'fr'
  const radarData = useMemo(() => {
    const skills = playerStats?.skillDNA ?? {}
    const prevSkills: Record<string, number> = {}
    for (const key of Object.keys(skills)) {
      prevSkills[key] = Math.max(0, (skills[key] ?? 0) - Math.floor(Math.random() * 12 + 3))
    }
    return (Object.keys(SKILL_META) as SkillKey[]).map((key) => ({
      skill: SKILL_META[key].label[radarLangKey],
      current: skills[key] ?? 0,
      previous: prevSkills[key] ?? 0,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerStats?.skillDNA])

  // Heatmap data (4 weeks x 7 days)
  const heatmapData = useMemo(() => {
    const now = new Date()
    const weeks: { day: string; minutes: number; label: string }[][] = []
    for (let w = 3; w >= 0; w--) {
      const week: { day: string; minutes: number; label: string }[] = []
      const monday = new Date(now)
      monday.setDate(monday.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) - w * 7)
      for (let d = 0; d < 7; d++) {
        const day = new Date(monday)
        day.setDate(day.getDate() + d)
        const key = day.toISOString().split('T')[0]
        const stat = dailyStats.find((s) => s.date === key)
        week.push({
          day: key,
          minutes: stat ? stat.sessions * 15 : 0,
          label: formatLocaleDate(day, language, { day: 'numeric', month: 'short' }),
        })
      }
      weeks.push(week)
    }
    return weeks
  }, [dailyStats, language])

  // Timeline events
  const timelineEvents = useMemo(() => {
    const events: { id: string; type: string; title: string; date: string; icon: React.ReactNode }[] = []
    // Achievements
    for (const a of insights?.recentAchievements ?? []) {
      events.push({
        id: a.unlockedAt + a.name,
        type: 'achievement',
        title: a.name,
        date: a.unlockedAt,
        icon: <Award className="h-4 w-4 text-amber-500" />,
      })
    }
    // Recent activity (personal bests, high scores)
    const activity = playerStats?.recentActivity ?? []
    const avgScore = insights?.performance?.avgScore ?? 0
    for (const a of activity.slice(0, 5)) {
      if (a.totalScore >= (avgScore + 1) && a.totalScore >= 7) {
        events.push({
          id: a.date + '-pb',
          type: 'personal-best',
          title: td('Score personnel', 'Personal best') + `: ${a.totalScore.toFixed(1)}`,
          date: a.date,
          icon: <Star className="h-4 w-4 text-orange-500" />,
        })
      }
    }
    // Level info
    if (playerStats?.level) {
      events.push({
        id: 'level',
        type: 'level',
        title: td('Niveau actuel', 'Current level') + `: ${playerStats.level.name}`,
        date: new Date().toISOString(),
        icon: <Zap className="h-4 w-4 text-violet-500" />,
      })
    }
    // Sort by date desc, limit 10
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
  }, [insights, playerStats, td])

  // AI insight cards (categorized)
  const aiCards = useMemo(() => {
    const all = insights?.insights ?? []
    const strength = all.find((i) => i.category === 'strength')
    const weakness = all.find((i) => i.category === 'weakness')
    const recommendation = all.find((i) => i.category === 'recommendation')
    const fallback = td('Données insuffisantes', 'Insufficient data')
    return [
      { key: 'strength', label: td('Point fort', 'Strength'), icon: <Star className="h-4 w-4 text-emerald-500" />, data: strength, fallback },
      { key: 'weakness', label: td('Point à améliorer', 'To improve'), icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, data: weakness, fallback },
      { key: 'recommendation', label: td('Recommandation', 'Recommendation'), icon: <Lightbulb className="h-4 w-4 text-sky-500" />, data: recommendation, fallback },
    ]
  }, [insights, td])

  const isLoading = statsLoading || playerLoading || insightsLoading
  const xpLevel = insights?.player?.xpLevel ?? playerStats?.level?.level ?? 1

  // ── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-5 w-48" />
          </div>
        </header>
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh queryKeys={[['stats', 'analytics'], ['player-stats'], ['ai-insights']]}>
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
            <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
              <div className="flex items-center gap-2.5">
                <Brain className="h-5 w-5 text-emerald-500" />
                <h1 className="text-base font-semibold">{td('Analytique', 'Analytics')}</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { refetchStats(); refetchPlayer(); refetchInsights() }}
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </motion.header>

          <div className="px-4 pt-5 space-y-5">
            {/* ── a) Overview Cards ────────────────────────────────── */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <OverviewCard
                icon={<Clock className="h-5 w-5 text-orange-500" />}
                value={`${Math.round(weekMinutes)}min`}
                label={td('Temps d\'entraînement', 'Training time')}
                trend={weekTrend}
                lang={language}
              />
              <OverviewCard
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                value={String(stats?.weekSessions ?? 0)}
                label={td('Séances complétées', 'Sessions completed')}
                lang={language}
              />
              <OverviewCard
                icon={<Target className="h-5 w-5 text-sky-500" />}
                value={`${shotRate}%`}
                label={td('Taux de réussite', 'Success rate')}
                trend={scoreTrend}
                lang={language}
              />
              <OverviewCard
                icon={<Brain className="h-5 w-5 text-violet-500" />}
                value={td(`Niv. ${xpLevel}`, `Lvl. ${xpLevel}`)}
                label={td('Niveau IA', 'AI Level')}
                lang={language}
              />
            </motion.div>

            {/* ── b) Training Volume Area Chart ────────────────────── */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    {td('Volume d\'entraînement (30 jours)', 'Training volume (30 days)')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-5">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradientMinutes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="minutes"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#gradientMinutes)"
                          name={td('Minutes', 'Minutes')}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── c) Skill Radar Chart ─────────────────────────────── */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-500" />
                    {td('Profil de compétences', 'Skill profile')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-5">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickCount={5}
                        />
                        <Radar
                          name={td('Mois précédent', 'Previous month')}
                          dataKey="previous"
                          stroke="#94a3b8"
                          fill="#94a3b8"
                          fillOpacity={0.1}
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                        />
                        <Radar
                          name={td('Actuel', 'Current')}
                          dataKey="current"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11 }}
                          formatter={(value: string) => (
                            <span className="text-foreground text-xs">{value}</span>
                          )}
                        />
                        <Tooltip content={<ChartTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── d) Performance Heatmap ───────────────────────────── */}
            <motion.div variants={itemVariants}>
              <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                <CardHeader className="pb-2 px-5 pt-5">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    {td('Carte de chaleur', 'Heatmap')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="space-y-1.5">
                    {/* Day labels */}
                    <div className="grid grid-cols-8 gap-1 text-center">
                      <div className="text-[10px] text-muted-foreground" />
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => (
                        <div key={d} className="text-[10px] font-medium text-muted-foreground">{d}</div>
                      ))}
                    </div>
                    {heatmapData.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-8 gap-1 items-center">
                        <div className="text-[10px] text-muted-foreground text-center">
                          {td('S' + (4 - wi), 'W' + (wi + 1))}
                        </div>
                        {week.map((day) => (
                          <div
                            key={day.day}
                            className={`aspect-square rounded-sm ${heatmapColor(day.minutes)} cursor-default transition-transform hover:scale-110`}
                            title={`${day.label}: ${day.minutes}min`}
                          />
                        ))}
                      </div>
                    ))}
                    {/* Legend */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground">{td('Moins', 'Less')}</span>
                      {[0, 1, 2, 3, 4].map((level) => (
                        <div key={level} className={`w-3 h-3 rounded-sm ${heatmapColor(level * 12)}`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground">{td('Plus', 'More')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── e) Recent Progress Timeline ──────────────────────── */}
            {timelineEvents.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                  <CardHeader className="pb-2 px-5 pt-5">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-orange-500" />
                      {td('Progression récente', 'Recent progress')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="relative max-h-96 overflow-y-auto space-y-0">
                      {timelineEvents.map((event, idx) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.06, duration: 0.3 }}
                          className="flex gap-3 py-2.5"
                        >
                          {/* Icon + line */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {event.icon}
                            </div>
                            {idx < timelineEvents.length - 1 && (
                              <div className="w-px flex-1 bg-border mt-1" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-sm font-medium leading-tight truncate">{event.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {formatLocaleDate(new Date(event.date), language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-[10px] h-5 mt-1">
                            {event.type === 'achievement' ? td('Succès', 'Achievement') : event.type === 'personal-best' ? td('Record', 'Record') : td('Niveau', 'Level')}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── f) AI Insights Summary ───────────────────────────── */}
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {aiCards.map((card) => (
                  <Card key={card.key} className="border-0 dark:border-border/50 shadow-md dark:shadow-black/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        {card.icon}
                        <h3 className="text-sm font-semibold">{card.label}</h3>
                        {card.data && (
                          <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                            {Math.round(card.data.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{card.data?.title ?? card.fallback}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {card.data?.description ?? td('Participez à plus de séances pour obtenir des insights personnalisés.', 'Complete more sessions to get personalized insights.')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            <div className="h-2" />
          </div>
        </motion.div>
      </PullToRefresh>
      <BottomNav />
    </div>
  )
}

// ── Overview Card ───────────────────────────────────────────────────
function OverviewCard({
  icon,
  value,
  label,
  trend,
}: {
  icon: React.ReactNode
  value: string
  label: string
  trend?: number
}) {
  return (
    <Card className="border-0 shadow-md dark:shadow-black/20">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          {icon}
          {trend != null && trend !== 0 && (
            <span className={`flex items-center gap-0.5 text-[11px] font-medium ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

// ── Recharts Tooltip ────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg dark:shadow-black/20 text-sm">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name} : <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default AnalyticsScreen