import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/require-subscription', () => ({
  requireSubscription: vi.fn().mockResolvedValue(true),
  subscriptionError: vi.fn().mockReturnValue({ status: 403 }),
}))

vi.mock('@/lib/sanitize', () => ({
  sanitize: (s: string) => s,
}))

const mockDb = {
  player: { findUnique: vi.fn() },
  workoutSession: { findMany: vi.fn() },
  formAnalysis: { findMany: vi.fn() },
  shotDetection: { findMany: vi.fn() },
  playerInsight: { findMany: vi.fn(), createMany: vi.fn() },
  achievementUnlock: { findMany: vi.fn() },
  playerDocument: { findMany: vi.fn() },
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

const mockChatCompletionsCreate = vi.fn()
vi.mock('z-ai-web-dev-sdk', () => ({
  default: {
    create: vi.fn().mockResolvedValue({
      chat: { completions: { create: (...args: unknown[]) => mockChatCompletionsCreate(...args) } },
    }),
  },
}))

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeNextRequest(url: string): Request {
  return new Request(new URL(url, 'http://localhost:3000'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
}

const authedSession = { user: { id: 'p1', email: 't@t.com' } }

// ── GET /api/ai/insights ──────────────────────────────────────────────────────

describe('GET /api/ai/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    vi.resetModules()
    const { GET } = await import('@/app/api/ai/insights/route')
    const res = await GET(makeNextRequest('/api/ai/insights'))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toContain('autorisé')
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.formAnalysis.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.shotDetection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerInsight.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.achievementUnlock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    vi.resetModules()
    const { GET } = await import('@/app/api/ai/insights/route')
    expect((await GET(makeNextRequest('/api/ai/insights'))).status).toBe(404)
  })

  it('returns 200 with insights data when authenticated', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Test', position: 'guard', level: 'intermediate', goals: 'shooting',
      xpLevel: 5, xp: 5000, createdAt: new Date('2025-01-01'),
      weeklyGoalSessions: 3, weeklyGoalReps: 100,
    })
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.formAnalysis.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.shotDetection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerInsight.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.achievementUnlock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ insights: [
        { category: 'strength', title: 'Bon tir', description: 'Améliore', confidence: 0.9 },
      ] }) } }],
    })
    vi.resetModules()
    const { GET } = await import('@/app/api/ai/insights/route')
    const res = await GET(makeNextRequest('/api/ai/insights'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.player.name).toBe('Test')
    expect(body.insights).toBeDefined()
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })
    vi.resetModules()
    const { GET } = await import('@/app/api/ai/insights/route')
    const res = await GET(makeNextRequest('/api/ai/insights'))
    expect(res.status).toBe(429)
  })

  it('bypasses rate limit with force refresh', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Test', position: 'guard', level: 'intermediate', goals: 'shooting',
      xpLevel: 3, xp: 3000, createdAt: new Date('2025-01-01'),
      weeklyGoalSessions: 3, weeklyGoalReps: 100,
    })
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.formAnalysis.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.shotDetection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerInsight.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.achievementUnlock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    vi.resetModules()
    const { GET } = await import('@/app/api/ai/insights/route')
    expect((await GET(makeNextRequest('/api/ai/insights?refresh=true'))).status).toBe(200)
  })

  it('returns performance stats with session data', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Test', position: 'guard', level: 'advanced', goals: 'defense',
      xpLevel: 8, xp: 8000, createdAt: new Date('2025-01-01'),
      weeklyGoalSessions: 4, weeklyGoalReps: 150,
    })
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { totalScore: 85, createdAt: new Date(), drills: [] },
      { totalScore: 90, createdAt: new Date(), drills: [] },
      { totalScore: 70, createdAt: new Date(), drills: [] },
    ])
    ;(mockDb.formAnalysis.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.shotDetection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerInsight.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.achievementUnlock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.playerDocument.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    vi.resetModules()
    const { GET } = await import('@/app/api/ai/insights/route')
    const res = await GET(makeNextRequest('/api/ai/insights'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.performance.avgScore).toBe(82)
    expect(body.performance.totalSessions).toBe(3)
  })
})