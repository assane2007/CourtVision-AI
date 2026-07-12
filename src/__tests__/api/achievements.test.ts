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
  workoutSession: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  workoutSessionDrill: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  trainingPlan: {
    count: vi.fn(),
  },
  reactionScore: {
    aggregate: vi.fn(),
  },
  aIChatMessage: {
    count: vi.fn(),
  },
  achievement: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  player: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  xpLog: {
    createMany: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

vi.mock('@/lib/xp', () => ({
  getAchievementXp: vi.fn().mockReturnValue({ amount: 25, source: 'achievement', description: 'Succès' }),
  getLevelFromXp: vi.fn().mockReturnValue(5),
}))

vi.mock('@/lib/streak', () => ({
  calculateStreak: vi.fn().mockReturnValue({ current: 2, best: 5 }),
}))

// Mock withCache to just call the fetcher directly
vi.mock('@/lib/cache', () => ({
  withCache: (_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher(),
}))

// ── Helper ─────────────────────────────────────────────────────────────────────

const authedSession = { user: { id: 'p1', email: 't@t.com' } }

function allowRateLimit() {
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
}

function setupEmptyStats() {
  ;(mockDb.workoutSession.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
  ;(mockDb.workoutSession.aggregate as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    .mockResolvedValueOnce({ _avg: { totalScore: 0 } })
  ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(mockDb.trainingPlan.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
  ;(mockDb.reactionScore.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _avg: { reactionMs: null } })
  ;(mockDb.aIChatMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
  ;(mockDb.workoutSessionDrill.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
  ;(mockDb.achievement.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(mockDb.achievement.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
  ;(mockDb.xpLog.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
  ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ xp: 0, xpLevel: 1 })
  ;(mockDb.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
}

// ── GET /api/achievements ────────────────────────────────────────────────────

describe('GET /api/achievements', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { GET } = await import('@/app/api/achievements/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns achievements with unlocked status', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    setupEmptyStats()

    vi.resetModules()
    const { GET } = await import('@/app/api/achievements/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.achievements).toBeDefined()
    expect(Array.isArray(body.achievements)).toBe(true)
    expect(body.achievements.length).toBeGreaterThan(0)
    expect(body.totalAchievements).toBe(body.achievements.length)

    for (const a of body.achievements) {
      expect(typeof a.unlocked).toBe('boolean')
      expect(a.type).toBeDefined()
      expect(a.title).toBeDefined()
      expect(a.icon).toBeDefined()
    }
  })

  it('first_login is always unlocked', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    setupEmptyStats()

    vi.resetModules()
    const { GET } = await import('@/app/api/achievements/route')
    const res = await GET()
    const body = await res.json()
    const firstLogin = body.achievements.find((a: { type: string }) => a.type === 'first_login')
    expect(firstLogin.unlocked).toBe(true)
  })

  it('returns newUnlocks for newly earned achievements', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)

    ;(mockDb.workoutSession.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(mockDb.workoutSession.aggregate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ _sum: { totalReps: 0 } })
      .mockResolvedValueOnce({ _avg: { totalScore: 0 } })
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { startedAt: new Date() },
    ])
    ;(mockDb.trainingPlan.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.reactionScore.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _avg: { reactionMs: null } })
    ;(mockDb.aIChatMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.workoutSessionDrill.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.achievement.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.achievement.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.xpLog.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ xp: 0, xpLevel: 1 })
    ;(mockDb.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    vi.resetModules()
    const { GET } = await import('@/app/api/achievements/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.newUnlocks).toContain('first_login')
    expect(body.newUnlocks).toContain('first_workout')
    expect(body.xpAwarded).toBeGreaterThan(0)
  })

  it('returns totalUnlocked count', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    setupEmptyStats()

    vi.resetModules()
    const { GET } = await import('@/app/api/achievements/route')
    const res = await GET()
    const body = await res.json()
    expect(typeof body.totalUnlocked).toBe('number')
    expect(body.totalUnlocked).toBeGreaterThanOrEqual(1)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { GET } = await import('@/app/api/achievements/route')
    const res = await GET()
    expect(res.status).toBe(429)
  })

  it('awards XP for new achievements via transaction', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)

    ;(mockDb.workoutSession.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(mockDb.workoutSession.aggregate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ _sum: { totalReps: 0 } })
      .mockResolvedValueOnce({ _avg: { totalScore: 0 } })
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { startedAt: new Date() },
    ])
    ;(mockDb.trainingPlan.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.reactionScore.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _avg: { reactionMs: null } })
    ;(mockDb.aIChatMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.workoutSessionDrill.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.achievement.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.achievement.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.xpLog.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ xp: 0, xpLevel: 1 })
    ;(mockDb.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    vi.resetModules()
    const mod = await import('@/app/api/achievements/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    await mod.GET()

    expect(db.achievement.createMany).toHaveBeenCalled()
    expect(db.xpLog.createMany).toHaveBeenCalled()
    expect(db.player.update).toHaveBeenCalled()
  })
})