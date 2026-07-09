import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockDb = {
  feedPost: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  feedPostLike: {
    findMany: vi.fn(),
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

// ── POST /api/feed ────────────────────────────────────────────────────────────

describe('POST /api/feed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { POST } = await import('@/app/api/feed/route')
    const res = await POST(makeNextRequest('/api/feed', { content: 'Hello!' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns 400 when content and sessionId are missing', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.resetModules()
    const { POST } = await import('@/app/api/feed/route')
    const res = await POST(makeNextRequest('/api/feed', {}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Contenu')
  })

  it('returns 400 when content is empty string', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.resetModules()
    const { POST } = await import('@/app/api/feed/route')
    const res = await POST(makeNextRequest('/api/feed', { content: '' }))
    expect(res.status).toBe(400)
  })

  it('creates a post with valid content and returns 201', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.feedPost.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'post1',
      playerId: 'p1',
      content: 'Great workout today!',
      type: 'text',
      imageUrls: '[]',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      player: { id: 'p1', name: 'Test', avatar: null, xpLevel: 5 },
      session: null,
    })

    vi.resetModules()
    const mod = await import('@/app/api/feed/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const res = await mod.POST(makeNextRequest('/api/feed', { content: 'Great workout today!' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.post).toBeDefined()
    expect(body.post.content).toBe('Great workout today!')
    expect(body.post.type).toBe('text')

    expect(db.feedPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerId: 'p1',
          content: 'Great workout today!',
          type: 'text',
        }),
      }),
    )
  })

  it('creates a post with valid type', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.feedPost.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'post2',
      playerId: 'p1',
      content: 'Achievement unlocked!',
      type: 'achievement',
      imageUrls: '[]',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      player: { id: 'p1', name: 'Test', avatar: null, xpLevel: 5 },
      session: null,
    })

    vi.resetModules()
    const { POST } = await import('@/app/api/feed/route')
    const res = await POST(makeNextRequest('/api/feed', { content: 'Achievement unlocked!', type: 'achievement' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.post.type).toBe('achievement')
  })

  it('defaults to text type for invalid type', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.feedPost.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'post3',
      playerId: 'p1',
      content: 'Hello',
      type: 'text',
      imageUrls: '[]',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      player: { id: 'p1', name: 'Test', avatar: null, xpLevel: 5 },
      session: null,
    })

    vi.resetModules()
    const mod = await import('@/app/api/feed/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const res = await mod.POST(makeNextRequest('/api/feed', { content: 'Hello', type: 'invalid_type' }))
    expect(res.status).toBe(201)
    expect(db.feedPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'text' }),
      }),
    )
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { POST } = await import('@/app/api/feed/route')
    const res = await POST(makeNextRequest('/api/feed', { content: 'test' }))
    expect(res.status).toBe(429)
  })

  it('trims content before saving', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.feedPost.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'post4',
      playerId: 'p1',
      content: 'Trimmed',
      type: 'text',
      imageUrls: '[]',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      player: { id: 'p1', name: 'Test', avatar: null, xpLevel: 5 },
      session: null,
    })

    vi.resetModules()
    const mod = await import('@/app/api/feed/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const res = await mod.POST(makeNextRequest('/api/feed', { content: '  Trimmed  ' }))
    expect(res.status).toBe(201)
    expect(db.feedPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'Trimmed' }),
      }),
    )
  })
})