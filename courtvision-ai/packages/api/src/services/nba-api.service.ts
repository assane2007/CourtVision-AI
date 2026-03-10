/**
 * NBA API Service — Fetches real NBA data from free APIs
 *
 * Primary: balldontlie.io (free tier: 5 req/min, needs API key)
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

// ── Config ────────────────────────────────────────────────────

const BDL_API_BASE = 'https://api.balldontlie.io/v1'
const BDL_API_KEY = process.env.BDL_API_KEY || ''
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const REQUEST_TIMEOUT_MS = 8000

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

async function bdlFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BDL_API_BASE}${path}`)
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value)
        }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        }
        if (BDL_API_KEY) {
            headers['Authorization'] = BDL_API_KEY
        }

        const res = await fetch(url.toString(), {
            signal: controller.signal,
            headers,
        })

        if (!res.ok) {
            throw new Error(`BDL API ${res.status}: ${res.statusText}`)
        }

        return await res.json() as T
    } finally {
        clearTimeout(timeout)
    }
}

// ── Mappers ───────────────────────────────────────────────────

function mapPlayer(raw: any): NBAPlayer {
    return {
        id: raw.id,
        firstName: raw.first_name,
        lastName: raw.last_name,
        fullName: `${raw.first_name} ${raw.last_name}`,
        position: raw.position || '',
        height: raw.height || '',
        weight: raw.weight || '',
        jerseyNumber: raw.jersey_number || '',
        college: raw.college || null,
        country: raw.country || 'USA',
        draftYear: raw.draft_year || null,
        team: raw.team ? mapTeam(raw.team) : {
            id: 0, conference: '', division: '', city: '', name: '', fullName: '', abbreviation: '',
        },
    }
}

function mapTeam(raw: any): NBATeam {
    return {
        id: raw.id,
        conference: raw.conference,
        division: raw.division,
        city: raw.city,
        name: raw.name,
        fullName: raw.full_name,
        abbreviation: raw.abbreviation,
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
            const res = await bdlFetch<{ data: any[] }>('/players', {
                search,
                per_page: String(perPage),
            })
            const players = (res.data || []).map(mapPlayer)
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
            const res = await bdlFetch<{ data: any[] }>('/teams')
            const teams = (res.data || []).map(mapTeam)
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
            const res = await bdlFetch<{ data: any }>(`/players/${playerId}`)
            if (!res.data) return null
            const player = mapPlayer(res.data)
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
            // Fetch top known players by searching common star names
            // balldontlie free tier: 5 req/min, so we batch carefully
            const starSearches = ['Curry', 'LeBron', 'Durant', 'Harden', 'Doncic', 'Jokic', 'Lillard', 'Irving', 'Tatum', 'Booker', 'Edwards', 'Young', 'Paul', 'Thompson', 'Morant']

            const allPlayers: NBAPlayer[] = []

            // Do searches sequentially to respect rate limit (5 req/min)
            for (const name of starSearches) {
                try {
                    const res = await bdlFetch<{ data: any[] }>('/players', {
                        search: name,
                        per_page: '5',
                    })
                    const players = (res.data || []).map(mapPlayer)
                    allPlayers.push(...players)

                    // Small delay to respect rate limit
                    await new Promise(resolve => setTimeout(resolve, 250))
                } catch {
                    // Skip failed individual searches
                }
            }

            if (allPlayers.length === 0) {
                logger.warn('[NBA API] No players fetched, using fallback')
                return FALLBACK_INSPIRATIONS
            }

            // Deduplicate by player ID
            const unique = new Map<number, NBAPlayer>()
            for (const p of allPlayers) {
                unique.set(p.id, p)
            }
            const players = Array.from(unique.values())

            // Classify players by position and build inspirations
            const guards = players.filter(p => p.position.includes('G')).map(p => p.fullName)
            const forwards = players.filter(p => p.position.includes('F')).map(p => p.fullName)
            const centers = players.filter(p => p.position.includes('C')).map(p => p.fullName)
            const allNames = players.map(p => p.fullName)

            // Pick random subsets for each category, with sensible defaults
            const pick = (arr: string[], n: number): string[] => {
                const shuffled = [...arr].sort(() => Math.random() - 0.5)
                return shuffled.slice(0, Math.min(n, shuffled.length))
            }

            const inspirations: ChallengeInspirations = {
                zone_shot: pick(guards.length >= 3 ? guards : allNames, 4),
                fadeaway: pick(forwards.length >= 3 ? forwards : allNames, 4),
                stepback: pick(guards.length >= 3 ? guards : allNames, 4),
                bank_shot: pick([...forwards, ...centers].length >= 3 ? [...forwards, ...centers] : allNames, 4),
                swish_only: pick(guards.length >= 3 ? guards : allNames, 4),
                off_dribble: pick(guards.length >= 3 ? guards : allNames, 4),
                catch_and_shoot: pick(guards.length >= 3 ? guards : allNames, 4),
                turnaround: pick(centers.length >= 3 ? centers : [...forwards, ...centers].length >= 3 ? [...forwards, ...centers] : allNames, 4),
                floater: pick(guards.length >= 3 ? guards : allNames, 4),
                logo_shot: pick(guards.length >= 3 ? guards : allNames, 4),
            }

            setCache(cacheKey, inspirations)
            logger.info({ playerCount: players.length }, '[NBA API] Challenge inspirations loaded from API')
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
     * Check if the API is reachable (health check)
     */
    async isAvailable(): Promise<boolean> {
        try {
            await bdlFetch<{ data: any[] }>('/teams')
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
