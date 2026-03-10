import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getNbaApiService } from '../services/nba-api.service'

/**
 * NBA Data Routes — Live NBA data from balldontlie.io API
 *
 * Endpoints :
 * - GET /players/search   → Search NBA players by name
 * - GET /players/:id      → Get a specific NBA player
 * - GET /teams            → Get all NBA teams
 * - GET /inspirations     → Get challenge inspirations (grouped by type)
 * - GET /health           → Check NBA API availability
 */

const searchSchema = z.object({
    q: z.string().min(1).max(100),
    limit: z.coerce.number().min(1).max(25).default(10),
})

const playerIdSchema = z.object({
    id: z.coerce.number().int().positive(),
})

export default async function nbaRoutes(fastify: FastifyInstance) {
    const nbaApi = getNbaApiService()

    // ==========================================
    // GET /players/search — Search NBA players
    // ==========================================
    fastify.get('/players/search', async (request, reply) => {
        try {
            const { q, limit } = searchSchema.parse(request.query)
            const players = await nbaApi.searchPlayers(q, limit)
            return { success: true, data: players, source: 'balldontlie.io' }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid query', details: error.errors })
            }
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /players/:id — Get specific NBA player
    // ==========================================
    fastify.get('/players/:id', async (request, reply) => {
        try {
            const { id } = playerIdSchema.parse(request.params)
            const player = await nbaApi.getPlayer(id)
            if (!player) {
                return reply.code(404).send({ error: 'Player not found' })
            }
            return { success: true, data: player, source: 'balldontlie.io' }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid player ID', details: error.errors })
            }
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /teams — Get all NBA teams
    // ==========================================
    fastify.get('/teams', async (_request, reply) => {
        try {
            const teams = await nbaApi.getTeams()
            return { success: true, data: teams, source: 'balldontlie.io' }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /inspirations — Challenge inspirations
    // ==========================================
    fastify.get('/inspirations', async (_request, reply) => {
        try {
            const inspirations = await nbaApi.getInspirationsByType()
            return { success: true, data: inspirations, source: 'balldontlie.io' }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /health — Check NBA API availability
    // ==========================================
    fastify.get('/health', async (_request, reply) => {
        try {
            const available = await nbaApi.isAvailable()
            return {
                success: true,
                data: {
                    apiAvailable: available,
                    provider: 'balldontlie.io',
                    tier: 'free',
                    rateLimit: '5 req/min',
                    note: available
                        ? 'NBA data is fetched live from the API'
                        : 'API unavailable — using cached/fallback data',
                },
            }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })
}
