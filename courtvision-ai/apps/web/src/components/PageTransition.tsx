'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0, filter: 'blur(10px) brightness(1.5)' }}
                animate={{ opacity: 1, filter: 'blur(0px) brightness(1)' }}
                exit={{ opacity: 0, filter: 'blur(10px) brightness(1.5)' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative min-h-screen"
            >
                {/* Neural Pulse Overlay (visible only during start of transition) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.1, 0] }}
                    transition={{ duration: 0.8, times: [0, 0.5, 1] }}
                    className="absolute inset-0 pointer-events-none bg-fire z-50 mix-blend-overlay"
                />

                {children}
            </motion.div>
        </AnimatePresence>
    )
}
