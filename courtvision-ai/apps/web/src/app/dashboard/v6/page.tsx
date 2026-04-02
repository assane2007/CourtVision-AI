'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Swords,
    Bot,
    Store,
    FileDown,
    RefreshCw,
    Play,
    CheckCircle2,
    AlertTriangle,
    Search,
} from 'lucide-react'
import {
    v6Service,
    type ArenaMatch,
    type ArenaScoreboard,
    type HorseChallenge,
    type HorseGameState,
    type DrillPack,
    type ArenaMode,
    type HorseDifficulty,
    type HorsePersonality,
} from '@/services/v6Service'

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format((Number(cents) || 0) / 100)
}

export default function DashboardV6Page() {
    const [feedback, setFeedback] = useState<string | null>(null)

    // Arena
    const [arenaMatches, setArenaMatches] = useState<ArenaMatch[]>([])
    const [arenaLoading, setArenaLoading] = useState(true)
    const [arenaError, setArenaError] = useState<string | null>(null)
    const [arenaMode, setArenaMode] = useState<ArenaMode>('shootout')
    const [arenaMaxPlayers, setArenaMaxPlayers] = useState(4)
    const [arenaTotalRounds, setArenaTotalRounds] = useState(3)
    const [arenaShotsPerRound, setArenaShotsPerRound] = useState(10)
    const [activeArenaMatchId, setActiveArenaMatchId] = useState<string | null>(null)
    const [arenaScoreboard, setArenaScoreboard] = useState<ArenaScoreboard | null>(null)
    const [arenaZone, setArenaZone] = useState('midrange')
    const [arenaActionLoading, setArenaActionLoading] = useState(false)

    // Horse
    const [horseState, setHorseState] = useState<HorseGameState | null>(null)
    const [horseCurrentChallenge, setHorseCurrentChallenge] = useState<HorseChallenge | null>(null)
    const [horseLoading, setHorseLoading] = useState(true)
    const [horseError, setHorseError] = useState<string | null>(null)
    const [horseDifficulty, setHorseDifficulty] = useState<HorseDifficulty>('pro')
    const [horsePersonality, setHorsePersonality] = useState<HorsePersonality>('classic')
    const [horseActionLoading, setHorseActionLoading] = useState(false)

    // Marketplace
    const [drills, setDrills] = useState<DrillPack[]>([])
    const [drillsLoading, setDrillsLoading] = useState(true)
    const [drillsError, setDrillsError] = useState<string | null>(null)
    const [drillSearch, setDrillSearch] = useState('')
    const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null)

    // Reports
    const [reportSessionId, setReportSessionId] = useState('')
    const [reportLoading, setReportLoading] = useState(false)
    const [reportError, setReportError] = useState<string | null>(null)

    useEffect(() => {
        if (!feedback) {
            return
        }
        const timer = window.setTimeout(() => setFeedback(null), 2600)
        return () => window.clearTimeout(timer)
    }, [feedback])

    const loadArenaMatches = useCallback(async () => {
        setArenaLoading(true)
        setArenaError(null)
        try {
            const matches = await v6Service.listArenaAvailable(8)
            setArenaMatches(matches)
        } catch (error: unknown) {
            setArenaError(error instanceof Error ? error.message : 'Failed to load arena matches')
            setArenaMatches([])
        } finally {
            setArenaLoading(false)
        }
    }, [])

    const refreshArenaScoreboard = useCallback(async (matchId: string) => {
        try {
            const scoreboard = await v6Service.getArenaScoreboard(matchId)
            setArenaScoreboard(scoreboard)
        } catch (error: unknown) {
            setArenaError(error instanceof Error ? error.message : 'Failed to load scoreboard')
        }
    }, [])

    const loadHorseState = useCallback(async () => {
        setHorseLoading(true)
        setHorseError(null)
        try {
            const activeState = await v6Service.getActiveHorseGame()
            setHorseState(activeState)
            setHorseCurrentChallenge(activeState?.currentChallenge ?? null)
        } catch (error: unknown) {
            setHorseError(error instanceof Error ? error.message : 'Failed to load HORSE mode')
            setHorseState(null)
            setHorseCurrentChallenge(null)
        } finally {
            setHorseLoading(false)
        }
    }, [])

    const loadMarketplace = useCallback(async (search = '') => {
        setDrillsLoading(true)
        setDrillsError(null)
        try {
            const packs = await v6Service.listMarketplaceDrills(search)
            setDrills(packs)
        } catch (error: unknown) {
            setDrillsError(error instanceof Error ? error.message : 'Failed to load marketplace')
            setDrills([])
        } finally {
            setDrillsLoading(false)
        }
    }, [])

    useEffect(() => {
        void Promise.all([
            loadArenaMatches(),
            loadHorseState(),
            loadMarketplace(),
        ])
    }, [loadArenaMatches, loadHorseState, loadMarketplace])

    useEffect(() => {
        if (!activeArenaMatchId) {
            setArenaScoreboard(null)
            return
        }

        void refreshArenaScoreboard(activeArenaMatchId)
        const timer = window.setInterval(() => {
            void refreshArenaScoreboard(activeArenaMatchId)
        }, 3000)

        return () => window.clearInterval(timer)
    }, [activeArenaMatchId, refreshArenaScoreboard])

    const handleCreateArena = async () => {
        setArenaActionLoading(true)
        try {
            const match = await v6Service.createArenaMatch({
                mode: arenaMode,
                maxPlayers: arenaMaxPlayers,
                totalRounds: arenaTotalRounds,
                shotsPerRound: arenaShotsPerRound,
            })
            setActiveArenaMatchId(match.id)
            setFeedback('Arena match created.')
            await Promise.all([loadArenaMatches(), refreshArenaScoreboard(match.id)])
        } catch (error: unknown) {
            setArenaError(error instanceof Error ? error.message : 'Failed to create arena match')
        } finally {
            setArenaActionLoading(false)
        }
    }

    const handleJoinArena = async (matchId: string) => {
        setArenaActionLoading(true)
        try {
            await v6Service.joinArenaMatch(matchId)
            setActiveArenaMatchId(matchId)
            setFeedback('Joined arena match successfully.')
            await refreshArenaScoreboard(matchId)
        } catch (error: unknown) {
            setArenaError(error instanceof Error ? error.message : 'Failed to join arena match')
        } finally {
            setArenaActionLoading(false)
        }
    }

    const handleArenaReady = async () => {
        if (!activeArenaMatchId) {
            return
        }
        setArenaActionLoading(true)
        try {
            await v6Service.readyArenaMatch(activeArenaMatchId)
            setFeedback('Ready status submitted.')
            await refreshArenaScoreboard(activeArenaMatchId)
        } catch (error: unknown) {
            setArenaError(error instanceof Error ? error.message : 'Failed to set ready status')
        } finally {
            setArenaActionLoading(false)
        }
    }

    const handleArenaShot = async (result: 'made' | 'missed') => {
        if (!activeArenaMatchId) {
            return
        }
        setArenaActionLoading(true)
        try {
            await v6Service.submitArenaShot(activeArenaMatchId, { result, zone: arenaZone })
            await refreshArenaScoreboard(activeArenaMatchId)
        } catch (error: unknown) {
            setArenaError(error instanceof Error ? error.message : 'Failed to submit shot')
        } finally {
            setArenaActionLoading(false)
        }
    }

    const handleStartHorse = async () => {
        setHorseActionLoading(true)
        setHorseError(null)
        try {
            const state = await v6Service.startHorseGame(horseDifficulty, horsePersonality)
            setHorseState(state)
            setHorseCurrentChallenge(state.currentChallenge)
            setFeedback('HORSE game started.')
        } catch (error: unknown) {
            setHorseError(error instanceof Error ? error.message : 'Failed to start HORSE game')
        } finally {
            setHorseActionLoading(false)
        }
    }

    const horseGameId = horseState?.game.id ?? null

    const handleGenerateHorseChallenge = async () => {
        if (!horseGameId) {
            return
        }
        setHorseActionLoading(true)
        try {
            const challenge = await v6Service.generateHorseChallenge(horseGameId)
            setHorseCurrentChallenge(challenge)
            setFeedback('New HORSE challenge generated.')
        } catch (error: unknown) {
            setHorseError(error instanceof Error ? error.message : 'Failed to generate challenge')
        } finally {
            setHorseActionLoading(false)
        }
    }

    const handleHorseAttempt = async (success: boolean) => {
        if (!horseGameId || !horseCurrentChallenge) {
            return
        }
        setHorseActionLoading(true)
        try {
            const state = await v6Service.submitHorseAttempt(horseGameId, horseCurrentChallenge.id, success)
            setHorseState(state)
            setHorseCurrentChallenge(state.currentChallenge)
        } catch (error: unknown) {
            setHorseError(error instanceof Error ? error.message : 'Failed to submit attempt')
        } finally {
            setHorseActionLoading(false)
        }
    }

    const handlePurchaseDrill = async (packId: string) => {
        setPurchasingPackId(packId)
        setDrillsError(null)
        try {
            await v6Service.purchaseDrill(packId)
            setFeedback('Drill purchased successfully.')
            await loadMarketplace(drillSearch)
        } catch (error: unknown) {
            setDrillsError(error instanceof Error ? error.message : 'Failed to purchase drill')
        } finally {
            setPurchasingPackId(null)
        }
    }

    const filteredDrills = useMemo(() => {
        const query = drillSearch.trim().toLowerCase()
        if (!query) {
            return drills
        }
        return drills.filter((pack) =>
            pack.title.toLowerCase().includes(query)
            || pack.description.toLowerCase().includes(query)
            || pack.category.toLowerCase().includes(query)
        )
    }, [drills, drillSearch])

    const handleDownloadReport = async () => {
        if (!reportSessionId.trim()) {
            setReportError('Enter a valid session UUID first.')
            return
        }

        setReportLoading(true)
        setReportError(null)
        try {
            const blob = await v6Service.downloadSessionPdf(reportSessionId.trim())
            const blobUrl = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = blobUrl
            anchor.download = `courtvision_report_${reportSessionId.trim()}.pdf`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(blobUrl)
            setFeedback('Scout report PDF downloaded.')
        } catch (error: unknown) {
            setReportError(error instanceof Error ? error.message : 'Failed to download report')
        } finally {
            setReportLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-text-tertiary font-mono text-xs uppercase tracking-[0.3em] mb-1">V6 FEATURE CONTROL CENTER</p>
                    <h1 className="text-3xl font-display font-black italic uppercase">Arena, Horse, Marketplace & Reports</h1>
                </div>
                <button
                    onClick={() => {
                        void Promise.all([loadArenaMatches(), loadHorseState(), loadMarketplace(drillSearch)])
                    }}
                    className="bg-surface border border-white/10 hover:border-fire/40 text-xs font-mono uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
                >
                    <RefreshCw size={14} /> Refresh All
                </button>
            </div>

            {feedback && (
                <div className="rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-200 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{feedback}</span>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-white/10 bg-surface p-6 space-y-5"
                >
                    <div className="flex items-center gap-3">
                        <Swords className="text-fire" size={22} />
                        <h2 className="text-xl font-display font-black italic uppercase">Challenge Multi-joueurs</h2>
                    </div>

                    {arenaError && (
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300 text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span>{arenaError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <select value={arenaMode} onChange={(event) => setArenaMode(event.target.value as ArenaMode)} className="bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm">
                            <option value="shootout">Shootout</option>
                            <option value="accuracy">Accuracy</option>
                            <option value="speed">Speed</option>
                            <option value="clutch">Clutch</option>
                            <option value="knockout">Knockout</option>
                        </select>
                        <input type="number" min={2} max={8} value={arenaMaxPlayers} onChange={(event) => setArenaMaxPlayers(Math.min(8, Math.max(2, Number(event.target.value) || 2)))} className="bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm" placeholder="Players" />
                        <input type="number" min={1} max={10} value={arenaTotalRounds} onChange={(event) => setArenaTotalRounds(Math.min(10, Math.max(1, Number(event.target.value) || 1)))} className="bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm" placeholder="Rounds" />
                        <input type="number" min={5} max={50} value={arenaShotsPerRound} onChange={(event) => setArenaShotsPerRound(Math.min(50, Math.max(5, Number(event.target.value) || 5)))} className="bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm" placeholder="Shots / round" />
                    </div>

                    <button
                        onClick={() => { void handleCreateArena() }}
                        disabled={arenaActionLoading}
                        className="w-full bg-fire hover:bg-fire-hover text-white py-3 rounded-xl text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-60"
                    >
                        {arenaActionLoading ? 'CREATING...' : 'CREATE ARENA MATCH'}
                    </button>

                    <div className="space-y-3">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Available Matches</p>
                        {arenaLoading ? (
                            <p className="text-sm text-text-tertiary">Loading matches...</p>
                        ) : arenaMatches.length === 0 ? (
                            <p className="text-sm text-text-tertiary">No public matches available.</p>
                        ) : (
                            arenaMatches.map((match) => (
                                <div key={match.id} className="rounded-xl border border-white/10 p-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold uppercase">{match.mode}</p>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                                            {match.players.length}/{match.config.maxPlayers} players • {match.status}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { void handleJoinArena(match.id) }}
                                        className="bg-surface border border-white/10 hover:border-fire/40 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all"
                                    >
                                        Join
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {activeArenaMatchId && (
                        <div className="rounded-2xl border border-fire/20 bg-fire/10 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-fire">Active Match</p>
                                <button onClick={() => { void handleArenaReady() }} className="text-[10px] font-mono uppercase tracking-widest text-fire hover:text-fire-hover">
                                    Ready
                                </button>
                            </div>
                            <p className="text-xs font-mono text-text-secondary break-all">{activeArenaMatchId}</p>

                            <div className="flex items-center gap-2">
                                <input
                                    value={arenaZone}
                                    onChange={(event) => setArenaZone(event.target.value)}
                                    placeholder="zone (midrange, wing3, paint...)"
                                    className="flex-1 bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm"
                                />
                                <button onClick={() => { void handleArenaShot('made') }} className="bg-green-500/20 border border-green-400/40 text-green-200 px-3 py-2 rounded-xl text-xs font-mono uppercase">Made</button>
                                <button onClick={() => { void handleArenaShot('missed') }} className="bg-red-500/20 border border-red-400/40 text-red-200 px-3 py-2 rounded-xl text-xs font-mono uppercase">Missed</button>
                            </div>

                            {arenaScoreboard && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                                        Round {arenaScoreboard.round}/{arenaScoreboard.totalRounds} • {arenaScoreboard.status}
                                    </p>
                                    {arenaScoreboard.players.map((player) => (
                                        <div key={player.userId} className="flex items-center justify-between text-sm">
                                            <span className="uppercase">{player.username}</span>
                                            <span className="font-mono">{player.score} pts • {player.accuracy}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-white/10 bg-surface p-6 space-y-5"
                >
                    <div className="flex items-center gap-3">
                        <Bot className="text-ice" size={22} />
                        <h2 className="text-xl font-display font-black italic uppercase">Mode HORSE IA</h2>
                    </div>

                    {horseError && (
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300 text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span>{horseError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <select value={horseDifficulty} onChange={(event) => setHorseDifficulty(event.target.value as HorseDifficulty)} className="bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm">
                            <option value="rookie">Rookie</option>
                            <option value="pro">Pro</option>
                            <option value="allstar">All-Star</option>
                            <option value="legend">Legend</option>
                        </select>
                        <select value={horsePersonality} onChange={(event) => setHorsePersonality(event.target.value as HorsePersonality)} className="bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm">
                            <option value="classic">Classic</option>
                            <option value="aggressive">Aggressive</option>
                            <option value="creative">Creative</option>
                            <option value="defensive">Defensive</option>
                        </select>
                    </div>

                    <button
                        onClick={() => { void handleStartHorse() }}
                        disabled={horseActionLoading}
                        className="w-full bg-ice/20 hover:bg-ice/30 border border-ice/40 text-ice py-3 rounded-xl text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-60"
                    >
                        {horseActionLoading ? 'STARTING...' : 'START HORSE GAME'}
                    </button>

                    {horseLoading ? (
                        <p className="text-sm text-text-tertiary">Loading HORSE state...</p>
                    ) : horseState ? (
                        <div className="rounded-2xl border border-white/10 p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="uppercase">Status: {horseState.game.status}</span>
                                <span className="font-mono">Score: {horseState.game.score}</span>
                            </div>
                            <p className="text-xs font-mono text-text-secondary uppercase tracking-widest">
                                Round {horseState.round} • You: {horseState.playerLetters || '-'} • AI: {horseState.aiLetters || '-'}
                            </p>

                            {horseCurrentChallenge ? (
                                <div className="rounded-xl border border-fire/20 bg-fire/10 p-3">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-fire">Current Challenge</p>
                                    <p className="mt-2 text-sm">{horseCurrentChallenge.description}</p>
                                    <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                                        Zone: {horseCurrentChallenge.targetZone} • Technique: {horseCurrentChallenge.targetTechnique}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-text-tertiary">No active challenge yet.</p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => { void handleGenerateHorseChallenge() }} className="bg-surface border border-white/10 hover:border-ice/40 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest">Generate Challenge</button>
                                <button onClick={() => { void handleHorseAttempt(true) }} disabled={!horseCurrentChallenge} className="bg-green-500/20 border border-green-400/40 text-green-200 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest disabled:opacity-40">Attempt Success</button>
                                <button onClick={() => { void handleHorseAttempt(false) }} disabled={!horseCurrentChallenge} className="bg-red-500/20 border border-red-400/40 text-red-200 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest disabled:opacity-40">Attempt Miss</button>
                            </div>

                            <p className="text-xs text-text-secondary">{horseState.message}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-text-tertiary">No active HORSE game. Start one now.</p>
                    )}
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-white/10 bg-surface p-6 space-y-5"
                >
                    <div className="flex items-center gap-3">
                        <Store className="text-fire" size={22} />
                        <h2 className="text-xl font-display font-black italic uppercase">Marketplace de Drills</h2>
                    </div>

                    {drillsError && (
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300 text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span>{drillsError}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 bg-void/60 border border-white/10 rounded-xl px-3 py-2">
                        <Search size={14} className="text-text-tertiary" />
                        <input
                            value={drillSearch}
                            onChange={(event) => setDrillSearch(event.target.value)}
                            placeholder="Search drills"
                            className="flex-1 bg-transparent text-sm outline-none"
                        />
                        <button onClick={() => { void loadMarketplace(drillSearch) }} className="text-[10px] font-mono uppercase tracking-widest text-fire hover:text-fire-hover">Search</button>
                    </div>

                    {drillsLoading ? (
                        <p className="text-sm text-text-tertiary">Loading marketplace...</p>
                    ) : filteredDrills.length === 0 ? (
                        <p className="text-sm text-text-tertiary">No drills found for current filters.</p>
                    ) : (
                        <div className="space-y-3">
                            {filteredDrills.slice(0, 6).map((pack) => (
                                <div key={pack.id} className="rounded-xl border border-white/10 p-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold uppercase">{pack.title}</p>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                                            {pack.category} • {pack.difficulty} • Rating {Number(pack.rating || 0).toFixed(1)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { void handlePurchaseDrill(pack.id) }}
                                        disabled={purchasingPackId === pack.id || Boolean(pack.isPurchased)}
                                        className="bg-surface border border-white/10 hover:border-fire/40 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        {pack.isPurchased ? 'Owned' : purchasingPackId === pack.id ? 'Buying...' : formatCurrency(pack.priceCents)}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-white/10 bg-surface p-6 space-y-5"
                >
                    <div className="flex items-center gap-3">
                        <FileDown className="text-ice" size={22} />
                        <h2 className="text-xl font-display font-black italic uppercase">Export PDF Scout Report</h2>
                    </div>

                    {reportError && (
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300 text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            <span>{reportError}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <input
                            value={reportSessionId}
                            onChange={(event) => setReportSessionId(event.target.value)}
                            placeholder="Session UUID"
                            className="w-full bg-void/60 border border-white/10 rounded-xl px-3 py-2 text-sm"
                        />
                        <button
                            onClick={() => { void handleDownloadReport() }}
                            disabled={reportLoading}
                            className="w-full bg-white text-void hover:bg-ice hover:text-white py-3 rounded-xl text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {reportLoading ? 'Generating PDF...' : <><Play size={14} /> Download Report PDF</>}
                        </button>
                    </div>

                    <p className="text-xs text-text-tertiary">
                        This downloads a real server-generated PDF from the new V6 report endpoint.
                    </p>
                </motion.section>
            </div>
        </div>
    )
}
