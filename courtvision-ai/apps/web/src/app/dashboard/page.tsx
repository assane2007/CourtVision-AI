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
import { useAuth } from '@/lib/auth/authContext'
import { dashboardService } from '@/services/dashboardService'

interface DashboardState {
    stats: { name: string; value: string; change: string; icon: any; color: string }[]
    username: string
    lastSession: {
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
    const [data, setData] = useState<DashboardState | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadDashboard = useCallback(async () => {
        try {
            const response = await dashboardService.getDashboardData()
            const apex = response.apexScore

            setData({
                username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player',
                stats: [
                    { name: 'APEX SCORE', value: apex?.overall?.toString() ?? '--', change: apex?.trend === 'rising' ? '+' : apex?.trend === 'declining' ? '-' : '~', icon: Target, color: 'text-fire' },
                    { name: 'THIS WEEK', value: `${response.streaks?.sessionThisWeek ?? 0} sessions`, change: `${response.streaks?.shotsThisWeek ?? 0} shots`, icon: Cpu, color: 'text-ice' },
                    { name: 'STREAK', value: `${response.streaks?.currentStreak ?? 0} days`, change: `Best: ${response.streaks?.longestStreak ?? 0}`, icon: Star, color: 'text-fire' },
                    { name: 'SHOOT GRADE', value: apex?.grade ?? '--', change: `${apex?.shooting ?? 0}%`, icon: Activity, color: 'text-ice' }
                ],
                lastSession: null, // Will be populated when sessions endpoint is connected
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
            // Fallback to demo data if API is unavailable
            setError(err.message)
            setData({
                username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player',
                stats: [
                    { name: 'APEX SCORE', value: '--', change: 'Connect API', icon: Target, color: 'text-fire' },
                    { name: 'THIS WEEK', value: '0 sessions', change: '0 shots', icon: Cpu, color: 'text-ice' },
                    { name: 'STREAK', value: '0 days', change: 'Best: 0', icon: Star, color: 'text-fire' },
                    { name: 'SHOOT GRADE', value: '--', change: '0%', icon: Activity, color: 'text-ice' }
                ],
                lastSession: null,
                neuralInsights: {
                    analysis: 'API unavailable — showing placeholder data. Start recording sessions to see your real analytics.',
                    nextMilestone: 'FIRST SESSION',
                    progress: '0%'
                }
            })
        }
    }, [user])

    useEffect(() => {
        loadDashboard()
    }, [loadDashboard])

    const handleView3DModel = () => {
        alert("Loading 3D Session Viewer... (Feature in beta)");
    };

    const handleOpenPlaybook = () => {
        alert("Initializing AI Playbook... Establishing secure connection to engine.");
    };

    if (!data) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Zap size={48} className="text-fire animate-pulse mx-auto opacity-50" />
                    <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Syncing Neural Data...</p>
                </div>
            </div>
        );
    }

    return (
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
                        <p className="text-sm text-yellow-400 font-mono">API connection failed — showing placeholder data</p>
                        <p className="text-xs text-text-tertiary font-mono mt-1">{error}</p>
                    </div>
                    <button onClick={loadDashboard} className="ml-auto text-xs font-mono text-yellow-400 hover:text-yellow-300 uppercase tracking-wider">
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
                        {/* Placeholder for 3D Thumbnail / Map */}
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
    )
}
