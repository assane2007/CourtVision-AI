'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Play,
    Filter,
    Search,
    ChevronDown,
    Map as CourtMap,
    Activity,
    Clock,
    Share2,
    MoreHorizontal,
    Zap
} from 'lucide-react'

type SessionItem = {
    id: string
    name: string
    date: string
    duration: string
    accuracy: string
    type: string
    tags: string[]
}

const ARCHIVED_SESSIONS: SessionItem[] = [
    {
        id: 'S-7684',
        name: 'Evening Jump Lab',
        date: 'Feb 21, 2026',
        duration: '35m',
        accuracy: '94.3%',
        type: 'Vertical Mechanics',
        tags: ['Archived', 'Biomechanics'],
    },
    {
        id: 'S-7670',
        name: 'CourtVision Sprint Test',
        date: 'Feb 19, 2026',
        duration: '28m',
        accuracy: '93.8%',
        type: 'Conditioning',
        tags: ['Archived', 'Heart Rate Sync'],
    },
]

// Mocking the real API response for now until it's synced
const fetchSessionsFromApi = async () => {
    return new Promise<SessionItem[]>((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: 'S-7721',
                    name: 'Midnight Grind',
                    date: 'March 02, 2026',
                    duration: '42m',
                    accuracy: '98.4%',
                    type: 'Team Scrimmage',
                    tags: ['Simulation Ready', '3D Reconstructed']
                },
                {
                    id: 'S-7718',
                    name: 'Free Throw Protocol',
                    date: 'March 01, 2026',
                    duration: '15m',
                    accuracy: '99.1%',
                    type: 'Solo Drills',
                    tags: ['Biometrics Only']
                },
                {
                    id: 'S-7712',
                    name: 'Shadow League Qualifier',
                    date: 'Feb 28, 2026',
                    duration: '22m',
                    accuracy: '97.8%',
                    type: '1v1 Matchup',
                    tags: ['Twin Sync OK', '3D']
                },
                {
                    id: 'S-7695',
                    name: 'Morning Cardio Scan',
                    date: 'Feb 25, 2026',
                    duration: '60m',
                    accuracy: '95.2%',
                    type: 'Fitness Track',
                    tags: ['Heart Rate Sync']
                },
            ]);
        }, 1200);
    });
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
    const [archivedLoaded, setArchivedLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;
        fetchSessionsFromApi().then(data => {
            if (mounted) {
                setSessions(data);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, []);

    const handleNewScan = () => {
        alert("Initializing Neural Scanner... Please connect your camera device.");
    };

    const handleFilter = () => {
        alert("Opening Advanced Filters...");
    };

    const handlePlaySession = (id: string) => {
        alert(`Loading 3D playback for Session ${id}...`);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert("Generating shareable link...");
    };

    const handleToggleSessionMenu = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setActiveMenuSessionId((current) => (current === sessionId ? null : sessionId));
    };

    const handleCopySessionId = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(sessionId);
                alert(`Session ID copied: ${sessionId}`);
            } else {
                window.prompt('Copy session ID', sessionId);
            }
        } catch {
            window.prompt('Copy session ID', sessionId);
        } finally {
            setActiveMenuSessionId(null);
        }
    };

    const handleLoadArchivedData = () => {
        if (archivedLoaded) {
            return;
        }
        setSessions((current) => [...current, ...ARCHIVED_SESSIONS]);
        setArchivedLoaded(true);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-display font-black italic uppercase italic">Neural <span className="text-fire">Sessions</span></h1>
                    <p className="text-text-tertiary font-mono text-[10px] uppercase tracking-widest mt-1">Audit your 3D gameplay reconstruction history</p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleFilter} className="bg-surface border border-white/5 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-text-secondary hover:border-fire/50 transition-all flex items-center gap-2">
                        <Filter size={14} /> FILTER
                    </button>
                    <button onClick={handleNewScan} className="bg-fire hover:bg-fire-hover text-white px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all font-bold shadow-lg shadow-fire/10">
                        NEW SCAN
                    </button>
                </div>
            </div>

            {/* Session Grid */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="text-center space-y-4">
                        <Zap size={48} className="text-fire animate-pulse mx-auto opacity-50" />
                        <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Loading Neural Archives...</p>
                    </div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-surface border border-white/5 rounded-3xl p-12 text-center">
                    <CourtMap size={48} className="text-text-tertiary mx-auto mb-4 opacity-50" />
                    <h3 className="font-display font-black text-xl italic uppercase mb-2">No Active Data</h3>
                    <p className="text-text-secondary font-mono text-sm max-w-sm mx-auto mb-6">Your neural repository is empty. Complete a session to begin logging biomechanical data.</p>
                    <button onClick={handleNewScan} className="bg-white text-void hover:bg-fire hover:text-white px-6 py-3 rounded-2xl font-bold font-mono text-xs uppercase tracking-widest transition-all">
                        INITIATE FIRST SCAN
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sessions.map((session, i) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-surface backdrop-blur-md border border-white/5 rounded-[32px] overflow-hidden group hover:border-fire/20 transition-all cursor-pointer"
                            onClick={() => handlePlaySession(session.id)}
                        >
                            <div className="aspect-video relative bg-void/80 flex items-center justify-center overflow-hidden">
                                {/* Mock 3D Preview Grid */}
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
                                    <button onClick={handleShare} className="p-2 text-text-tertiary hover:text-fire transition-colors"><Share2 size={18} /></button>
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
                                                    setActiveMenuSessionId(null);
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
                        onClick={handleLoadArchivedData}
                        disabled={archivedLoaded}
                        className="text-text-tertiary font-mono text-[10px] uppercase tracking-[0.3em] hover:text-fire transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {archivedLoaded ? 'ARCHIVES UP TO DATE' : 'LOAD ARCHIVED DATA'}
                    </button>
                </div>
            )}
        </div>
    )
}
