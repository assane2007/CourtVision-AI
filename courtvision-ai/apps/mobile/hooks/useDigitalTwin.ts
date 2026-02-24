import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../lib/api'

// ==========================================
// Types locaux (miroirs des types API)
// ==========================================

export interface TwinAttribute {
    name: string
    value: number
    trend: 'up' | 'stable' | 'down'
    delta: number
    confidence: number
}

export interface TwinAttributeCategory {
    category: string
    emoji: string
    attributes: TwinAttribute[]
    overallScore: number
}

export interface PlayStyleProfile {
    primary: string
    secondary: string | null
    confidence: number
    description: string
    nbaArchetype: string
    traits: string[]
}

export interface TwinTrait {
    id: string
    label: string
    description: string
    type: 'strength' | 'weakness'
    severity: number
    category: string
    evidenceCount: number
    trend: 'improving' | 'stable' | 'declining'
    drillRecommendation?: string
}

export interface NBAComparison {
    playerName: string
    similarity: number
    matchingTraits: string[]
    differenceAreas: string[]
}

export interface ComfortZone {
    zone: string
    attempts: number
    efficiency: number
    frequency: number
    isComfort: boolean
}

export interface TwinEvolutionPoint {
    date: string
    overallRating: number
    shootingRating: number
    mentalRating: number
    physicalRating: number
    sessionCount: number
}

export interface MentalProfile {
    resilience: number
    clutchFactor: number
    consistency: number
    pressureResponse: 'thrives' | 'neutral' | 'struggles'
    fatigueResistance: number
}

export interface PoseSignature {
    avgElbowAngle: number
    avgReleaseHeight: number
    avgShoulderPosture: number
    dominantHand: 'right' | 'left'
}

export interface TwinProfile {
    modelVersion: string
    updatedAt: string
    sessionCount: number
    overallRating: number
    attributeCategories: TwinAttributeCategory[]
    playStyle: PlayStyleProfile
    strengths: TwinTrait[]
    weaknesses: TwinTrait[]
    nbaComparisons: NBAComparison[]
    comfortZones: ComfortZone[]
    evolution: TwinEvolutionPoint[]
    preferredZones: Record<string, number>
    poseSignature: PoseSignature
    mentalProfile: MentalProfile
}

export interface MatchupSimulation {
    opponent: string
    winProbability: number
    advantages: string[]
    vulnerabilities: string[]
    gameplan: string[]
    predictedScore: { player: number; opponent: number }
    keyMatchups: { area: string; edge: 'player' | 'opponent' | 'even' }[]
}

// ==========================================
// Tabs de l'écran Twin
// ==========================================

export type TwinTab = 'overview' | 'attributes' | 'matchup' | 'evolution'

// ==========================================
// Hook
// ==========================================

export function useDigitalTwin() {
    const [profile, setProfile] = useState<TwinProfile | null>(null)
    const [insights, setInsights] = useState<string | null>(null)
    const [simulation, setSimulation] = useState<MatchupSimulation | null>(null)
    const [activeTab, setActiveTab] = useState<TwinTab>('overview')
    const [loading, setLoading] = useState(true)
    const [rebuilding, setRebuilding] = useState(false)
    const [simulating, setSimulating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ======= Fetch profile =======
    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await apiFetch<{ data: any }>('/api/twin/me')
            const data = res?.data
            if (data?.profile) {
                setProfile(data.profile)
                setInsights(data.insights ?? null)
            } else if (data?.twin?.twin_profile) {
                setProfile(data.twin.twin_profile)
                setInsights(data.twin.ai_insights ?? null)
            }
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors du chargement du Twin')
        } finally {
            setLoading(false)
        }
    }, [])

    // ======= Rebuild =======
    const rebuild = useCallback(async () => {
        try {
            setRebuilding(true)
            setError(null)
            const res = await apiFetch<{ data: any }>('/api/twin/rebuild', { method: 'POST' })
            const data = res?.data
            if (data?.profile) {
                setProfile(data.profile)
                setInsights(data.insights ?? null)
            }
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors de la reconstruction')
        } finally {
            setRebuilding(false)
        }
    }, [])

    // ======= Simulate vs NBA =======
    const simulateVsNBA = useCallback(async (playerName: string) => {
        try {
            setSimulating(true)
            setSimulation(null)
            const res = await apiFetch<{ data: any }>('/api/twin/simulate', {
                method: 'POST',
                body: JSON.stringify({ opponent: 'nba', opponentName: playerName }),
            })
            if (res?.data) {
                setSimulation(res.data)
            }
        } catch (err: any) {
            setError(err.message ?? 'Erreur de simulation')
        } finally {
            setSimulating(false)
        }
    }, [])

    // ======= Simulate vs user =======
    const simulateVsUser = useCallback(async (userId: string) => {
        try {
            setSimulating(true)
            setSimulation(null)
            const res = await apiFetch<{ data: any }>('/api/twin/simulate', {
                method: 'POST',
                body: JSON.stringify({ opponent: 'user', opponentId: userId }),
            })
            if (res?.data) {
                setSimulation(res.data)
            }
        } catch (err: any) {
            setError(err.message ?? 'Erreur de simulation')
        } finally {
            setSimulating(false)
        }
    }, [])

    // ======= Auto-fetch =======
    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    return {
        // State
        profile,
        insights,
        simulation,
        activeTab,
        loading,
        rebuilding,
        simulating,
        error,

        // Actions
        setActiveTab,
        fetchProfile,
        rebuild,
        simulateVsNBA,
        simulateVsUser,
        clearSimulation: () => setSimulation(null),
    }
}
