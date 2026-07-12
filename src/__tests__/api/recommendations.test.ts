import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/sanitize', () => ({
  sanitize: (s: string) => s,
}))

const mockDb = {
  player: {
    findUnique: vi.fn(),
  },
  drill: {
    findMany: vi.fn(),
  },
  workoutSessionDrill: {
    findMany: vi.fn(),
  },
  workoutSession: {
    findMany: vi.fn(),
  },
  formAnalysis: {
    findMany: vi.fn(),
  },
  shotDetection: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/cache', () => ({
  cacheInvalidate: vi.fn(),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

vi.mock('z-ai-web-dev-sdk', () => ({
  default: {
    create: vi.fn().mockResolvedValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{}' } }],
          }),
        },
      },
    }),
  },
}))

// ── Helper ─────────────────────────────────────────────────────────────────────

const authedSession = { user: { id: 'p1', email: 't@t.com' } }

function allowRateLimit() {
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
}

// ── GET /api/recommendations ──────────────────────────────────────────────────

describe('GET /api/recommendations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { GET } = await import('@/app/api/recommendations/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(mockDb.drill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    vi.resetModules()
    const { GET } = await import('@/app/api/recommendations/route')
    const res = await GET()
    expect(res.status).toBe(404)
  })

  it('returns recommendations array sorted by priority', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      position: 'guard',
      level: 'intermediate',
      goals: 'shooting',
    })
    ;(mockDb.drill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'd1', category: 'shooting', difficulty: 'intermediate', nameFr: 'Tir en course', isActive: true, playerId: null },
      { id: 'd2', category: 'defense', difficulty: 'intermediate', nameFr: 'Défense latérale', isActive: true, playerId: null },
      { id: 'd3', category: 'ball_handling', difficulty: 'advanced', nameFr: 'Dribble croisé', isActive: true, playerId: null },
    ])
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { drillId: 'd1', score: 50, drill: { category: 'shooting', difficulty: 'intermediate' } },
      { drillId: 'd1', score: 55, drill: { category: 'shooting', difficulty: 'intermediate' } },
      { drillId: 'd2', score: 90, drill: { category: 'defense', difficulty: 'intermediate' } },
    ])

    vi.resetModules()
    const { GET } = await import('@/app/api/recommendations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)

    // Verify sorted by priority (highest first)
    if (body.length >= 2) {
      const priorities = body.map((r: { factors: string[] }) => {
        let p = 0
        if (r.factors.includes('goal_match')) p += 3
        if (r.factors.includes('weakness_target')) p += 2
        if (r.factors.includes('new_category')) p += 2
        if (r.factors.includes('level_match')) p += 1
        return p
      })
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i - 1]).toBeGreaterThanOrEqual(priorities[i])
      }
    }
  })

  it('includes reasonFr in recommendations', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      position: 'guard',
      level: 'intermediate',
      goals: 'shooting',
    })
    ;(mockDb.drill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'd1', category: 'shooting', difficulty: 'intermediate', nameFr: 'Tir à 3 points', isActive: true, playerId: null },
    ])
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    vi.resetModules()
    const { GET } = await import('@/app/api/recommendations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    if (body.length > 0) {
      expect(body[0].reasonFr).toBeDefined()
      expect(typeof body[0].reasonFr).toBe('string')
      expect(body[0].factors).toBeDefined()
    }
  })

  it('excludes drills with negative priority (mastered)', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      position: 'guard',
      level: 'intermediate',
      goals: 'shooting',
    })
    ;(mockDb.drill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'd1', category: 'defense', difficulty: 'beginner', nameFr: 'Poste basique', isActive: true, playerId: null },
    ])
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { drillId: 'd1', score: 95, drill: { category: 'defense', difficulty: 'beginner' } },
      { drillId: 'd1', score: 92, drill: { category: 'defense', difficulty: 'beginner' } },
    ])

    vi.resetModules()
    const { GET } = await import('@/app/api/recommendations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(0)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { GET } = await import('@/app/api/recommendations/route')
    const res = await GET()
    expect(res.status).toBe(429)
  })

  it('limits results to top 8', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      position: 'guard',
      level: 'intermediate',
      goals: 'shooting',
    })
    const manyDrills = Array.from({ length: 12 }, (_, i) => ({
      id: `d${i}`,
      category: 'shooting',
      difficulty: 'intermediate',
      nameFr: `Drill ${i}`,
      isActive: true,
      playerId: null,
    }))
    ;(mockDb.drill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(manyDrills)
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    vi.resetModules()
    const { GET } = await import('@/app/api/recommendations/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBeLessThanOrEqual(8)
  })
})