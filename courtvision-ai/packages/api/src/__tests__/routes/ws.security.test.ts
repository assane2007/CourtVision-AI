import { buildApp } from '../../app'
import type { FastifyInstance } from 'fastify'
import { rateLimitCleanupTimer } from '../../routes/arena'
import { RealtimePipelineEngine, CoachChatEngine } from '@courtvision/ai'
import { ArenaService } from '../../services/arena.service'

// injectWS does not provide a full socket-backed request object.
// Disable global HTTP rate-limit middleware for this WS-only suite.
jest.mock('@fastify/rate-limit', () => {
    const fp = require('fastify-plugin')
    return fp(async () => {})
})

const AUTH_HEADERS = { authorization: 'Bearer ws-test-token-1234567890' }

let mockProcessFrame = jest.fn()
const mockArenaService = {
    getMatch: jest.fn(),
    getScoreboard: jest.fn(),
    setReady: jest.fn(),
    recordShot: jest.fn(),
    endMatch: jest.fn(),
}

jest.mock('@courtvision/ai', () => ({
    RealtimePipelineEngine: jest.fn(),
    CoachChatEngine: {
        generateResponse: jest.fn(),
    },
}))

jest.mock('../../services/arena.service', () => ({
    ArenaService: jest.fn(),
}))

// Mock Stripe (required by billing route registration)
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        customers: { create: jest.fn().mockResolvedValue({ id: 'cus_mock' }) },
        checkout: {
            sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/mock' }) },
        },
        billingPortal: {
            sessions: { create: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/mock' }) },
        },
        webhooks: {
            constructEvent: jest.fn().mockReturnValue({ type: 'checkout.session.completed', data: { object: {} } }),
        },
    }))
})

// Mock Supabase plugin
jest.mock('../../plugins/supabase', () => {
    const fp = require('fastify-plugin')
    return {
        supabasePlugin: fp(async (fastify: any) => {
            const chainable = () => {
                const chain: any = {
                    data: null,
                    error: null,
                    count: null,
                }
                chain.then = (resolve: any) => resolve({ data: chain.data, error: chain.error, count: chain.count })
                chain.select = jest.fn().mockReturnValue(chain)
                chain.insert = jest.fn().mockReturnValue(chain)
                chain.update = jest.fn().mockReturnValue(chain)
                chain.delete = jest.fn().mockReturnValue(chain)
                chain.eq = jest.fn().mockReturnValue(chain)
                chain.in = jest.fn().mockReturnValue(chain)
                chain.gte = jest.fn().mockReturnValue(chain)
                chain.lte = jest.fn().mockReturnValue(chain)
                chain.gt = jest.fn().mockReturnValue(chain)
                chain.or = jest.fn().mockReturnValue(chain)
                chain.order = jest.fn().mockReturnValue(chain)
                chain.limit = jest.fn().mockReturnValue(chain)
                chain.range = jest.fn().mockReturnValue(chain)
                chain.single = jest.fn().mockResolvedValue({ data: null, error: null })
                chain.upsert = jest.fn().mockReturnValue(chain)
                return chain
            }

            fastify.decorate('supabase', {
                auth: {
                    signUp: jest.fn(),
                    signInWithPassword: jest.fn(),
                    signInWithIdToken: jest.fn(),
                    getUser: jest.fn(),
                    admin: { signOut: jest.fn() },
                    refreshSession: jest.fn(),
                },
                from: jest.fn().mockImplementation(() => chainable()),
                rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
            })
        }),
    }
})

// Mock auth plugin but keep header enforcement semantics for websocket preValidation
jest.mock('../../plugins/auth', () => {
    const fp = require('fastify-plugin')
    return {
        authPlugin: fp(async (fastify: any) => {
            fastify.decorate('authenticate', async (request: any, reply: any) => {
                const authHeader = request.headers.authorization
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return reply.code(401).send({ success: false, error: 'Unauthorized' })
                }
                request.user = {
                    id: 'test-user-id',
                    email: 'ws@courtvision.ai',
                    username: 'ws_player',
                    position: 'PG',
                }
            })
        }),
    }
})

jest.mock('../../queue/videoProcessor', () => ({
    videoQueue: {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    },
    initWorker: jest.fn(),
}))

function waitForMessage(
    ws: any,
    predicate: (payload: any) => boolean,
    timeoutMs = 2500
): Promise<any> {
    return new Promise((resolve, reject) => {
        const onMessage = (raw: any) => {
            try {
                const payload = JSON.parse(raw.toString())
                if (predicate(payload)) {
                    cleanup()
                    resolve(payload)
                }
            } catch {
                // Ignore non-JSON test noise.
            }
        }

        const onError = (error: unknown) => {
            cleanup()
            reject(error)
        }

        const timer = setTimeout(() => {
            cleanup()
            reject(new Error('Timed out waiting for websocket message'))
        }, timeoutMs)

        const cleanup = () => {
            clearTimeout(timer)
            ws.off('message', onMessage)
            ws.off('error', onError)
        }

        ws.on('message', onMessage)
        ws.on('error', onError)
    })
}

describe('WebSocket hardening guards', () => {
    let app: FastifyInstance
    const mockRealtimePipelineEngine = RealtimePipelineEngine as unknown as jest.Mock
    const mockCoachGenerateResponse = CoachChatEngine.generateResponse as unknown as jest.Mock
    const mockArenaServiceCtor = ArenaService as unknown as jest.Mock

    beforeAll(async () => {
        app = buildApp({
            disableRequestLogging: true,
        })
        await app.ready()
    })

    beforeEach(() => {
        jest.clearAllMocks()

        mockProcessFrame = jest.fn()
        mockRealtimePipelineEngine.mockImplementation(() => ({
            processFrame: mockProcessFrame,
            stop: jest.fn(),
        }))
        mockArenaServiceCtor.mockImplementation(() => mockArenaService)

        mockProcessFrame.mockResolvedValue({
            mentalScore: 88,
            fatigueIndex: 12,
            postureScore: 91,
            confidence: 0.97,
            alerts: [],
        })

        mockCoachGenerateResponse.mockResolvedValue({
            message: 'Keep your elbow tucked and finish high.',
            suggestedActions: [],
        })

        mockArenaService.getMatch.mockResolvedValue({
            id: 'arena-1',
            hostId: 'test-user-id',
            hostUsername: 'ws_player',
            mode: 'shootout',
            status: 'live',
            config: { totalRounds: 3 },
            currentRound: 1,
            players: [],
        })

        mockArenaService.getScoreboard.mockResolvedValue({
            matchId: 'arena-1',
            mode: 'shootout',
            round: 1,
            totalRounds: 3,
            timeRemainingSec: 60,
            players: [],
            status: 'live',
        })

        mockArenaService.setReady.mockResolvedValue({ allReady: false, match: { id: 'arena-1' } })
        mockArenaService.recordShot.mockResolvedValue({
            userId: 'test-user-id',
            username: 'ws_player',
            result: 'made',
            zone: 'corner_3',
            timestamp: Date.now(),
            newScore: 3,
            streak: 1,
        })
        mockArenaService.endMatch.mockResolvedValue({ id: 'arena-1', status: 'finished' })
    })

    afterAll(async () => {
        clearInterval(rateLimitCleanupTimer)
        await app.close()
    })

    it('rejects websocket upgrade when auth header is missing', async () => {
        await expect((app as any).injectWS('/ws/sessions/session-1')).rejects.toThrow('401')
    })

    it('returns frame_error for invalid /ws/sessions payloads', async () => {
        const ws = await (app as any).injectWS('/ws/sessions/session-1', { headers: AUTH_HEADERS })

        const responsePromise = waitForMessage(ws, (msg) => msg.type === 'frame_error')
        ws.send(JSON.stringify({ type: 'frame', payload: { frameIndex: 1 } }))

        const response = await responsePromise
        expect(response.message).toBe('Invalid frame payload')

        ws.terminate()
    })

    it('returns frame_ack for valid /ws/sessions payloads', async () => {
        const ws = await (app as any).injectWS('/ws/sessions/session-2', { headers: AUTH_HEADERS })

        const responsePromise = waitForMessage(ws, (msg) => msg.type === 'frame_ack')
        ws.send(JSON.stringify({
            type: 'frame',
            frameId: 'frame-1',
            payload: {
                frameData: 'ZmFrZS1mcmFtZS1iYXNlNjQ=',
                frameIndex: 1,
                timestamp: 1710000000,
                width: 640,
                height: 480,
            },
        }))

        const response = await responsePromise
        expect(response.response.success).toBe(true)
        expect(mockProcessFrame).toHaveBeenCalledTimes(1)

        ws.terminate()
    })

    it('returns sanitized arena_error for invalid /ws/arena shot payloads', async () => {
        const ws = await (app as any).injectWS('/ws/arena/arena-1', { headers: AUTH_HEADERS })

        const responsePromise = waitForMessage(
            ws,
            (msg) => msg.type === 'arena_error' && msg.message === 'Invalid arena event payload',
            4000
        )

        ws.send(JSON.stringify({
            type: 'shot',
            payload: {
                result: 'invalid-result',
                zone: '',
            },
        }))

        const response = await responsePromise
        expect(response.message).toBe('Invalid arena event payload')

        ws.terminate()
    })

    it('returns voice_error for unsupported /ws/coach event types', async () => {
        const ws = await (app as any).injectWS('/ws/coach', { headers: AUTH_HEADERS })

        const responsePromise = waitForMessage(
            ws,
            (msg) => msg.type === 'voice_error' && msg.message === 'Unsupported voice event type'
        )

        ws.send(JSON.stringify({ type: 'something_else' }))

        const response = await responsePromise
        expect(response.message).toBe('Unsupported voice event type')

        ws.terminate()
    })

    it('rate limits /ws/coach voice_command flood attempts', async () => {
        const ws = await (app as any).injectWS('/ws/coach', { headers: AUTH_HEADERS })

        const responsePromise = waitForMessage(
            ws,
            (msg) => msg.type === 'voice_rate_limited',
            5000
        )

        for (let i = 0; i < 31; i += 1) {
            ws.send(JSON.stringify({
                type: 'voice_command',
                text: `command-${i}`,
                context: 'general',
            }))
        }

        const response = await responsePromise
        expect(response.message).toBe('Too many voice commands. Please slow down.')

        ws.terminate()
    })
})
