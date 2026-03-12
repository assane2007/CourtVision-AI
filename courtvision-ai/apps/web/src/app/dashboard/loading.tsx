'use client'

import { Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DashboardLoading() {
    return (
        <div className="flex h-[60vh] items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-6"
            >
                <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Zap size={48} className="text-fire mx-auto" />
                </motion.div>
                <div className="space-y-2">
                    <p className="font-mono text-text-tertiary uppercase tracking-[0.3em] text-xs">
                        Syncing Neural Data...
                    </p>
                    <div className="flex items-center justify-center gap-1">
                        {[0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="w-1 h-1 bg-fire rounded-full"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
