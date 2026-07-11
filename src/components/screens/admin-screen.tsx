'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Activity,
  DollarSign,
  Bot,
  Database,
  Layers,
  AlertTriangle,
  ShieldX,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'recharts'
import { useAppStore } from '@/stores/app'
import { apiFetch, formatLocaleDate } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminStats {
  overview: {
    totalUsers: number
    activeToday: number
    mrr: number
    aiCallsToday: number
  }
  signups30d: { date: string; count: number }[]
  aiUsageByType: { type: string; calls: number }[]
  subscriptionDist: { plan: string; count: number }[]
  recentSignups: { email: string; date: string; plan: string }[]
  systemHealth: {
    dbConnections: number
    queueDepth: number
    errorRate: number
  }
}

// ── Chart colors ───────────────────────────────────────────────────────────────

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))']
const BAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(220 70% 50%)',
  'hsl(160 60% 45%)',
  'hsl(30 80% 55%)',
  'hsl(280 65% 55%)',
]

// ── Component ──────────────────────────────────────────────────────────────────

export function AdminScreen() {
  const { td } = useTranslation()
  const { goBack } = useAppStore()
  const [unauthorized, setUnauthorized] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch<AdminStats>('/api/admin/stats'),
    retry: false,
    meta: { onError: (err: Error) => {
      if (err.message.includes('403') || err.message.includes('admin') || err.message.includes('non autorisé')) {
        setUnauthorized(true)
      }
    }},
  })

  // ── Unauthorized state ───────────────────────────────────────────────────

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

  // ── Helpers ──────────────────────────────────────────────────────────────

  function formatMrr(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value)
  }

  function formatDate(iso: string): string {
    return formatLocaleDate(new Date(iso))
  }

  // ── Overview cards data ──────────────────────────────────────────────────

  const cards = [
    { label: td('admin.totalUsers'), value: stats ? formatNumber(stats.overview.totalUsers) : '—', icon: Users },
    { label: td('admin.activeToday'), value: stats ? formatNumber(stats.overview.activeToday) : '—', icon: Activity },
    { label: td('admin.mrr'), value: stats ? formatMrr(stats.overview.mrr) : '—', icon: DollarSign },
    { label: td('admin.aiCallsToday'), value: stats ? formatNumber(stats.overview.aiCallsToday) : '—', icon: Bot },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} className="text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">{td('admin.title')}</h1>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <card.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{card.label}</span>
                </div>
                {isLoading
                  ? <Skeleton className="h-8 w-24 mt-1" />
                  : <p className="text-2xl font-bold">{card.value}</p>
                }
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">{td('admin.overview')}</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">{td('admin.users')}</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs sm:text-sm">{td('admin.aiUsage')}</TabsTrigger>
            <TabsTrigger value="system" className="text-xs sm:text-sm">{td('admin.system')}</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Signups line chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{td('admin.signups30d')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stats?.signups30d}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
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
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Subscription pie chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{td('admin.subscriptionDist')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats?.subscriptionDist}
                        dataKey="count"
                        nameKey="plan"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ plan }: { plan: string }) => plan === 'pro' ? td('admin.pro') : td('admin.free')}
                      >
                        {stats?.subscriptionDist.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Users Tab ────────────────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{td('admin.recentSignups')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{td('admin.email')}</TableHead>
                        <TableHead className="text-xs">{td('admin.date')}</TableHead>
                        <TableHead className="text-xs">{td('admin.plan')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.recentSignups.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{s.email}</TableCell>
                          <TableCell className="text-xs">{formatDate(s.date)}</TableCell>
                          <TableCell>
                            <Badge variant={s.plan === 'pro' ? 'default' : 'secondary'}>
                              {s.plan === 'pro' ? td('admin.pro') : td('admin.free')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AI Usage Tab ─────────────────────────────────────────────── */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{td('admin.usageByType')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats?.aiUsageByType}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                        {stats?.aiUsageByType.map((_, idx) => (
                          <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── System Tab ───────────────────────────────────────────────── */}
          <TabsContent value="system" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Database className="h-4 w-4" />
                    <span className="text-xs font-medium">{td('admin.dbConnections')}</span>
                  </div>
                  {isLoading
                    ? <Skeleton className="h-8 w-16 mt-1" />
                    : <p className="text-2xl font-bold">{stats?.systemHealth.dbConnections}</p>
                  }
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Layers className="h-4 w-4" />
                    <span className="text-xs font-medium">{td('admin.queueDepth')}</span>
                  </div>
                  {isLoading
                    ? <Skeleton className="h-8 w-16 mt-1" />
                    : <p className="text-2xl font-bold">{stats?.systemHealth.queueDepth}</p>
                  }
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">{td('admin.errorRate')}</span>
                  </div>
                  {isLoading
                    ? <Skeleton className="h-8 w-16 mt-1" />
                    : <p className="text-2xl font-bold">
                        {(stats?.systemHealth.errorRate ?? 0).toFixed(2)}%
                      </p>
                  }
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminScreen