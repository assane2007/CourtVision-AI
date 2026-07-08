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
  player: {
    findUnique: vi.fn(),
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
  achievementUnlock: {
    findMany: vi.fn(),
  },
  prediction: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

// Mock z-ai-web-dev-sdk
const mockChatCompletionsCreate = vi.fn()
vi.mock('z-ai-web-dev-sdk', () => ({
  default: {
    create: vi.fn().mockResolvedValue({
      chat: {
        completions: {
          create: (...args: unknown[]) => mockChatCompletionsCreate(...args),
        },
      },
    }),
  },
}))

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeNextRequest(url: string, body?: unknown): Request {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new Request(new URL(url, 'http://localhost:3000'), init)
}

const authedSession = { user: { id: 'p1', email: 't@t.com' } }

function allowRateLimit() {
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
}

function setupPlayerMocks() {
  ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    name: 'Test Player',
    position: 'guard',
    level: 'intermediate',
    goals: 'shooting',
    xpLevel: 5,
    xp: 5000,
    createdAt: new Date('2024-06-01'),
  })
  ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
    { totalScore: 85 },
    { totalScore: 90 },
    { totalScore: 75 },
  ])
  ;(mockDb.formAnalysis.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(mockDb.shotDetection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
    { type: 'made' }, { type: 'missed' }, { type: 'made' },
  ])
  ;(mockDb.achievementUnlock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(mockDb.prediction.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
}

// ── POST /api/ai/predictions/generate ─────────────────────────────────────────

describe('POST /api/ai/predictions/generate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { POST } = await import('@/app/api/ai/predictions/generate/route')
    const res = await POST(makeNextRequest('/api/ai/predictions/generate'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns 400 for invalid prediction type', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.resetModules()
    const { POST } = await import('@/app/api/ai/predictions/generate/route')
    const res = await POST(makeNextRequest('/api/ai/predictions/generate', { type: 'invalid_type' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Type invalide')
  })

  it('returns 200 with valid single prediction type', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    setupPlayerMocks()

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            predictedValue: 25,
            confidence: 0.85,
            factors: ['Entraînement régulier', 'Bonne progression'],
            recommendation: 'Continuez à vous entraîner 3 fois par semaine',
          }),
        },
      }],
    })

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/predictions/generate/route')
    const res = await POST(makeNextRequest('/api/ai/predictions/generate', { type: 'injury_risk' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.predictions).toHaveLength(1)
    expect(body.predictions[0].type).toBe('injury_risk')
    expect(body.predictions[0].confidence).toBe(0.85)
    expect(body.generatedAt).toBeDefined()
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.formAnalysis.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.shotDetection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.achievementUnlock.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/predictions/generate/route')
    const res = await POST(makeNextRequest('/api/ai/predictions/generate', { type: 'performance' }))
    expect(res.status).toBe(404)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/predictions/generate/route')
    const res = await POST(makeNextRequest('/api/ai/predictions/generate', { type: 'all' }))
    expect(res.status).toBe(429)
  })

  it('saves prediction to DB', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    setupPlayerMocks()

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            predictedAt: '2025-09-01',
            confidence: 0.9,
            factors: ['Bon rythme'],
            recommendation: 'Maintenez le rythme',
          }),
        },
      }],
    })

    vi.resetModules()
    const mod = await import('@/app/api/ai/predictions/generate/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const res = await mod.POST(makeNextRequest('/api/ai/predictions/generate', { type: 'next_level' }))
    expect(res.status).toBe(200)
    expect(db.prediction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerId: 'p1',
          type: 'next_level',
        }),
      }),
    )
  })

  it('handles AI failure gracefully and returns empty predictions', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    setupPlayerMocks()

    mockChatCompletionsCreate.mockRejectedValue(new Error('AI down'))

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/predictions/generate/route')
    const res = await POST(makeNextRequest('/api/ai/predictions/generate', { type: 'performance' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.predictions).toHaveLength(0)
  })

  it('generates all 4 prediction types when type is "all"', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    setupPlayerMocks()

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({ predictedValue: 50, confidence: 0.8, factors: ['test'], recommendation: 'Continuez' }),
        },
      }],
    })

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/predictions/generate/route')
    const res = await POST(makeNextRequest('/api/ai/predictions/generate', { type: 'all' }))
    expect(res.status).toBe(200)
    expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(4)
  })
})