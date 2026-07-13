import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAchievementFindMany = vi.fn()
const mockAchievementCreateMany = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    workoutSession: {
      count: vi.fn(() => Promise.resolve(0)),
      aggregate: vi.fn(() => Promise.resolve({ _sum: { totalReps: 0 }, _avg: { totalScore: 0 } })),
      findMany: vi.fn(() => Promise.resolve([])),
    },
    workoutSessionDrill: {
      findMany: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(0)),
    },
    trainingPlan: { count: vi.fn(() => Promise.resolve(0)) },
    reactionScore: { aggregate: vi.fn(() => Promise.resolve({ _avg: { reactionMs: null } })) },
    aIChatMessage: { count: vi.fn(() => Promise.resolve(0)) },
    achievement: {
      findMany: (...args: unknown[]) => mockAchievementFindMany(...args),
      createMany: (...args: unknown[]) => mockAchievementCreateMany(...args),
    },
    xpLog: { createMany: vi.fn() },
    player: {
      findUnique: vi.fn(() => Promise.resolve({ xp: 0, xpLevel: 1 })),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      xpLog: { createMany: vi.fn() },
      player: { findUnique: vi.fn(() => Promise.resolve({ xp: 0, xpLevel: 1 })), update: vi.fn() },
    })),
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

vi.mock('@/lib/xp', () => ({
  getAchievementXp: vi.fn(() => ({ amount: 50 })),
  getLevelFromXp: vi.fn(() => 1),
}))

vi.mock('@/lib/streak', () => ({
  calculateStreak: vi.fn(() => ({ current: 0, best: 0 })),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

describe('GET /api/achievements', () => {
  let GET: (req: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockAchievementFindMany.mockResolvedValue([])
    const route = await import('@/app/api/achievements/route')
    GET = route.GET as (req: Request) => Promise<Response>
  })

  function makeRequest(): Request {
    return new Request('http://localhost/api/achievements')
  }

  it('returns 200 with achievements array', async () => {
    const res = await GET(makeRequest())
    const data = await res.json() as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(Array.isArray(data.achievements)).toBe(true)
  })
})