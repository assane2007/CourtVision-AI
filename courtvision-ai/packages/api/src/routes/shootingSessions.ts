/**
 * Shooting Sessions API Routes — Sessions d'entraînement IA temps réel.
 *
 * Routes :
 *   POST   /api/shooting-sessions          — Sauvegarder une session d'entraînement
 *   GET    /api/shooting-sessions          — Liste des sessions de l'utilisateur
 *   GET    /api/shooting-sessions/:id      — Détail d'une session
 *   DELETE /api/shooting-sessions/:id      — Supprimer une session
 *   GET    /api/shooting-sessions/stats    — Stats lifetime de l'utilisateur
 *   GET    /api/shooting-sessions/trends   — Tendances de progression
 *   GET    /api/shooting-sessions/leaderboard — Classement communautaire
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'

// ==========================================
// Validation Schemas
// ==========================================

const saveSessionSchema = z.object({
    id: z.string(),
    duration_sec: z.number().int().min(0),
    total_shots: z.number().int().min(0),
    made_shots: z.number().int().min(0),
    shooting_pct: z.number().min(0).max(100),
    avg_elbow_angle: z.number().optional(),
    avg_release_height: z.number().optional(),
    avg_release_time: z.number().optional(),
    avg_posture_quality: z.number().optional(),
    mechanic_consistency: z.number().optional(),
    follow_through_pct: z.number().optional(),
    total_frames: z.number().optional(),
    avg_processing_ms: z.number().optional(),
    shots: z.array(z.object({
        id: z.string(),
        outcome: z.enum(['made', 'missed', 'blocked']).nullable(),
        elbow_angle: z.number().optional(),
        release_height_ratio: z.number().optional(),
        release_time: z.number().optional(),
        posture_quality: z.number().optional(),
        has_follow_through: z.boolean().optional(),
        detection_confidence: z.number().optional(),
        zone: z.string().nullable().optional(),
        shot_timestamp: z.number().optional(),
    })).optional(),
    metadata: z.object({
        device_model: z.string().optional(),
        os_version: z.string().optional(),
        app_version: z.string().optional(),
        court_type: z.enum(['indoor', 'outdoor', 'gym']).optional(),
        location: z.string().optional(),
    }).optional(),
})

const sessionIdParamSchema = z.object({
    id: z.string(),
})

const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
})

// ==========================================
// Routes
// ==========================================

export default async function shootingSessionRoutes(fastify: FastifyInstance) {
    // Toutes les routes nécessitent l'authentification
    fastify.addHook('preValidation', fastify.authenticate)

    // ---- POST / — Sauvegarder une session ----
    fastify.post('/', async (request, reply) => {
        try {
            const user = request.user!
            const body = saveSessionSchema.parse(request.body)

            // Insert session
            const { error: sessionError } = await fastify.supabase
                .from('shooting_sessions')
                .upsert({
                    id: body.id,
                    user_id: user.id,
                    duration_sec: body.duration_sec,
                    total_shots: body.total_shots,
                    made_shots: body.made_shots,
                    shooting_pct: body.shooting_pct,
                    avg_elbow_angle: body.avg_elbow_angle ?? 0,
                    avg_release_height: body.avg_release_height ?? 0,
                    avg_release_time: body.avg_release_time ?? 0,
                    avg_posture_quality: body.avg_posture_quality ?? 0,
                    mechanic_consistency: body.mechanic_consistency ?? 0,
                    follow_through_pct: body.follow_through_pct ?? 0,
                    total_frames: body.total_frames ?? 0,
                    avg_processing_ms: body.avg_processing_ms ?? 0,
                    device_model: body.metadata?.device_model,
                    os_version: body.metadata?.os_version,
                    app_version: body.metadata?.app_version,
                    court_type: body.metadata?.court_type,
                })

            if (sessionError) throw sessionError

            // Insert shots (si fournis)
            if (body.shots && body.shots.length > 0) {
                const shotRows = body.shots.map(shot => ({
                    id: shot.id,
                    session_id: body.id,
                    user_id: user.id,
                    outcome: shot.outcome,
                    elbow_angle: shot.elbow_angle,
                    release_height_ratio: shot.release_height_ratio,
                    release_time: shot.release_time,
                    posture_quality: shot.posture_quality,
                    has_follow_through: shot.has_follow_through ?? false,
                    detection_confidence: shot.detection_confidence ?? 0,
                    zone: shot.zone ?? null,
                    shot_timestamp: shot.shot_timestamp ?? 0,
                }))

                const { error: shotsError } = await fastify.supabase
                    .from('session_shots')
                    .upsert(shotRows)

                if (shotsError) {
                    request.log.warn({ shotsError }, 'Failed to insert shots')
                }
            }

            // Mettre à jour le XP de l'utilisateur
            const xpEarned = Math.min(50, body.total_shots * 2 + body.made_shots * 3)
            try {
                await fastify.supabase.rpc('add_user_xp', {
                    p_user_id: user.id,
                    p_xp: xpEarned,
                })
            } catch {
                // Non-bloquant si la fonction RPC n'existe pas encore
            }

            return {
                success: true,
                session_id: body.id,
                xp_earned: xpEarned,
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: error.errors })
            }
            request.log.error(error, 'Failed to save shooting session')
            return reply.code(500).send({ error: error.message })
        }
    })

    // ---- GET / — Liste des sessions ----
    fastify.get('/', async (request, reply) => {
        try {
            const user = request.user!
            const { limit, offset } = paginationSchema.parse(request.query)

            const { data, error, count } = await fastify.supabase
                .from('shooting_sessions')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            if (error) throw error

            // Ajouter le score global calculé
            const sessions = (data ?? []).map((s: any) => ({
                ...s,
                overall_score: Math.round(
                    (s.avg_posture_quality ?? 0) * 0.35 +
                    (s.mechanic_consistency ?? 0) * 0.25 +
                    (s.shooting_pct ?? 0) * 0.25 +
                    (s.follow_through_pct ?? 0) * 0.15
                ),
            }))

            return {
                sessions,
                total: count ?? 0,
                limit,
                offset,
            }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ---- GET /stats — Stats lifetime ----
    fastify.get('/stats', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .rpc('get_user_shooting_stats', { p_user_id: user.id })

            if (error) throw error

            return { stats: data?.[0] ?? null }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ---- GET /trends — Tendances de progression ----
    fastify.get('/trends', async (request, reply) => {
        try {
            const user = request.user!
            const limitSchema = z.object({ limit: z.coerce.number().int().min(2).max(50).default(10) })
            const { limit } = limitSchema.parse(request.query)

            const { data, error } = await fastify.supabase
                .rpc('get_user_shooting_trends', { p_user_id: user.id, p_limit: limit })

            if (error) throw error

            return { trends: data ?? [] }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ---- GET /leaderboard — Classement communautaire ----
    fastify.get('/leaderboard', async (request, reply) => {
        try {
            const limitSchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) })
            const { limit } = limitSchema.parse(request.query)

            const { data, error } = await fastify.supabase
                .rpc('get_shooting_leaderboard', { p_limit: limit })

            if (error) throw error

            return { leaderboard: data ?? [] }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ---- GET /:id — Détail d'une session ----
    fastify.get('/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = sessionIdParamSchema.parse(request.params)

            // Session
            const { data: session, error: sessionError } = await fastify.supabase
                .from('shooting_sessions')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (sessionError || !session) {
                return reply.code(404).send({ error: 'Session not found' })
            }

            // Shots
            const { data: shots, error: shotsError } = await fastify.supabase
                .from('session_shots')
                .select('*')
                .eq('session_id', id)
                .order('shot_timestamp', { ascending: true })

            if (shotsError) {
                request.log.warn({ shotsError }, 'Failed to fetch shots')
            }

            return {
                session: {
                    ...session,
                    overall_score: Math.round(
                        (session.avg_posture_quality ?? 0) * 0.35 +
                        (session.mechanic_consistency ?? 0) * 0.25 +
                        (session.shooting_pct ?? 0) * 0.25 +
                        (session.follow_through_pct ?? 0) * 0.15
                    ),
                },
                shots: shots ?? [],
            }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })

    // ---- DELETE /:id — Supprimer une session ----
    fastify.delete('/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = sessionIdParamSchema.parse(request.params)

            // Les shots seront supprimés en cascade (ON DELETE CASCADE)
            const { error } = await fastify.supabase
                .from('shooting_sessions')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error

            return { success: true }
        } catch (error: any) {
            return reply.code(500).send({ error: error.message })
        }
    })
}
