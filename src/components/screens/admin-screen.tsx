'use client';
import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  Activity,
  DollarSign,
  Database,
  Layers,
  AlertTriangle,
  ShieldX,
  Video,
  Dumbbell,
  Brain,
  Crown,
  ChevronLeft,
  Search,
  RefreshCw,

  Eye,
  Shield,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { useAppStore } from '@/stores/app';
import { apiFetch, formatLocaleDate } from '@/lib/utils';
import { useTranslation } from '@/components/providers/language-provider';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminStats {
  overview: {
    totalUsers: number
    activeToday: number
    mrr: number
    aiCallsToday: number
    totalVideos: number
    totalWorkouts: number
    totalAIAnalyses: number
    activeSubscriptions: number
  }
  signups30d: { date: string; count: number }[]
  videoUploads30d: { date: string; count: number }[]
  aiUsageByType: { type: string; calls: number }[]
  subscriptionDist: { plan: string; count: number }[]
  recentSignups: { id: string; email: string; name: string; date: string; plan: string }[]
  systemHealth: {
    dbConnections: number
    queueDepth: number
    errorRate: number
    cacheHitRate: number
    rateLimitTotal: number
    rateLimitBlocked: number
  }
}

interface AuditLogEntry {
  id: string
  playerId: string
  action: string
  resource: string
  resourceId: string | null
  ipAddress: string | null
  timestamp: string
  player?: { id: string; email: string; name: string } | null
}

interface PlayerRow {
  id: string
  email: string
  name: string
  role: string
  subscriptionStatus: string
  subscriptionExpiresAt: string | null
  createdAt: string
  lastActivityDate: string | null
  xp: number
  xpLevel: number
  workoutCount: number
}

interface FeatureFlagEntry {
  key: string
  label: string
  defaultValue: boolean
  currentValue: boolean
  isOverridden: boolean
}

// ── Chart colors ───────────────────────────────────────────────────────────────

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
  'hsl(160 60% 45%)',
  'hsl(30 80% 55%)',
]
const BAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(160 60% 45%)',
  'hsl(30 80% 55%)',
]
const AI_PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(160 60% 45%)',
  'hsl(280 65% 55%)',
  'hsl(30 80% 55%)',
  'hsl(220 70% 50%)',
]

// ── Animation variants ─────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}

// ── Stat Card Skeleton ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminScreen() {
  const { td } = useTranslation()
  const { goBack } = useAppStore()
  const queryClient = useQueryClient()
  const [unauthorized, setUnauthorized] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Queries ───────────────────────────────────────────────────────────────

  const {
    data: stats,
    isLoading: statsLoading,
    isError,
  } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch<AdminStats>('/api/admin/stats'),
    retry: false,
    refetchInterval: 30000,
    meta: {
      onError: (err: Error) => {
        if (
          err.message.includes('403') ||
          err.message.includes('admin') ||
          err.message.includes('non autorisé')
        ) {
          setUnauthorized(true)
        }
      },
    },
  })

  const { data: auditData, isLoading: auditLoading } = useQuery<{
    data: AuditLogEntry[]
    pagination: { hasMore: boolean; nextCursor: string | null }
  }>({
    queryKey: ['admin-audit'],
    queryFn: () => apiFetch('/api/admin/audit?limit=20'),
    retry: false,
    refetchInterval: 15000,
    meta: { onError: () => {} },
  })

  const [userSearch, setUserSearch] = useState('')
  const { data: usersData, isLoading: usersLoading } = useQuery<{
    data: PlayerRow[]
    pagination: { hasMore: boolean; nextCursor: string | null }
  }>({
    queryKey: ['admin-users', userSearch],
    queryFn: () =>
      apiFetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=20`),
    retry: false,
    enabled: activeTab === 'users',
    meta: { onError: () => {} },
  })

  const { data: flagsData, isLoading: flagsLoading } = useQuery<{
    flags: FeatureFlagEntry[]
  }>({
    queryKey: ['admin-feature-flags'],
    queryFn: () => apiFetch('/api/admin/feature-flags'),
    retry: false,
    enabled: activeTab === 'flags',
    meta: { onError: () => {} },
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const toggleSubscription = useMutation({
    mutationFn: (playerId: string) =>
      apiFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_subscription', playerId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      if (selectedPlayer) {
        setSelectedPlayer((prev) =>
          prev
            ? {
                ...prev,
                subscriptionStatus:
                  prev.subscriptionStatus === 'free' ? 'pro' : 'free',
              }
            : null,
        )
      }
    },
  })

  const toggleRole = useMutation({
    mutationFn: (playerId: string) =>
      apiFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_role', playerId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (selectedPlayer) {
        setSelectedPlayer((prev) =>
          prev
            ? { ...prev, role: prev.role === 'admin' ? 'user' : 'admin' }
            : null,
        )
      }
    },
  })

  const toggleFlag = useMutation({
    mutationFn: ({ flag, enabled }: { flag: string; enabled: boolean }) =>
      apiFetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag, enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] })
    },
  })

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    queryClient.invalidateQueries({ queryKey: ['admin-audit'] })
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] })
  }, [queryClient])

  // ── Unauthorized state ─────────────────────────────────────────────────────

  if (unauthorized || (isError && !stats)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <ShieldX className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">{td('admin.unauthorized')}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          {td('admin.unauthorizedDesc')}
        </p>
      </div>
    )
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value)
  }

  function formatDate(iso: string): string {
    return formatLocaleDate(new Date(iso))
  }

  function formatDateTime(iso: string): string {
    const d = new Date(iso)
    return formatLocaleDate(d) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  function getAITypeLabel(type: string): string {
    const labels: Record<string, string> = {
      form_analysis: td('Form Analysis', 'Form Analysis'),
      predictions: td('Predictions', 'Predictions'),
      insights: td('Insights', 'Insights'),
      coach: td('AI Coach', 'AI Coach'),
      scouting: td('Scouting', 'Scouting'),
      reaction: td('Reaction', 'Reaction'),
      workout_gen: td('Workout Gen', 'Workout Generation'),
    }
    return labels[type] || type
  }

  // ── Overview stat cards ────────────────────────────────────────────────────

  const statCards = [
    {
      label: td('admin.totalUsers'),
      value: stats ? formatNumber(stats.overview.totalUsers) : '—',
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: td('Total Videos', 'Total Vidéos'),
      value: stats ? formatNumber(stats.overview.totalVideos) : '—',
      icon: Video,
      color: 'text-purple-500',
    },
    {
      label: td('Total Workouts', 'Total Séances'),
      value: stats ? formatNumber(stats.overview.totalWorkouts) : '—',
      icon: Dumbbell,
      color: 'text-orange-500',
    },
    {
      label: td('AI Analyses', 'Analyses IA'),
      value: stats ? formatNumber(stats.overview.totalAIAnalyses) : '—',
      icon: Brain,
      color: 'text-emerald-500',
    },
    {
      label: td('Active Subscriptions', 'Abonnements Actifs'),
      value: stats ? formatNumber(stats.overview.activeSubscriptions) : '—',
      icon: Crown,
      color: 'text-amber-500',
    },
    {
      label: td('admin.mrr'),
      value: stats ? formatCurrency(stats.overview.mrr) : '—',
      icon: DollarSign,
      color: 'text-green-500',
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={goBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">{td('admin.title')}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshAll}
          title={td('Refresh', 'Actualiser')}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* ── Overview Stat Cards ─────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {statsLoading
            ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((card) => (
                <motion.div key={card.label} variants={fadeIn}>
                  <Card className="hover:shadow-md dark:hover:shadow-black/20 transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                        <span className="text-xs font-medium truncate">{card.label}</span>
                      </div>
                      <p className="text-xl lg:text-2xl font-bold">{card.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </motion.div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              {td('admin.overview')}
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">
              {td('Activity', 'Activité')}
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              {td('admin.users')}
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm">
              {td('admin.system')}
            </TabsTrigger>
            <TabsTrigger value="flags" className="text-xs sm:text-sm">
              {td('Features', 'Fonctionnalités')}
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════════════════════════════
              OVERVIEW TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* User registrations line chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {td('admin.signups30d')}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {td('New user registrations per day', 'Nouvelles inscriptions par jour')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={stats?.signups30d}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v: string) => v.slice(5)}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          labelFormatter={(v: string) => formatDate(v)}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Video uploads bar chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {td('Video Uploads (30d)', 'Uploads Vidéo (30j)')}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {td('Video uploads per day', 'Uploads vidéo par jour')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats?.videoUploads30d}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v: string) => v.slice(5)}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          labelFormatter={(v: string) => formatDate(v)}
                        />
                        <Bar dataKey="count" fill="hsl(280 65% 55%)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* AI usage pie chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {td('AI Usage by Type', 'Utilisation IA par Type')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={stats?.aiUsageByType}
                          dataKey="calls"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={40}
                          paddingAngle={2}
                          label={({ type, percent }: { type: string; percent: number }) =>
                            `${getAITypeLabel(type)} ${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={true}
                        >
                          {stats?.aiUsageByType.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={AI_PIE_COLORS[idx % AI_PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(value: number) => formatNumber(value)}
                          labelFormatter={(v: string) => getAITypeLabel(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Subscription distribution pie chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {td('admin.subscriptionDist')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-[220px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={stats?.subscriptionDist}
                          dataKey="count"
                          nameKey="plan"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={40}
                          paddingAngle={2}
                          label={({ plan, percent }: { plan: string; percent: number }) =>
                            `${plan} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {stats?.subscriptionDist.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend
                          formatter={(value: string) =>
                            value === 'pro' ? td('admin.pro') : td('admin.free')
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent signups mini table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {td('admin.recentSignups')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {statsLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{td('Name', 'Nom')}</TableHead>
                          <TableHead className="text-xs">{td('admin.email')}</TableHead>
                          <TableHead className="text-xs">{td('admin.date')}</TableHead>
                          <TableHead className="text-xs">{td('admin.plan')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats?.recentSignups.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs font-medium">{s.name}</TableCell>
                            <TableCell className="text-xs font-mono">{s.email}</TableCell>
                            <TableCell className="text-xs">{formatDate(s.date)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  s.plan === 'pro' || s.plan === 'elite' ?'default' :'secondary'
                                }
                              >
                                {s.plan === 'pro' ? td('admin.pro')
                                  : s.plan === 'elite' ?'Elite' : td('admin.free')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              ACTIVITY TAB (Audit Log)
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {td('Recent Activity', 'Activité Récente')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {td('Last 20 events from the audit log', '20 derniers événements du journal d\'audit')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {auditLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{td('Timestamp', 'Horodatage')}</TableHead>
                          <TableHead className="text-xs">{td('User', 'Utilisateur')}</TableHead>
                          <TableHead className="text-xs">{td('Action', 'Action')}</TableHead>
                          <TableHead className="text-xs">{td('Resource', 'Ressource')}</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">{td('IP', 'IP')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditData?.data.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {formatDateTime(log.timestamp)}
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[150px] truncate">
                              {log.player?.email || log.playerId.slice(0, 8) + '…'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-mono">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{log.resource}</TableCell>
                            <TableCell className="text-xs font-mono hidden md:table-cell">
                              {log.ipAddress || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!auditData?.data || auditData.data.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                              {td('No activity logged', 'Aucune activité enregistrée')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              USERS TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="users" className="space-y-4 mt-4">
            {/* Search bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder={td('Search by name or email...', 'Rechercher par nom ou email...')}
                  className="pl-9"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{td('Name', 'Nom')}</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">{td('admin.email')}</TableHead>
                          <TableHead className="text-xs">{td('Plan', 'Plan')}</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">{td('Level', 'Niveau')}</TableHead>
                          <TableHead className="text-xs text-right">{td('Actions', 'Actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData?.data.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="text-xs font-medium">{u.name}</TableCell>
                            <TableCell className="text-xs font-mono hidden sm:table-cell max-w-[180px] truncate">
                              {u.email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  u.subscriptionStatus !== 'free' ? 'default' : 'secondary'
                                }
                              >
                                {u.subscriptionStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs hidden md:table-cell">
                              Lv. {u.xpLevel}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedPlayer(u)}
                                  title={td('View details', 'Voir détails')}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleSubscription.mutate(u.id)}
                                  disabled={toggleSubscription.isPending}
                                  title={td('Toggle subscription', 'Basculer abonnement')}
                                >
                                  <Crown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!usersData?.data || usersData.data.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                              {td('No users found', 'Aucun utilisateur trouvé')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* User Detail Dialog */}
            <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">
                    {td('User Details', 'Détails Utilisateur')}
                  </DialogTitle>
                </DialogHeader>
                {selectedPlayer && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">{td('Name', 'Nom')}</p>
                        <p className="font-medium">{selectedPlayer.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{td('admin.email')}</p>
                        <p className="font-mono text-xs break-all">{selectedPlayer.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{td('Plan', 'Plan')}</p>
                        <Badge
                          variant={
                            selectedPlayer.subscriptionStatus !== 'free' ?'default' :'secondary'
                          }
                        >
                          {selectedPlayer.subscriptionStatus}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{td('Role', 'Rôle')}</p>
                        <Badge variant={selectedPlayer.role === 'admin' ? 'default' : 'outline'}>
                          {selectedPlayer.role}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{td('Level', 'Niveau')}</p>
                        <p>Lv. {selectedPlayer.xpLevel} ({selectedPlayer.xp} XP)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          {td('Workouts', 'Séances')}
                        </p>
                        <p>{selectedPlayer.workoutCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          {td('Joined', 'Inscrit le')}
                        </p>
                        <p>{formatDate(selectedPlayer.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          {td('Last Active', 'Dernière Activité')}
                        </p>
                        <p>
                          {selectedPlayer.lastActivityDate
                            ? formatDate(selectedPlayer.lastActivityDate)
                            : '—'}
                        </p>
                      </div>
                      {selectedPlayer.subscriptionExpiresAt && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs">
                            {td('Subscription Expires', 'Abonnement Expire Le')}
                          </p>
                          <p>{formatDate(selectedPlayer.subscriptionExpiresAt)}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleSubscription.mutate(selectedPlayer.id)}
                        disabled={toggleSubscription.isPending}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        {selectedPlayer.subscriptionStatus === 'free' ? td('Grant Pro', 'Accorder Pro')
                          : td('Revoke Pro', 'Révoquer Pro')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleRole.mutate(selectedPlayer.id)}
                        disabled={toggleRole.isPending}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {selectedPlayer.role === 'admin' ? td('Remove Admin', 'Retirer Admin')
                          : td('Make Admin', 'Rendre Admin')}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              SYSTEM TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="system" className="space-y-4 mt-4">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {[
                {
                  label: td('admin.dbConnections'),
                  value: stats?.systemHealth.dbConnections,
                  icon: Database,
                  unit: '',
                },
                {
                  label: td('admin.queueDepth'),
                  value: stats?.systemHealth.queueDepth,
                  icon: Layers,
                  unit: '',
                },
                {
                  label: td('admin.errorRate'),
                  value: stats?.systemHealth.errorRate,
                  icon: AlertTriangle,
                  unit: '%',
                  decimals: 2,
                },
                {
                  label: td('Cache Hit Rate', 'Taux de Cache'),
                  value: stats?.systemHealth.cacheHitRate,
                  icon: Zap,
                  unit: '%',
                  decimals: 1,
                },
                {
                  label: td('Rate Limit (24h)', 'Limite de Débit (24h)'),
                  value: stats?.systemHealth.rateLimitTotal,
                  icon: Activity,
                  unit: '',
                },
                {
                  label: td('Rate Blocked (24h)', 'Bloqués (24h)'),
                  value: stats?.systemHealth.rateLimitBlocked,
                  icon: ShieldX,
                  unit: '',
                },
              ].map((metric) => (
                <motion.div key={metric.label} variants={fadeIn}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <metric.icon className="h-4 w-4" />
                        <span className="text-xs font-medium truncate">{metric.label}</span>
                      </div>
                      {statsLoading ? (
                        <Skeleton className="h-8 w-16 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold">
                          {metric.value !== undefined
                            ? formatNumber(
                                metric.decimals
                                  ? Number(metric.value.toFixed(metric.decimals))
                                  : metric.value,
                              ) + (metric.unit || '')
                            : '—'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* AI Usage bar chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {td('admin.usageByType')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats?.aiUsageByType}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="type"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => getAITypeLabel(v)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: number) => formatNumber(value)}
                        labelFormatter={(v: string) => getAITypeLabel(v)}
                      />
                      <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                        {stats?.aiUsageByType.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={BAR_COLORS[idx % BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════════
              FEATURE FLAGS TAB
          ════════════════════════════════════════════════════════════════ */}
          <TabsContent value="flags" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {td('Feature Flags', 'Fonctionnalités')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {td(
                    'Toggle features on/off. Overrides reset on server restart.',
                    'Activez/désactivez les fonctionnalités. Les modifications sont réinitialisées au redémarrage du serveur.',
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flagsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-10 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {flagsData?.flags.map((flag) => (
                      <div
                        key={flag.key}
                        className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-0.5 min-w-0 mr-3">
                          <p className="text-sm font-medium truncate">{flag.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {flag.key}
                            {flag.isOverridden && (
                              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                                {td('overridden', 'modifié')}
                              </Badge>
                            )}
                          </p>
                        </div>
                        <Switch
                          checked={flag.currentValue}
                          onCheckedChange={(enabled) =>
                            toggleFlag.mutate({ flag: flag.key, enabled })
                          }
                          disabled={toggleFlag.isPending}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminScreen