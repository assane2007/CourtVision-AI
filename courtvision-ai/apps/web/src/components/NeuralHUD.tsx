'use client'

import React, { useEffect, useState } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'
import { Crosshair, Activity, Cpu, ShieldAlert } from 'lucide-react'

export default function NeuralHUD() {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    const springX = useSpring(mouseX, { damping: 25, stiffness: 150 })
    const springY = useSpring(mouseY, { damping: 25, stiffness: 150 })

    const [isClient, setIsClient] = useState(false)
    const [isTouchDevice, setIsTouchDevice] = useState(false)
    const [mockBiometrics, setMockBiometrics] = useState({
        hr: 72,
        integrity: 99.8,
        load: 42
    })

    useEffect(() => {
        setIsClient(true)

        // Disable HUD on touch/mobile devices
        const isTouch = window.matchMedia('(pointer: coarse)').matches
        setIsTouchDevice(isTouch)
        if (isTouch) return

        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX)
            mouseY.set(e.clientY)
        }

        const interval = setInterval(() => {
            setMockBiometrics(prev => ({
                hr: 70 + Math.floor(Math.random() * 10),
                integrity: 99.5 + (Math.random() * 0.4),
                load: 40 + Math.floor(Math.random() * 5)
            }))
        }, 2000)

        window.addEventListener('mousemove', handleMouseMove)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            clearInterval(interval)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    if (!isClient || isTouchDevice) return null

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            <motion.div
                style={{
                    x: springX,
                    y: springY,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                className="relative"
            >
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <Crosshair className="text-fire/40" size={24} strokeWidth={1} />
                    <motion.div
                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border border-fire/20 rounded-full"
                    />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-fire/40" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-fire/40" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-2 bg-fire/40" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-2 bg-fire/40" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 30 }}
                    className="absolute top-0 left-0 whitespace-nowrap bg-void/60 backdrop-blur-md border border-fire/30 p-3 rounded-tr-3xl rounded-br-3xl rounded-bl-3xl shadow-2xl shadow-fire/20"
                >
                    <div className="space-y-1.5 min-w-[140px]">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[8px] font-mono text-fire uppercase tracking-widest">NEURAL SCAN</span>
                            <div className="flex gap-0.5">
                                {[1, 2, 3].map(i => <div key={i} className="w-1 h-2 bg-fire/40" />)}
                            </div>
                        </div>
                        <div className="h-[1px] bg-fire/20 w-full" />
                        <div className="flex items-center gap-2">
                            <Activity size={10} className="text-fire animate-pulse" />
                            <span className="text-[9px] font-mono text-text-primary uppercase tracking-tighter">BPM: {mockBiometrics.hr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Cpu size={10} className="text-ice" />
                            <span className="text-[9px] font-mono text-text-primary uppercase tracking-tighter">LOAD: {mockBiometrics.load}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={10} className="text-fire" />
                            <span className="text-[9px] font-mono text-text-primary uppercase tracking-tighter">SYNC: {mockBiometrics.integrity.toFixed(1)}%</span>
                        </div>
                    </div>
                    <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[1px] bg-fire/40 shadow-[0_0_10px_#FF4D00]"
                    />
                </motion.div>
            </motion.div>

            <motion.div
                style={{
                    background: `radial-gradient(circle 400px at ${mouseX}px ${mouseY}px, rgba(255, 77, 0, 0.03), transparent)`,
                }}
                className="absolute inset-0"
            />
        </div>
    )
}
