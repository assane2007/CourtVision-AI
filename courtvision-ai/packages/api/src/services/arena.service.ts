/**
 * Arena Service — Challenge Multi-joueurs Temps Réel
 * CourtVision AI v6.0
 *
 * Gère la logique métier des matchs Arena :
 * - Création et gestion des matchs (public & privé)
 * - Scoreboard temps réel
 * - Classement ELO avec K-Factor dynamique
 * - Statistiques détaillées par joueur & par match
 * - Système d'invitation par code
 * - Anti-triche côté service
 * - Historique paginé
 */
import { SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import crypto from 'crypto'
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

/** ELO K-Factor dynamique : plus élevé pour les nouveaux joueurs */
const ELO_K_BASE = 32
const ELO_K_PROVISIONAL = 48 // <30 games
const ELO_PROVISIONAL_THRESHOLD = 30

export class ArenaService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Create a new Arena match
     */
    async createMatch(hostId: string, hostUsername: string, config: Partial<ArenaConfig> & { isPrivate?: boolean; password?: string } = {}): Promise<ArenaMatch> {
        const matchConfig: ArenaConfig = { ...DEFAULT_CONFIG, ...config }
        const inviteCode = config.isPrivate ? this.generateInviteCode() : null

        const { data, error } = await this.supabase
            .from('arena_matches')
            .insert({
                host_id: hostId,
                mode: matchConfig.mode,
                status: 'waiting' as ArenaStatus,
                config: matchConfig,
                current_round: 0,
                is_private: config.isPrivate || false,
                invite_code: inviteCode,
                password_hash: config.password ? this.hashPassword(config.password) : null,
            })
            .select()
            .single()

        if (error || !data) throw new Error(`Failed to create arena match: ${error?.message || 'No data returned'}`)

        // Add host as first player
        await this.supabase.from('arena_players').insert({
            match_id: data.id,
            user_id: hostId,
            is_ready: false,
            score: 0,
            shots_made: 0,
            shots_total: 0,
        })

        logger.info({ matchId: data.id, host: hostUsername, mode: matchConfig.mode, private: config.isPrivate }, '[Arena] Match created')

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
            ...(inviteCode ? { inviteCode } : {}),
        } as ArenaMatch & { inviteCode?: string }
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
        if (match.is_private) throw new Error('This match is private — use an invite link')

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
     * Join a match via invite code
     */
    async joinMatchByInvite(
        matchId: string,
        userId: string,
        username: string,
        inviteCode: string,
        password?: string
    ): Promise<ArenaMatch> {
        const { data: match, error } = await this.supabase
            .from('arena_matches')
            .select('*, arena_players(*)')
            .eq('id', matchId)
            .single()

        if (error || !match) throw new Error('Match not found')
        if (match.status !== 'waiting') throw new Error('Match is not accepting players')
        if (match.invite_code !== inviteCode) throw new Error('Invalid invite code')
        if (match.password_hash && (!password || this.hashPassword(password) !== match.password_hash)) {
            throw new Error('Invalid invite password')
        }

        const currentPlayers = match.arena_players?.length || 0
        if (currentPlayers >= match.config.maxPlayers) throw new Error('Match is full')

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

        logger.info({ matchId, userId }, '[Arena] Player joined via invite')
        return this.getMatch(matchId)
    }

    /**
     * Mark player as ready
     */
    async setReady(matchId: string, userId: string): Promise<{ allReady: boolean; match: ArenaMatch }> {
        // Verify player is in the match
        const { data: playerEntry } = await this.supabase
            .from('arena_players')
            .select('id')
            .eq('match_id', matchId)
            .eq('user_id', userId)
            .single()

        if (!playerEntry) throw new Error('Player not in this match')

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
            logger.info({ matchId, playerCount: match.players.length }, '[Arena] All players ready — countdown starting')
        }

        return { allReady, match }
    }

    /**
     * Record a shot in the Arena (with optional confidence & match state validation)
     */
    async recordShot(
        matchId: string,
        userId: string,
        username: string,
        result: 'made' | 'missed',
        zone: string,
        confidence?: number
    ): Promise<ArenaShotEvent> {
        // Validate match is live
        const { data: matchData } = await this.supabase
            .from('arena_matches')
            .select('status, current_round')
            .eq('id', matchId)
            .single()

        if (!matchData || !['live', 'countdown'].includes(matchData.status)) {
            throw new Error('Match is not live — cannot record shot')
        }

        // Log the shot with extended data
        await this.supabase.from('arena_shot_log').insert({
            match_id: matchId,
            user_id: userId,
            result,
            zone,
            round: matchData.current_round,
            confidence: confidence || null,
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

        logger.debug({ matchId, userId, result, zone, newScore, streak: newStreak }, '[Arena] Shot recorded')
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
     * Get detailed match statistics
     */
    async getMatchStats(matchId: string): Promise<{
        match: ArenaMatch
        shotLog: any[]
        zoneBreakdown: Record<string, { made: number; missed: number; pct: number }>
        timeline: { timestamp: string; userId: string; result: string; zone: string }[]
        mvp: { userId: string; username: string; score: number; accuracy: number } | null
    }> {
        const match = await this.getMatch(matchId)

        // Get full shot log
        const { data: shots } = await this.supabase
            .from('arena_shot_log')
            .select('user_id, result, zone, timestamp, round')
            .eq('match_id', matchId)
            .order('timestamp', { ascending: true })

        const shotLog = shots || []

        // Zone breakdown (aggregate)
        const zoneBreakdown: Record<string, { made: number; missed: number; pct: number }> = {}
        for (const shot of shotLog) {
            if (!zoneBreakdown[shot.zone]) zoneBreakdown[shot.zone] = { made: 0, missed: 0, pct: 0 }
            if (shot.result === 'made') zoneBreakdown[shot.zone].made++
            else zoneBreakdown[shot.zone].missed++
        }
        for (const zone of Object.values(zoneBreakdown)) {
            const total = zone.made + zone.missed
            zone.pct = total > 0 ? Math.round((zone.made / total) * 1000) / 10 : 0
        }

        // Timeline
        const timeline = shotLog.map((s: any) => ({
            timestamp: s.timestamp,
            userId: s.user_id,
            result: s.result,
            zone: s.zone,
        }))

        // MVP
        const sortedPlayers = [...match.players].sort((a, b) => b.score - a.score)
        const mvp = sortedPlayers.length > 0 ? {
            userId: sortedPlayers[0].userId,
            username: sortedPlayers[0].username,
            score: sortedPlayers[0].score,
            accuracy: sortedPlayers[0].accuracy,
        } : null

        return { match, shotLog, zoneBreakdown, timeline, mvp }
    }

    /**
     * End a match and calculate ELO changes
     */
    async endMatch(matchId: string): Promise<ArenaMatch> {
        const match = await this.getMatch(matchId)
        if (match.status === 'finished') throw new Error('Match already finished')

        // Update match status
        await this.supabase
            .from('arena_matches')
            .update({ status: 'finished', ended_at: new Date().toISOString() })
            .eq('id', matchId)

        // Sort players by score to determine ranking
        const sortedPlayers = [...match.players].sort((a, b) => b.score - a.score)
        const winnerId = sortedPlayers[0]?.userId

        // Update arena leaderboard for each player with dynamic K-Factor
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i]
            const isWinner = i === 0

            const { data: existing } = await this.supabase
                .from('arena_leaderboard')
                .select('*')
                .eq('user_id', player.userId)
                .single()

            if (existing) {
                const totalGames = existing.wins + existing.losses
                const kFactor = totalGames < ELO_PROVISIONAL_THRESHOLD ? ELO_K_PROVISIONAL : ELO_K_BASE
                const newWins = existing.wins + (isWinner ? 1 : 0)
                const newLosses = existing.losses + (isWinner ? 0 : 1)
                const newElo = this.calculateElo(existing.elo_rating, isWinner, kFactor)

                await this.supabase
                    .from('arena_leaderboard')
                    .update({
                        wins: newWins,
                        losses: newLosses,
                        avg_accuracy: this.rollingAvg(existing.avg_accuracy, player.accuracy, totalGames),
                        elo_rating: newElo,
                        best_streak: Math.max(existing.best_streak || 0, player.streak),
                        win_streak: isWinner ? (existing.win_streak || 0) + 1 : 0,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', player.userId)
            } else {
                await this.supabase.from('arena_leaderboard').insert({
                    user_id: player.userId,
                    wins: isWinner ? 1 : 0,
                    losses: isWinner ? 0 : 1,
                    avg_accuracy: player.accuracy,
                    elo_rating: this.calculateElo(1200, isWinner, ELO_K_PROVISIONAL),
                    best_streak: player.streak,
                    win_streak: isWinner ? 1 : 0,
                })
            }
        }

        logger.info({ matchId, winnerId, playerCount: sortedPlayers.length }, '[Arena] Match ended')

        match.status = 'finished'
        match.endedAt = new Date().toISOString()
        return match
    }

    /**
     * Cancel a match (host only, before live)
     */
    async cancelMatch(matchId: string): Promise<ArenaMatch> {
        await this.supabase
            .from('arena_matches')
            .update({ status: 'cancelled', ended_at: new Date().toISOString() })
            .eq('id', matchId)

        logger.info({ matchId }, '[Arena] Match cancelled')
        return this.getMatch(matchId)
    }

    /**
     * Kick a player from a match
     */
    async kickPlayer(matchId: string, playerId: string): Promise<{ kicked: true; matchId: string; playerId: string }> {
        const { data: player } = await this.supabase
            .from('arena_players')
            .select('id')
            .eq('match_id', matchId)
            .eq('user_id', playerId)
            .single()

        if (!player) throw new Error('Player not in match')

        await this.supabase
            .from('arena_players')
            .delete()
            .eq('match_id', matchId)
            .eq('user_id', playerId)

        logger.info({ matchId, playerId }, '[Arena] Player kicked')
        return { kicked: true, matchId, playerId }
    }

    /**
     * Generate an invite link for a match
     */
    async generateInviteLink(matchId: string): Promise<{ inviteCode: string; link: string }> {
        const { data: match } = await this.supabase
            .from('arena_matches')
            .select('invite_code')
            .eq('id', matchId)
            .single()

        let inviteCode = match?.invite_code
        if (!inviteCode) {
            inviteCode = this.generateInviteCode()
            await this.supabase
                .from('arena_matches')
                .update({ invite_code: inviteCode })
                .eq('id', matchId)
        }

        const baseUrl = process.env.APP_URL || 'https://courtvision.ai'
        return {
            inviteCode,
            link: `${baseUrl}/arena/join/${matchId}?code=${inviteCode}`,
        }
    }

    /**
     * Get personal Arena stats for a player
     */
    async getPlayerStats(userId: string): Promise<{
        totalMatches: number
        wins: number
        losses: number
        winRate: number
        eloRating: number
        avgAccuracy: number
        bestStreak: number
        currentWinStreak: number
        totalShotsMade: number
        totalShotsAttempted: number
        favoriteMode: string | null
        rank: number | null
    }> {
        const { data: lb } = await this.supabase
            .from('arena_leaderboard')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (!lb) {
            return {
                totalMatches: 0, wins: 0, losses: 0, winRate: 0,
                eloRating: 1200, avgAccuracy: 0, bestStreak: 0, currentWinStreak: 0,
                totalShotsMade: 0, totalShotsAttempted: 0, favoriteMode: null, rank: null,
            }
        }

        // Calculate rank
        const { count } = await this.supabase
            .from('arena_leaderboard')
            .select('id', { count: 'exact', head: true })
            .gt('elo_rating', lb.elo_rating)

        // Favorite mode
        const { data: playerMatches } = await this.supabase
            .from('arena_players')
            .select('match_id')
            .eq('user_id', userId)

        let favoriteMode: string | null = null
        if (playerMatches && playerMatches.length > 0) {
            const matchIds = playerMatches.map((p: any) => p.match_id)
            const { data: matches } = await this.supabase
                .from('arena_matches')
                .select('mode')
                .in('id', matchIds)

            if (matches) {
                const modeCounts: Record<string, number> = {}
                for (const m of matches) {
                    modeCounts[m.mode] = (modeCounts[m.mode] || 0) + 1
                }
                favoriteMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
            }
        }

        // Total shots aggregated
        const { data: allPlayerRecords } = await this.supabase
            .from('arena_players')
            .select('shots_made, shots_total')
            .eq('user_id', userId)

        const totalShotsMade = (allPlayerRecords || []).reduce((sum: number, r: any) => sum + (r.shots_made || 0), 0)
        const totalShotsAttempted = (allPlayerRecords || []).reduce((sum: number, r: any) => sum + (r.shots_total || 0), 0)

        return {
            totalMatches: lb.wins + lb.losses,
            wins: lb.wins,
            losses: lb.losses,
            winRate: lb.wins + lb.losses > 0 ? Math.round((lb.wins / (lb.wins + lb.losses)) * 100) : 0,
            eloRating: lb.elo_rating,
            avgAccuracy: Math.round(lb.avg_accuracy * 10) / 10,
            bestStreak: lb.best_streak || 0,
            currentWinStreak: lb.win_streak || 0,
            totalShotsMade,
            totalShotsAttempted,
            favoriteMode,
            rank: (count || 0) + 1,
        }
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
            ...(match.invite_code ? { inviteCode: match.invite_code } : {}),
        } as ArenaMatch & { inviteCode?: string }
    }

    /**
     * List available matches to join (with pagination)
     */
    async getAvailableMatches(limit = 20, offset = 0): Promise<ArenaMatch[]> {
        const { data: matches } = await this.supabase
            .from('arena_matches')
            .select('id')
            .eq('status', 'waiting')
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (!matches || matches.length === 0) return []

        // Batch fetch to reduce N+1 — but we still call getMatch for consistent mapping
        const results: ArenaMatch[] = []
        const batchPromises = matches.map(m =>
            this.getMatch(m.id).catch(() => null) // skip broken matches
        )
        const resolved = await Promise.all(batchPromises)
        for (const match of resolved) {
            if (match) results.push(match)
        }
        return results
    }

    /**
     * Get arena leaderboard (with pagination)
     */
    async getLeaderboard(limit = 50, offset = 0): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('arena_leaderboard')
            .select(`
                user_id, wins, losses, avg_accuracy, elo_rating, best_streak, win_streak,
                users!inner ( username, avatar_url )
            `)
            .order('elo_rating', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        return (data || []).map((entry: any, index: number) => ({
            rank: offset + index + 1,
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
            currentWinStreak: entry.win_streak || 0,
        }))
    }

    /**
     * Get match history for a user (with pagination)
     */
    async getHistory(userId: string, limit = 20, offset = 0): Promise<ArenaMatch[]> {
        // Join arena_players → arena_matches to get finished matches ordered by date
        const { data: playerRecords } = await this.supabase
            .from('arena_players')
            .select('match_id, arena_matches!inner(id, status, created_at)')
            .eq('user_id', userId)
            .eq('arena_matches.status', 'finished')
            .order('arena_matches(created_at)', { ascending: false })
            .range(offset, offset + limit - 1)

        if (!playerRecords || playerRecords.length === 0) return []

        const matchIds = playerRecords.map((r: any) => r.match_id)
        const batchPromises = matchIds.map((id: string) =>
            this.getMatch(id).catch(() => null)
        )
        const resolved = await Promise.all(batchPromises)
        return resolved.filter(Boolean) as ArenaMatch[]
    }

    // ── Private helpers ──

    private calculatePoints(zone: string, streak: number): number {
        const zonePoints: Record<string, number> = {
            paint: 1, restricted: 1,
            midrange: 2,
            corner3: 3, wing3: 3, top3: 3,
        }
        const base = zonePoints[zone] || 2
        // Progressive streak bonus: encourages hot hands
        const streakBonus = streak >= 7 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0
        return base + streakBonus
    }

    private calculateElo(currentElo: number, won: boolean, kFactor = ELO_K_BASE): number {
        const expected = 1 / (1 + Math.pow(10, (1200 - currentElo) / 400))
        return Math.round(currentElo + kFactor * ((won ? 1 : 0) - expected))
    }

    private rollingAvg(currentAvg: number, newValue: number, count: number): number {
        return Math.round(((currentAvg * count + newValue) / (count + 1)) * 10) / 10
    }

    private calculateTimeRemaining(match: ArenaMatch): number {
        if (!match.startedAt || match.status !== 'live') return match.config.roundDurationSec
        const elapsed = (Date.now() - new Date(match.startedAt).getTime()) / 1000
        const roundTime = match.config.roundDurationSec * match.currentRound
        return Math.max(0, roundTime - elapsed)
    }

    private generateInviteCode(): string {
        return crypto.randomBytes(4).toString('hex').toUpperCase()
    }

    private hashPassword(password: string): string {
        return crypto.createHash('sha256').update(password).digest('hex')
    }
}
