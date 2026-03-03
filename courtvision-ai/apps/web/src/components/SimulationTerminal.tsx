'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Shield, Zap, Activity } from 'lucide-react'

const MOCK_LOGS = [
    { id: 1, type: 'SIM', text: 'Matchup: LeBron Twin vs Giannis Twin... Calculating defensive gaps.' },
    { id: 2, type: 'DATA', text: 'Point Cloud reconstructed. Session #8902 verified (4K NeRF).' },
    { id: 3, type: 'SIM', text: 'User_442 Twin: Jump shot stability +12% after simulate_drills_v4.' },
    { id: 4, type: 'ALERT', text: 'The Shadow League: New Global Challenge detected: "Step-back Mastery".' },
    { id: 5, type: 'SIM', text: 'Simulating 1,000 matches for "Elite" tier strategy optimization...' },
    { id: 6, type: 'BOLA', text: 'Tracking: 33 body keypoints locked. Skeletal drift < 0.2%.' },
]

export default function SimulationTerminal() {
    const [logs, setLogs] = useState(MOCK_LOGS.slice(0, 3))
    const indexRef = useRef(3)

    useEffect(() => {
        const interval = setInterval(() => {
            const nextLog = MOCK_LOGS[indexRef.current % MOCK_LOGS.length]
            setLogs(prev => [...prev.slice(-4), { ...nextLog, id: Date.now() }])
            indexRef.current++
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full max-w-md bg-black/60 border border-fire/20 rounded-xl p-4 font-mono text-[11px] backdrop-blur-xl shadow-2xl shadow-fire/5">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-fire">
                    <Terminal size={14} />
                    <span className="uppercase tracking-[0.2em] font-black">Shadow Stream [LIVE]</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-fire animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-elevated" />
                    <div className="w-2 h-2 rounded-full bg-elevated" />
                </div>
            </div>

            <div className="space-y-3 h-[180px] overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex gap-3"
                        >
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${log.type === 'ALERT' ? 'bg-red/20 text-red' :
                                    log.type === 'SIM' ? 'bg-fire/20 text-fire' : 'bg-ice/20 text-ice'
                                }`}>
                                {log.type}
                            </span>
                            <span className="text-text-secondary">{log.text}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="mt-4 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-text-tertiary">
                <span>BUFFER: 1024KB</span>
                <span className="flex items-center gap-1">
                    <Activity size={10} className="text-fire" />
                    NEURAL LOAD: 42%
                </span>
            </div>
        </div>
    )
}
