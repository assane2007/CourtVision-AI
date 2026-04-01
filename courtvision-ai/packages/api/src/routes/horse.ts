import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { HorseService } from '../services/horse.service'

/**
 * HORSE IA Routes — Mode HORSE contre un avatar IA (V6.0)
 *
 * Endpoints :
 * - POST /start             → Démarrer une partie
 * - GET  /:id               → État de la partie en cours
 * - POST /:id/challenge     → Générer un défi (AI)
 * - POST /:id/attempt       → Soumettre une tentative
 * - POST /:id/skip          → Passer (prend une lettre)
 * - GET  /:id/result        → Résultat final
 * - GET  /:id/replay        → Replay complet de la partie
 * - GET  /active             → Partie active de l'utilisateur
 * - GET  /history           → Historique des parties (paginé)
 * - GET  /challenges        → Bibliothèque de défis
 * - GET  /leaderboard       → Classement HORSE (paginé)
 * - GET  /my-stats          → Stats personnelles HORSE
 */

// ── Zod Schemas ──

const startSchema = z.object({
    difficulty: z.enum(['rookie', 'pro', 'allstar', 'legend']).default('pro'),
    aiPersonality: z.enum(['classic', 'aggressive', 'creative', 'defensive']).default('classic'),
})

const attemptSchema = z.object({
    challengeId: z.string().uuid(),
    success: z.boolean(),
    similarityScore: z.number().min(0).max(100).default(50),
    shotData: z.record(z.any()).optional(),
    elapsedTimeSec: z.number().min(0).optional(),
})

const gameIdSchema = z.object({
    id: z.string().uuid(),
})

const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
})

export default async function horseRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    const horseService = new HorseService(fastify.supabase)

    // ==========================================
    // POST /start — Démarrer une partie HORSE
    // ==========================================
    fastify.post('/start', async (request, reply) => {
        try {
            const user = request.user!
            const { difficulty, aiPersonality } = startSchema.parse(request.body)

            const state = await horseService.startGame(user.id, difficulty, aiPersonality)
            return { success: true, data: state }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid input', details: error.errors })
            }
            request.log.error({ err: error }, 'HORSE start failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /active — Partie active
    // ==========================================
    fastify.get('/active', async (request, reply) => {
        try {
            const user = request.user!
            const game = await horseService.getActiveGame(user.id)
            if (!game) {
                return { success: true, data: null, message: 'No active HORSE game' }
            }
            return { success: true, data: game }
        } catch (error: any) {
            request.log.error({ err: error }, 'HORSE get active failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id — État de la partie
    // ==========================================
    fastify.get('/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = gameIdSchema.parse(request.params)

            const state = await horseService.getGameState(id, user.id)
            return { success: true, data: state }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'HORSE get state failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/challenge — Générer un défi (AI)
    // ==========================================
    fastify.post('/:id/challenge', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = gameIdSchema.parse(request.params)

            const state = await horseService.getGameState(id, user.id)
            if (state.game.status !== 'active') {
                return reply.code(400).send({ error: 'Game is not active' })
            }

            // Retrieve AI personality from DB for this game
            const { data: gameRow } = await fastify.supabase
                .from('horse_games')
                .select('ai_personality')
                .eq('id', id)
                .single()

            const challenge = await horseService.generateChallenge(state.game, gameRow?.ai_personality || 'classic')
            return { success: true, data: challenge }
        } catch (error: any) {
            request.log.error({ err: error }, 'HORSE challenge generation failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/attempt — Soumettre une tentative
    // ==========================================
    fastify.post('/:id/attempt', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = gameIdSchema.parse(request.params)
            const body = attemptSchema.parse(request.body)

            const state = await horseService.submitAttempt(
                id, user.id, body.challengeId, body.success,
                body.similarityScore, body.shotData
            )
            return { success: true, data: state }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid attempt data', details: error.errors })
            }
            if (error.message.includes('not found') || error.message.includes('No active')) {
                return reply.code(404).send({ error: error.message })
            }
            request.log.error({ err: error }, 'HORSE attempt failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/skip — Passer (prend une lettre)
    // ==========================================
    fastify.post('/:id/skip', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = gameIdSchema.parse(request.params)

            const state = await horseService.skipChallenge(id, user.id)
            return { success: true, data: state }
        } catch (error: any) {
            if (error.message.includes('not found') || error.message.includes('No active')) {
                return reply.code(404).send({ error: error.message })
            }
            request.log.error({ err: error }, 'HORSE skip failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/result — Résultat final
    // ==========================================
    fastify.get('/:id/result', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = gameIdSchema.parse(request.params)

            const state = await horseService.getGameState(id, user.id)
            if (state.game.status === 'active') {
                return reply.code(400).send({ error: 'Game is still in progress' })
            }

            return { success: true, data: state }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'HORSE result failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/replay — Replay complet de la partie
    // ==========================================
    fastify.get('/:id/replay', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = gameIdSchema.parse(request.params)

            const replay = await horseService.getReplay(id, user.id)
            return { success: true, data: replay }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            if (error.message.includes('still active')) return reply.code(400).send({ error: error.message })
            request.log.error({ err: error }, 'HORSE replay failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /history — Historique des parties (paginé)
    // ==========================================
    fastify.get('/history', async (request, reply) => {
        try {
            const user = request.user!
            const { page, limit } = paginationSchema.parse(request.query)
            const games = await horseService.getHistory(user.id, limit)
            return { success: true, data: games, page, limit }
        } catch (error: any) {
            request.log.error({ err: error }, 'HORSE history failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /challenges — Bibliothèque de défis
    // ==========================================
    fastify.get('/challenges', async (_request, reply) => {
        try {
            const library = await horseService.getChallengeLibrary()
            return { success: true, data: library }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /leaderboard — Classement HORSE (paginé)
    // ==========================================
    fastify.get('/leaderboard', async (request, reply) => {
        try {
            const { page, limit } = paginationSchema.parse(request.query)
            const leaderboard = await horseService.getLeaderboard(limit)
            return { success: true, data: leaderboard, page, limit }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /my-stats — Stats personnelles HORSE
    // ==========================================
    fastify.get('/my-stats', async (request, reply) => {
        try {
            const user = request.user!
            const stats = await horseService.getPlayerStats(user.id)
            return { success: true, data: stats }
        } catch (error: any) {
            request.log.error({ err: error }, 'HORSE my-stats failed')
            return reply.code(500).send({ error: error.message })
        }
    })
}
