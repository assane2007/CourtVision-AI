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

export interface TwinDrillRecommendation {
    id: string
    rank: number
    title: string
    objective: string
    rationale: string
    category: string
    priority: number
    linkedWeakness?: string
    zoneFocus?: string
    sessionsPerWeek: number
    minutesPerSession: number
    targetMetric: string
    drill: {
        name: string
        sets: number
        reps: string
        intensity: 'low' | 'moderate' | 'high' | 'max'
        tips: string[]
    }
}

// ==========================================
// Tabs de l'écran Twin
// ==========================================

export type TwinTab = 'overview' | 'attributes' | 'matchup' | 'evolution'

function mapDrillRecommendations(data: any[]): TwinDrillRecommendation[] {
    return data
        .map((rec: any, index: number): TwinDrillRecommendation => ({
            id: String(rec?.id ?? `drill-${index + 1}`),
            rank: Number(rec?.rank ?? index + 1),
            title: String(rec?.title ?? 'Recommendation'),
            objective: String(rec?.objective ?? 'Focus on this area to improve your Twin profile.'),
            rationale: String(rec?.rationale ?? ''),
            category: String(rec?.category ?? 'shooting'),
            priority: Math.max(0, Math.min(100, Number(rec?.priority ?? 0))),
            linkedWeakness: rec?.linkedWeakness ? String(rec.linkedWeakness) : undefined,
            zoneFocus: rec?.zoneFocus ? String(rec.zoneFocus) : undefined,
            sessionsPerWeek: Math.max(1, Number(rec?.sessionsPerWeek ?? 3)),
            minutesPerSession: Math.max(10, Number(rec?.minutesPerSession ?? 20)),
            targetMetric: String(rec?.targetMetric ?? 'performance'),
            drill: {
                name: String(rec?.drill?.name ?? 'Custom drill'),
                sets: Math.max(1, Number(rec?.drill?.sets ?? 3)),
                reps: String(rec?.drill?.reps ?? '10 reps'),
                intensity: ['low', 'moderate', 'high', 'max'].includes(String(rec?.drill?.intensity ?? '').toLowerCase())
                    ? String(rec?.drill?.intensity).toLowerCase() as TwinDrillRecommendation['drill']['intensity']
                    : 'moderate',
                tips: Array.isArray(rec?.drill?.tips)
                    ? rec.drill.tips.map((tip: any) => String(tip)).slice(0, 3)
                    : [],
            },
        }))
        .sort((a, b) => a.rank - b.rank)
}

// ==========================================
// Hook
// ==========================================

export function useDigitalTwin() {
    const [profile, setProfile] = useState<TwinProfile | null>(null)
    const [insights, setInsights] = useState<string | null>(null)
    const [simulation, setSimulation] = useState<MatchupSimulation | null>(null)
    const [drillRecommendations, setDrillRecommendations] = useState<TwinDrillRecommendation[]>([])
    const [activeTab, setActiveTab] = useState<TwinTab>('overview')
    const [loading, setLoading] = useState(true)
    const [loadingDrillRecommendations, setLoadingDrillRecommendations] = useState(false)
    const [rebuilding, setRebuilding] = useState(false)
    const [simulating, setSimulating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ======= Fetch drill recommendations =======
    const fetchDrillRecommendations = useCallback(async (limit: number = 5) => {
        try {
            setLoadingDrillRecommendations(true)
            const res = await apiFetch<{ data?: { recommendations?: any[] } }>(`/api/twin/drills?limit=${limit}`)
            const recommendations = Array.isArray(res?.data?.recommendations)
                ? mapDrillRecommendations(res.data.recommendations)
                : []
            setDrillRecommendations(recommendations)
            return recommendations
        } catch {
            setDrillRecommendations([])
            return []
        } finally {
            setLoadingDrillRecommendations(false)
        }
    }, [])

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

            await fetchDrillRecommendations(5)
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors du chargement du Twin')
        } finally {
            setLoading(false)
        }
    }, [fetchDrillRecommendations])

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

            await fetchDrillRecommendations(5)
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors de la reconstruction')
        } finally {
            setRebuilding(false)
        }
    }, [fetchDrillRecommendations])

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
        drillRecommendations,
        activeTab,
        loading,
        loadingDrillRecommendations,
        rebuilding,
        simulating,
        error,

        // Actions
        setActiveTab,
        fetchProfile,
        rebuild,
        simulateVsNBA,
        simulateVsUser,
        fetchDrillRecommendations,
        clearSimulation: () => setSimulation(null),
    }
}
