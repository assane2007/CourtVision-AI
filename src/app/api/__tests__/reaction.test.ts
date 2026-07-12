import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../reaction/route';
import { createMockRequest } from './api-test-utils';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockReactionCreateMany = vi.fn()
const mockReactionFindMany = vi.fn()
const mockReactionGroupBy = vi.fn().mockResolvedValue([])
const mockAwardXp = vi.fn().mockImplementation(async (_id: string, rewards: Array<{ amount: number }>) => {
  const total = rewards.reduce((s, r) => s + r.amount, 0)
  return { xpGained: total, leveledUp: false, newLevel: 1, oldLevel: 1, rewards: [] }
})

vi.mock('@/lib/db', () => ({
  db: {
    reactionScore: {
      createMany: (...args: unknown[]) => mockReactionCreateMany(...args),
      findMany: (...args: unknown[]) => mockReactionFindMany(...args),
      groupBy: (...args: unknown[]) => mockReactionGroupBy(...args),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ success: true, retryAfterMs: 0 }),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/award-xp', () => ({
  awardXp: (...args: unknown[]) => mockAwardXp(...args),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authenticatedSession = {
  user: { id: 'test-id', email: 'test@test.com', name: 'Test' },
}

const validReactionBody = {
  type: 'direction',
  rounds: [
    { reactionMs: 300, correct: true },
    { reactionMs: 350, correct: true },
    { reactionMs: 400, correct: false },
  ],
}

function makeReactionScore(overrides: {
  id?: string
  type?: string
  reactionMs?: number
  correct?: boolean
  createdAt?: Date
}) {
  return {
    id: overrides.id ?? 'rs-' + Math.random().toString(36).slice(2),
    playerId: 'test-id',
    type: overrides.type ?? 'direction',
    reactionMs: overrides.reactionMs ?? 300,
    correct: overrides.correct ?? true,
    createdAt: overrides.createdAt ?? new Date('2025-01-15T10:00:00Z'),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockReactionGroupBy.mockResolvedValue([])
  mockAwardXp.mockImplementation(async (_id: string, rewards: Array<{ amount: number }>) => {
    const total = rewards.reduce((s, r) => s + r.amount, 0)
    return { xpGained: total, leveledUp: false, newLevel: 1, oldLevel: 1, rewards: [] }
  })
})

// ─── POST Tests ───────────────────────────────────────────────────────────────

describe('POST /api/reaction', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest(validReactionBody, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })
    const req = createMockRequest(validReactionBody, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('saves scores with valid data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionCreateMany.mockResolvedValue({ count: 3 })

    const req = createMockRequest(validReactionBody, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.avgMs).toBe(350) // (300+350+400)/3 = 350
    expect(data.accuracy).toBe(67) // 2/3 = 66.67 → 67
    expect(data.rounds).toBe(3)
    expect(data.bestMs).toBe(300)

    // Verify createMany was called with correct data
    expect(mockReactionCreateMany).toHaveBeenCalledOnce()
    const callArgs = mockReactionCreateMany.mock.calls[0][0] as { data: unknown[] }
    expect(callArgs.data).toHaveLength(3)
  })

  it('returns 400 for missing type', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({ rounds: [{ reactionMs: 300, correct: true }] }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing rounds', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({ type: 'direction' }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty rounds array', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({ type: 'direction', rounds: [] }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({
      type: 'invalid_type',
      rounds: [{ reactionMs: 300, correct: true }],
    }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('accepts all valid game types', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionCreateMany.mockResolvedValue({ count: 1 })

    for (const type of ['direction', 'color', 'shot_clock', 'reflex']) {
      const req = createMockRequest({
        type,
        rounds: [{ reactionMs: 300, correct: true }],
      }, undefined, undefined, 'POST')
      const res = await POST(req)
      expect(res.status).toBe(200)
    }
  })

  it('awards XP for fast and accurate reaction', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionCreateMany.mockResolvedValue({ count: 1 })

    // avgMs = 249, accuracy = 100% → should award 30 XP (avgMs < 250)
    const req = createMockRequest({
      type: 'direction',
      rounds: [
        { reactionMs: 248, correct: true },
        { reactionMs: 250, correct: true },
      ],
    }, undefined, undefined, 'POST')
    const res = await POST(req)
    const data = await res.json()
    expect(data.xpAwarded).toBe(30)
  })

  it('awards 20 XP for 250-300ms range', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionCreateMany.mockResolvedValue({ count: 1 })

    const req = createMockRequest({
      type: 'direction',
      rounds: [
        { reactionMs: 275, correct: true },
        { reactionMs: 285, correct: true },
      ],
    }, undefined, undefined, 'POST')
    const res = await POST(req)
    const data = await res.json()
    expect(data.xpAwarded).toBe(20)
  })

  it('awards 10 XP for 300-400ms range', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionCreateMany.mockResolvedValue({ count: 1 })

    const req = createMockRequest({
      type: 'direction',
      rounds: [
        { reactionMs: 350, correct: true },
        { reactionMs: 370, correct: true },
      ],
    }, undefined, undefined, 'POST')
    const res = await POST(req)
    const data = await res.json()
    expect(data.xpAwarded).toBe(10)
  })

  it('awards 0 XP for slow reaction (> 400ms)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionCreateMany.mockResolvedValue({ count: 1 })

    const req = createMockRequest({
      type: 'direction',
      rounds: [
        { reactionMs: 500, correct: true },
        { reactionMs: 550, correct: true },
      ],
    }, undefined, undefined, 'POST')
    const res = await POST(req)
    const data = await res.json()
    expect(data.xpAwarded).toBe(0)
  })

  it('awards 0 XP for low accuracy (< 70%)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionCreateMany.mockResolvedValue({ count: 1 })

    const req = createMockRequest({
      type: 'direction',
      rounds: [
        { reactionMs: 200, correct: true },
        { reactionMs: 200, correct: false },
        { reactionMs: 200, correct: false },
      ],
    }, undefined, undefined, 'POST')
    const res = await POST(req)
    const data = await res.json()
    // avgMs = 200 < 400 but accuracy = 33% < 70% → 0 XP
    expect(data.xpAwarded).toBe(0)
  })
})

// ─── GET Tests ────────────────────────────────────────────────────────────────

describe('GET /api/reaction', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns empty history and personalBests for new user', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionFindMany.mockResolvedValue([])

    const res = await GET()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.history).toEqual([])
    expect(data.personalBests).toEqual({})
  })

  it('groups scores into game sessions correctly', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const baseTime = new Date('2025-01-15T10:00:00Z')
    const game1Scores = [
      makeReactionScore({ type: 'direction', reactionMs: 300, correct: true, createdAt: baseTime }),
      makeReactionScore({ type: 'direction', reactionMs: 350, correct: true, createdAt: new Date(baseTime.getTime() + 500) }),
      makeReactionScore({ type: 'direction', reactionMs: 280, correct: false, createdAt: new Date(baseTime.getTime() + 1000) }),
    ]
    // Game 2 is 5 seconds later (gap > 2000ms)
    const game2Scores = [
      makeReactionScore({ type: 'color', reactionMs: 400, correct: true, createdAt: new Date(baseTime.getTime() + 5000) }),
      makeReactionScore({ type: 'color', reactionMs: 450, correct: false, createdAt: new Date(baseTime.getTime() + 5500) }),
    ]

    mockReactionFindMany.mockResolvedValue([...game2Scores, ...game1Scores])
    mockReactionGroupBy.mockResolvedValue([])

    const res = await GET()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.history).toHaveLength(2)

    // Game 2 (most recent, comes first due to desc order)
    const g2 = data.history[0]
    expect(g2.type).toBe('color')
    expect(g2.avgMs).toBe(425) // (400+450)/2
    expect(g2.accuracy).toBe(50) // 1/2
    expect(g2.bestMs).toBe(400)
    expect(g2.rounds).toBe(2)

    // Game 1
    const g1 = data.history[1]
    expect(g1.type).toBe('direction')
    expect(g1.avgMs).toBe(310) // (300+350+280)/3
    expect(g1.accuracy).toBe(67) // 2/3
    expect(g1.bestMs).toBe(280)
    expect(g1.rounds).toBe(3)
  })

  it('computes personal bests per type', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const scores = [
      makeReactionScore({ type: 'direction', reactionMs: 300, correct: true, id: 'r1' }),
      makeReactionScore({ type: 'direction', reactionMs: 250, correct: true, id: 'r2' }),
      makeReactionScore({ type: 'color', reactionMs: 400, correct: true, id: 'r3' }),
      makeReactionScore({ type: 'color', reactionMs: 350, correct: true, id: 'r4' }),
    ]

    mockReactionFindMany.mockResolvedValue(scores)
    mockReactionGroupBy.mockResolvedValue([
      { type: 'direction', _min: { reactionMs: 250 } },
      { type: 'color', _min: { reactionMs: 350 } },
    ])

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)

    expect(data.personalBests.direction).toBe(250)
    expect(data.personalBests.color).toBe(350)
  })

  it('limits history to 20 entries', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    // Create 25 game sessions (each separated by > 2 seconds)
    const baseTime = new Date('2025-01-15T10:00:00Z')
    const scores = []
    for (let i = 0; i < 25; i++) {
      scores.push(
        makeReactionScore({
          type: 'direction',
          reactionMs: 300 + i * 10,
          correct: true,
          createdAt: new Date(baseTime.getTime() + i * 5000),
          id: `r-${i}`,
        }),
      )
    }

    mockReactionFindMany.mockResolvedValue(scores)
    mockReactionGroupBy.mockResolvedValue([])

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.history).toHaveLength(20)
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockReactionFindMany.mockRejectedValue(new Error('DB error'))
    mockReactionGroupBy.mockRejectedValue(new Error('DB error'))

    const res = await GET()
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})