import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { RealtimePipelineEngine } from '@courtvision/ai'
import { ArenaService } from '../services/arena.service'

const arenaShotSchema = z.object({
    result: z.enum(['made', 'missed']),
    zone: z.string().min(1),
    confidence: z.number().min(0).max(100).optional(),
})

function sendWs(socket: any, payload: unknown) {
    try {
        if (socket.readyState === 1) {
            socket.send(JSON.stringify(payload))
        }
    } catch {
        // Ignore socket send failures from disconnected clients.
    }
}

export default async function wsRoutes(fastify: FastifyInstance) {
    // Pipeline instances indexed by sessionId
    const pipelines = new Map<string, RealtimePipelineEngine>()
    const arenaSockets = new Map<string, Set<any>>()

    const broadcastArena = (matchId: string, payload: unknown) => {
        const sockets = arenaSockets.get(matchId)
        if (!sockets || sockets.size === 0) {
            return
        }

        for (const socket of sockets) {
            sendWs(socket, payload)
        }
    }

    // WebSocket endpoint: /ws/sessions/:id
    // Auth is validated on the HTTP upgrade request via preValidation
    fastify.get('/sessions/:id', {
        websocket: true,
        preValidation: [fastify.authenticate]
    }, (connectionParam: any, req: any) => {
        const socket = connectionParam.socket || connectionParam
        const sessionId = req.params.id

        // Initialize high-performance pipeline for this session
        const pipeline = new RealtimePipelineEngine({
            mode: 'full',
            onEvent: (event: any) => {
                // Forward events to mobile in real-time
                sendWs(socket, event)
            }
        } as any)
        pipelines.set(sessionId, pipeline)

        socket.on('message', async (message: import('ws').RawData) => {
            try {
                const data = JSON.parse(message.toString())

                if (data.type === 'frame') {
                    // Process frame through the real AI motor
                    // Arguments: (frameData, frameIndex, timestamp, frameWidth, frameHeight)
                    const result = await (pipeline as any).processFrame(
                        data.payload.frameData,
                        data.payload.frameIndex || 0,
                        data.payload.timestamp || Date.now() / 1000,
                        data.payload.width || 640,
                        data.payload.height || 480
                    )

                    // Send sync response for UI rendering
                    sendWs(socket, {
                        type: 'frame_ack',
                        frameId: data.frameId,
                        response: {
                            success: true,
                            mentalScore: result.mentalScore,
                            fatigueIndex: result.fatigueIndex,
                            postureScore: result.postureScore,
                            confidence: result.confidence,
                            alerts: (result as any).alerts || [],
                            stats: (result as any).getStats ? (result as any).getStats() : null
                        }
                    })
                }
            } catch (err) {
                console.error(`[WS] Error on session ${sessionId}:`, err)
            }
        })

        socket.on('close', () => {
            pipeline.stop()
            pipelines.delete(sessionId)
            console.info(`[WS] Session ${sessionId} cleaned up.`)
        })

        // Initial handshake payload
        sendWs(socket, {
            sessionId,
            status: 'connected',
            timestamp: Date.now()
        })
    })

    // WebSocket endpoint: /ws/arena/:id
    // Broadcasts live arena events and scoreboard updates to all room participants.
    fastify.get('/arena/:id', {
        websocket: true,
        preValidation: [fastify.authenticate],
    }, (connectionParam: any, req: any) => {
        const socket = connectionParam.socket || connectionParam
        const matchId = req.params.id
        const user = req.user || {}
        const userId = String(user.id || '')
        const username = String(user.username || user.email?.split('@')[0] || 'Player')
        const arenaService = new ArenaService(fastify.supabase)

        if (!arenaSockets.has(matchId)) {
            arenaSockets.set(matchId, new Set())
        }
        arenaSockets.get(matchId)!.add(socket)

        const pushScoreboard = async () => {
            try {
                const scoreboard = await arenaService.getScoreboard(matchId)
                broadcastArena(matchId, {
                    type: 'arena_scoreboard',
                    matchId,
                    payload: scoreboard,
                    timestamp: Date.now(),
                })
            } catch (error: any) {
                sendWs(socket, {
                    type: 'arena_error',
                    matchId,
                    message: error.message || 'Unable to load scoreboard',
                })
            }
        }

        void pushScoreboard()
        sendWs(socket, {
            type: 'arena_connected',
            matchId,
            userId,
            username,
            timestamp: Date.now(),
        })

        socket.on('message', async (raw: import('ws').RawData) => {
            try {
                const data = JSON.parse(raw.toString())
                const eventType = data?.type

                if (eventType === 'ping') {
                    sendWs(socket, { type: 'pong', timestamp: Date.now() })
                    return
                }

                if (eventType === 'scoreboard_sync') {
                    await pushScoreboard()
                    return
                }

                if (eventType === 'ready') {
                    const readyResult = await arenaService.setReady(matchId, userId)
                    broadcastArena(matchId, {
                        type: 'arena_ready',
                        matchId,
                        userId,
                        username,
                        payload: readyResult,
                        timestamp: Date.now(),
                    })
                    await pushScoreboard()
                    return
                }

                if (eventType === 'shot') {
                    const shotPayload = arenaShotSchema.parse(data.payload || {})
                    const shotEvent = await arenaService.recordShot(
                        matchId,
                        userId,
                        username,
                        shotPayload.result,
                        shotPayload.zone,
                        shotPayload.confidence
                    )

                    broadcastArena(matchId, {
                        type: 'arena_shot',
                        matchId,
                        payload: shotEvent,
                        timestamp: Date.now(),
                    })
                    await pushScoreboard()
                    return
                }

                if (eventType === 'end_match') {
                    const match = await arenaService.getMatch(matchId)
                    if (match.hostId !== userId) {
                        sendWs(socket, {
                            type: 'arena_error',
                            matchId,
                            message: 'Only host can end match',
                        })
                        return
                    }

                    const endedMatch = await arenaService.endMatch(matchId)
                    broadcastArena(matchId, {
                        type: 'arena_match_ended',
                        matchId,
                        payload: endedMatch,
                        timestamp: Date.now(),
                    })
                    await pushScoreboard()
                    return
                }

                sendWs(socket, {
                    type: 'arena_error',
                    matchId,
                    message: 'Unsupported arena event type',
                })
            } catch (error: any) {
                sendWs(socket, {
                    type: 'arena_error',
                    matchId,
                    message: error?.message || 'Arena event processing failed',
                })
            }
        })

        socket.on('close', () => {
            const sockets = arenaSockets.get(matchId)
            if (!sockets) {
                return
            }
            sockets.delete(socket)
            if (sockets.size === 0) {
                arenaSockets.delete(matchId)
            }
        })
    })
}
