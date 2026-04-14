import fastify, { type FastifyInstance } from 'fastify'
import horseRoutes from '../../routes/horse'

const mockGetHistory = jest.fn()
const mockGetLeaderboard = jest.fn()

jest.mock('../../services/horse.service', () => ({
    HorseService: jest.fn().mockImplementation(() => ({
        getHistory: mockGetHistory,
        getLeaderboard: mockGetLeaderboard,
    })),
}))

describe('HORSE routes pagination', () => {
    let app: FastifyInstance

    beforeAll(async () => {
        app = fastify({ logger: false })

        app.decorate('supabase', {} as any)
        app.decorate('authenticate', async (request: any, reply: any) => {
            const authHeader = request.headers.authorization
            if (!authHeader) {
                return reply.code(401).send({ error: 'Unauthorized' })
            }
            request.user = { id: 'test-user-horse', email: 'horse@test.ai' }
        })

        await app.register(horseRoutes, { prefix: '/api/horse' })
        await app.ready()
    })

    afterAll(async () => {
        await app.close()
    })

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('GET /api/horse/history computes offset from page and limit', async () => {
        mockGetHistory.mockResolvedValueOnce([
            { id: 'game-1' },
            { id: 'game-2' },
        ])

        const response = await app.inject({
            method: 'GET',
            url: '/api/horse/history?page=3&limit=7',
            headers: { authorization: 'Bearer test-token' },
        })

        expect(response.statusCode).toBe(200)
        expect(mockGetHistory).toHaveBeenCalledTimes(1)
        expect(mockGetHistory).toHaveBeenCalledWith('test-user-horse', 7, 14)

        const body = JSON.parse(response.body)
        expect(body.success).toBe(true)
        expect(body.page).toBe(3)
        expect(body.limit).toBe(7)
        expect(body.data).toEqual([
            { id: 'game-1' },
            { id: 'game-2' },
        ])
    })

    it('GET /api/horse/leaderboard computes offset from page and limit', async () => {
        mockGetLeaderboard.mockResolvedValueOnce([
            { rank: 26, userId: 'u-1' },
            { rank: 27, userId: 'u-2' },
        ])

        const response = await app.inject({
            method: 'GET',
            url: '/api/horse/leaderboard?page=2&limit=25',
            headers: { authorization: 'Bearer test-token' },
        })

        expect(response.statusCode).toBe(200)
        expect(mockGetLeaderboard).toHaveBeenCalledTimes(1)
        expect(mockGetLeaderboard).toHaveBeenCalledWith(25, 25)

        const body = JSON.parse(response.body)
        expect(body.success).toBe(true)
        expect(body.page).toBe(2)
        expect(body.limit).toBe(25)
        expect(body.data).toEqual([
            { rank: 26, userId: 'u-1' },
            { rank: 27, userId: 'u-2' },
        ])
    })
})
