/**
 * HORSE IA Service — Mode HORSE contre un avatar IA (V6.0)
 *
 * Recréer le jeu HORSE classique en version numérique.
 * L'IA génère des défis, évalue la biomécanique via Shot DNA.
 *
 * NBA player data is fetched LIVE from balldontlie.io (free API).
 * Static fallback is used only when the API is unreachable.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import type {
    HorseGame, HorseChallenge, HorseAttempt,
    HorseGameState, HorseDifficulty, HorseChallengeType,
    HorseLeaderboardEntry
} from '@courtvision/shared'
import type { NbaApiService} from './nba-api.service';
import { getNbaApiService } from './nba-api.service'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const HORSE_WORD = 'HORSE'

/** Challenge templates keyed by type — NBA inspirations are fetched LIVE from API */
const CHALLENGE_TEMPLATES: Record<HorseChallengeType, {
    description: string
    targetTechnique: string
    baseDifficulty: number
}> = {
    zone_shot: {
        description: 'Nail a shot from the designated zone',
        targetTechnique: 'Set shot',
        baseDifficulty: 3,
    },
    fadeaway: {
        description: 'Execute a fadeaway jumper',
        targetTechnique: 'Fadeaway',
        baseDifficulty: 6,
    },
    stepback: {
        description: 'Hit a stepback three-pointer',
        targetTechnique: 'Step-back',
        baseDifficulty: 7,
    },
    bank_shot: {
        description: 'Use the backboard — bank shot only',
        targetTechnique: 'Bank shot',
        baseDifficulty: 5,
    },
    swish_only: {
        description: 'Nothing but net — swish only counts',
        targetTechnique: 'Clean swish',
        baseDifficulty: 6,
    },
    off_dribble: {
        description: 'Pull-up jumper off the dribble',
        targetTechnique: 'Off-dribble pull-up',
        baseDifficulty: 5,
    },
    catch_and_shoot: {
        description: 'Catch and shoot in rhythm',
        targetTechnique: 'Catch & shoot',
        baseDifficulty: 4,
    },
    turnaround: {
        description: 'Post up and hit a turnaround jumper',
        targetTechnique: 'Turnaround jumper',
        baseDifficulty: 7,
    },
    floater: {
        description: 'Float one in over the defense',
        targetTechnique: 'Floater / runner',
        baseDifficulty: 5,
    },
    logo_shot: {
        description: 'Shoot from the logo — deep range!',
        targetTechnique: 'Deep three / logo shot',
        baseDifficulty: 9,
    },
}

const ZONES = ['paint', 'midrange', 'corner3', 'wing3', 'top3', 'restricted']

/** Difficulty multipliers */
const DIFFICULTY_MODIFIERS: Record<HorseDifficulty, {
    challengePoolWeight: number
    aiSuccessRate: number
    timeoutSec: number
    minDifficulty: number
}> = {
    rookie: { challengePoolWeight: 0.5, aiSuccessRate: 0.4, timeoutSec: 90, minDifficulty: 1 },
    pro: { challengePoolWeight: 0.7, aiSuccessRate: 0.6, timeoutSec: 60, minDifficulty: 3 },
    allstar: { challengePoolWeight: 0.85, aiSuccessRate: 0.75, timeoutSec: 45, minDifficulty: 5 },
    legend: { challengePoolWeight: 1.0, aiSuccessRate: 0.9, timeoutSec: 30, minDifficulty: 7 },
}

/** AI Personality weights — bias challenge selection based on personality */
const AI_PERSONALITY_WEIGHTS: Record<string, Partial<Record<HorseChallengeType, number>>> = {
    classic: {},  // no bias, fully random
    aggressive: {
        stepback: 2, logo_shot: 2, off_dribble: 1.5, fadeaway: 1.5,
    },
    creative: {
        bank_shot: 2, turnaround: 2, floater: 2, swish_only: 1.5,
    },
    defensive: {
        zone_shot: 2, catch_and_shoot: 2, swish_only: 1.5,
    },
}

export class HorseService {
    private nbaApi: NbaApiService

    constructor(private supabase: SupabaseClient, nbaApi?: NbaApiService) {
        this.nbaApi = nbaApi || getNbaApiService()
    }

    /**
     * Start a new HORSE game
     */
    async startGame(userId: string, difficulty: HorseDifficulty, aiPersonality: string = 'classic'): Promise<HorseGameState> {
        // Abandon any active game
        await this.supabase
            .from('horse_games')
            .update({ status: 'abandoned', ended_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active')

        const { data, error } = await this.supabase
            .from('horse_games')
            .insert({
                user_id: userId,
                difficulty,
                ai_personality: aiPersonality,
                status: 'active',
                letters: '',
                ai_letters: '',
                max_letters: HORSE_WORD.length,
                current_round: 1,
                score: 0,
            })
            .select()
            .single()

        if (error || !data) throw new Error(`Failed to create HORSE game: ${error?.message || 'No data returned'}`)

        const game: HorseGame = this.mapGame(data)

        // Generate first challenge
        const challenge = await this.generateChallenge(game, aiPersonality)

        logger.info({ gameId: game.id, difficulty }, '[HORSE] Game started')

        return {
            game,
            currentChallenge: challenge,
            playerLetters: '',
            aiLetters: '',
            round: 1,
            isPlayerTurn: true,
            message: `🐴 HORSE game started on ${difficulty} difficulty! Complete the challenge.`,
        }
    }

    /**
     * Generate an AI challenge for the current round
     */
    async generateChallenge(game: HorseGame, aiPersonality: string = 'classic'): Promise<HorseChallenge> {
        const modifier = DIFFICULTY_MODIFIERS[game.difficulty]
        const types = Object.keys(CHALLENGE_TEMPLATES) as HorseChallengeType[]

        // Filter by difficulty
        const eligible = types.filter(t => {
            const template = CHALLENGE_TEMPLATES[t]
            return template.baseDifficulty >= modifier.minDifficulty
        })

        // Apply AI personality weights for biased selection
        const personalityWeights = AI_PERSONALITY_WEIGHTS[aiPersonality] || {}
        const weighted: HorseChallengeType[] = []
        for (const type of eligible) {
            const weight = personalityWeights[type] || 1
            for (let i = 0; i < Math.round(weight); i++) {
                weighted.push(type)
            }
        }

        // Pick a random challenge type from the weighted pool
        const challengeType = weighted[Math.floor(Math.random() * weighted.length)] || 'zone_shot'
        const template = CHALLENGE_TEMPLATES[challengeType]
        const zone = ZONES[Math.floor(Math.random() * ZONES.length)]

        // Fetch NBA inspiration from live API (falls back to static data if API is down)
        const nba = await this.nbaApi.getInspirationForChallenge(challengeType)

        const difficulty = Math.min(10, Math.round(
            template.baseDifficulty * modifier.challengePoolWeight + (game.currentRound * 0.3)
        ))

        const { data, error } = await this.supabase
            .from('horse_challenges')
            .insert({
                game_id: game.id,
                round: game.currentRound,
                challenge_type: challengeType,
                target_zone: zone,
                target_technique: template.targetTechnique,
                nba_inspiration: nba,
                description: `${template.description} from the ${zone}. Inspired by ${nba}! 🏀`,
                difficulty,
                timeout_sec: modifier.timeoutSec,
            })
            .select()
            .single()

        if (error || !data) throw new Error(`Failed to generate challenge: ${error?.message || 'No data returned'}`)

        return {
            id: data.id,
            gameId: game.id,
            round: game.currentRound,
            challengeType: data.challenge_type,
            targetZone: data.target_zone,
            targetTechnique: data.target_technique,
            nbaInspiration: data.nba_inspiration,
            description: data.description,
            difficulty: data.difficulty,
            timeoutSec: data.timeout_sec,
        }
    }

    /**
     * Submit a shot attempt
     */
    async submitAttempt(
        gameId: string,
        userId: string,
        challengeId: string,
        success: boolean,
        similarityScore: number,
        shotData?: Record<string, any>
    ): Promise<HorseGameState> {
        // Validate game is active
        const { data: gameData, error: gameErr } = await this.supabase
            .from('horse_games')
            .select('*')
            .eq('id', gameId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single()

        if (gameErr || !gameData) throw new Error('No active HORSE game found')

        // Record the attempt
        await this.supabase.from('horse_attempts').insert({
            challenge_id: challengeId,
            game_id: gameId,
            user_id: userId,
            success,
            similarity_score: similarityScore,
            shot_data: shotData || {},
        })

        let game = this.mapGame(gameData)
        const modifier = DIFFICULTY_MODIFIERS[game.difficulty]

        // AI also attempts the challenge
        const aiSuccess = Math.random() < modifier.aiSuccessRate

        let playerLetters = game.letters
        let aiLetters = gameData.ai_letters || ''
        let message = ''

        if (success && !aiSuccess) {
            // Player made it, AI missed → AI gets a letter
            aiLetters += HORSE_WORD[aiLetters.length] || ''
            message = `✅ You made it, AI missed! AI now has "${aiLetters}" 🎯`
        } else if (!success && aiSuccess) {
            // Player missed, AI made it → Player gets a letter
            playerLetters += HORSE_WORD[playerLetters.length] || ''
            message = `❌ You missed, AI made it! You now have "${playerLetters}" 😤`
        } else if (success && aiSuccess) {
            // Both made it → No letters
            message = `🤝 Both made it! No letters awarded. Round continues.`
        } else {
            // Both missed → No letters
            message = `😅 Both missed! No letters awarded. New challenge incoming.`
        }

        const newRound = game.currentRound + 1
        const score = game.score + (success ? Math.round(similarityScore / 10) : 0)

        // Check for game end
        let status: 'active' | 'won' | 'lost' = 'active'
        if (playerLetters.length >= HORSE_WORD.length) {
            status = 'lost'
            message = `💀 HORSE! You spelled it out. AI wins this time. Final score: ${score}`
        } else if (aiLetters.length >= HORSE_WORD.length) {
            status = 'won'
            message = `🏆 You beat the AI! The AI spelled HORSE. Final score: ${score}`
        }

        // Update game state
        await this.supabase
            .from('horse_games')
            .update({
                letters: playerLetters,
                ai_letters: aiLetters,
                current_round: newRound,
                score,
                status,
                ...(status !== 'active' ? { ended_at: new Date().toISOString() } : {}),
            })
            .eq('id', gameId)

        game = {
            ...game,
            letters: playerLetters,
            currentRound: newRound,
            score,
            status,
        }

        // Update leaderboard if game ended
        if (status !== 'active') {
            await this.updateLeaderboard(userId, status === 'won', score, similarityScore)
        }

        // Generate next challenge if still active
        let nextChallenge: HorseChallenge | null = null
        if (status === 'active') {
            nextChallenge = await this.generateChallenge({ ...game, currentRound: newRound }, gameData.ai_personality || 'classic')
        }

        logger.info({ gameId, round: newRound, status, playerLetters, aiLetters }, '[HORSE] Attempt submitted')

        return {
            game,
            currentChallenge: nextChallenge,
            playerLetters,
            aiLetters,
            round: newRound,
            isPlayerTurn: true,
            message,
        }
    }

    /**
     * Skip a challenge (take a letter)
     */
    async skipChallenge(gameId: string, userId: string): Promise<HorseGameState> {
        const { data: gameData, error } = await this.supabase
            .from('horse_games')
            .select('*')
            .eq('id', gameId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single()

        if (error || !gameData) throw new Error('No active HORSE game found')

        const playerLetters = (gameData.letters || '') + HORSE_WORD[gameData.letters?.length || 0]
        const aiLetters = gameData.ai_letters || ''
        const newRound = gameData.current_round + 1

        let status: 'active' | 'won' | 'lost' = 'active'
        let message = `⏭️ Skipped! You now have "${playerLetters}"`

        if (playerLetters.length >= HORSE_WORD.length) {
            status = 'lost'
            message = `💀 HORSE! You skipped too many. AI wins.`
        }

        await this.supabase
            .from('horse_games')
            .update({
                letters: playerLetters,
                current_round: newRound,
                status,
                ...(status !== 'active' ? { ended_at: new Date().toISOString() } : {}),
            })
            .eq('id', gameId)

        if (status !== 'active') {
            await this.updateLeaderboard(userId, false, gameData.score || 0, 0)
        }

        const game = this.mapGame({ ...gameData, letters: playerLetters, current_round: newRound, status })

        let nextChallenge: HorseChallenge | null = null
        if (status === 'active') {
            nextChallenge = await this.generateChallenge({ ...game, currentRound: newRound }, gameData.ai_personality || 'classic')
        }

        return {
            game,
            currentChallenge: nextChallenge,
            playerLetters,
            aiLetters,
            round: newRound,
            isPlayerTurn: true,
            message,
        }
    }

    /**
     * Get the user's active game
     */
    async getActiveGame(userId: string): Promise<HorseGameState | null> {
        const { data, error } = await this.supabase
            .from('horse_games')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error || !data) return null
        return this.getGameState(data.id, userId)
    }

    /**
     * Get current game state
     */
    async getGameState(gameId: string, userId: string): Promise<HorseGameState> {
        const { data: gameData, error } = await this.supabase
            .from('horse_games')
            .select('*')
            .eq('id', gameId)
            .eq('user_id', userId)
            .single()

        if (error || !gameData) throw new Error('Game not found')

        const game = this.mapGame(gameData)

        // Fetch latest challenge
        const { data: challengeData } = await this.supabase
            .from('horse_challenges')
            .select('*')
            .eq('game_id', gameId)
            .order('round', { ascending: false })
            .limit(1)
            .single()

        const challenge = challengeData ? this.mapChallenge(challengeData) : null

        return {
            game,
            currentChallenge: challenge,
            playerLetters: game.letters,
            aiLetters: gameData.ai_letters || '',
            round: game.currentRound,
            isPlayerTurn: true,
            message: game.status === 'active' ? 'Your turn! Complete the challenge.' : `Game over — ${game.status}`,
        }
    }

    /**
     * Get a full replay of a completed game
     */
    async getReplay(gameId: string, userId: string): Promise<{
        game: HorseGame
        challenges: HorseChallenge[]
        attempts: any[]
        summary: { totalRounds: number; playerLetters: string; aiLetters: string; finalScore: number; result: string }
    }> {
        const { data: gameData, error } = await this.supabase
            .from('horse_games')
            .select('*')
            .eq('id', gameId)
            .eq('user_id', userId)
            .single()

        if (error || !gameData) throw new Error('Game not found')
        if (gameData.status === 'active') throw new Error('Game is still active — cannot get replay')

        const game = this.mapGame(gameData)

        const { data: challengeData } = await this.supabase
            .from('horse_challenges')
            .select('*')
            .eq('game_id', gameId)
            .order('round', { ascending: true })

        const challenges = (challengeData || []).map(this.mapChallenge)

        const { data: attemptData } = await this.supabase
            .from('horse_attempts')
            .select('*')
            .eq('game_id', gameId)
            .order('timestamp', { ascending: true })

        const attempts = (attemptData || []).map((a: any) => ({
            id: a.id,
            challengeId: a.challenge_id,
            success: a.success,
            similarityScore: a.similarity_score,
            shotData: a.shot_data,
            timestamp: a.timestamp,
        }))

        return {
            game,
            challenges,
            attempts,
            summary: {
                totalRounds: game.currentRound,
                playerLetters: game.letters,
                aiLetters: gameData.ai_letters || '',
                finalScore: game.score,
                result: game.status,
            },
        }
    }

    /**
     * Get personal HORSE stats for a player
     */
    async getPlayerStats(userId: string): Promise<{
        totalGames: number
        gamesWon: number
        gamesLost: number
        winRate: number
        bestScore: number
        avgSimilarity: number
        longestWinStreak: number
        currentWinStreak: number
        favoriteChallenge: string | null
        difficultyBreakdown: Record<string, { played: number; won: number }>
    }> {
        const { data: lb } = await this.supabase
            .from('horse_leaderboard')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (!lb) {
            return {
                totalGames: 0, gamesWon: 0, gamesLost: 0, winRate: 0,
                bestScore: 0, avgSimilarity: 0, longestWinStreak: 0, currentWinStreak: 0,
                favoriteChallenge: null, difficultyBreakdown: {},
            }
        }

        // Difficulty breakdown
        const { data: games } = await this.supabase
            .from('horse_games')
            .select('difficulty, status')
            .eq('user_id', userId)
            .in('status', ['won', 'lost'])

        const difficultyBreakdown: Record<string, { played: number; won: number }> = {}
        for (const g of (games || [])) {
            if (!difficultyBreakdown[g.difficulty]) difficultyBreakdown[g.difficulty] = { played: 0, won: 0 }
            difficultyBreakdown[g.difficulty].played++
            if (g.status === 'won') difficultyBreakdown[g.difficulty].won++
        }

        // Favorite challenge type
        const { data: attempts } = await this.supabase
            .from('horse_attempts')
            .select('challenge_id')
            .eq('user_id', userId)

        let favoriteChallenge: string | null = null
        if (attempts && attempts.length > 0) {
            const challengeIds = [...new Set(attempts.map((a: any) => a.challenge_id))]
            const { data: challengeTypes } = await this.supabase
                .from('horse_challenges')
                .select('challenge_type')
                .in('id', challengeIds.slice(0, 100))

            if (challengeTypes) {
                const typeCounts: Record<string, number> = {}
                for (const c of challengeTypes) {
                    typeCounts[c.challenge_type] = (typeCounts[c.challenge_type] || 0) + 1
                }
                favoriteChallenge = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
            }
        }

        return {
            totalGames: lb.games_played,
            gamesWon: lb.games_won,
            gamesLost: lb.games_played - lb.games_won,
            winRate: lb.games_played > 0 ? Math.round((lb.games_won / lb.games_played) * 100) : 0,
            bestScore: lb.best_score || 0,
            avgSimilarity: lb.avg_similarity || 0,
            longestWinStreak: lb.longest_win_streak || 0,
            currentWinStreak: lb.current_win_streak || 0,
            favoriteChallenge,
            difficultyBreakdown,
        }
    }

    /**
     * Get game history
     */
    async getHistory(userId: string, limit = 20): Promise<HorseGame[]> {
        const { data, error } = await this.supabase
            .from('horse_games')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return (data || []).map(this.mapGame)
    }

    /**
     * Get HORSE leaderboard
     */
    async getLeaderboard(limit = 50): Promise<HorseLeaderboardEntry[]> {
        const { data, error } = await this.supabase
            .from('horse_leaderboard')
            .select(`
                user_id, games_played, games_won, best_score, avg_similarity, longest_win_streak,
                users!inner ( username, avatar_url )
            `)
            .order('games_won', { ascending: false })
            .limit(limit)

        if (error) throw error

        return (data || []).map((entry: any, index: number) => ({
            rank: index + 1,
            userId: entry.user_id,
            username: entry.users.username,
            avatarUrl: entry.users.avatar_url,
            gamesPlayed: entry.games_played,
            gamesWon: entry.games_won,
            winRate: entry.games_played > 0
                ? Math.round((entry.games_won / entry.games_played) * 100)
                : 0,
            bestScore: entry.best_score,
            avgSimilarity: entry.avg_similarity,
            longestWinStreak: entry.longest_win_streak,
        }))
    }

    /**
     * Get all available challenge types (with live NBA inspirations from API)
     */
    async getChallengeLibrary(): Promise<{ type: HorseChallengeType; description: string; difficulty: number; nbaInspirations: string[] }[]> {
        const inspirations = await this.nbaApi.getInspirationsByType()

        return (Object.entries(CHALLENGE_TEMPLATES) as [HorseChallengeType, typeof CHALLENGE_TEMPLATES[HorseChallengeType]][]).map(
            ([type, template]) => ({
                type,
                description: template.description,
                difficulty: template.baseDifficulty,
                nbaInspirations: inspirations[type] || [],
            })
        )
    }

    // ── Private helpers ──

    private async updateLeaderboard(userId: string, won: boolean, score: number, similarity: number) {
        const { data: existing } = await this.supabase
            .from('horse_leaderboard')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (existing) {
            const newGamesPlayed = existing.games_played + 1
            const newGamesWon = existing.games_won + (won ? 1 : 0)
            const newBestScore = Math.max(existing.best_score || 0, score)
            const newCurrentStreak = won ? (existing.current_win_streak || 0) + 1 : 0
            const newLongestStreak = Math.max(existing.longest_win_streak || 0, newCurrentStreak)
            const newAvgSimilarity = (existing.avg_similarity * existing.games_played + similarity) / newGamesPlayed

            await this.supabase.from('horse_leaderboard').update({
                games_played: newGamesPlayed,
                games_won: newGamesWon,
                best_score: newBestScore,
                avg_similarity: Math.round(newAvgSimilarity * 10) / 10,
                longest_win_streak: newLongestStreak,
                current_win_streak: newCurrentStreak,
                updated_at: new Date().toISOString(),
            }).eq('user_id', userId)
        } else {
            await this.supabase.from('horse_leaderboard').insert({
                user_id: userId,
                games_played: 1,
                games_won: won ? 1 : 0,
                best_score: score,
                avg_similarity: similarity,
                longest_win_streak: won ? 1 : 0,
                current_win_streak: won ? 1 : 0,
            })
        }
    }

    private mapGame(data: any): HorseGame {
        return {
            id: data.id,
            userId: data.user_id,
            difficulty: data.difficulty,
            status: data.status,
            letters: data.letters || '',
            maxLetters: data.max_letters || 5,
            currentRound: data.current_round || 1,
            score: data.score || 0,
            challenges: [],
            startedAt: data.started_at || data.created_at,
            endedAt: data.ended_at,
        }
    }

    private mapChallenge(data: any): HorseChallenge {
        return {
            id: data.id,
            gameId: data.game_id,
            round: data.round,
            challengeType: data.challenge_type,
            targetZone: data.target_zone,
            targetTechnique: data.target_technique,
            nbaInspiration: data.nba_inspiration,
            description: data.description,
            difficulty: data.difficulty,
            timeoutSec: data.timeout_sec,
        }
    }
}
