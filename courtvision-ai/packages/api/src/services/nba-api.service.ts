/**
 * NBA API Service — Fetches NBA data from swar/nba_api (Python engine)
 *
 * Primary: swar/nba_api via CourtVision Python engine
 * Fallback: in-memory cache + minimal static fallback
 *
 * Provides:
 * - NBA players (real names, teams, positions)
 * - Player search
 * - NBA teams
 * - Players grouped by playstyle for HORSE challenge inspirations
 */

import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// ── Types ─────────────────────────────────────────────────────

export interface NBAPlayer {
    id: number
    firstName: string
    lastName: string
    fullName: string
    position: string
    height: string
    weight: string
    jerseyNumber: string
    college: string | null
    country: string
    draftYear: number | null
    team: NBATeam
}

export interface NBATeam {
    id: number
    conference: string
    division: string
    city: string
    name: string
    fullName: string
    abbreviation: string
}

export interface NBAPlayerStats {
    playerId: number
    playerName: string
    pts: number
    ast: number
    reb: number
    fgPct: number
    fg3Pct: number
    ftPct: number
    gamesPlayed: number
}

/** Maps challenge types to NBA player styles (populated from API) */
export interface ChallengeInspirations {
    zone_shot: string[]
    fadeaway: string[]
    stepback: string[]
    bank_shot: string[]
    swish_only: string[]
    off_dribble: string[]
    catch_and_shoot: string[]
    turnaround: string[]
    floater: string[]
    logo_shot: string[]
}

export interface NBAFieldGoalStat {
    playerId: number
    fgPct: number
}

// ── Config ────────────────────────────────────────────────────

const NBA_ENGINE_BASE = (process.env.NBA_ENGINE_URL || process.env.CV_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '')
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function parsePositiveIntEnv(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const REQUEST_TIMEOUT_MS = parsePositiveIntEnv(
    process.env.NBA_ENGINE_TIMEOUT_MS || process.env.CV_ENGINE_REQUEST_TIMEOUT_MS,
    30_000,
)

// ── In-memory Cache ───────────────────────────────────────────

interface CacheEntry<T> {
    data: T
    fetchedAt: number
}

const cache: Record<string, CacheEntry<any>> = {}

function getCached<T>(key: string): T | null {
    const entry = cache[key]
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
        delete cache[key]
        return null
    }
    return entry.data
}

function setCache<T>(key: string, data: T): void {
    cache[key] = { data, fetchedAt: Date.now() }
}

// ── HTTP Helper ───────────────────────────────────────────────

type WrappedResponse<T> = { success?: boolean; data?: T; [key: string]: unknown } | T

function unwrapData<T>(payload: WrappedResponse<T>): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: T }).data
    }
    return payload as T
}

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value)
        if (Number.isFinite(n)) return n
    }
    return fallback
}

function toNullableNumber(value: unknown): number | null {
    if (value == null) return null
    const n = toNumber(value, Number.NaN)
    return Number.isFinite(n) ? n : null
}

function toStringValue(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

async function engineFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${NBA_ENGINE_BASE}${path}`)
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value)
        }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const res = await fetch(url.toString(), {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
            },
        })

        if (!res.ok) {
            throw new Error(`NBA engine ${res.status}: ${res.statusText}`)
        }

        return await res.json() as T
    } finally {
        clearTimeout(timeout)
    }
}

// ── Mappers ───────────────────────────────────────────────────

function mapTeam(raw: unknown): NBATeam {
    const team = (raw ?? {}) as Record<string, unknown>
    return {
        id: toNumber(team.id, 0),
        conference: toStringValue(team.conference),
        division: toStringValue(team.division),
        city: toStringValue(team.city),
        name: toStringValue(team.name),
        fullName: toStringValue(team.full_name) || toStringValue(team.fullName),
        abbreviation: toStringValue(team.abbreviation),
    }
}

function mapPlayer(raw: unknown): NBAPlayer {
    const player = (raw ?? {}) as Record<string, unknown>
    const firstName = toStringValue(player.first_name) || toStringValue(player.firstName)
    const lastName = toStringValue(player.last_name) || toStringValue(player.lastName)
    const fullName = toStringValue(player.full_name) || toStringValue(player.fullName) || `${firstName} ${lastName}`.trim()

    const collegeValue = player.college
    const college = typeof collegeValue === 'string' && collegeValue.trim() !== ''
        ? collegeValue
        : null

    return {
        id: toNumber(player.id, 0),
        firstName,
        lastName,
        fullName,
        position: toStringValue(player.position),
        height: toStringValue(player.height),
        weight: toStringValue(player.weight),
        jerseyNumber: toStringValue(player.jersey_number) || toStringValue(player.jerseyNumber),
        college,
        country: toStringValue(player.country) || 'USA',
        draftYear: toNullableNumber(player.draft_year ?? player.draftYear),
        team: mapTeam(player.team),
    }
}

function mapInspirations(raw: unknown): ChallengeInspirations {
    const data = (raw ?? {}) as Record<string, unknown>
    const toNames = (key: keyof ChallengeInspirations): string[] => {
        const value = data[key]
        if (!Array.isArray(value)) return []
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    }

    return {
        zone_shot: toNames('zone_shot'),
        fadeaway: toNames('fadeaway'),
        stepback: toNames('stepback'),
        bank_shot: toNames('bank_shot'),
        swish_only: toNames('swish_only'),
        off_dribble: toNames('off_dribble'),
        catch_and_shoot: toNames('catch_and_shoot'),
        turnaround: toNames('turnaround'),
        floater: toNames('floater'),
        logo_shot: toNames('logo_shot'),
    }
}

// ── Minimal Static Fallback (used only when API is unreachable) ──

const FALLBACK_INSPIRATIONS: ChallengeInspirations = {
    zone_shot: ['Ray Allen', 'Klay Thompson', 'Reggie Miller'],
    fadeaway: ['Michael Jordan', 'Kobe Bryant', 'Dirk Nowitzki'],
    stepback: ['James Harden', 'Luka Dončić', 'Trae Young'],
    bank_shot: ['Tim Duncan', 'Tony Parker', 'Dwyane Wade'],
    swish_only: ['Stephen Curry', 'Kevin Durant', 'Devin Booker'],
    off_dribble: ['Chris Paul', 'Kyrie Irving', 'Damian Lillard'],
    catch_and_shoot: ['Klay Thompson', 'JJ Redick', 'Duncan Robinson'],
    turnaround: ['Hakeem Olajuwon', 'Kevin McHale', 'Nikola Jokić'],
    floater: ['Tony Parker', 'Trae Young', 'Derrick Rose'],
    logo_shot: ['Stephen Curry', 'Damian Lillard', 'Trae Young'],
}

interface EngineFgPctRow {
    player_id?: number
    playerId?: number
    fg_pct?: number
    fgPct?: number
}

// ── NBA API Service ───────────────────────────────────────────

export class NbaApiService {
    /**
     * Search NBA players by name
     */
    async searchPlayers(search: string, perPage = 10): Promise<NBAPlayer[]> {
        const cacheKey = `players_search_${search}_${perPage}`
        const cached = getCached<NBAPlayer[]>(cacheKey)
        if (cached) return cached

        try {
            const payload = await engineFetch<WrappedResponse<unknown[]>>('/nba/players/search', {
                q: search,
                limit: String(perPage),
            })
            const rawPlayers = unwrapData<unknown[]>(payload)
            const players = Array.isArray(rawPlayers) ? rawPlayers.map(mapPlayer) : []
            setCache(cacheKey, players)
            return players
        } catch (err) {
            logger.warn({ err, search }, '[NBA API] searchPlayers failed, returning empty')
            return []
        }
    }

    /**
     * Get all NBA teams
     */
    async getTeams(): Promise<NBATeam[]> {
        const cacheKey = 'teams_all'
        const cached = getCached<NBATeam[]>(cacheKey)
        if (cached) return cached

        try {
            const payload = await engineFetch<WrappedResponse<unknown[]>>('/nba/teams')
            const rawTeams = unwrapData<unknown[]>(payload)
            const teams = Array.isArray(rawTeams) ? rawTeams.map(mapTeam) : []
            setCache(cacheKey, teams)
            return teams
        } catch (err) {
            logger.warn({ err }, '[NBA API] getTeams failed')
            return []
        }
    }

    /**
     * Get a specific player by ID
     */
    async getPlayer(playerId: number): Promise<NBAPlayer | null> {
        const cacheKey = `player_${playerId}`
        const cached = getCached<NBAPlayer>(cacheKey)
        if (cached) return cached

        try {
            const payload = await engineFetch<WrappedResponse<unknown>>(`/nba/players/${playerId}`)
            const rawPlayer = unwrapData<unknown>(payload)
            if (!rawPlayer || typeof rawPlayer !== 'object') return null
            const player = mapPlayer(rawPlayer)
            setCache(cacheKey, player)
            return player
        } catch (err) {
            logger.warn({ err, playerId }, '[NBA API] getPlayer failed')
            return null
        }
    }

    /**
     * Get real NBA players for HORSE challenge inspirations.
     * Fetches guards, forwards, centers from the API and groups them
     * by play style for different challenge types.
     *
     * Falls back to static data if API is unavailable.
     */
    async getChallengeInspirations(): Promise<ChallengeInspirations> {
        const cacheKey = 'challenge_inspirations'
        const cached = getCached<ChallengeInspirations>(cacheKey)
        if (cached) return cached

        try {
            const payload = await engineFetch<WrappedResponse<unknown>>('/nba/inspirations')
            const rawInspirations = unwrapData<unknown>(payload)
            const inspirations = mapInspirations(rawInspirations)

            const hasData = Object.values(inspirations).some((names) => names.length > 0)
            if (!hasData) {
                logger.warn('[NBA API] Empty inspirations from engine, using fallback')
                return FALLBACK_INSPIRATIONS
            }

            setCache(cacheKey, inspirations)
            logger.info('[NBA API] Challenge inspirations loaded from swar/nba_api')
            return inspirations
        } catch (err) {
            logger.warn({ err }, '[NBA API] getChallengeInspirations failed, using fallback')
            return FALLBACK_INSPIRATIONS
        }
    }

    /**
     * Get a random NBA player name for a given challenge type.
     * This is the main method called by HorseService.
     */
    async getInspirationForChallenge(challengeType: string): Promise<string> {
        const inspirations = await this.getChallengeInspirations()
        const names = inspirations[challengeType as keyof ChallengeInspirations] || inspirations.zone_shot
        return names[Math.floor(Math.random() * names.length)] || 'Stephen Curry'
    }

    /**
     * Get random NBA players for the challenge library display
     */
    async getInspirationsByType(): Promise<Record<string, string[]>> {
        const inspirations = await this.getChallengeInspirations()
        return { ...inspirations }
    }

    /**
     * Get latest field goal percentages for a list of player IDs.
     */
    async getFieldGoalPercentages(playerIds: number[], season?: string): Promise<Record<number, number>> {
        const uniqueIds = Array.from(new Set(playerIds.filter((id) => Number.isFinite(id) && id > 0)))
        if (uniqueIds.length === 0) return {}

        const cacheKey = `fg_pct_${season || 'current'}_${uniqueIds.sort((a, b) => a - b).join('_')}`
        const cached = getCached<Record<number, number>>(cacheKey)
        if (cached) return cached

        try {
            const payload = await engineFetch<WrappedResponse<EngineFgPctRow[]>>('/nba/fg-pct', {
                player_ids: uniqueIds.join(','),
                ...(season ? { season } : {}),
            })
            const raw = unwrapData<EngineFgPctRow[]>(payload)
            const rows = Array.isArray(raw) ? raw : []

            const result: Record<number, number> = {}
            for (const row of rows) {
                const playerId = toNumber(row.player_id ?? row.playerId, 0)
                const fgPct = toNumber(row.fg_pct ?? row.fgPct, Number.NaN)
                if (playerId > 0 && Number.isFinite(fgPct)) {
                    result[playerId] = Math.round(fgPct * 10) / 10
                }
            }

            setCache(cacheKey, result)
            return result
        } catch (err) {
            logger.warn({ err }, '[NBA API] getFieldGoalPercentages failed')
            return {}
        }
    }

    /**
     * Check if the API is reachable (health check)
     */
    async isAvailable(): Promise<boolean> {
        try {
            const payload = await engineFetch<WrappedResponse<unknown>>('/nba/health')
            const health = unwrapData<unknown>(payload)
            if (typeof health === 'boolean') return health
            if (Array.isArray(health)) return health.length > 0
            if (health && typeof health === 'object') {
                const data = health as Record<string, unknown>
                if (typeof data.api_available === 'boolean') return data.api_available
                if (typeof data.apiAvailable === 'boolean') return data.apiAvailable
            }
            return true
        } catch {
            return false
        }
    }
}

// ── Singleton for shared usage ───────────────────────────────

let _instance: NbaApiService | null = null

export function getNbaApiService(): NbaApiService {
    if (!_instance) {
        _instance = new NbaApiService()
    }
    return _instance
}
