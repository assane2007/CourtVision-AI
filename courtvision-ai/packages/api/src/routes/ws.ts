import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { RealtimePipelineEngine } from '@courtvision/ai'
import { ArenaService } from '../services/arena.service'

const arenaClientEventIdSchema = z.string().trim().min(8).max(120)

const arenaReadySchema = z.object({
    clientEventId: arenaClientEventIdSchema.optional(),
})

const arenaShotSchema = z.object({
    result: z.enum(['made', 'missed']),
    zone: z.string().min(1),
    confidence: z.number().min(0).max(100).optional(),
    clientEventId: arenaClientEventIdSchema.optional(),
})

const ARENA_EVENT_ID_TTL_MS = 15_000

function sendWs(socket: any, payload: unknown) {
    try {
        if (socket.readyState === 1) {
            socket.send(JSON.stringify(payload))
        }
    } catch {
        // Ignore socket send failures from disconnected clients.
    }
}

function toClientEventId(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined
    }
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

export default async function wsRoutes(fastify: FastifyInstance) {
    // Pipeline instances indexed by sessionId
    const pipelines = new Map<string, RealtimePipelineEngine>()
    const arenaSockets = new Map<string, Set<any>>()
    const arenaEventCache = new Map<string, Map<string, number>>()
    const arenaPresence = new Map<string, Map<string, { username: string; connections: number; lastSeen: number }>>()

    const broadcastArena = (matchId: string, payload: unknown) => {
        const sockets = arenaSockets.get(matchId)
        if (!sockets || sockets.size === 0) {
            return
        }

        for (const socket of sockets) {
            sendWs(socket, payload)
        }
    }

    const getArenaPresenceSnapshot = (matchId: string) => {
        const roomPresence = arenaPresence.get(matchId)
        if (!roomPresence) {
            return []
        }

        return Array.from(roomPresence.entries()).map(([connectedUserId, entry]) => ({
            userId: connectedUserId,
            username: entry.username,
            connections: entry.connections,
            lastSeen: entry.lastSeen,
        }))
    }

    const announceArenaPresence = (matchId: string) => {
        broadcastArena(matchId, {
            type: 'arena_presence',
            matchId,
            payload: {
                connectedUsers: getArenaPresenceSnapshot(matchId),
            },
            timestamp: Date.now(),
        })
    }

    const markArenaPresenceConnected = (matchId: string, userId: string, username: string) => {
        if (!arenaPresence.has(matchId)) {
            arenaPresence.set(matchId, new Map())
        }

        const roomPresence = arenaPresence.get(matchId)!
        const existing = roomPresence.get(userId)
        roomPresence.set(userId, {
            username,
            connections: (existing?.connections || 0) + 1,
            lastSeen: Date.now(),
        })
    }

    const markArenaPresenceDisconnected = (matchId: string, userId: string) => {
        const roomPresence = arenaPresence.get(matchId)
        if (!roomPresence) {
            return
        }

        const existing = roomPresence.get(userId)
        if (!existing) {
            return
        }

        if (existing.connections <= 1) {
            roomPresence.delete(userId)
        } else {
            roomPresence.set(userId, {
                ...existing,
                connections: existing.connections - 1,
                lastSeen: Date.now(),
            })
        }

        if (roomPresence.size === 0) {
            arenaPresence.delete(matchId)
        }
    }

    const isArenaEventDuplicate = (matchId: string, userId: string, eventType: string, clientEventId?: string): boolean => {
        if (!clientEventId) {
            return false
        }

        const now = Date.now()
        if (!arenaEventCache.has(matchId)) {
            arenaEventCache.set(matchId, new Map())
        }

        const roomEvents = arenaEventCache.get(matchId)!
        for (const [key, expiry] of roomEvents) {
            if (expiry <= now) {
                roomEvents.delete(key)
            }
        }

        const dedupeKey = `${userId}:${eventType}:${clientEventId}`
        if (roomEvents.has(dedupeKey)) {
            return true
        }

        roomEvents.set(dedupeKey, now + ARENA_EVENT_ID_TTL_MS)
        return false
    }

    const clearArenaCachesIfRoomEmpty = (matchId: string) => {
        const sockets = arenaSockets.get(matchId)
        if (sockets && sockets.size > 0) {
            return
        }

        arenaSockets.delete(matchId)
        arenaEventCache.delete(matchId)
        arenaPresence.delete(matchId)
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

        const syncArenaState = async (reason: 'connected' | 'client_request' | 'recovered') => {
            try {
                const [match, scoreboard] = await Promise.all([
                    arenaService.getMatch(matchId),
                    arenaService.getScoreboard(matchId),
                ])

                sendWs(socket, {
                    type: 'arena_state_sync',
                    matchId,
                    reason,
                    payload: {
                        match,
                        scoreboard,
                        connectedUsers: getArenaPresenceSnapshot(matchId),
                    },
                    timestamp: Date.now(),
                })
            } catch (error: any) {
                sendWs(socket, {
                    type: 'arena_error',
                    matchId,
                    message: error.message || 'Unable to sync arena state',
                })
            }
        }

        if (!arenaSockets.has(matchId)) {
            arenaSockets.set(matchId, new Set())
        }
        arenaSockets.get(matchId)!.add(socket)
        markArenaPresenceConnected(matchId, userId, username)
        announceArenaPresence(matchId)

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

        sendWs(socket, {
            type: 'arena_connected',
            matchId,
            userId,
            username,
            payload: {
                connectedUsers: getArenaPresenceSnapshot(matchId),
            },
            timestamp: Date.now(),
        })
        void pushScoreboard()
        void syncArenaState('connected')

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

                if (eventType === 'state_sync') {
                    await syncArenaState('client_request')
                    return
                }

                if (eventType === 'ready') {
                    const readyPayload = arenaReadySchema.parse(data.payload || {})
                    const readyEventId = toClientEventId(readyPayload.clientEventId || data?.eventId)

                    if (isArenaEventDuplicate(matchId, userId, 'ready', readyEventId)) {
                        sendWs(socket, {
                            type: 'arena_event_ignored',
                            matchId,
                            eventType,
                            eventId: readyEventId,
                            reason: 'duplicate_event',
                            timestamp: Date.now(),
                        })
                        return
                    }

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
                    const shotEventId = toClientEventId(shotPayload.clientEventId || data?.eventId)

                    if (isArenaEventDuplicate(matchId, userId, 'shot', shotEventId)) {
                        sendWs(socket, {
                            type: 'arena_event_ignored',
                            matchId,
                            eventType,
                            eventId: shotEventId,
                            reason: 'duplicate_event',
                            timestamp: Date.now(),
                        })
                        return
                    }

                    const shotEvent = await arenaService.recordShot(
                        matchId,
                        userId,
                        username,
                        shotPayload.result,
                        shotPayload.zone,
                        shotPayload.confidence,
                        shotEventId
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
                    const endEventId = toClientEventId(data?.eventId)
                    if (isArenaEventDuplicate(matchId, userId, 'end_match', endEventId)) {
                        sendWs(socket, {
                            type: 'arena_event_ignored',
                            matchId,
                            eventType,
                            eventId: endEventId,
                            reason: 'duplicate_event',
                            timestamp: Date.now(),
                        })
                        return
                    }

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
            if (sockets) {
                sockets.delete(socket)
            }

            markArenaPresenceDisconnected(matchId, userId)
            announceArenaPresence(matchId)

            if (sockets && sockets.size === 0) {
                arenaSockets.delete(matchId)
            }

            clearArenaCachesIfRoomEmpty(matchId)
        })
    })
}
