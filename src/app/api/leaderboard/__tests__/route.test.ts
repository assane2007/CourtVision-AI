import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPlayerFindMany = vi.fn()
const mockPlayerCount = vi.fn(() => Promise.resolve(10))

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findMany: (...args: unknown[]) => mockPlayerFindMany(...args),
      count: (...args: unknown[]) => mockPlayerCount(...args),
      findUnique: vi.fn(),
    },
    teamMember: { findMany: vi.fn(() => Promise.resolve([])) },
    team: { findUnique: vi.fn(() => Promise.resolve(null)) },
    friendship: { findMany: vi.fn(() => Promise.resolve([])) },
  },
}))

vi.mock('@/lib/with-auth', () => ({
  withAuth: (handler: (req: Request, ctx: { user: { id: string } }) => Promise<Response>) =>
    async (req: Request) => handler(req, { user: { id: 'player-1' } }),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ success: true })),
}))

vi.mock('@/lib/cache', () => ({
  withCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

describe('GET /api/leaderboard', () => {
  let GET: (req: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPlayerFindMany.mockResolvedValue([
      { id: 'p-1', name: 'John Doe', xp: 500, xpLevel: 5, position: 'Guard',
        sessions: [{ totalScore: 85, totalReps: 10, totalDrills: 3, startedAt: '2025-01-01' }] },
    ])
    const route = await import('@/app/api/leaderboard/route')
    GET = route.GET as (req: Request) => Promise<Response>
  })

  function makeRequest(url = '/api/leaderboard'): Request {
    return new Request(`http://localhost${url}`)
  }

  it('returns 200 with leaderboard array', async () => {
    const res = await GET(makeRequest())
    const data = await res.json() as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(Array.isArray(data.leaderboard)).toBe(true)
  })

  it('returns 500 on error', async () => {
    mockPlayerFindMany.mockRejectedValue(new Error('DB fail'))

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })
})