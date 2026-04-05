import { apiRequest, apiRequestBlob } from './api'

type ApiEnvelope<T> = {
    success: boolean
    data: T
    total?: number
    page?: number
    limit?: number
    message?: string
}

export type ArenaMode = 'shootout' | 'accuracy' | 'speed' | 'clutch' | 'knockout'

type ArenaMatchPlayer = {
    userId: string
    username: string
    score: number
    accuracy: number
    isReady: boolean
}

type ArenaScoreboard = {
    matchId: string
    mode: ArenaMode
    round: number
    totalRounds: number
    status: string
    players: ArenaMatchPlayer[]
}

type ArenaMatch = {
    id: string
    mode: ArenaMode
    status: string
    players: ArenaMatchPlayer[]
    config: {
        maxPlayers: number
        totalRounds: number
        shotsPerRound: number
    }
}

export type HorseDifficulty = 'rookie' | 'pro' | 'allstar' | 'legend'
export type HorsePersonality = 'classic' | 'aggressive' | 'creative' | 'defensive'

type HorseChallenge = {
    id: string
    description: string
    targetZone: string
    targetTechnique: string
    difficulty: number
}

type HorseGameState = {
    game: {
        id: string
        status: 'active' | 'won' | 'lost' | 'abandoned'
        difficulty: HorseDifficulty
        score: number
    }
    round: number
    playerLetters: string
    aiLetters: string
    currentChallenge: HorseChallenge | null
    message: string
}

type DrillPack = {
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

function createClientEventId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 10)
    return `${prefix}_${Date.now().toString(36)}_${random}`
}

export const v6Service = {
    async listArenaAvailable(limit = 10): Promise<ArenaMatch[]> {
        const response = await apiRequest<ApiEnvelope<ArenaMatch[]>>(`/arena/available?limit=${limit}`)
        return response.data || []
    },

    async createArenaMatch(payload: {
        mode: ArenaMode
        maxPlayers: number
        totalRounds: number
        shotsPerRound: number
    }): Promise<ArenaMatch> {
        const response = await apiRequest<ApiEnvelope<ArenaMatch>>('/arena/create', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
        return response.data
    },

    async joinArenaMatch(matchId: string): Promise<ArenaMatch> {
        const response = await apiRequest<ApiEnvelope<ArenaMatch>>(`/arena/${matchId}/join`, {
            method: 'POST',
        })
        return response.data
    },

    async readyArenaMatch(matchId: string): Promise<void> {
        await apiRequest<ApiEnvelope<unknown>>(`/arena/${matchId}/ready`, {
            method: 'POST',
        })
    },

    async submitArenaShot(matchId: string, payload: { result: 'made' | 'missed'; zone: string }): Promise<void> {
        await apiRequest<ApiEnvelope<unknown>>(`/arena/${matchId}/shot`, {
            method: 'POST',
            body: JSON.stringify({
                ...payload,
                clientEventId: createClientEventId('arena-shot'),
            }),
        })
    },

    async getArenaScoreboard(matchId: string): Promise<ArenaScoreboard> {
        const response = await apiRequest<ApiEnvelope<ArenaScoreboard>>(`/arena/${matchId}/scoreboard`)
        return response.data
    },

    async getActiveHorseGame(): Promise<HorseGameState | null> {
        const response = await apiRequest<ApiEnvelope<HorseGameState | null>>('/horse/active')
        return response.data || null
    },

    async startHorseGame(difficulty: HorseDifficulty, aiPersonality: HorsePersonality): Promise<HorseGameState> {
        const response = await apiRequest<ApiEnvelope<HorseGameState>>('/horse/start', {
            method: 'POST',
            body: JSON.stringify({ difficulty, aiPersonality }),
        })
        return response.data
    },

    async generateHorseChallenge(gameId: string): Promise<HorseChallenge> {
        const response = await apiRequest<ApiEnvelope<HorseChallenge>>(`/horse/${gameId}/challenge`, {
            method: 'POST',
        })
        return response.data
    },

    async submitHorseAttempt(gameId: string, challengeId: string, success: boolean): Promise<HorseGameState> {
        const response = await apiRequest<ApiEnvelope<HorseGameState>>(`/horse/${gameId}/attempt`, {
            method: 'POST',
            body: JSON.stringify({ challengeId, success, similarityScore: success ? 88 : 35 }),
        })
        return response.data
    },

    async listMarketplaceDrills(search = ''): Promise<DrillPack[]> {
        const query = new URLSearchParams({
            limit: '12',
            sort: 'popular',
            ...(search.trim() ? { search: search.trim() } : {}),
        })
        const response = await apiRequest<ApiEnvelope<DrillPack[]>>(`/marketplace/drills?${query.toString()}`)
        return response.data || []
    },

    async purchaseDrill(packId: string): Promise<void> {
        await apiRequest<ApiEnvelope<unknown>>(`/marketplace/drills/${packId}/purchase`, {
            method: 'POST',
        })
    },

    async downloadSessionPdf(sessionId: string): Promise<Blob> {
        return apiRequestBlob(`/reports/session/${encodeURIComponent(sessionId)}/pdf`, {
            method: 'GET',
        })
    },
}

export type {
    ArenaMatch,
    ArenaScoreboard,
    HorseGameState,
    HorseChallenge,
    DrillPack,
}
