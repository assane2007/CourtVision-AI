'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Camera,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores/app'
import { cn, apiFetch } from '@/lib/utils'
import { BottomNav } from '@/components/shared/bottom-nav'
import { PullToRefresh } from '@/components/shared/pull-to-refresh'

// New home components
import { StreakCalendar } from '@/components/home/streak-calendar'
import { WeeklyChallenge } from '@/components/home/weekly-challenge'
import { ProgressRings } from '@/components/home/progress-rings'
import { QuickStartCarousel } from '@/components/home/quick-start-carousel'
import { MotivationalQuote } from '@/components/home/motivational-quote'
import { EmptyRecommendations, EmptyActivity } from '@/components/home/empty-states'

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 28 },
  },
}

// ---------------------------------------------------------------------------
// Types (derived from API / Prisma responses)
// ---------------------------------------------------------------------------
interface DailyStat {
  date: string
  sessions: number
  reps: number
  score: number
}

interface StatsResponse {
  totalSessions: number
  totalReps: number
  avgScore: number
  weekSessions: number
  dailyStats: DailyStat[]
  currentStreak: number
  bestStreak: number
  achievementCount: number
}

interface RecommendationDrill {
  id: string
  name: string
  nameFr: string
  category: string
  difficulty: string
  icon: string
  reasonFr: string
  bestScore?: number
}

interface SessionDrill {
  drill: { id: string; nameFr: string; icon: string }
  score: number
  reps: number
}

interface Session {
  id: string
  startedAt: string
  totalScore: number
  totalReps: number
  totalDrills: number
  drills: SessionDrill[]
}

// ---------------------------------------------------------------------------
// Skeleton placeholders
// ---------------------------------------------------------------------------
function RingsSkeleton() {
  return (
    <div className="flex items-center justify-around rounded-2xl border bg-card p-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Skeleton className="h-[88px] w-[88px] rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="rounded-2xl border bg-card">
      <div className="p-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="px-5 pb-4">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full max-w-[32px] rounded-[4px]" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChallengeSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-48 mb-3" />
      <Skeleton className="h-2.5 w-full rounded-full" />
    </div>
  )
}

function CarouselSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[180px] w-[240px] flex-shrink-0 rounded-2xl bg-muted/50" />
        ))}
      </div>
    </div>
  )
}

function SessionsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border px-4 py-3"
        >
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Session list item
// ---------------------------------------------------------------------------
function SessionItem({ session }: { session: Session }) {
  const date = new Date(session.startedAt)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const borderColor =
    session.totalScore > 80
      ? 'border-l-emerald-500'
      : session.totalScore > 50
        ? 'border-l-amber-500'
        : 'border-l-red-500'

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border border-l-4 bg-gradient-to-r from-card/60 to-transparent px-4 py-3',
        borderColor,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium">{formattedDate}</p>
        <p className="text-xs text-muted-foreground">
          {session.totalDrills} exercice{session.totalDrills > 1 ? 's' : ''} &middot;{' '}
          {session.totalReps} r&eacute;p.
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
        <span
          className={cn(
            session.totalScore > 80
              ? 'text-emerald-600'
              : session.totalScore > 50
                ? 'text-amber-600'
                : 'text-red-600',
          )}
        >
          {Math.round(session.totalScore)}
        </span>
        <span className="text-xs font-normal text-muted-foreground">pts</span>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const { data: session } = useSession()
  const { navigate, selectDrill } = useAppStore()

  const userName = session?.user?.name ?? 'Joueur'
  const userInitial = userName.charAt(0).toUpperCase()

  // ---- Data fetching ----
  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['stats'],
    queryFn: () => apiFetch('/api/stats'),
    staleTime: 1000 * 60 * 2,
  })

  // 28-day stats for streak calendar
  const { data: calendarStats, isLoading: calendarLoading } = useQuery<{
    dailyStats: DailyStat[]
  }>({
    queryKey: ['stats', 'calendar'],
    queryFn: () => apiFetch('/api/stats?days=28'),
    staleTime: 1000 * 60 * 5,
  })

  const { data: recommendations, isLoading: recsLoading } = useQuery<
    RecommendationDrill[]
  >({
    queryKey: ['recommendations'],
    queryFn: () => apiFetch('/api/recommendations'),
    staleTime: 1000 * 60 * 5,
  })

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<{
    sessions: Session[]
  }>({
    queryKey: ['sessions'],
    queryFn: () => apiFetch<{ sessions: Session[] }>('/api/sessions'),
    staleTime: 1000 * 60 * 2,
  })

  const sessions = sessionsData?.sessions

  // Filter sessions to only this week (Monday–Sunday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - mondayOffset)
  startOfWeek.setHours(0, 0, 0, 0)

  const weekSessions = sessions?.filter((s) => {
    const d = new Date(s.startedAt)
    return d >= startOfWeek
  }) ?? []

  // Count total drills this week (for challenges)
  const totalDrillsThisWeek = weekSessions.reduce((acc, s) => acc + s.totalDrills, 0)

  // Count high-score drills (>= 80%)
  const highScoreDrillsCount = weekSessions
    ? weekSessions.reduce(
        (acc, s) =>
          acc +
          s.drills.filter((d: SessionDrill) => d.score >= 80).length,
        0,
      )
    : 0

  // Count perfect-score drills (>= 90%)
  const perfectScoreDrillsCount = weekSessions
    ? weekSessions.reduce(
        (acc, s) =>
          acc +
          s.drills.filter((d: SessionDrill) => d.score >= 90).length,
        0,
      )
    : 0

  // Compute best scores per drill for the carousel
  const drillBestScores = sessions
    ? sessions.reduce<Record<string, number>>((acc, s) => {
        for (const d of s.drills) {
          const prev = acc[d.drill.id]
          if (prev == null || d.score > prev) {
            acc[d.drill.id] = d.score
          }
        }
        return acc
      }, {})
    : {}

  const recentSessions = sessions?.slice(0, 5) ?? []

  // ---- Derived data ----
  const weeklyGoal = 5 // Default weekly goal
  const weeklyGoalProgress = stats
    ? Math.min((stats.weekSessions / weeklyGoal) * 100, 100)
    : 0

  const enrichedRecommendations = (recommendations ?? []).map((r) => ({
    ...r,
    bestScore: drillBestScores[r.id] ?? undefined,
  }))

  // ---- Handlers ----
  const handleSelectDrill = (drillId: string) => {
    selectDrill(drillId)
    navigate('drill-detail')
  }

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh
        queryKeys={[['stats'], ['sessions'], ['recommendations'], ['stats', 'calendar']]}
        className="mx-auto max-w-lg px-4 pb-24 pt-6"
      >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                          */}
        {/* ---------------------------------------------------------------- */}
        <motion.header
          variants={itemVariants}
          className="mb-4 flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold tracking-tight">{userName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pr&ecirc;t pour l&apos;entra&icirc;nement ?
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => navigate('profile')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-xs font-bold text-white shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Voir le profil"
            >
              {userInitial}
            </button>
          </div>
        </motion.header>

        {/* ---------------------------------------------------------------- */}
        {/* Basketball Court Mini Banner                                     */}
        {/* ---------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-5 text-white"
        >
          {/* Court lines SVG background */}
          <svg
            className="absolute inset-0 h-full w-full opacity-10"
            viewBox="0 0 400 200"
            preserveAspectRatio="xMidYMid slice"
          >
            <rect
              x="5"
              y="5"
              width="390"
              height="190"
              rx="12"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
            <circle
              cx="200"
              cy="100"
              r="40"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            />
            <line
              x1="200"
              y1="5"
              x2="200"
              y2="60"
              stroke="white"
              strokeWidth="1.5"
            />
            <rect
              x="140"
              y="5"
              width="120"
              height="50"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            />
            <circle
              cx="200"
              cy="55"
              r="8"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            />
            <path
              d="M 60 5 Q 60 100 140 100"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            />
            <path
              d="M 340 5 Q 340 100 260 100"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>

          <div className="relative z-10">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-100">
                  Aujourd&apos;hui
                </p>
                <p className="text-xl font-bold">
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <span className="text-3xl">🏀</span>
              </div>
            </div>
            <p className="text-sm text-orange-100">
              {stats?.weekSessions && stats.weekSessions > 0
                ? `${stats.weekSessions} séance${stats.weekSessions > 1 ? 's' : ''} cette semaine — continuez !`
                : 'Aucune séance cette semaine — commencez maintenant !'}
            </p>
          </div>
        </motion.div>

        {/* ---------------------------------------------------------------- */}
        {/* Progress Rings                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Statistiques" className="mb-6">
          {statsLoading ? (
            <RingsSkeleton />
          ) : (
            <ProgressRings
              weeklyGoalProgress={weeklyGoalProgress}
              avgScore={stats?.avgScore ?? 0}
              currentStreak={stats?.currentStreak ?? 0}
              weekGoalLabel={`${stats?.weekSessions ?? 0}/${weeklyGoal} séances`}
            />
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Streak Calendar                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Calendrier" className="mb-5">
          {calendarLoading ? (
            <CalendarSkeleton />
          ) : (
            <StreakCalendar dailyStats={calendarStats?.dailyStats ?? []} />
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Weekly Challenge                                                */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Défi de la semaine" className="mb-5">
          {statsLoading ? (
            <ChallengeSkeleton />
          ) : (
            <WeeklyChallenge
              weekSessions={stats?.weekSessions ?? 0}
              currentStreak={stats?.currentStreak ?? 0}
              totalDrillsThisWeek={totalDrillsThisWeek}
              highScoreDrillsCount={highScoreDrillsCount}
              perfectScoreDrillsCount={perfectScoreDrillsCount}
            />
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Motivational Quote                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-6">
          <MotivationalQuote />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* AI Recommendations (Quick Start Carousel)                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Recommandations IA" className="mb-8">
          {recsLoading ? (
            <CarouselSkeleton />
          ) : enrichedRecommendations.length > 0 ? (
            <QuickStartCarousel
              drills={enrichedRecommendations.slice(0, 6)}
              onSelect={handleSelectDrill}
            />
          ) : (
            <EmptyRecommendations onStart={() => navigate('train-hub')} />
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Recent Activity                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Activité récente" className="mb-8">
          <motion.div
            variants={itemVariants}
            className="mb-3 flex items-center gap-2"
          >
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">
              Activit&eacute; R&eacute;cente
            </h2>
          </motion.div>

          {sessionsLoading ? (
            <SessionsSkeleton />
          ) : recentSessions.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {recentSessions.map((s) => (
                <SessionItem key={s.id} session={s} />
              ))}
            </motion.div>
          ) : (
            <EmptyActivity />
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* CTA: Start Training                                             */}
        {/* ---------------------------------------------------------------- */}
        <motion.div variants={itemVariants} className="pb-4">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              onClick={() => navigate('train-hub')}
              className={cn(
                'w-full py-6 text-base font-semibold rounded-2xl shadow-lg shadow-orange-500/25 transition-all',
                'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 hover:shadow-xl hover:shadow-orange-500/30',
                !stats?.weekSessions && 'animate-pulse',
              )}
            >
              <Camera className="h-5 w-5" />
              D&eacute;marrer l&apos;Entra&icirc;nement
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
      </PullToRefresh>

      <BottomNav />
    </div>
  )
}