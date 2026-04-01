'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Cpu,
    Wind,
    Zap,
    Shield,
    Crosshair,
    Settings,
    Activity,
    Box
} from 'lucide-react'

function bumpTwinVersion(version: string): string {
    const match = version.match(/v?(\d+)\.(\d+)\.(\d+)(.*)/i)
    if (!match) {
        return version
    }

    const major = Number(match[1])
    const minor = Number(match[2])
    const patch = Number(match[3])
    const suffix = match[4] || ''
    return `v${major}.${minor}.${patch + 1}${suffix}`
}

// Mock fetching twin data
const fetchTwinData = async () => {
    return new Promise<any>((resolve) => {
        setTimeout(() => {
            resolve({
                version: "v2.4.0-STABLE",
                twinId: "USER_442_TWIN",
                status: "FULLY SYNCHRONIZED",
                attributes: [
                    { name: 'EXPLOSIVENESS', value: 88, icon: Zap, color: 'text-fire' },
                    { name: 'LATERAL SPEED', value: 72, icon: Wind, color: 'text-ice' },
                    { name: 'SKELETAL DRIFT', value: 0.12, icon: Shield, color: 'text-green-400', unit: '%' },
                    { name: 'NEURAL SYNC', value: 96, icon: Crosshair, color: 'text-fire' },
                ]
            });
        }, 1000);
    });
};

export default function TwinPage() {
    const [twinData, setTwinData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isRecalibrating, setIsRecalibrating] = useState(false)
    const [recalibrationProgress, setRecalibrationProgress] = useState(0)
    const [isUpgrading, setIsUpgrading] = useState(false)
    const [systemMessage, setSystemMessage] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true;
        fetchTwinData().then(data => {
            if (mounted) {
                setTwinData(data);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!isRecalibrating) {
            return
        }

        const interval = window.setInterval(() => {
            setRecalibrationProgress((current) => {
                const next = Math.min(100, current + 20)
                if (next === 100) {
                    window.clearInterval(interval)
                    setIsRecalibrating(false)
                    setSystemMessage('Recalibration complete. Neural sync now optimized.')
                    setTwinData((currentTwin: any) => {
                        if (!currentTwin) {
                            return currentTwin
                        }
                        return {
                            ...currentTwin,
                            status: 'RECALIBRATED // SYNCHRONIZED',
                            attributes: currentTwin.attributes.map((attribute: any) => {
                                if (typeof attribute.value !== 'number') {
                                    return attribute
                                }

                                const boosted = attribute.name === 'SKELETAL DRIFT'
                                    ? Math.max(0.05, Number((attribute.value - 0.01).toFixed(2)))
                                    : Math.min(99, Math.round(attribute.value + 1))
                                return { ...attribute, value: boosted }
                            }),
                        }
                    })
                }
                return next
            })
        }, 300)

        return () => window.clearInterval(interval)
    }, [isRecalibrating])

    const handleRecalibrate = () => {
        if (isRecalibrating) {
            return
        }
        setSystemMessage('Running biometric recalibration sequence...')
        setRecalibrationProgress(0)
        setIsRecalibrating(true)
    }

    const handleUpgrade = () => {
        if (isUpgrading) {
            return
        }

        setIsUpgrading(true)
        setSystemMessage('Downloading neural engine firmware package...')

        window.setTimeout(() => {
            setTwinData((currentTwin: any) => {
                if (!currentTwin) {
                    return currentTwin
                }
                return {
                    ...currentTwin,
                    version: bumpTwinVersion(currentTwin.version),
                    status: 'ENGINE UPGRADED // SYNCHRONIZED',
                }
            })
            setIsUpgrading(false)
            setSystemMessage('Neural engine update installed successfully.')
        }, 1200)
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Box size={48} className="text-ice animate-spin-slow mx-auto opacity-50" />
                    <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Constructing Digital Twin...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-black italic uppercase italic">Neural <span className="text-fire">Digital Twin</span></h1>
                <p className="text-text-tertiary font-mono text-[10px] uppercase tracking-widest mt-1">Version: {twinData.version} // ID: {twinData.twinId}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Twin Visualization Placeholder */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 aspect-square max-h-[600px] bg-void/50 border border-white/5 rounded-[60px] flex items-center justify-center relative overflow-hidden group cursor-move"
                >
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_#FF4D00_0%,_transparent_70%)]" />
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    <div className="relative z-10 text-center pointer-events-none">
                        <Box size={100} className="text-fire/30 animate-pulse mb-6 mx-auto" />
                        <p className="text-xl font-display font-black text-white italic uppercase tracking-widest">3D SKELETAL RENDERING...</p>
                        <p className="text-xs font-mono text-text-tertiary uppercase mt-2 tracking-[0.2em]">TOUCH TO EXPLORE KINEMATICS</p>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center bg-void/80 backdrop-blur-md border border-white/5 p-6 rounded-3xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-fire/10 rounded-full flex items-center justify-center">
                                <Cpu className="text-fire" size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-mono text-text-tertiary uppercase">TWIN STATUS</p>
                                <p className="text-sm font-display font-black text-white italic uppercase">{twinData.status}</p>
                                {isRecalibrating && (
                                    <div className="mt-2 w-44">
                                        <div className="h-1.5 bg-void rounded-full overflow-hidden border border-white/10">
                                            <div
                                                className="h-full bg-fire transition-all"
                                                style={{ width: `${recalibrationProgress}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-fire">
                                            recalibrating {recalibrationProgress}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleRecalibrate}
                            disabled={isRecalibrating}
                            className="bg-surface hover:bg-fire/10 text-xs font-mono px-4 py-2 rounded-xl transition-all uppercase tracking-widest border border-white/10 hover:border-fire/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRecalibrating ? 'RE-CALIBRATING...' : 'RE-CALIBRATE'}
                        </button>
                    </div>
                </motion.div>

                {/* Attributes */}
                <div className="space-y-6 flex flex-col h-full">
                    {twinData.attributes.map((attr: any, i: number) => (
                        <motion.div
                            key={attr.name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-surface border border-white/5 p-6 rounded-[32px] flex-1 flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-2xl bg-void border border-white/5 ${attr.color}`}>
                                    <attr.icon size={20} />
                                </div>
                                <span className="text-2xl font-display font-black tracking-tight">{attr.value}{attr.unit || ''}</span>
                            </div>
                            <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest mb-2">{attr.name}</p>
                            <div className="h-1 bg-void rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: typeof attr.value === 'number' ? `${Math.min(attr.value, 100)}%` : '100%' }}
                                    className={`h-full ${attr.color.replace('text', 'bg')} opacity-60`}
                                />
                            </div>
                        </motion.div>
                    ))}

                    <button
                        onClick={handleUpgrade}
                        disabled={isUpgrading}
                        className="bg-white text-void font-display font-black py-4 rounded-3xl uppercase italic tracking-widest hover:bg-fire hover:text-white transition-all shadow-xl shadow-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isUpgrading ? 'UPGRADING...' : 'UPGRADE NEURAL ENGINE'}
                    </button>

                    {systemMessage && (
                        <div className="rounded-2xl border border-fire/20 bg-fire/10 p-4">
                            <p className="text-xs font-mono uppercase tracking-widest text-fire">System</p>
                            <p className="mt-2 text-sm text-text-secondary">{systemMessage}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
