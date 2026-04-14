import { useCallback, useEffect, useState } from 'react'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { API_BASE_URL, api, getAuthToken } from '../lib/api'

type ApiEnvelope<T> = {
    success: boolean
    data: T
    total?: number
    page?: number
    limit?: number
    message?: string
}

export type V6ArenaMode = 'shootout' | 'accuracy' | 'speed' | 'clutch' | 'knockout'

export type V6ArenaPlayer = {
    userId: string
    username: string
    score: number
    accuracy: number
    isReady: boolean
}

export type V6ArenaMatch = {
    id: string
    mode: V6ArenaMode
    status: string
    players: V6ArenaPlayer[]
    config: {
        maxPlayers: number
        totalRounds: number
        shotsPerRound: number
    }
}

export type V6ArenaScoreboard = {
    matchId: string
    mode: V6ArenaMode
    round: number
    totalRounds: number
    status: string
    players: V6ArenaPlayer[]
}

export type V6HorseDifficulty = 'rookie' | 'pro' | 'allstar' | 'legend'
export type V6HorsePersonality = 'classic' | 'aggressive' | 'creative' | 'defensive'

export type V6HorseChallenge = {
    id: string
    description: string
    targetZone: string
    targetTechnique: string
    difficulty: number
}

export type V6HorseState = {
    game: {
        id: string
        status: 'active' | 'won' | 'lost' | 'abandoned'
        difficulty: V6HorseDifficulty
        score: number
    }
    round: number
    playerLetters: string
    aiLetters: string
    currentChallenge: V6HorseChallenge | null
    message: string
}

export type V6DrillPack = {
    id: string
    title: string
    description: string
    category: string
    difficulty: string
    priceCents: number
    rating: number
    salesCount: number
    isPurchased?: boolean
}

type V6ControlCenterOptions = {
    arena?: boolean
    horse?: boolean
    marketplace?: boolean
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
        return error.message || fallback
    }
    return fallback
}

function createClientEventId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10)
    return `${prefix}_${Date.now().toString(36)}_${random}`
}

export function useV6ControlCenter(options: V6ControlCenterOptions = {}) {
    const enableArena = options.arena ?? true
    const enableHorse = options.horse ?? true
    const enableMarketplace = options.marketplace ?? true

    const [arenaMatches, setArenaMatches] = useState<V6ArenaMatch[]>([])
    const [arenaLoading, setArenaLoading] = useState(false)
    const [arenaActionLoading, setArenaActionLoading] = useState(false)
    const [arenaError, setArenaError] = useState<string | null>(null)
    const [activeArenaMatchId, setActiveArenaMatchId] = useState<string | null>(null)
    const [arenaScoreboard, setArenaScoreboard] = useState<V6ArenaScoreboard | null>(null)

    const [horseState, setHorseState] = useState<V6HorseState | null>(null)
    const [horseLoading, setHorseLoading] = useState(false)
    const [horseActionLoading, setHorseActionLoading] = useState(false)
    const [horseError, setHorseError] = useState<string | null>(null)

    const [drills, setDrills] = useState<V6DrillPack[]>([])
    const [drillsLoading, setDrillsLoading] = useState(false)
    const [drillsActionLoading, setDrillsActionLoading] = useState(false)
    const [drillsError, setDrillsError] = useState<string | null>(null)

    const [reportsLoading, setReportsLoading] = useState(false)
    const [reportsError, setReportsError] = useState<string | null>(null)

    const loadArenaMatches = useCallback(async (limit = 8) => {
        setArenaLoading(true)
        setArenaError(null)
        try {
            const response = await api.get<ApiEnvelope<V6ArenaMatch[]>>(`/api/arena/available?limit=${limit}`)
            setArenaMatches(response.data || [])
        } catch (error) {
            setArenaError(toErrorMessage(error, 'Failed to load arena matches'))
            setArenaMatches([])
        } finally {
            setArenaLoading(false)
        }
    }, [])

    const refreshArenaScoreboard = useCallback(async (matchId: string) => {
        try {
            const response = await api.get<ApiEnvelope<V6ArenaScoreboard>>(`/api/arena/${matchId}/scoreboard`)
            setArenaScoreboard(response.data)
        } catch (error) {
            setArenaError(toErrorMessage(error, 'Failed to load arena scoreboard'))
            setArenaScoreboard(null)
        }
    }, [])

    const createArenaMatch = useCallback(async (payload: {
        mode: V6ArenaMode
        maxPlayers: number
        totalRounds: number
        shotsPerRound: number
    }) => {
        setArenaActionLoading(true)
        setArenaError(null)
        try {
            const response = await api.post<ApiEnvelope<V6ArenaMatch>>('/api/arena/create', payload)
            const createdMatch = response.data
            setActiveArenaMatchId(createdMatch.id)
            await Promise.all([
                loadArenaMatches(),
                refreshArenaScoreboard(createdMatch.id),
            ])
            return createdMatch
        } finally {
            setArenaActionLoading(false)
        }
    }, [loadArenaMatches, refreshArenaScoreboard])

    const joinArenaMatch = useCallback(async (matchId: string) => {
        setArenaActionLoading(true)
        setArenaError(null)
        try {
            await api.post<ApiEnvelope<V6ArenaMatch>>(`/api/arena/${matchId}/join`, {})
            setActiveArenaMatchId(matchId)
            await refreshArenaScoreboard(matchId)
        } catch (error) {
            setArenaError(toErrorMessage(error, 'Failed to join arena match'))
            throw error
        } finally {
            setArenaActionLoading(false)
        }
    }, [refreshArenaScoreboard])

    const readyArenaMatch = useCallback(async () => {
        if (!activeArenaMatchId) {
            return
        }

        setArenaActionLoading(true)
        setArenaError(null)
        try {
            await api.post<ApiEnvelope<unknown>>(`/api/arena/${activeArenaMatchId}/ready`, {})
            await refreshArenaScoreboard(activeArenaMatchId)
        } catch (error) {
            setArenaError(toErrorMessage(error, 'Failed to mark arena ready'))
            throw error
        } finally {
            setArenaActionLoading(false)
        }
    }, [activeArenaMatchId, refreshArenaScoreboard])

    const submitArenaShot = useCallback(async (result: 'made' | 'missed', zone: string) => {
        if (!activeArenaMatchId) {
            return
        }

        setArenaActionLoading(true)
        setArenaError(null)
        try {
            await api.post<ApiEnvelope<unknown>>(`/api/arena/${activeArenaMatchId}/shot`, {
                result,
                zone,
                clientEventId: createClientEventId('mobile-arena-shot'),
            })
            await refreshArenaScoreboard(activeArenaMatchId)
        } catch (error) {
            setArenaError(toErrorMessage(error, 'Failed to submit arena shot'))
            throw error
        } finally {
            setArenaActionLoading(false)
        }
    }, [activeArenaMatchId, refreshArenaScoreboard])

    useEffect(() => {
        if (!activeArenaMatchId) {
            setArenaScoreboard(null)
            return
        }

        void refreshArenaScoreboard(activeArenaMatchId)
        const timer = setInterval(() => {
            void refreshArenaScoreboard(activeArenaMatchId)
        }, 3500)

        return () => clearInterval(timer)
    }, [activeArenaMatchId, refreshArenaScoreboard])

    const loadHorseState = useCallback(async () => {
        setHorseLoading(true)
        setHorseError(null)
        try {
            const response = await api.get<ApiEnvelope<V6HorseState | null>>('/api/horse/active')
            setHorseState(response.data || null)
        } catch (error) {
            setHorseError(toErrorMessage(error, 'Failed to load HORSE state'))
            setHorseState(null)
        } finally {
            setHorseLoading(false)
        }
    }, [])

    const startHorseGame = useCallback(async (difficulty: V6HorseDifficulty, aiPersonality: V6HorsePersonality) => {
        setHorseActionLoading(true)
        setHorseError(null)
        try {
            const response = await api.post<ApiEnvelope<V6HorseState>>('/api/horse/start', {
                difficulty,
                aiPersonality,
            })
            setHorseState(response.data)
            return response.data
        } catch (error) {
            setHorseError(toErrorMessage(error, 'Failed to start HORSE game'))
            throw error
        } finally {
            setHorseActionLoading(false)
        }
    }, [])

    const generateHorseChallenge = useCallback(async () => {
        if (!horseState?.game.id) {
            return null
        }

        setHorseActionLoading(true)
        setHorseError(null)
        try {
            const response = await api.post<ApiEnvelope<V6HorseChallenge>>(`/api/horse/${horseState.game.id}/challenge`, {})
            setHorseState((prev) => {
                if (!prev) {
                    return prev
                }
                return {
                    ...prev,
                    currentChallenge: response.data,
                    message: 'New challenge generated.',
                }
            })
            return response.data
        } catch (error) {
            setHorseError(toErrorMessage(error, 'Failed to generate HORSE challenge'))
            throw error
        } finally {
            setHorseActionLoading(false)
        }
    }, [horseState?.game.id])

    const submitHorseAttempt = useCallback(async (challengeId: string, success: boolean) => {
        if (!horseState?.game.id) {
            return
        }

        setHorseActionLoading(true)
        setHorseError(null)
        try {
            const response = await api.post<ApiEnvelope<V6HorseState>>(`/api/horse/${horseState.game.id}/attempt`, {
                challengeId,
                success,
                similarityScore: success ? 88 : 35,
            })
            setHorseState(response.data)
            return response.data
        } catch (error) {
            setHorseError(toErrorMessage(error, 'Failed to submit HORSE attempt'))
            throw error
        } finally {
            setHorseActionLoading(false)
        }
    }, [horseState?.game.id])

    const loadMarketplace = useCallback(async (search = '') => {
        setDrillsLoading(true)
        setDrillsError(null)

        try {
            const query = new URLSearchParams({
                limit: '8',
                sort: 'popular',
                ...(search.trim() ? { search: search.trim() } : {}),
            })
            const response = await api.get<ApiEnvelope<V6DrillPack[]>>(`/api/marketplace/drills?${query.toString()}`)
            setDrills(response.data || [])
        } catch (error) {
            setDrillsError(toErrorMessage(error, 'Failed to load marketplace drills'))
            setDrills([])
        } finally {
            setDrillsLoading(false)
        }
    }, [])

    const purchaseDrill = useCallback(async (packId: string) => {
        setDrillsActionLoading(true)
        setDrillsError(null)
        try {
            await api.post<ApiEnvelope<unknown>>(`/api/marketplace/drills/${packId}/purchase`, {})
            setDrills((previous) => previous.map((pack) => (
                pack.id === packId
                    ? { ...pack, isPurchased: true }
                    : pack
            )))
        } catch (error) {
            setDrillsError(toErrorMessage(error, 'Failed to purchase drill pack'))
            throw error
        } finally {
            setDrillsActionLoading(false)
        }
    }, [])

    const downloadPdf = useCallback(async (path: string, filename: string) => {
        const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory
        if (!baseDirectory) {
            throw new Error('No writable directory available')
        }

        const token = await getAuthToken()
        const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, `${baseDirectory}${filename}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })

        if (result.status !== 200) {
            throw new Error(`Failed to download PDF (${result.status})`)
        }

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(result.uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Share CourtVision report',
            })
        }

        return result.uri
    }, [])

    const downloadSessionReportPdf = useCallback(async (sessionId: string) => {
        setReportsLoading(true)
        setReportsError(null)
        try {
            return await downloadPdf(
                `/api/reports/session/${encodeURIComponent(sessionId)}/pdf`,
                `courtvision_session_${sessionId}.pdf`
            )
        } catch (error) {
            const message = toErrorMessage(error, 'Failed to download session report')
            setReportsError(message)
            throw new Error(message)
        } finally {
            setReportsLoading(false)
        }
    }, [downloadPdf])

    const downloadScoutReportPdf = useCallback(async (userId: string) => {
        setReportsLoading(true)
        setReportsError(null)
        try {
            return await downloadPdf(
                `/api/reports/scout/${encodeURIComponent(userId)}/pdf`,
                `courtvision_scout_${userId}.pdf`
            )
        } catch (error) {
            const message = toErrorMessage(error, 'Failed to download scout report')
            setReportsError(message)
            throw new Error(message)
        } finally {
            setReportsLoading(false)
        }
    }, [downloadPdf])

    const refreshAll = useCallback(async (search = '') => {
        const jobs: Promise<unknown>[] = []

        if (enableArena) {
            jobs.push(loadArenaMatches())
        }

        if (enableHorse) {
            jobs.push(loadHorseState())
        }

        if (enableMarketplace) {
            jobs.push(loadMarketplace(search))
        }

        if (jobs.length > 0) {
            await Promise.all(jobs)
        }
    }, [enableArena, enableHorse, enableMarketplace, loadArenaMatches, loadHorseState, loadMarketplace])

    useEffect(() => {
        void refreshAll()
    }, [refreshAll])

    return {
        arenaMatches,
        arenaLoading,
        arenaActionLoading,
        arenaError,
        activeArenaMatchId,
        arenaScoreboard,
        setActiveArenaMatchId,
        loadArenaMatches,
        refreshArenaScoreboard,
        createArenaMatch,
        joinArenaMatch,
        readyArenaMatch,
        submitArenaShot,

        horseState,
        horseLoading,
        horseActionLoading,
        horseError,
        loadHorseState,
        startHorseGame,
        generateHorseChallenge,
        submitHorseAttempt,

        drills,
        drillsLoading,
        drillsActionLoading,
        drillsError,
        loadMarketplace,
        purchaseDrill,

        reportsLoading,
        reportsError,
        downloadSessionReportPdf,
        downloadScoutReportPdf,

        refreshAll,
    }
}
