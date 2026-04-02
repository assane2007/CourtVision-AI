'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Trophy,
    Crown,
    TrendingUp,
    Zap,
    Globe,
    ArrowUpRight,
    Users,
    Box
} from 'lucide-react'
import { apiRequest } from '@/services/api'

type LeagueScope = 'worldwide' | 'friends'

type LeaderboardApiEntry = {
    rank: number
    user_id: string
    username: string
    full_name?: string | null
    avatar_url?: string | null
    position?: string | null
    score: number
    level?: number
    is_me?: boolean
}

type LeaderboardApiResponse = {
    entries: LeaderboardApiEntry[]
    metric: string
    scope: 'global' | 'friends'
    myRank?: number
    totalPlayers: number
}

type LeaguePlayer = {
    rank: number
    name: string
    twin: string
    points: string
    tier: string
    color: string
    isMe: boolean
}

type LeagueData = {
    userRank: LeaguePlayer | null
    leaders: LeaguePlayer[]
    nextTierPoints: number
    regionalRank: string
    totalPlayers: number
    topPercent: number | null
}

function mapTier(level?: number): { tier: string; color: string } {
    if ((level ?? 0) >= 9) return { tier: 'APEX', color: 'text-fire' }
    if ((level ?? 0) >= 6) return { tier: 'ELITE', color: 'text-ice' }
    if ((level ?? 0) >= 3) return { tier: 'PRIME', color: 'text-text-secondary' }
    return { tier: 'RISING', color: 'text-text-tertiary' }
}

function nextTierThreshold(score: number): number {
    if (score <= 0) return 5000
    return Math.ceil((score + 1) / 5000) * 5000
}

function normalizeLeaderboard(response: LeaderboardApiResponse): LeagueData {
    const leaders: LeaguePlayer[] = (response.entries || []).map((entry) => {
        const { tier, color } = mapTier(entry.level)
        return {
            rank: entry.rank,
            name: (entry.full_name || entry.username || 'Player').toUpperCase(),
            twin: `${(entry.position || 'PLAYER').toUpperCase()} TWIN`,
            points: new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(entry.score || 0))),
            tier,
            color,
            isMe: !!entry.is_me,
        }
    })

    const userRank = leaders.find((p) => p.isMe)
        ?? (typeof response.myRank === 'number'
            ? leaders.find((p) => p.rank === response.myRank) ?? null
            : null)

    const userScore = userRank ? Number(userRank.points.replace(/,/g, '')) : 0
    const totalPlayers = Math.max(response.totalPlayers || 0, leaders.length)
    const topPercent = userRank && totalPlayers > 0
        ? Math.max(1, Math.round((userRank.rank / totalPlayers) * 100))
        : null

    return {
        userRank,
        leaders,
        nextTierPoints: nextTierThreshold(userScore),
        regionalRank: userRank ? `#${userRank.rank} (GLOBAL)` : '--',
        totalPlayers,
        topPercent,
    }
}

export default function LeaguePage() {
    const [data, setData] = useState<LeagueData | null>(null)
    const [loading, setLoading] = useState(true)
    const [scope, setScope] = useState<LeagueScope>('worldwide')
    const [limit, setLimit] = useState(25)
    const [error, setError] = useState<string | null>(null)

    const fullRankingsLoaded = limit >= 100

    useEffect(() => {
        let mounted = true
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const response = await apiRequest<LeaderboardApiResponse>(
                    `/community/leaderboard?metric=overall&scope=${scope === 'friends' ? 'friends' : 'global'}&limit=${limit}`,
                )
                if (!mounted) return
                setData(normalizeLeaderboard(response))
            } catch (err: any) {
                if (!mounted) return
                setError(err?.message || 'Unable to load leaderboard')
                setData({
                    userRank: null,
                    leaders: [],
                    nextTierPoints: 5000,
                    regionalRank: '--',
                    totalPlayers: 0,
                    topPercent: null,
                })
            } finally {
                if (mounted) setLoading(false)
            }
        }

        void load()
        return () => {
            mounted = false
        }
    }, [scope, limit])

    const handleLoadFullRankings = () => {
        if (scope === 'friends') {
            setScope('worldwide')
            return
        }

        if (fullRankingsLoaded) {
            return
        }

        setLimit(100)
    }

    const visibleLeaders = React.useMemo(() => {
        if (!data?.leaders) {
            return []
        }
        return data.leaders
    }, [data])

    const myPoints = data?.userRank ? Number(data.userRank.points.replace(/,/g, '')) : 0
    const pointsLeft = Math.max(0, (data?.nextTierPoints ?? 0) - myPoints)

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Trophy size={48} className="text-fire animate-bounce mx-auto opacity-50" />
                    <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Syncing Shadow League Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="md:col-span-2 bg-gradient-to-br from-fire/20 to-void border border-fire/30 p-10 rounded-[40px] relative overflow-hidden flex flex-col justify-center"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Trophy size={200} className="text-fire" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-2 w-2 rounded-full bg-fire animate-ping" />
                            <p className="text-xs font-mono text-fire uppercase tracking-[0.4em]">SEASON 01 // NEURAL DOMINANCE</p>
                        </div>
                        <h1 className="text-5xl font-display font-black italic uppercase italic leading-tight">THE SHADOW <br /><span className="gradient-text">LEAGUE</span></h1>
                        <p className="text-text-secondary max-w-sm mt-4 font-mono text-xs uppercase tracking-widest leading-relaxed">
                            {data?.topPercent != null
                                ? <>Your Digital Twin is currently ranked in the <span className="text-white font-bold">Top {data.topPercent}%</span> of global athletes.</>
                                : <>Your Digital Twin ranking will appear after your first synchronized sessions.</>}
                        </p>
                    </div>
                </motion.div>

                <div className="space-y-6">
                    <div className="bg-surface border border-white/5 p-8 rounded-[40px] flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-ice/10 border border-ice/20 rounded-full flex items-center justify-center mb-4">
                            <Crown className="text-ice" size={32} />
                        </div>
                        <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">NEXT TIER AT</p>
                        <p className="text-3xl font-display font-black italic mt-1">{(data?.nextTierPoints ?? 0).toLocaleString()} <span className="text-sm font-mono text-ice">PTS</span></p>
                        <p className="text-[10px] font-mono text-ice uppercase tracking-widest mt-2">+{pointsLeft} LEFT</p>
                    </div>
                    <div className="bg-surface border border-white/5 p-6 rounded-[40px] flex items-center gap-4">
                        <div className="bg-surface p-3 rounded-2xl"><Globe className="text-text-tertiary" size={24} /></div>
                        <div>
                            <p className="text-[10px] font-mono text-text-tertiary uppercase">REGIONAL RANK</p>
                            <p className="text-xl font-display font-black text-white italic tracking-tight">{data?.regionalRank ?? '--'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <p className="text-xs font-mono uppercase tracking-widest text-yellow-300">Leaderboard</p>
                    <p className="mt-1 text-sm text-yellow-200">{error}</p>
                </div>
            )}

            {/* Leaderboard Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface backdrop-blur-md border border-white/5 rounded-[40px] overflow-hidden"
            >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-display font-black italic uppercase tracking-tight">
                        {scope === 'friends' ? 'Friends' : 'Global'} <span className="text-fire">Neural</span> Ranking
                    </h3>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setScope('worldwide')}
                            className={`text-[10px] font-mono pb-1 uppercase tracking-widest transition-colors ${scope === 'worldwide' ? 'text-fire border-b border-fire' : 'text-text-tertiary hover:text-white'}`}
                        >
                            WORLDWIDE
                        </button>
                        <button
                            onClick={() => setScope('friends')}
                            className={`text-[10px] font-mono pb-1 uppercase tracking-widest transition-colors ${scope === 'friends' ? 'text-fire border-b border-fire' : 'text-text-tertiary hover:text-white'}`}
                        >
                            FRIENDS
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {visibleLeaders.map((player) => (
                        <div
                            key={`${player.rank}-${player.name}`}
                            className={`flex items-center justify-between p-6 rounded-[24px] transition-all cursor-pointer group ${player.isMe ? 'bg-fire/10 border border-fire/20' : 'hover:bg-surface'}`}
                        >
                            <div className="flex items-center gap-8">
                                <span className={`text-xl font-display font-black italic w-6 ${player.rank === 1 ? 'text-fire' : 'text-text-tertiary'}`}>
                                    {player.rank.toString().padStart(2, '0')}
                                </span>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-void border border-white/5 overflow-hidden flex items-center justify-center">
                                        <div className={`w-full h-full opacity-40 bg-gradient-to-br ${player.rank === 1 ? 'from-fire to-void' : 'from-ice to-void'}`} />
                                    </div>
                                    <div>
                                        <p className="font-display font-black italic text-white uppercase tracking-tight">{player.name}</p>
                                        <p className="text-[10px] font-mono text-text-tertiary uppercase">{player.twin}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-right hidden sm:block">
                                    <p className={`text-[10px] font-mono uppercase tracking-widest ${player.color}`}>{player.tier} TIER</p>
                                    <p className="text-lg font-display font-black tracking-tight">{player.points} <span className="text-[10px] font-mono text-text-tertiary">PTS</span></p>
                                </div>
                                <ArrowUpRight className="text-text-tertiary group-hover:text-fire transition-colors" size={20} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-void/30 flex justify-center">
                    <button
                        onClick={handleLoadFullRankings}
                        disabled={scope === 'worldwide' && fullRankingsLoaded}
                        className="text-[10px] font-mono text-text-tertiary uppercase tracking-[0.4em] hover:text-fire transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {scope === 'friends'
                            ? 'SWITCH TO WORLDWIDE'
                            : fullRankingsLoaded
                                ? 'RANKINGS UP TO DATE'
                                : 'LOAD FULL RANKINGS'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
