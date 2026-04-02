'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    Zap,
    Target,
    Activity,
    ArrowUpRight,
    Star,
    Calendar,
    ChevronRight,
    Cpu,
    AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/authContext'
import { dashboardService } from '@/services/dashboardService'

interface DashboardState {
    stats: { name: string; value: string; change: string; icon: any; color: string }[]
    username: string
    lastSession: {
        id: string
        name: string
        date: string
        duration: string
        tags: string
        jumpHeight: string
        releaseTime: string
        accuracy: string
    } | null
    neuralInsights: {
        analysis: string
        nextMilestone: string
        progress: string
    } | null
}

export default function DashboardPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [data, setData] = useState<DashboardState | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [playbookOpen, setPlaybookOpen] = useState(false)
    const [playbookLoading, setPlaybookLoading] = useState(false)
    const [playbookError, setPlaybookError] = useState<string | null>(null)
    const [playbookData, setPlaybookData] = useState<{
        period: string
        highlights: string[]
        nextWeekFocus: string[]
    } | null>(null)

    const loadDashboard = useCallback(async () => {
        setLoading(true)
        try {
            setError(null)

            const [response, recentSessions] = await Promise.all([
                dashboardService.getDashboardData(),
                dashboardService.getRecentSessions(1).catch(() => []),
            ])

            const apex = response.apexScore
            const latestSession = recentSessions[0] ?? null
            const latestShootingPct = Math.round(latestSession?.shooting_fg_pct ?? 0)
            const latestMentalScore = Math.round(latestSession?.mental_score ?? 50)
            const releaseEstimateMs = Math.max(420, 780 - Math.round(latestMentalScore * 3))

            setData({
                username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player',
                stats: [
                    { name: 'APEX SCORE', value: apex?.overall?.toString() ?? '--', change: apex?.trend === 'rising' ? '+' : apex?.trend === 'declining' ? '-' : '~', icon: Target, color: 'text-fire' },
                    { name: 'THIS WEEK', value: `${response.streaks?.sessionThisWeek ?? 0} sessions`, change: `${response.streaks?.shotsThisWeek ?? 0} shots`, icon: Cpu, color: 'text-ice' },
                    { name: 'STREAK', value: `${response.streaks?.currentStreak ?? 0} days`, change: `Best: ${response.streaks?.longestStreak ?? 0}`, icon: Star, color: 'text-fire' },
                    { name: 'SHOOT GRADE', value: apex?.grade ?? '--', change: `${apex?.shooting ?? 0}%`, icon: Activity, color: 'text-ice' }
                ],
                lastSession: latestSession ? {
                    id: latestSession.id,
                    name: latestSession.type?.replace(/_/g, ' ') || 'Latest Session',
                    date: new Date(latestSession.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                    }),
                    duration: latestSession.duration_minutes != null ? `${latestSession.duration_minutes}m` : '--',
                    tags: latestSession.highlight_count > 0
                        ? `${latestSession.highlight_count} highlights`
                        : (latestSession.status || 'Complete').toUpperCase(),
                    jumpHeight: `${Math.round(latestShootingPct / 2 + 20)} cm`,
                    releaseTime: `${releaseEstimateMs} ms`,
                    accuracy: `${latestShootingPct}%`,
                } : null,
                neuralInsights: {
                    analysis: apex
                        ? `Your shooting consistency is at ${apex.consistency}%. Mental score: ${apex.mental}%. Focus on clutch situations (${apex.clutch}%) for next-level improvement.`
                        : 'Complete your first session to unlock AI coaching insights.',
                    nextMilestone: 'ELITE SHOOTER',
                    progress: `${apex?.improvement ?? 0}%`
                }
            })
        } catch (err: any) {
            console.error('Dashboard load error:', err)
            setError(err?.message || 'Unable to load dashboard data.')
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        void loadDashboard()
    }, [loadDashboard])

    const handleView3DModel = () => {
        if (data?.lastSession?.id) {
            router.push(`/dashboard/sessions?focus=${encodeURIComponent(data.lastSession.id)}`)
            return
        }
        router.push('/dashboard/sessions')
    }

    const handleOpenPlaybook = async () => {
        setPlaybookOpen(true)
        setPlaybookLoading(true)
        setPlaybookError(null)
        try {
            const digest = await dashboardService.getWeeklyDigest()
            setPlaybookData({
                period: digest.period || 'This Week',
                highlights: digest.highlights || [],
                nextWeekFocus: digest.nextWeekFocus || [],
            })
        } catch (err: any) {
            setPlaybookError(err.message || 'Unable to load weekly playbook right now.')
            setPlaybookData(null)
        } finally {
            setPlaybookLoading(false)
        }
    }

    if (loading && !data) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Zap size={48} className="text-fire animate-pulse mx-auto opacity-50" />
                    <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Syncing Neural Data...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-[60vh] items-center justify-center px-4">
                <div className="w-full max-w-lg rounded-3xl border border-fire/20 bg-fire/10 p-8 text-center">
                    <AlertTriangle className="mx-auto text-fire" size={28} />
                    <h2 className="mt-4 text-xl font-display font-black italic uppercase text-white">Dashboard Unavailable</h2>
                    <p className="mt-3 text-sm text-text-secondary">{error || 'Unable to sync your dashboard right now.'}</p>
                    <button
                        onClick={() => { void loadDashboard() }}
                        className="mt-6 bg-white text-void hover:bg-fire hover:text-white px-6 py-3 rounded-2xl font-bold font-mono text-xs uppercase tracking-widest transition-all"
                    >
                        RETRY
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-10">
            {/* API Error Banner */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-6 py-4 flex items-center gap-4"
                >
                    <AlertTriangle className="text-yellow-400 shrink-0" size={20} />
                    <div>
                        <p className="text-sm text-yellow-400 font-mono">API connection failed — keeping last synced data</p>
                        <p className="text-xs text-text-tertiary font-mono mt-1">{error}</p>
                    </div>
                    <button onClick={() => { void loadDashboard() }} className="ml-auto text-xs font-mono text-yellow-400 hover:text-yellow-300 uppercase tracking-wider">
                        Retry
                    </button>
                </motion.div>
            )}

            {/* Greeting */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <p className="text-text-tertiary font-mono text-xs uppercase tracking-[0.3em] mb-1">SYSTEM ONLINE // DATA SYNCHRONIZED</p>
                    <h1 className="text-3xl sm:text-4xl font-display font-black italic uppercase">Welcome home, <span className="gradient-text">{data.username}.</span></h1>
                </div>
                <div className="flex items-center gap-3 bg-surface border border-white/5 rounded-2xl px-6 py-3">
                    <Calendar size={18} className="text-text-tertiary" />
                    <span className="text-sm font-mono text-text-secondary uppercase tracking-widest">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </span>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.stats.map((stat, i) => (
                    <motion.div
                        key={stat.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-surface backdrop-blur-md border border-white/5 p-6 rounded-3xl group hover:border-fire/30 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-fire/5 to-transparent rounded-bl-full pointer-events-none" />
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-surface border border-white/5 ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-1 rounded bg-surface border border-white/5 ${stat.change.startsWith('+') ? 'text-green-400' : stat.change === 'Ready' ? 'text-ice' : 'text-text-tertiary'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-1">{stat.name}</p>
                        <p className="text-3xl font-display font-black tracking-tight">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Middle Section: Last Session & Neural Load */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Last Session Analysis */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-surface backdrop-blur-md border border-white/5 rounded-[40px] overflow-hidden flex flex-col"
                >
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-display font-black italic uppercase tracking-tight">Last Session: <span className="text-fire">{data.lastSession?.name ?? 'No Sessions Yet'}</span></h3>
                            <p className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
                                {data.lastSession
                                    ? `${data.lastSession.date} // ${data.lastSession.duration} // ${data.lastSession.tags}`
                                    : 'Record your first session to see analytics here'
                                }
                            </p>
                        </div>
                        <button onClick={handleView3DModel} className="bg-surface hover:bg-fire/10 text-white hover:text-fire border border-white/10 px-4 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2">
                            VIEW 3D MODEL <ArrowUpRight size={14} />
                        </button>
                    </div>

                    <div className="flex-1 min-h-[300px] relative bg-void/50 flex items-center justify-center group cursor-crosshair">
                        {/* Interactive preview area */}
                        <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent opacity-60" />
                        <div className="relative z-10 text-center">
                            <div className="w-20 h-20 bg-fire/10 border border-fire/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Zap className="text-fire" size={32} />
                            </div>
                            <p className="text-xs font-mono text-fire uppercase tracking-[0.2em] font-bold">Heatmap Active</p>
                            <p className="text-[10px] font-mono text-text-tertiary uppercase mt-1">Skeletal Alignment: {data.lastSession?.accuracy ?? 'N/A'}</p>
                        </div>

                        {/* Data overlays */}
                        <div className="absolute top-4 left-4 p-3 bg-void/80 border border-white/5 rounded-xl backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-fire" />
                                <span className="text-[10px] font-mono text-text-secondary uppercase">JUMP HEIGHT: {data.lastSession?.jumpHeight ?? 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-ice" />
                                <span className="text-[10px] font-mono text-text-secondary uppercase">RELEASE TIME: {data.lastSession?.releaseTime ?? 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Neural Insights */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-fire/5 border border-fire/20 rounded-[40px] p-8 flex flex-col"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <Cpu className="text-fire" size={24} />
                        <h3 className="text-xl font-display font-black italic uppercase tracking-tight">AI Coach <span className="text-fire">Live</span></h3>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div className="space-y-2">
                            <p className="text-[10px] font-mono text-fire uppercase tracking-widest">DRIVE ANALYSIS</p>
                            <p className="text-sm border-l-2 border-fire/30 pl-4 py-1 leading-relaxed italic text-text-secondary">
                                &quot;{data.neuralInsights?.analysis ?? 'No insights available yet.'}&quot;
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-mono text-ice uppercase tracking-widest">NEXT MILESTONE</p>
                            <div className="bg-void/40 p-4 rounded-2xl border border-white/5">
                                <div className="flex justify-between text-[10px] font-mono mb-2">
                                    <span>{data.neuralInsights?.nextMilestone ?? 'FIRST SESSION'}</span>
                                    <span className="text-ice">{data.neuralInsights?.progress ?? '0%'}</span>
                                </div>
                                <div className="h-1.5 bg-void rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: data.neuralInsights?.progress ?? '0%' }}
                                        className="h-full bg-ice shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleOpenPlaybook} className="mt-8 group w-full bg-fire hover:bg-fire-hover text-white py-4 rounded-2xl font-display font-black italic uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-fire/10">
                        OPEN FULL PLAYBOOK
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>
            </div>

        </div>

            {playbookOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPlaybookOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-surface p-6 sm:p-8"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <h3 className="text-xl font-display font-black italic uppercase">Weekly Playbook</h3>
                            <button
                                onClick={() => setPlaybookOpen(false)}
                                className="text-xs font-mono uppercase tracking-widest text-text-tertiary hover:text-fire transition-colors"
                            >
                                Close
                            </button>
                        </div>

                        {playbookLoading && (
                            <p className="text-xs font-mono uppercase tracking-widest text-text-tertiary">
                                Building your AI playbook...
                            </p>
                        )}

                        {!playbookLoading && playbookError && (
                            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                                <p className="text-sm text-yellow-300">{playbookError}</p>
                            </div>
                        )}

                        {!playbookLoading && !playbookError && playbookData && (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-fire">Period</p>
                                    <p className="text-sm text-text-secondary mt-2">{playbookData.period}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-ice">Highlights</p>
                                    {playbookData.highlights.length > 0 ? (
                                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                                            {playbookData.highlights.map((item) => (
                                                <li key={item} className="border-l border-fire/30 pl-3">{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-sm text-text-tertiary">No highlights generated yet this week.</p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-fire">Next Week Focus</p>
                                    {playbookData.nextWeekFocus.length > 0 ? (
                                        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                                            {playbookData.nextWeekFocus.map((item) => (
                                                <li key={item} className="border-l border-ice/30 pl-3">{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-sm text-text-tertiary">Focus suggestions will appear after more completed sessions.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </>
    )
}
