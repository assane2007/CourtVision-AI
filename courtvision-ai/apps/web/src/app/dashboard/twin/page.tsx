'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
    Cpu,
    Wind,
    Zap,
    Shield,
    Crosshair,
    Box,
    type LucideIcon,
} from 'lucide-react'
import { apiRequest } from '@/services/api'

type TwinApiCategory = {
    category?: string
    overallScore?: number
}

type TwinApiProfile = {
    modelVersion?: string
    sessionCount?: number
    overallRating?: number
    attributeCategories?: TwinApiCategory[]
}

type TwinApiEntity = {
    user_id?: string
    model_version?: string
    twin_profile?: TwinApiProfile
}

type TwinApiPayload = {
    profile?: TwinApiProfile
    twin?: TwinApiEntity
}

type TwinViewAttribute = {
    name: string
    value: number
    icon: LucideIcon
    color: string
    unit?: string
}

type TwinViewData = {
    version: string
    twinId: string
    status: string
    attributes: TwinViewAttribute[]
}

function formatTwinId(userId: string | undefined): string {
    if (!userId) {
        return 'UNAVAILABLE'
    }
    return `USER_${userId.slice(0, 8).toUpperCase()}`
}

function getAttributeVisual(label: string): { icon: LucideIcon; color: string } {
    const normalized = label.toLowerCase()

    if (normalized.includes('tir') || normalized.includes('shoot')) {
        return { icon: Crosshair, color: 'text-fire' }
    }
    if (normalized.includes('mental')) {
        return { icon: Shield, color: 'text-green-400' }
    }
    if (normalized.includes('physique') || normalized.includes('physical')) {
        return { icon: Zap, color: 'text-fire' }
    }
    if (normalized.includes('tactique') || normalized.includes('tactic')) {
        return { icon: Wind, color: 'text-ice' }
    }

    return { icon: Cpu, color: 'text-fire' }
}

function mapTwinData(payload: TwinApiPayload | undefined): TwinViewData {
    const profile = payload?.profile ?? payload?.twin?.twin_profile
    if (!profile) {
        throw new Error('Twin profile unavailable for this account.')
    }

    const categories = Array.isArray(profile.attributeCategories)
        ? profile.attributeCategories
        : []

    const attributes: TwinViewAttribute[] = categories.slice(0, 4).map((category, index) => {
        const label = String(category.category ?? `Attribute ${index + 1}`).toUpperCase()
        const numericValue = Number(category.overallScore ?? profile.overallRating ?? 0)
        const { icon, color } = getAttributeVisual(label)
        return {
            name: label,
            value: Math.max(0, Math.min(100, Math.round(numericValue))),
            icon,
            color,
        }
    })

    if (attributes.length === 0 && typeof profile.overallRating === 'number') {
        attributes.push({
            name: 'OVERALL RATING',
            value: Math.max(0, Math.min(100, Math.round(profile.overallRating))),
            icon: Cpu,
            color: 'text-fire',
        })
    }

    const sessionCount = Number(profile.sessionCount ?? 0)

    return {
        version: String(profile.modelVersion ?? payload?.twin?.model_version ?? 'UNKNOWN'),
        twinId: formatTwinId(payload?.twin?.user_id),
        status: sessionCount > 0
            ? 'FULLY SYNCHRONIZED'
            : 'INITIALIZED // COLLECTING DATA',
        attributes,
    }
}

async function fetchTwinData(): Promise<TwinViewData> {
    const response = await apiRequest<{ data?: TwinApiPayload }>('/twin/me')
    return mapTwinData(response.data)
}

async function rebuildTwinData(): Promise<TwinViewData> {
    const response = await apiRequest<{ data?: TwinApiPayload }>('/twin/rebuild', {
        method: 'POST',
    })
    return mapTwinData(response.data)
}

export default function TwinPage() {
    const [twinData, setTwinData] = useState<TwinViewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRecalibrating, setIsRecalibrating] = useState(false)
    const [recalibrationProgress, setRecalibrationProgress] = useState(0)
    const [isUpgrading, setIsUpgrading] = useState(false)
    const [systemMessage, setSystemMessage] = useState<string | null>(null)

    const loadTwin = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchTwinData()
            setTwinData(data)
        } catch (loadError: unknown) {
            const message = loadError instanceof Error
                ? loadError.message
                : 'Failed to load digital twin data.'
            setError(message)
            setTwinData(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadTwin()
    }, [loadTwin])

    useEffect(() => {
        if (!isRecalibrating) {
            return
        }

        const interval = window.setInterval(() => {
            setRecalibrationProgress((current) => {
                if (current >= 88) {
                    return current
                }
                return Math.min(88, current + 8)
            })
        }, 250)

        return () => window.clearInterval(interval)
    }, [isRecalibrating])

    const handleRecalibrate = async () => {
        if (isRecalibrating) {
            return
        }

        setSystemMessage('Running biometric recalibration sequence...')
        setRecalibrationProgress(8)
        setIsRecalibrating(true)

        try {
            const rebuiltData = await rebuildTwinData()
            setTwinData(rebuiltData)
            setRecalibrationProgress(100)
            setSystemMessage('Recalibration complete. Twin rebuilt from latest sessions.')
        } catch (rebuildError: unknown) {
            const message = rebuildError instanceof Error
                ? rebuildError.message
                : 'Recalibration failed.'
            setSystemMessage(`Recalibration failed: ${message}`)
        } finally {
            window.setTimeout(() => {
                setIsRecalibrating(false)
                setRecalibrationProgress(0)
            }, 450)
        }
    }

    const handleUpgrade = async () => {
        if (isUpgrading) {
            return
        }

        setIsUpgrading(true)
        setSystemMessage('Synchronizing AI insights...')

        try {
            const response = await apiRequest<{ data?: { insights?: string; cached?: boolean } }>('/twin/insights')
            const insightsMessage = response.data?.cached
                ? 'Insights synchronized from cache.'
                : 'New AI insights generated and synchronized.'
            setSystemMessage(insightsMessage)
        } catch (insightsError: unknown) {
            const message = insightsError instanceof Error
                ? insightsError.message
                : 'Insights synchronization failed.'
            setSystemMessage(`Insights synchronization failed: ${message}`)
        } finally {
            setIsUpgrading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Box size={48} className="text-ice animate-spin-slow mx-auto opacity-50" />
                    <p className="font-mono text-text-tertiary uppercase tracking-[0.3em]">Constructing Digital Twin...</p>
                </div>
            </div>
        )
    }

    if (error || !twinData) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="max-w-md text-center space-y-4 rounded-3xl border border-fire/20 bg-fire/10 p-8">
                    <p className="font-display text-xl font-black italic uppercase text-fire">Twin Unavailable</p>
                    <p className="text-sm text-text-secondary">{error ?? 'Unable to load twin data right now.'}</p>
                    <button
                        onClick={() => { void loadTwin() }}
                        className="bg-white text-void hover:bg-fire hover:text-white px-6 py-3 rounded-2xl font-bold font-mono text-xs uppercase tracking-widest transition-all"
                    >
                        RETRY
                    </button>
                </div>
            </div>
        )
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
                    {twinData.attributes.map((attr, i) => (
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
                                    animate={{ width: `${Math.min(attr.value, 100)}%` }}
                                    className={`h-full ${attr.color.replace('text', 'bg')} opacity-60`}
                                />
                            </div>
                        </motion.div>
                    ))}

                    {twinData.attributes.length === 0 && (
                        <div className="rounded-3xl border border-white/10 bg-surface p-6 text-center">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary">No attribute categories yet</p>
                            <p className="mt-2 text-sm text-text-secondary">Analyze more sessions to unlock detailed twin attributes.</p>
                        </div>
                    )}

                    <button
                        onClick={handleUpgrade}
                        disabled={isUpgrading}
                        className="bg-white text-void font-display font-black py-4 rounded-3xl uppercase italic tracking-widest hover:bg-fire hover:text-white transition-all shadow-xl shadow-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isUpgrading ? 'SYNCING...' : 'SYNC AI INSIGHTS'}
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
