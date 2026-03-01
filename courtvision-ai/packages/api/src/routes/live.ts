import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Redis from 'ioredis'
import { LiveCoachEngine, analyzeSingleFrame } from '@courtvision/ai'
import type { Landmark } from '@courtvision/ai'
import crypto from 'crypto'

const liveParamsSchema = z.object({
    id: z.string().uuid()
})

const liveStartSchema = z.object({
    frameInterval: z.number().min(1).max(10).default(3),
    alertSensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
    fatigueAlerts: z.boolean().default(true),
    shotPostureAlerts: z.boolean().default(true),
    mentalAlerts: z.boolean().default(true),
    maxAlertsPerQuarter: z.number().min(1).max(50).default(15)
}).partial()

const landmarkSchema = z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    visibility: z.number()
})

const liveFrameSchema = z.object({
    timestamp: z.number(),
    quarter: z.number().int().min(1).max(4).default(1),
    landmarks: z.array(landmarkSchema).optional(),
    ballDetected: z.boolean().default(false),
    ballPosition: z.object({ x: z.number(), y: z.number() }).optional(),
    manualShotMade: z.boolean().optional(),
    manualShotMissed: z.boolean().optional()
})

const liveEndQuarterSchema = z.object({
    quarter: z.number().int().min(1).max(4)
})

/**
 * Coach Live Routes — Mode analyse en temps réel pendant le match
 *
 * Flow complet :
 * 1. POST /:id/live          → Démarrer le mode Coach Live (crée un engine)
 * 2. POST /:id/live/frame    → Envoyer une frame (landmarks) → reçoit des alertes
 * 3. POST /:id/live/shot     → Enregistrer manuellement un tir (made/missed)
 * 4. POST /:id/live/quarter  → Terminer un quart-temps → reçoit un résumé
 * 5. POST /:id/live/end      → Terminer le match → reçoit le rapport final
 * 6. GET  /:id/live/status   → État courant de la session live
 * 7. GET  /:id/live/stream   → SSE (Server-Sent Events) pour recevoir les alertes en push
 */

// ── Redis-backed Live Session Store ────────────────────────────
// Engines stay in-memory (hot path: <1ms frame analysis).
// Redis stores session registry + metadata for:
//   - Crash recovery (detect stale sessions on restart)
//   - Horizontal scaling awareness (which server owns which session)
//   - Session state snapshots for observability
// Graceful degradation: falls back to memory-only if Redis unavailable.

const REDIS_KEY_PREFIX = 'live:session:'
const SERVER_ID = crypto.randomBytes(4).toString('hex') // unique per process

class LiveSessionStore {
    private engines = new Map<string, LiveCoachEngine>()
    private redis: Redis | null = null
    private redisAvailable = false
    private logger: { info: (...a: any[]) => void; warn: (...a: any[]) => void; error: (...a: any[]) => void }

    constructor(logger?: any) {
        this.logger = logger || { info: () => {}, warn: () => {}, error: () => {} }
    }

    async connectRedis(): Promise<void> {
        try {
            this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    if (times > 3) return null
                    return Math.min(times * 200, 2000)
                },
                lazyConnect: true,
            })
            this.redis.on('connect', () => { this.redisAvailable = true })
            this.redis.on('error', () => { this.redisAvailable = false })
            await this.redis.connect()
            this.redisAvailable = true
            this.logger.info('LiveStore: Redis connected')
        } catch {
            this.logger.warn('LiveStore: Redis unavailable — memory-only mode')
            this.redisAvailable = false
        }
    }

    /** Recover stale sessions from a previous crash — mark them as 'failed' in DB */
    async recoverStaleSessions(supabase: any): Promise<void> {
        if (!this.redisAvailable || !this.redis) return
        try {
            const keys = await this.redis.keys(`${REDIS_KEY_PREFIX}*`)
            for (const key of keys) {
                const meta = await this.redis.hgetall(key)
                if (!meta || !meta.sessionId) continue
                // Only clean sessions that belonged to THIS server (or any if serverId not set)
                // On restart, our SERVER_ID changed, so all old sessions from this host are stale
                if (meta.serverId && meta.serverId !== SERVER_ID) continue
                // Mark as failed in DB (stale live session)
                await supabase
                    .from('sessions')
                    .update({ status: 'failed' })
                    .eq('id', meta.sessionId)
                    .eq('status', 'live')
                await this.redis.del(key)
                this.logger.info({ sessionId: meta.sessionId }, 'LiveStore: Recovered stale session')
            }
        } catch (err) {
            this.logger.warn({ err }, 'LiveStore: Stale session recovery failed')
        }
    }

    async set(id: string, engine: LiveCoachEngine, config: Record<string, any> = {}): Promise<void> {
        this.engines.set(id, engine)
        if (this.redisAvailable && this.redis) {
            try {
                await this.redis.hmset(`${REDIS_KEY_PREFIX}${id}`, {
                    sessionId: id,
                    serverId: SERVER_ID,
                    startedAt: new Date().toISOString(),
                    config: JSON.stringify(config),
                })
                // TTL 4 hours — safety net for leaked sessions
                await this.redis.expire(`${REDIS_KEY_PREFIX}${id}`, 4 * 60 * 60)
            } catch { /* Redis write failed — engine still in memory */ }
        }
    }

    get(id: string): LiveCoachEngine | undefined {
        return this.engines.get(id)
    }

    has(id: string): boolean {
        return this.engines.has(id)
    }

    async delete(id: string): Promise<void> {
        this.engines.delete(id)
        if (this.redisAvailable && this.redis) {
            try { await this.redis.del(`${REDIS_KEY_PREFIX}${id}`) } catch { /* ignore */ }
        }
    }

    /** Snapshot current engine state to Redis for observability */
    async snapshotState(id: string): Promise<void> {
        const engine = this.engines.get(id)
        if (!engine || !this.redisAvailable || !this.redis) return
        try {
            const state = engine.getSessionState()
            await this.redis.hset(`${REDIS_KEY_PREFIX}${id}`, 'lastState', JSON.stringify(state))
        } catch { /* ignore */ }
    }

    async disconnect(): Promise<void> {
        if (this.redis) {
            try { await this.redis.quit() } catch { /* ignore */ }
        }
    }
}

const sessionStore = new LiveSessionStore()
const sseConnections = new Map<string, Set<any>>()

export default async function liveRoutes(fastify: FastifyInstance) {

    // Inject Fastify logger into the session store
    (sessionStore as any).logger = fastify.log

    // ── Init Redis + recover stale sessions on startup ──
    await sessionStore.connectRedis()
    await sessionStore.recoverStaleSessions(fastify.supabase)

    // Cleanup Redis on server shutdown
    fastify.addHook('onClose', async () => {
        await sessionStore.disconnect()
    })

    // ==========================================
    // POST /:id/live — Démarrer le mode Coach Live
    // ==========================================
    fastify.post('/:id/live', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { id } = liveParamsSchema.parse(request.params)
            const config = liveStartSchema.parse(request.body || {})

            // Vérifier que la session existe et appartient à l'utilisateur
            const { data: session, error } = await fastify.supabase
                .from('sessions')
                .select('id, type, status')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (error || !session) {
                return reply.code(404).send({ error: 'Session not found' })
            }

            // Vérifier qu'il n'y a pas déjà une session live active
            if (sessionStore.has(id)) {
                return reply.code(409).send({
                    error: 'Live session already active',
                    message: 'Use POST /:id/live/end to stop the current session first'
                })
            }

            // Créer et démarrer le moteur IA temps réel
            const engine = new LiveCoachEngine()
            engine.startSession(config)
            await sessionStore.set(id, engine, config)

            // Marquer la session en mode live dans la DB
            await fastify.supabase
                .from('sessions')
                .update({ status: 'live' })
                .eq('id', id)

            return {
                liveSessionId: id,
                status: 'live',
                config: {
                    frameInterval: config.frameInterval ?? 3,
                    alertSensitivity: config.alertSensitivity ?? 'medium',
                    ...config
                },
                message: 'Coach Live activé 🏀 Envoie des frames à POST /api/sessions/:id/live/frame',
                endpoints: {
                    sendFrame: `POST /api/sessions/${id}/live/frame`,
                    recordShot: `POST /api/sessions/${id}/live/shot`,
                    endQuarter: `POST /api/sessions/${id}/live/quarter`,
                    endSession: `POST /api/sessions/${id}/live/end`,
                    status: `GET /api/sessions/${id}/live/status`,
                    stream: `GET /api/sessions/${id}/live/stream`
                }
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/live/frame — Analyser une frame en temps réel
    // ==========================================
    fastify.post('/:id/live/frame', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { id } = liveParamsSchema.parse(request.params)
            const body = liveFrameSchema.parse(request.body)

            const engine = sessionStore.get(id)
            if (!engine) {
                return reply.code(404).send({
                    error: 'No active live session',
                    message: 'Start a live session first with POST /api/sessions/:id/live'
                })
            }

            // Préparer les données de landmarks
            const landmarksData = {
                landmarks: (body.landmarks || []) as Landmark[],
                ballDetected: body.ballDetected,
                ballPosition: body.ballPosition
            }

            // Analyse de la frame via le moteur IA temps réel
            const analysis = engine.analyzeFrame(
                landmarksData,
                body.quarter,
                body.timestamp,
                body.manualShotMade,
                body.manualShotMissed
            )

            // Émettre les alertes via SSE si des clients sont connectés
            const sseClients = sseConnections.get(id)
            if (sseClients && analysis.alerts.length > 0) {
                for (const client of sseClients) {
                    try {
                        client.write(`data: ${JSON.stringify({
                            type: 'alerts',
                            alerts: analysis.alerts,
                            mentalScore: analysis.mentalScore,
                            fatigueIndex: analysis.fatigueIndex
                        })}\n\n`)
                    } catch { /* client disconnected */ }
                }
            }

            return {
                sessionId: id,
                timestamp: body.timestamp,
                quarter: body.quarter,
                mentalScore: analysis.mentalScore,
                fatigueIndex: analysis.fatigueIndex,
                postureScore: analysis.postureScore,
                speed: analysis.speed,
                alerts: analysis.alerts,
                vibrate: analysis.alerts.some((a: any) => a.vibrate),
                vibrationPattern: analysis.alerts.length > 0
                    ? analysis.alerts[0].vibrationPattern
                    : [],
                stats: analysis.cumulativeStats,
                confidence: analysis.confidence
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/live/shot — Enregistrer un tir manuellement
    // ==========================================
    fastify.post('/:id/live/shot', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const { id } = liveParamsSchema.parse(request.params)
            const { outcome, zone } = z.object({
                outcome: z.enum(['made', 'missed']),
                zone: z.enum(['paint', 'midrange', 'corner3', 'wing3', 'top3', 'restricted']).optional()
            }).parse(request.body)

            const engine = sessionStore.get(id)
            if (!engine) {
                return reply.code(404).send({ error: 'No active live session' })
            }

            const analysis = engine.analyzeFrame(
                { landmarks: [], ballDetected: false },
                engine.getSessionState().quarter,
                Date.now() / 1000,
                outcome === 'made',
                outcome === 'missed'
            )

            return {
                recorded: true,
                outcome,
                zone: zone || 'unknown',
                currentStats: {
                    shotsMade: analysis.cumulativeStats.shotsMade,
                    shotsDetected: analysis.cumulativeStats.shotsDetected,
                    shootingPct: analysis.cumulativeStats.shootingPct
                },
                alerts: analysis.alerts
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/live/quarter — Terminer un quart-temps
    // ==========================================
    fastify.post('/:id/live/quarter', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const { id } = liveParamsSchema.parse(request.params)
            const { quarter } = liveEndQuarterSchema.parse(request.body)

            const engine = sessionStore.get(id)
            if (!engine) {
                return reply.code(404).send({ error: 'No active live session' })
            }

            const summary = engine.endQuarter()

            await fastify.supabase
                .from('live_quarter_summaries')
                .upsert({
                    session_id: id,
                    quarter,
                    mental_score: summary.data?.avgMentalScore ?? 0,
                    shooting_pct: summary.data?.shootingPct ?? 0,
                    distance_covered: summary.data?.distanceCovered ?? 0,
                    summary_message: summary.message,
                    created_at: new Date().toISOString()
                })

            const sseClients = sseConnections.get(id)
            if (sseClients) {
                for (const client of sseClients) {
                    try {
                        client.write(`data: ${JSON.stringify({ type: 'quarter_end', quarter, summary })}\n\n`)
                    } catch { /* disconnected */ }
                }
            }

            return {
                sessionId: id,
                quarter,
                summary,
                nextQuarter: quarter < 4 ? quarter + 1 : null,
                message: quarter < 4
                    ? `Q${quarter} terminé. Prêt pour Q${quarter + 1} !`
                    : 'Dernier quart terminé. Utilise POST /:id/live/end pour le rapport final.'
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/live/end — Terminer le match
    // ==========================================
    fastify.post('/:id/live/end', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { id } = liveParamsSchema.parse(request.params)

            const engine = sessionStore.get(id)
            if (!engine) {
                return reply.code(404).send({ error: 'No active live session' })
            }

            const result = engine.endSession()

            await fastify.supabase
                .from('analyses')
                .insert({
                    session_id: id,
                    shot_attempts: result.stats.shotsDetected,
                    shot_made: result.stats.shotsMade,
                    mental_score: Math.round(result.stats.avgMentalScore),
                    body_language: {
                        patterns: [],
                        insights: result.recommendations,
                        timeline: result.mentalTimeline.map((score: number, i: number) => ({ timestamp: i, score })),
                        fatigueIndex: 0,
                        bodyLanguageScore: 0
                    },
                    ai_report: `Coach Live Report — ${new Date().toLocaleDateString('fr-FR')}`,
                    created_at: new Date().toISOString()
                })

            await fastify.supabase
                .from('sessions')
                .update({ status: 'complete' })
                .eq('id', id)

            await sessionStore.delete(id)
            const sseClients = sseConnections.get(id)
            if (sseClients) {
                for (const client of sseClients) {
                    try {
                        client.write(`data: ${JSON.stringify({ type: 'session_end', result })}\n\n`)
                        client.end()
                    } catch { /* disconnected */ }
                }
                sseConnections.delete(id)
            }

            return {
                sessionId: id,
                status: 'complete',
                summary: result.summary,
                stats: result.stats,
                mentalTimeline: result.mentalTimeline,
                recommendations: result.recommendations,
                message: 'Match terminé ! Le rapport complet est disponible.'
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/live/status — État courant
    // ==========================================
    fastify.get('/:id/live/status', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const { id } = liveParamsSchema.parse(request.params)
            const engine = sessionStore.get(id)
            if (!engine) {
                return reply.code(404).send({ error: 'No active live session' })
            }
            const state = engine.getSessionState()
            // Snapshot state to Redis for observability
            await sessionStore.snapshotState(id)
            return { sessionId: id, ...state }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/live/stream — Server-Sent Events
    // ==========================================
    fastify.get('/:id/live/stream', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const { id } = liveParamsSchema.parse(request.params)
            const engine = sessionStore.get(id)
            if (!engine) {
                return reply.code(404).send({ error: 'No active live session' })
            }

            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            })

            if (!sseConnections.has(id)) sseConnections.set(id, new Set())
            sseConnections.get(id)!.add(reply.raw)

            reply.raw.write(`data: ${JSON.stringify({
                type: 'connected',
                sessionId: id,
                state: engine.getSessionState()
            })}\n\n`)

            const heartbeat = setInterval(() => {
                try {
                    reply.raw.write(`data: ${JSON.stringify({ type: 'heartbeat', time: Date.now() })}\n\n`)
                } catch { clearInterval(heartbeat) }
            }, 30000)

            request.raw.on('close', () => {
                clearInterval(heartbeat)
                const clients = sseConnections.get(id)
                if (clients) {
                    clients.delete(reply.raw)
                    if (clients.size === 0) sseConnections.delete(id)
                }
            })

            return reply
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/live/analyze-frame — Analyse stateless (sans session)
    // ==========================================
    fastify.post('/:id/live/analyze-frame', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const { landmarks } = z.object({
                landmarks: z.array(landmarkSchema).min(33)
            }).parse(request.body)

            const result = analyzeSingleFrame(landmarks as Landmark[])
            return { ...result, timestamp: Date.now() }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })
}
