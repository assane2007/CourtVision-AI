'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Flame,
  Target,
  TrendingUp,
  Calendar,
  Sparkles,
  Camera,
  Clock,
  ChevronRight,
  User,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores/app'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 420, damping: 28 },
  },
}

// ---------------------------------------------------------------------------
// Types (derived from API / Prisma responses)
// ---------------------------------------------------------------------------
interface StatsResponse {
  totalSessions: number
  totalReps: number
  avgScore: number
  weekSessions: number
}

interface RecommendationDrill {
  id: string
  name: string
  nameFr: string
  category: string
  difficulty: string
  icon: string
  reasonFr: string
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
// Category label map
// ---------------------------------------------------------------------------
const categoryLabels: Record<string, string> = {
  pocket_ball: 'Pocket Ball',
  shifty: 'Shifty',
  ball_handling: 'Dribble',
  speed_change: 'Vitesse',
  defense: 'Défense',
  shooting: 'Tir',
  footwork: 'Pieds',
  finishing: 'Finition',
  conditioning: 'Condition',
}

// ---------------------------------------------------------------------------
// Quick‑stat card
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  index,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  suffix?: string
  color: string
  index: number
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-card/50 p-4',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {value}
            {suffix && (
              <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                {suffix}
              </span>
            )}
          </p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            color,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {/* subtle decorative accent */}
      <div
        className={cn(
          'pointer-events-none absolute -right-4 -bottom-4 h-20 w-20 rounded-full opacity-[0.06]',
          color.replace('bg-', 'bg-'),
        )}
      />
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Recommendation card (horizontal scroll item)
// ---------------------------------------------------------------------------
function RecommendationCard({
  drill,
  onSelect,
}: {
  drill: RecommendationDrill
  onSelect: (drillId: string) => void
}) {
  return (
    <motion.div variants={itemVariants} className="min-w-[220px] max-w-[260px] flex-shrink-0">
      <button
        type="button"
        onClick={() => onSelect(drill.id)}
        className="group w-full cursor-pointer rounded-2xl border bg-gradient-to-br from-card to-card/50 p-4 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Icon + name */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl">{drill.icon}</span>
          <h4 className="line-clamp-1 text-sm font-semibold leading-tight">
            {drill.nameFr}
          </h4>
        </div>

        {/* Category badge */}
        <Badge
          variant="secondary"
          className="mb-2 text-[10px] uppercase tracking-wider"
        >
          {categoryLabels[drill.category] ?? drill.category}
        </Badge>

        {/* Reason */}
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {drill.reasonFr}
        </p>

        {/* Chevron hint */}
        <div className="mt-2 flex items-center justify-end">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    </motion.div>
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
          {session.totalReps} rép.
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
// Skeleton placeholders
// ---------------------------------------------------------------------------
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-gradient-to-br from-card to-card/50 p-4"
        >
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[220px] flex-shrink-0 rounded-2xl border bg-gradient-to-br from-card to-card/50 p-4"
        >
          <Skeleton className="mb-2 h-6 w-6 rounded-full" />
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
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
// Bottom Navigation
// ---------------------------------------------------------------------------
function BottomNav() {
  const { navigate, currentScreen } = useAppStore()

  const tabs = [
    {
      icon: '🏠',
      label: 'Accueil',
      screen: 'home' as const,
      active: currentScreen === 'home',
    },
    {
      icon: '🏋️',
      label: 'Entraînement',
      screen: 'train-hub' as const,
      active: false,
    },
    {
      icon: '📊',
      label: 'Stats',
      screen: 'stats' as const,
      active: false,
    },
    {
      icon: '👤',
      label: 'Profil',
      screen: 'profile' as const,
      active: false,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => (
          <button
            key={tab.screen}
            type="button"
            onClick={() => navigate(tab.screen)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab.active
                ? 'text-orange-600'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="text-xl" role="img" aria-label={tab.label}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
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
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
    staleTime: 1000 * 60 * 2,
  })

  const { data: recommendations, isLoading: recsLoading } = useQuery<
    RecommendationDrill[]
  >({
    queryKey: ['recommendations'],
    queryFn: () => fetch('/api/recommendations').then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
  })

  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => fetch('/api/sessions').then((r) => r.json()),
    staleTime: 1000 * 60 * 2,
  })

  const recentSessions = sessions?.slice(0, 5) ?? []

  // ---- Handlers ----
  const handleSelectDrill = (drillId: string) => {
    selectDrill(drillId)
    navigate('drill-detail')
  }

  return (
    <div className="min-h-screen bg-white">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-lg px-4 pb-24 pt-6"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                          */}
        {/* ---------------------------------------------------------------- */}
        <motion.header
          variants={itemVariants}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bonjour, {userName} 👋
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Prêt pour l&apos;entraînement ?
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('profile')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-sm font-bold text-white shadow-md transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Voir le profil"
          >
            {userInitial}
          </button>
        </motion.header>

        {/* ---------------------------------------------------------------- */}
        {/* Quick Stats                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Statistiques rapides" className="mb-8">
          {statsLoading ? (
            <StatsSkeleton />
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
              <StatCard
                icon={Flame}
                label="Séances"
                value={stats?.totalSessions ?? 0}
                color="bg-orange-100 text-orange-600"
                index={0}
              />
              <StatCard
                icon={Target}
                label="Répétitions"
                value={stats?.totalReps ?? 0}
                color="bg-sky-100 text-sky-600"
                index={1}
              />
              <StatCard
                icon={TrendingUp}
                label="Score Moyen"
                value={stats?.avgScore ?? 0}
                suffix="%"
                color="bg-emerald-100 text-emerald-600"
                index={2}
              />
              <StatCard
                icon={Calendar}
                label="Cette Semaine"
                value={stats?.weekSessions ?? 0}
                color="bg-violet-100 text-violet-600"
                index={3}
              />
            </motion.div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* AI Recommendations                                              */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Recommandations IA" className="mb-8">
          <motion.div variants={itemVariants} className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold tracking-tight">
              Recommandations IA
            </h2>
          </motion.div>

          {recsLoading ? (
            <RecommendationsSkeleton />
          ) : recommendations && recommendations.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none"
            >
              {recommendations.slice(0, 4).map((drill) => (
                <RecommendationCard
                  key={drill.id}
                  drill={drill}
                  onSelect={handleSelectDrill}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center"
            >
              <Sparkles className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Commencez votre premier entraînement !
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate('train-hub')}
              >
                <Camera className="mr-1.5 h-3.5 w-3.5" />
                Démarrer
              </Button>
            </motion.div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Recent Activity                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Activité récente" className="mb-8">
          <motion.div variants={itemVariants} className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">
              Activité Récente
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
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center"
            >
              <Clock className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aucune activité récente
              </p>
            </motion.div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* CTA: Start Training                                             */}
        {/* ---------------------------------------------------------------- */}
        <motion.div variants={itemVariants} className="pb-4">
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-base font-semibold shadow-lg shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:shadow-orange-500/30"
            onClick={() => navigate('train-hub')}
          >
            <Camera className="mr-2 h-5 w-5" />
            Démarrer l&apos;Entraînement
          </Button>
        </motion.div>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}