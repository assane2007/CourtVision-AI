import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { LiveCoachEngine, analyzeSingleFrame } from '@courtvision/ai'
import type { Landmark } from '@courtvision/ai'

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

// Store des sessions live actives (en production: Redis)
const activeSessions = new Map<string, LiveCoachEngine>()
const sseConnections = new Map<string, Set<any>>()

export default async function liveRoutes(fastify: FastifyInstance) {

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
            if (activeSessions.has(id)) {
                return reply.code(409).send({
                    error: 'Live session already active',
                    message: 'Use POST /:id/live/end to stop the current session first'
                })
            }

            // Créer et démarrer le moteur IA temps réel
            const engine = new LiveCoachEngine()
            engine.startSession(config)
            activeSessions.set(id, engine)

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

            const engine = activeSessions.get(id)
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

            const engine = activeSessions.get(id)
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

            const engine = activeSessions.get(id)
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

            const engine = activeSessions.get(id)
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

            activeSessions.delete(id)
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
            const engine = activeSessions.get(id)
            if (!engine) {
                return reply.code(404).send({ error: 'No active live session' })
            }
            const state = engine.getSessionState()
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
            const engine = activeSessions.get(id)
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
