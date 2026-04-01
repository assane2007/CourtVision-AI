'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Play,
    Filter,
    Search,
    ChevronDown,
    Map as CourtMap,
    Clock,
    Share2,
    MoreHorizontal,
    Zap,
    X,
    CheckCircle2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/services/api'

type SessionItem = {
    id: string
    name: string
    date: string
    duration: string
    accuracy: string
    type: string
    tags: string[]
}

const fetchSessionsFromApi = async (): Promise<SessionItem[]> => {
    const data = await apiRequest<any[]>('/sessions')
    if (!Array.isArray(data)) {
        return []
    }

    return data.map((session) => {
        const sessionId = String(session.id ?? '')
        const shootingPct = Number(session.shooting_fg_pct ?? 0)
        const highlights = Number(session.highlight_count ?? 0)
        const status = String(session.status ?? 'complete').toUpperCase()
        const createdAt = new Date(session.created_at)

        return {
            id: sessionId,
            name: `${String(session.type ?? 'Session').replace(/_/g, ' ')} ${sessionId.slice(0, 4) || 'N/A'}`,
            date: Number.isNaN(createdAt.getTime())
                ? '--'
                : createdAt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            duration: session.duration_minutes != null ? `${session.duration_minutes}m` : '--',
            accuracy: `${Math.round(shootingPct)}%`,
            type: String(session.type ?? 'Session').replace(/_/g, ' '),
            tags: highlights > 0
                ? [`${highlights} Highlights`, status]
                : [status],
        }
    })
}

export default function SessionsPage() {
    const router = useRouter()
    const [sessions, setSessions] = useState<SessionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null)
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<string>('ALL')
    const [searchTerm, setSearchTerm] = useState('')
    const [activeSession, setActiveSession] = useState<SessionItem | null>(null)
    const [feedback, setFeedback] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const loadSessions = useCallback(async (successFeedback?: string) => {
        setLoading(true)
        setErrorMessage(null)
        try {
            const data = await fetchSessionsFromApi()
            setSessions(data)
            if (successFeedback) {
                setFeedback(successFeedback)
            }
        } catch (loadError: unknown) {
            const message = loadError instanceof Error
                ? loadError.message
                : 'Unable to load sessions.'
            setSessions([])
            setErrorMessage(message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadSessions()
    }, [loadSessions])

    useEffect(() => {
        if (!feedback) {
            return
        }
        const timer = window.setTimeout(() => setFeedback(null), 2400)
        return () => window.clearTimeout(timer)
    }, [feedback])

    const sessionTypes = useMemo(
        () => ['ALL', ...Array.from(new Set(sessions.map((session) => session.type.toUpperCase())))],
        [sessions]
    )

    const visibleSessions = useMemo(() => {
        return sessions.filter((session) => {
            const matchesType = selectedType === 'ALL' || session.type.toUpperCase() === selectedType
            const query = searchTerm.trim().toLowerCase()
            const matchesSearch = query.length === 0
                || session.name.toLowerCase().includes(query)
                || session.id.toLowerCase().includes(query)
                || session.tags.some((tag) => tag.toLowerCase().includes(query))
            return matchesType && matchesSearch
        })
    }, [sessions, selectedType, searchTerm])

    const closeFilter = () => setIsFilterOpen(false)

    const copyToClipboard = async (value: string): Promise<boolean> => {
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value)
                return true
            }
            return false
        } catch {
            return false
        }
    }

    const buildSessionShareUrl = (sessionId: string): string => {
        if (typeof window === 'undefined') {
            return `/dashboard/sessions?session=${encodeURIComponent(sessionId)}`
        }
        return `${window.location.origin}/dashboard/sessions?session=${encodeURIComponent(sessionId)}`
    }

    const handleNewScan = () => {
        router.push('/dashboard/twin?mode=scan')
    }

    const handleFilter = () => {
        setIsFilterOpen((current) => !current)
    }

    const handlePlaySession = (id: string) => {
        const selected = sessions.find((session) => session.id === id) ?? null
        setActiveSession(selected)
        setActiveMenuSessionId(null)
    }

    const handleShare = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation()
        const link = buildSessionShareUrl(sessionId)
        const copied = await copyToClipboard(link)
        setFeedback(copied ? 'Share link copied to clipboard.' : `Share link: ${link}`)
        setActiveMenuSessionId(null)
    }

    const handleToggleSessionMenu = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation()
        setActiveMenuSessionId((current) => (current === sessionId ? null : sessionId))
    }

    const handleCopySessionId = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation()
        const copied = await copyToClipboard(sessionId)
        setFeedback(copied ? 'Session ID copied.' : `Session ID: ${sessionId}`)
        setActiveMenuSessionId(null)
    }

    const handleSyncSessions = () => {
        void loadSessions('Sessions synchronized from API.')
    }

    const handleSelectFilter = (type: string) => {
        setSelectedType(type)
        closeFilter()
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-display font-black italic uppercase italic">Neural <span className="text-fire">Sessions</span></h1>
                    <p className="text-text-tertiary font-mono text-[10px] uppercase tracking-widest mt-1">Audit your 3D gameplay reconstruction history</p>
                </div>

                <div className="relative flex items-center gap-3">
                    <button onClick={handleFilter} className="bg-surface border border-white/5 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-text-secondary hover:border-fire/50 transition-all flex items-center gap-2">
                        <Filter size={14} /> FILTER <ChevronDown size={12} />
                    </button>
                    <button onClick={handleNewScan} className="bg-fire hover:bg-fire-hover text-white px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all font-bold shadow-lg shadow-fire/10">
                        NEW SCAN
                    </button>

                    {isFilterOpen && (
                        <div className="absolute right-0 top-12 z-30 min-w-52 rounded-xl border border-white/10 bg-void/95 backdrop-blur-md overflow-hidden">
                            {sessionTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => handleSelectFilter(type)}
                                    className={`w-full px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-widest transition-colors ${selectedType === type ? 'text-fire bg-fire/10' : 'text-text-secondary hover:text-fire hover:bg-fire/10'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Search size={16} className="text-text-tertiary" />
                <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by session name, ID or tag"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-text-tertiary focus:outline-none"
                />
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">
                    {selectedType}
                </span>
            </div>

            {/* Session Grid */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="text-center space-y-4">
                        <Zap size={48} className="text-fire animate-pulse mx-auto opacity-50" />
                        <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Loading Neural Archives...</p>
                    </div>
                </div>
            ) : errorMessage ? (
                <div className="bg-surface border border-fire/20 rounded-3xl p-12 text-center">
                    <h3 className="font-display font-black text-xl italic uppercase mb-2 text-fire">Unable To Load Sessions</h3>
                    <p className="text-text-secondary font-mono text-sm max-w-sm mx-auto mb-6">{errorMessage}</p>
                    <button
                        onClick={() => { void loadSessions() }}
                        className="bg-white text-void hover:bg-fire hover:text-white px-6 py-3 rounded-2xl font-bold font-mono text-xs uppercase tracking-widest transition-all"
                    >
                        RETRY
                    </button>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-surface border border-white/5 rounded-3xl p-12 text-center">
                    <CourtMap size={48} className="text-text-tertiary mx-auto mb-4 opacity-50" />
                    <h3 className="font-display font-black text-xl italic uppercase mb-2">No Sessions Yet</h3>
                    <p className="text-text-secondary font-mono text-sm max-w-sm mx-auto mb-6">Upload a new scan to start building your archive.</p>
                    <button
                        onClick={handleNewScan}
                        className="bg-fire hover:bg-fire-hover text-white px-6 py-3 rounded-2xl font-bold font-mono text-xs uppercase tracking-widest transition-all"
                    >
                        START NEW SCAN
                    </button>
                </div>
            ) : visibleSessions.length === 0 ? (
                <div className="bg-surface border border-white/5 rounded-3xl p-12 text-center">
                    <CourtMap size={48} className="text-text-tertiary mx-auto mb-4 opacity-50" />
                    <h3 className="font-display font-black text-xl italic uppercase mb-2">No Matching Sessions</h3>
                    <p className="text-text-secondary font-mono text-sm max-w-sm mx-auto mb-6">Try another filter or search term to find your archived neural sessions.</p>
                    <button
                        onClick={() => {
                            setSearchTerm('')
                            setSelectedType('ALL')
                        }}
                        className="bg-white text-void hover:bg-fire hover:text-white px-6 py-3 rounded-2xl font-bold font-mono text-xs uppercase tracking-widest transition-all"
                    >
                        RESET FILTERS
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visibleSessions.map((session, i) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-surface backdrop-blur-md border border-white/5 rounded-[32px] overflow-hidden group hover:border-fire/20 transition-all cursor-pointer"
                            onClick={() => handlePlaySession(session.id)}
                        >
                            <div className="aspect-video relative bg-void/80 flex items-center justify-center overflow-hidden">
                                {/* 3D Preview Grid */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #FF4D00 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                                </div>

                                <Play size={48} className="text-fire/40 group-hover:text-fire group-hover:scale-110 transition-all z-10" />

                                {/* Stats Overlay */}
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                    <div className="space-y-1">
                                        <span className="bg-fire/20 text-fire text-[8px] font-mono font-bold px-2 py-0.5 rounded tracking-tighter uppercase whitespace-nowrap">
                                            ACCURACY: {session.accuracy}
                                        </span>
                                        <p className="text-sm font-display font-black text-white uppercase italic">{session.name}</p>
                                    </div>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        {session.tags.map((tag: string) => (
                                            <span key={tag} className="bg-surface text-text-tertiary text-[8px] font-mono px-1.5 py-0.5 rounded uppercase whitespace-nowrap mb-1">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-text-tertiary" />
                                        <span className="text-xs font-mono text-text-secondary uppercase">{session.duration}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CourtMap size={16} className="text-text-tertiary" />
                                        <span className="text-xs font-mono text-text-secondary uppercase flex-1 truncate max-w-[100px]">{session.type}</span>
                                    </div>
                                </div>
                                <div className="relative flex items-center gap-2">
                                    <button onClick={(e) => { void handleShare(e, session.id); }} className="p-2 text-text-tertiary hover:text-fire transition-colors"><Share2 size={18} /></button>
                                    <button
                                        onClick={(e) => handleToggleSessionMenu(e, session.id)}
                                        className="p-2 text-text-tertiary hover:text-fire transition-colors"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>
                                    {activeMenuSessionId === session.id && (
                                        <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-white/10 bg-void/95 backdrop-blur-md overflow-hidden">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePlaySession(session.id);
                                                }}
                                                className="w-full px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest text-text-secondary hover:text-fire hover:bg-fire/10 transition-colors"
                                            >
                                                Open session
                                            </button>
                                            <button
                                                onClick={(e) => { void handleCopySessionId(e, session.id); }}
                                                className="w-full px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest text-text-secondary hover:text-fire hover:bg-fire/10 transition-colors"
                                            >
                                                Copy session ID
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Pagination Placeholder */}
            {!loading && sessions.length > 0 && (
                <div className="flex justify-center py-6">
                    <button
                        onClick={handleSyncSessions}
                        className="text-text-tertiary font-mono text-[10px] uppercase tracking-[0.3em] hover:text-fire transition-colors"
                    >
                        SYNC WITH API
                    </button>
                </div>
            )}

            {activeSession && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setActiveSession(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="w-full max-w-lg rounded-3xl border border-white/10 bg-surface p-6"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-display font-black italic uppercase">Session Preview</h3>
                            <button onClick={() => setActiveSession(null)} className="text-text-tertiary hover:text-fire transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            <p className="text-sm font-display font-black text-white uppercase italic">{activeSession.name}</p>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">{activeSession.id} • {activeSession.date}</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/10 p-3">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Duration</p>
                                    <p className="mt-1 text-white font-display font-black italic">{activeSession.duration}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 p-3">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">Accuracy</p>
                                    <p className="mt-1 text-fire font-display font-black italic">{activeSession.accuracy}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    router.push(`/dashboard/twin?session=${encodeURIComponent(activeSession.id)}`)
                                    setActiveSession(null)
                                }}
                                className="flex-1 bg-fire hover:bg-fire-hover text-white py-3 rounded-xl text-xs font-mono uppercase tracking-widest transition-all"
                            >
                                Open in Twin
                            </button>
                            <button
                                onClick={() => setActiveSession(null)}
                                className="flex-1 bg-surface border border-white/10 hover:border-fire/40 text-text-secondary hover:text-fire py-3 rounded-xl text-xs font-mono uppercase tracking-widest transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {feedback && (
                <div className="fixed bottom-6 right-6 z-40 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-200 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{feedback}</span>
                </div>
            )}
        </div>
    )
}
