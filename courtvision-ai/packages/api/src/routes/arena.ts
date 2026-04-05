import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ArenaService } from '../services/arena.service'

/**
 * Arena Routes — Challenge Multi-joueurs Temps Réel (V6.0)
 *
 * Permet à 2-8 joueurs de s'affronter en temps réel.
 *
 * Endpoints :
 * - POST /create            → Créer un match arena
 * - GET  /available          → Lister les matchs ouverts
 * - POST /:id/join           → Rejoindre un match
 * - POST /:id/join-invite    → Rejoindre via lien d'invitation
 * - POST /:id/ready          → Signaler prêt
 * - POST /:id/shot           → Enregistrer un tir
 * - GET  /:id/scoreboard     → Scoreboard temps réel
 * - GET  /:id/stats          → Statistiques détaillées du match
 * - POST /:id/end            → Terminer le match
 * - POST /:id/cancel         → Annuler le match (host only)
 * - POST /:id/kick/:playerId → Expulser un joueur (host only)
 * - GET  /:id/invite-link    → Générer un lien d'invitation
 * - GET  /history            → Historique des matchs (paginé)
 * - GET  /leaderboard        → Classement Arena global (paginé)
 * - GET  /my-stats           → Statistiques personnelles Arena
 */

// ── Zod Schemas ──

const createSchema = z.object({
    mode: z.enum(['shootout', 'accuracy', 'speed', 'clutch', 'knockout']).default('shootout'),
    maxPlayers: z.number().min(2).max(8).default(4),
    roundDurationSec: z.number().min(30).max(600).default(120),
    totalRounds: z.number().min(1).max(10).default(3),
    shotsPerRound: z.number().min(5).max(50).default(10),
    allowedZones: z.array(z.string()).optional(),
    minLevel: z.number().min(1).optional(),
    isPrivate: z.boolean().default(false),
    password: z.string().max(50).optional(),
})

const shotSchema = z.object({
    result: z.enum(['made', 'missed']),
    zone: z.string().min(1),
    confidence: z.number().min(0).max(100).optional(),
    clientEventId: z.string().min(8).max(120).optional(),
    timestamp: z.number().optional(),
})

const matchIdSchema = z.object({
    id: z.string().uuid(),
})

const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
})

const joinInviteSchema = z.object({
    inviteCode: z.string().min(6).max(20),
    password: z.string().max(50).optional(),
})

// Anti-triche : tracking des tirs par session pour rate-limit
const shotRateMap = new Map<string, { count: number; windowStart: number }>()
const MAX_SHOTS_PER_MINUTE = 30

// Nettoyage périodique du rate-limit map pour éviter les fuites mémoire
const RATE_MAP_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
export const rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of shotRateMap) {
        if (now - entry.windowStart > 120_000) { // 2 minutes stale
            shotRateMap.delete(key)
        }
    }
}, RATE_MAP_CLEANUP_INTERVAL)
rateLimitCleanupTimer.unref() // .unref() = ne bloque pas le shutdown Node

function checkShotRate(userId: string, matchId: string): boolean {
    const key = `${matchId}:${userId}`
    const now = Date.now()
    const entry = shotRateMap.get(key)

    if (!entry || now - entry.windowStart > 60_000) {
        shotRateMap.set(key, { count: 1, windowStart: now })
        return true
    }

    if (entry.count >= MAX_SHOTS_PER_MINUTE) return false
    entry.count++
    return true
}

export default async function arenaRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    const arenaService = new ArenaService(fastify.supabase)

    // ==========================================
    // POST /create — Créer un match Arena
    // ==========================================
    fastify.post('/create', async (request, reply) => {
        try {
            const user = request.user!
            const config = createSchema.parse(request.body)

            const { data: profile } = await fastify.supabase
                .from('users')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single()

            const match = await arenaService.createMatch(
                user.id,
                profile?.username || 'Player',
                config
            )

            request.log.info({ matchId: match.id, mode: config.mode }, 'Arena match created')
            return { success: true, data: match }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid config', details: error.errors })
            }
            request.log.error({ err: error }, 'Arena create failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /available — Matchs ouverts (paginé)
    // ==========================================
    fastify.get('/available', async (request, reply) => {
        try {
            const { page, limit } = paginationSchema.parse(request.query)
            const matches = await arenaService.getAvailableMatches(limit, (page - 1) * limit)
            return { success: true, data: matches, page, limit }
        } catch (error: any) {
            request.log.error({ err: error }, 'Arena available failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/join — Rejoindre un match
    // ==========================================
    fastify.post('/:id/join', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)

            const { data: profile } = await fastify.supabase
                .from('users')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single()

            const match = await arenaService.joinMatch(id, user.id, profile?.username || 'Player')
            return { success: true, data: match }
        } catch (error: any) {
            if (error.message.includes('full')) return reply.code(409).send({ error: error.message })
            if (error.message.includes('Already')) return reply.code(409).send({ error: error.message })
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            if (error.message.includes('private')) return reply.code(403).send({ error: error.message })
            request.log.error({ err: error }, 'Arena join failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/join-invite — Rejoindre via code d'invitation
    // ==========================================
    fastify.post('/:id/join-invite', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)
            const { inviteCode, password } = joinInviteSchema.parse(request.body)

            const { data: profile } = await fastify.supabase
                .from('users')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single()

            const match = await arenaService.joinMatchByInvite(
                id, user.id, profile?.username || 'Player', inviteCode, password
            )
            return { success: true, data: match }
        } catch (error: any) {
            if (error.message.includes('Invalid invite')) return reply.code(403).send({ error: error.message })
            if (error.message.includes('full')) return reply.code(409).send({ error: error.message })
            request.log.error({ err: error }, 'Arena join-invite failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/ready — Signaler prêt
    // ==========================================
    fastify.post('/:id/ready', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)

            const result = await arenaService.setReady(id, user.id)
            return { success: true, data: result }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            if (error.message.includes('not in this match')) return reply.code(403).send({ error: error.message })
            request.log.error({ err: error }, 'Arena ready failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/shot — Enregistrer un tir (rate-limited)
    // ==========================================
    fastify.post('/:id/shot', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)
            const shotData = shotSchema.parse(request.body)

            // Anti-triche : rate-limit les tirs
            if (!checkShotRate(user.id, id)) {
                return reply.code(429).send({
                    error: 'Shot rate limit exceeded',
                    message: `Maximum ${MAX_SHOTS_PER_MINUTE} shots per minute allowed`,
                })
            }

            const { data: profile } = await fastify.supabase
                .from('users')
                .select('username')
                .eq('id', user.id)
                .single()

            const event = await arenaService.recordShot(
                id, user.id, profile?.username || 'Player',
                shotData.result, shotData.zone, shotData.confidence, shotData.clientEventId
            )
            return { success: true, data: event }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Invalid shot data', details: error.errors })
            }
            if (error.message.includes('not live')) return reply.code(400).send({ error: error.message })
            if (error.message.includes('not in this match')) return reply.code(403).send({ error: error.message })
            request.log.error({ err: error }, 'Arena shot failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/scoreboard — Scoreboard temps réel
    // ==========================================
    fastify.get('/:id/scoreboard', async (request, reply) => {
        try {
            const { id } = matchIdSchema.parse(request.params)
            const scoreboard = await arenaService.getScoreboard(id)
            return { success: true, data: scoreboard }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Arena scoreboard failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/stats — Stats détaillées du match
    // ==========================================
    fastify.get('/:id/stats', async (request, reply) => {
        try {
            const { id } = matchIdSchema.parse(request.params)
            const stats = await arenaService.getMatchStats(id)
            return { success: true, data: stats }
        } catch (error: any) {
            if (error.message.includes('not found')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Arena stats failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/end — Terminer le match
    // ==========================================
    fastify.post('/:id/end', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)

            // Only host can end the match
            const match = await arenaService.getMatch(id)
            if (match.hostId !== user.id) {
                return reply.code(403).send({ error: 'Only the host can end the match' })
            }

            const result = await arenaService.endMatch(id)
            return { success: true, data: result }
        } catch (error: any) {
            if (error.message.includes('already finished')) return reply.code(400).send({ error: error.message })
            request.log.error({ err: error }, 'Arena end failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/cancel — Annuler le match (host only)
    // ==========================================
    fastify.post('/:id/cancel', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)

            const match = await arenaService.getMatch(id)
            if (match.hostId !== user.id) {
                return reply.code(403).send({ error: 'Only the host can cancel the match' })
            }
            if (match.status === 'finished') {
                return reply.code(400).send({ error: 'Cannot cancel a finished match' })
            }

            const result = await arenaService.cancelMatch(id)
            return { success: true, data: result }
        } catch (error: any) {
            request.log.error({ err: error }, 'Arena cancel failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/kick/:playerId — Expulser un joueur (host only)
    // ==========================================
    fastify.post('/:id/kick/:playerId', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)
            const { playerId } = z.object({ playerId: z.string().uuid() }).parse(request.params)

            const match = await arenaService.getMatch(id)
            if (match.hostId !== user.id) {
                return reply.code(403).send({ error: 'Only the host can kick players' })
            }
            if (playerId === user.id) {
                return reply.code(400).send({ error: 'Cannot kick yourself' })
            }

            const result = await arenaService.kickPlayer(id, playerId)
            return { success: true, data: result }
        } catch (error: any) {
            if (error.message.includes('not in match')) return reply.code(404).send({ error: error.message })
            request.log.error({ err: error }, 'Arena kick failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/invite-link — Générer un lien d'invitation
    // ==========================================
    fastify.get('/:id/invite-link', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = matchIdSchema.parse(request.params)

            const match = await arenaService.getMatch(id)
            if (match.hostId !== user.id) {
                return reply.code(403).send({ error: 'Only the host can generate invite links' })
            }

            const inviteLink = await arenaService.generateInviteLink(id)
            return { success: true, data: inviteLink }
        } catch (error: any) {
            request.log.error({ err: error }, 'Arena invite-link failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /history — Historique des matchs (paginé)
    // ==========================================
    fastify.get('/history', async (request, reply) => {
        try {
            const user = request.user!
            const { page, limit } = paginationSchema.parse(request.query)
            const history = await arenaService.getHistory(user.id, limit, (page - 1) * limit)
            return { success: true, data: history, page, limit }
        } catch (error: any) {
            request.log.error({ err: error }, 'Arena history failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /leaderboard — Classement Arena global (paginé)
    // ==========================================
    fastify.get('/leaderboard', async (request, reply) => {
        try {
            const { page, limit } = paginationSchema.parse(request.query)
            const leaderboard = await arenaService.getLeaderboard(limit, (page - 1) * limit)
            return { success: true, data: leaderboard, page, limit }
        } catch (error: any) {
            request.log.error({ err: error }, 'Arena leaderboard failed')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /my-stats — Statistiques personnelles Arena
    // ==========================================
    fastify.get('/my-stats', async (request, reply) => {
        try {
            const user = request.user!
            const stats = await arenaService.getPlayerStats(user.id)
            return { success: true, data: stats }
        } catch (error: any) {
            request.log.error({ err: error }, 'Arena my-stats failed')
            return reply.code(500).send({ error: error.message })
        }
    })
}
