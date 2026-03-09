/**
 * Arena Service — Challenge Multi-joueurs Temps Réel
 * CourtVision AI v6.0
 *
 * Gère la logique métier des matchs Arena :
 * - Création et gestion des matchs
 * - Scoreboard temps réel
 * - Classement ELO
 * - Historique
 */
import { SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import type {
    ArenaMatch, ArenaPlayer, ArenaScoreboard,
    ArenaShotEvent, ArenaConfig, ArenaMode, ArenaStatus
} from '@courtvision/shared'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const DEFAULT_CONFIG: ArenaConfig = {
    mode: 'shootout',
    maxPlayers: 4,
    roundDurationSec: 120,
    totalRounds: 3,
    shotsPerRound: 10,
}

const ELO_K_FACTOR = 32

export class ArenaService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Create a new Arena match
     */
    async createMatch(hostId: string, hostUsername: string, config: Partial<ArenaConfig> = {}): Promise<ArenaMatch> {
        const matchConfig: ArenaConfig = { ...DEFAULT_CONFIG, ...config }

        const { data, error } = await this.supabase
            .from('arena_matches')
            .insert({
                host_id: hostId,
                mode: matchConfig.mode,
                status: 'waiting' as ArenaStatus,
                config: matchConfig,
                current_round: 0,
            })
            .select()
            .single()

        if (error) throw new Error(`Failed to create arena match: ${error.message}`)

        // Add host as first player
        await this.supabase.from('arena_players').insert({
            match_id: data.id,
            user_id: hostId,
            is_ready: false,
            score: 0,
            shots_made: 0,
            shots_total: 0,
        })

        logger.info({ matchId: data.id, host: hostUsername, mode: matchConfig.mode }, '[Arena] Match created')

        return {
            id: data.id,
            hostId,
            hostUsername,
            mode: matchConfig.mode,
            status: 'waiting',
            config: matchConfig,
            players: [{
                userId: hostId,
                username: hostUsername,
                level: 1,
                isReady: false,
                score: 0,
                shotsMade: 0,
                shotsTotal: 0,
                accuracy: 0,
                streak: 0,
                isEliminated: false,
            }],
            currentRound: 0,
            startedAt: null,
            endedAt: null,
            createdAt: data.created_at,
        }
    }

    /**
     * Join an existing Arena match
     */
    async joinMatch(matchId: string, userId: string, username: string): Promise<ArenaMatch> {
        // Verify match exists and is waiting
        const { data: match, error: matchErr } = await this.supabase
            .from('arena_matches')
            .select('*, arena_players(*)')
            .eq('id', matchId)
            .single()

        if (matchErr || !match) throw new Error('Match not found')
        if (match.status !== 'waiting') throw new Error('Match is not accepting players')

        const currentPlayers = match.arena_players?.length || 0
        if (currentPlayers >= match.config.maxPlayers) throw new Error('Match is full')

        // Check not already joined
        const alreadyJoined = match.arena_players?.some((p: any) => p.user_id === userId)
        if (alreadyJoined) throw new Error('Already in this match')

        await this.supabase.from('arena_players').insert({
            match_id: matchId,
            user_id: userId,
            is_ready: false,
            score: 0,
            shots_made: 0,
            shots_total: 0,
        })

        logger.info({ matchId, userId }, '[Arena] Player joined')
        return this.getMatch(matchId)
    }

    /**
     * Mark player as ready
     */
    async setReady(matchId: string, userId: string): Promise<{ allReady: boolean; match: ArenaMatch }> {
        await this.supabase
            .from('arena_players')
            .update({ is_ready: true })
            .eq('match_id', matchId)
            .eq('user_id', userId)

        const match = await this.getMatch(matchId)
        const allReady = match.players.length >= 2 && match.players.every(p => p.isReady)

        if (allReady) {
            await this.supabase
                .from('arena_matches')
                .update({ status: 'countdown', started_at: new Date().toISOString(), current_round: 1 })
                .eq('id', matchId)

            match.status = 'countdown'
            match.currentRound = 1
            logger.info({ matchId }, '[Arena] All players ready — countdown starting')
        }

        return { allReady, match }
    }

    /**
     * Record a shot in the Arena
     */
    async recordShot(
        matchId: string,
        userId: string,
        username: string,
        result: 'made' | 'missed',
        zone: string
    ): Promise<ArenaShotEvent> {
        // Log the shot
        await this.supabase.from('arena_shot_log').insert({
            match_id: matchId,
            user_id: userId,
            result,
            zone,
            timestamp: new Date().toISOString(),
        })

        // Update player stats
        const { data: player } = await this.supabase
            .from('arena_players')
            .select('score, shots_made, shots_total, streak')
            .eq('match_id', matchId)
            .eq('user_id', userId)
            .single()

        const newShotsMade = (player?.shots_made || 0) + (result === 'made' ? 1 : 0)
        const newShotsTotal = (player?.shots_total || 0) + 1
        const newStreak = result === 'made' ? (player?.streak || 0) + 1 : 0
        const newScore = (player?.score || 0) + (result === 'made' ? this.calculatePoints(zone, newStreak) : 0)

        await this.supabase
            .from('arena_players')
            .update({
                score: newScore,
                shots_made: newShotsMade,
                shots_total: newShotsTotal,
                streak: newStreak,
            })
            .eq('match_id', matchId)
            .eq('user_id', userId)

        const event: ArenaShotEvent = {
            userId,
            username,
            result,
            zone,
            timestamp: Date.now(),
            newScore,
            streak: newStreak,
        }

        logger.debug({ matchId, userId, result, zone, newScore }, '[Arena] Shot recorded')
        return event
    }

    /**
     * Get the current scoreboard
     */
    async getScoreboard(matchId: string): Promise<ArenaScoreboard> {
        const match = await this.getMatch(matchId)

        return {
            matchId,
            mode: match.mode,
            round: match.currentRound,
            totalRounds: match.config.totalRounds,
            timeRemainingSec: this.calculateTimeRemaining(match),
            players: match.players.sort((a, b) => b.score - a.score),
            status: match.status,
        }
    }

    /**
     * End a match and calculate ELO changes
     */
    async endMatch(matchId: string): Promise<ArenaMatch> {
        const match = await this.getMatch(matchId)

        // Update match status
        await this.supabase
            .from('arena_matches')
            .update({ status: 'finished', ended_at: new Date().toISOString() })
            .eq('id', matchId)

        // Sort players by score to determine ranking
        const sortedPlayers = [...match.players].sort((a, b) => b.score - a.score)
        const winnerId = sortedPlayers[0]?.userId

        // Update arena leaderboard for each player
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i]
            const isWinner = i === 0

            const { data: existing } = await this.supabase
                .from('arena_leaderboard')
                .select('*')
                .eq('user_id', player.userId)
                .single()

            if (existing) {
                const newWins = existing.wins + (isWinner ? 1 : 0)
                const newLosses = existing.losses + (isWinner ? 0 : 1)
                const newElo = this.calculateElo(existing.elo_rating, isWinner)

                await this.supabase
                    .from('arena_leaderboard')
                    .update({
                        wins: newWins,
                        losses: newLosses,
                        avg_accuracy: player.accuracy,
                        elo_rating: newElo,
                        best_streak: Math.max(existing.best_streak || 0, player.streak),
                    })
                    .eq('user_id', player.userId)
            } else {
                await this.supabase.from('arena_leaderboard').insert({
                    user_id: player.userId,
                    wins: isWinner ? 1 : 0,
                    losses: isWinner ? 0 : 1,
                    avg_accuracy: player.accuracy,
                    elo_rating: this.calculateElo(1200, isWinner),
                    best_streak: player.streak,
                })
            }
        }

        logger.info({ matchId, winnerId }, '[Arena] Match ended')

        match.status = 'finished'
        match.endedAt = new Date().toISOString()
        return match
    }

    /**
     * Get full match details
     */
    async getMatch(matchId: string): Promise<ArenaMatch> {
        const { data: match, error } = await this.supabase
            .from('arena_matches')
            .select('*')
            .eq('id', matchId)
            .single()

        if (error || !match) throw new Error('Match not found')

        const { data: players } = await this.supabase
            .from('arena_players')
            .select(`
                user_id, is_ready, score, shots_made, shots_total, streak, is_eliminated
            `)
            .eq('match_id', matchId)

        // Fetch user details separately for clean typing
        const playerUserIds = (players || []).map((p: any) => p.user_id)
        const { data: userDetails } = await this.supabase
            .from('users')
            .select('id, username, avatar_url, position')
            .in('id', playerUserIds)

        const userMap = new Map((userDetails || []).map((u: any) => [u.id, u]))

        const { data: profiles } = await this.supabase
            .from('public_profiles')
            .select('user_id, level')
            .in('user_id', (players || []).map((p: any) => p.user_id))

        const levelMap = new Map((profiles || []).map((p: any) => [p.user_id, p.level || 1]))

        return {
            id: match.id,
            hostId: match.host_id,
            hostUsername: userMap.get(match.host_id)?.username || 'Host',
            mode: match.mode,
            status: match.status,
            config: match.config,
            players: (players || []).map((p: any) => {
                const user = userMap.get(p.user_id) || {}
                return {
                    userId: p.user_id,
                    username: user.username || 'Unknown',
                    avatarUrl: user.avatar_url,
                    position: user.position,
                    level: levelMap.get(p.user_id) || 1,
                    isReady: p.is_ready,
                    score: p.score,
                    shotsMade: p.shots_made,
                    shotsTotal: p.shots_total,
                    accuracy: p.shots_total > 0 ? Math.round((p.shots_made / p.shots_total) * 100) : 0,
                    streak: p.streak || 0,
                    isEliminated: p.is_eliminated || false,
                }
            }),
            currentRound: match.current_round,
            startedAt: match.started_at,
            endedAt: match.ended_at,
            createdAt: match.created_at,
        }
    }

    /**
     * List available matches to join
     */
    async getAvailableMatches(limit = 20): Promise<ArenaMatch[]> {
        const { data: matches } = await this.supabase
            .from('arena_matches')
            .select('id')
            .eq('status', 'waiting')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (!matches || matches.length === 0) return []

        const results: ArenaMatch[] = []
        for (const m of matches) {
            try {
                results.push(await this.getMatch(m.id))
            } catch { /* skip broken matches */ }
        }
        return results
    }

    /**
     * Get arena leaderboard
     */
    async getLeaderboard(limit = 50): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('arena_leaderboard')
            .select(`
                user_id, wins, losses, avg_accuracy, elo_rating, best_streak,
                users!inner ( username, avatar_url )
            `)
            .order('elo_rating', { ascending: false })
            .limit(limit)

        if (error) throw error

        return (data || []).map((entry: any, index: number) => ({
            rank: index + 1,
            userId: entry.user_id,
            username: entry.users.username,
            avatarUrl: entry.users.avatar_url,
            wins: entry.wins,
            losses: entry.losses,
            winRate: entry.wins + entry.losses > 0
                ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
                : 0,
            avgAccuracy: entry.avg_accuracy,
            eloRating: entry.elo_rating,
            bestStreak: entry.best_streak,
        }))
    }

    /**
     * Get match history for a user
     */
    async getHistory(userId: string, limit = 20): Promise<ArenaMatch[]> {
        const { data: playerRecords } = await this.supabase
            .from('arena_players')
            .select('match_id')
            .eq('user_id', userId)
            .limit(limit)

        if (!playerRecords || playerRecords.length === 0) return []

        const matchIds = playerRecords.map((r: any) => r.match_id)
        const results: ArenaMatch[] = []
        for (const id of matchIds) {
            try {
                results.push(await this.getMatch(id))
            } catch { /* skip */ }
        }
        return results.filter(m => m.status === 'finished')
    }

    // ── Private helpers ──

    private calculatePoints(zone: string, streak: number): number {
        const zonePoints: Record<string, number> = {
            paint: 1, restricted: 1,
            midrange: 2,
            corner3: 3, wing3: 3, top3: 3,
        }
        const base = zonePoints[zone] || 2
        const streakBonus = streak >= 5 ? 2 : streak >= 3 ? 1 : 0
        return base + streakBonus
    }

    private calculateElo(currentElo: number, won: boolean): number {
        const expected = 1 / (1 + Math.pow(10, (1200 - currentElo) / 400))
        return Math.round(currentElo + ELO_K_FACTOR * ((won ? 1 : 0) - expected))
    }

    private calculateTimeRemaining(match: ArenaMatch): number {
        if (!match.startedAt || match.status !== 'live') return match.config.roundDurationSec
        const elapsed = (Date.now() - new Date(match.startedAt).getTime()) / 1000
        const roundTime = match.config.roundDurationSec * match.currentRound
        return Math.max(0, roundTime - elapsed)
    }
}
