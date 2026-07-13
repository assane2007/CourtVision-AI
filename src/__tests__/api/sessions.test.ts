import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockDb = {
  player: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  workoutSession: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  workoutSessionDrill: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  drill: {
    findMany: vi.fn(),
  },
  xpLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  cacheInvalidatePattern: vi.fn(),
}))

vi.mock('@/lib/award-xp', () => ({
  awardXp: vi.fn().mockResolvedValue({
    xpGained: 50,
    newTotalXp: 550,
    oldLevel: 4,
    newLevel: 5,
    leveledUp: true,
    rewards: [],
  }),
}))

vi.mock('@/lib/xp', () => ({
  calculateWorkoutXp: vi.fn().mockReturnValue([
    { amount: 40, source: 'workout', description: 'Séance' },
    { amount: 10, source: 'rep', description: 'Répétitions' },
  ]),
  calculateStreakXp: vi.fn().mockReturnValue({
    amount: 25,
    source: 'streak',
    description: 'Série de 3 jours',
  }),
}))

vi.mock('@/lib/streak', () => ({
  calculateStreak: vi.fn().mockReturnValue({ current: 3, best: 5 }),
}))

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeNextRequest(url: string, body?: unknown): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new Request(new URL(url, 'http://localhost:3000'), init)
}

// ── POST /api/sessions ────────────────────────────────────────────────────────

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    vi.resetModules()
    const { POST } = await import('@/app/api/sessions/route')
    const res = await POST(makeNextRequest('/api/sessions', {}))
    expect(res.status).toBe(401)
  })

  it('returns 400 when body is missing drillScores', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const { POST } = await import('@/app/api/sessions/route')
    const res = await POST(makeNextRequest('/api/sessions', { notes: 'hello' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when drillScores is empty', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const { POST } = await import('@/app/api/sessions/route')
    const res = await POST(makeNextRequest('/api/sessions', { drillScores: [] }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Au moins un')
  })

  it('returns 400 when drill ID is invalid (missing required fields)', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const { POST } = await import('@/app/api/sessions/route')
    const res = await POST(
      makeNextRequest('/api/sessions', {
        drillScores: [{ drillId: '', reps: -5, score: 200, durationMs: 0 }],
      }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 413 when content-length exceeds 1MB', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const { POST } = await import('@/app/api/sessions/route')

    const req = new Request(new URL('/api/sessions', 'http://localhost:3000'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '2000000', // 2MB
      },
      body: JSON.stringify({
        drillScores: [{ drillId: 'd1', reps: 10, score: 80, durationMs: 30000 }],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.error).toContain('volumineuse')
  })

  it('returns 400 when drill IDs do not exist in DB', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const { POST } = await import('@/app/api/sessions/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    // No drills found in DB
    ;(db.drill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const res = await POST(
      makeNextRequest('/api/sessions', {
        drillScores: [
          { drillId: 'nonexistent-drill', reps: 10, score: 80, durationMs: 30000 },
        ],
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('introuvable')
  })

  it('returns 201 with session and XP on valid input', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const mod = await import('@/app/api/sessions/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    // Drills exist in DB
    ;(db.drill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'd1' },
    ])
    ;(db.workoutSessionDrill.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(db.workoutSessionDrill.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(db.workoutSession.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 's1',
      totalScore: 80,
      totalReps: 10,
      totalDrills: 1,
      drills: [],
    })
    ;(db.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const res = await mod.POST(
      makeNextRequest('/api/sessions', {
        drillScores: [
          { drillId: 'd1', reps: 10, score: 80, durationMs: 30000 },
        ],
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.session).toBeDefined()
    expect(body.xpAwarded).toBeDefined()
    expect(body.xpAwarded.xpGained).toBe(50)
  })

  it('returns 429 when rate limited on POST', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 30000 })

    vi.resetModules()
    const { POST } = await import('@/app/api/sessions/route')
    const res = await POST(makeNextRequest('/api/sessions', { drillScores: [] }))
    expect(res.status).toBe(429)
  })
})

// ── GET /api/sessions ─────────────────────────────────────────────────────────

describe('GET /api/sessions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    vi.resetModules()
    const { GET } = await import('@/app/api/sessions/route')
    const res = await GET(new Request('http://localhost:3000/api/sessions') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
  })

  it('returns sessions with pagination', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const mod = await import('@/app/api/sessions/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const fakeSession = {
      id: 's1',
      startedAt: new Date(),
      endedAt: new Date(),
      totalScore: 85,
      totalReps: 30,
      totalDrills: 3,
      notes: null,
      drills: [],
    }
    ;(db.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([fakeSession])
    ;(db.workoutSession.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

    const res = await mod.GET(
      new Request('http://localhost:3000/api/sessions?page=1&limit=10') as unknown as import('next/server').NextRequest,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(1)
    expect(body.page).toBe(1)
    expect(body.total).toBe(1)
    expect(body.totalPages).toBe(1)
  })
})