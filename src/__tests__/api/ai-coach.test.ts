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
  workoutSessionDrill: {
    findMany: vi.fn(),
  },
  aIChatMessage: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn(() => ({ success: true, retryAfterMs: 0 }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

vi.mock('@/lib/constants', () => ({
  CATEGORY_LABELS: {
    shooting: 'Tir',
    defense: 'Défense',
    ball_handling: 'Maniement',
  },
}))

vi.mock('@/lib/date-utils', () => ({
  formatShortDate: vi.fn((date: unknown) => {
    const d = new Date(date as string | Date)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }),
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

// ── GET /api/ai-coach ─────────────────────────────────────────────────────────

describe('GET /api/ai-coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    vi.resetModules()
    const { GET } = await import('@/app/api/ai-coach/route')
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('authentifié')
  })

  it('returns messages when authenticated', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const mod = await import('@/app/api/ai-coach/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    ;(db.aIChatMessage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { role: 'user', content: 'Bonjour', createdAt: new Date('2025-01-01') },
      { role: 'assistant', content: 'Salut!', createdAt: new Date('2025-01-01') },
    ])

    const res = await mod.GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0].content).toBe('Bonjour')
    expect(body.messages[0].createdAt).toBe('2025-01-01T00:00:00.000Z')
  })
})

// ── POST /api/ai-coach ────────────────────────────────────────────────────────

describe('POST /api/ai-coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    vi.resetModules()
    const { POST } = await import('@/app/api/ai-coach/route')
    const res = await POST(makeNextRequest('/api/ai-coach', {}))
    expect(res.status).toBe(401)
  })

  it('returns 400 when message is empty', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const { POST } = await import('@/app/api/ai-coach/route')
    const res = await POST(makeNextRequest('/api/ai-coach', { message: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 when message exceeds 2000 chars', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    vi.resetModules()
    const { POST } = await import('@/app/api/ai-coach/route')
    const res = await POST(
      makeNextRequest('/api/ai-coach', { message: 'a'.repeat(2001) }),
    )
    expect(res.status).toBe(400)
  })

  it('returns reply from AI when valid message', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })

    // Setup DB mocks
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Test Player',
      level: 'intermediate',
      xpLevel: 5,
      position: 'guard',
      goals: 'shooting',
    })
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.workoutSessionDrill.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.aIChatMessage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.aIChatMessage.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

    // Mock LLM response
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: 'Essaie de shooter 100 tirs par jour! 🏀' } }],
    })

    vi.resetModules()
    const mod = await import('@/app/api/ai-coach/route')

    const res = await mod.POST(makeNextRequest('/api/ai-coach', { message: 'Conseil pour le tir' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reply).toContain('shoot')
  })
})

// ── DELETE /api/ai-coach ──────────────────────────────────────────────────────

describe('DELETE /api/ai-coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    vi.resetModules()
    const { DELETE } = await import('@/app/api/ai-coach/route')
    const res = await DELETE()
    expect(res.status).toBe(401)
  })

  it('clears chat history when authenticated', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    ;(mockDb.aIChatMessage.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 5 })

    vi.resetModules()
    const mod = await import('@/app/api/ai-coach/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const res = await mod.DELETE()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(db.aIChatMessage.deleteMany).toHaveBeenCalledWith({
      where: { playerId: 'p1' },
    })
  })
})

// ── Rate limiting ──────────────────────────────────────────────────────────────

describe('Rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 429 when rate limited on GET', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const mod = await import('@/app/api/ai-coach/route')

    const res = await mod.GET()
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toContain('requêtes')
  })

  it('returns 429 when rate limited on POST', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'p1', email: 't@t.com' },
    })
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 30000 })

    vi.resetModules()
    const mod = await import('@/app/api/ai-coach/route')

    const res = await mod.POST(makeNextRequest('/api/ai-coach', { message: 'test' }))
    expect(res.status).toBe(429)
  })
})