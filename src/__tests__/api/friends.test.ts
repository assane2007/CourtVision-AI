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
    findMany: vi.fn(),
  },
  friendship: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  notification: {
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

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeRequest(url: string, method: string = 'GET', body?: unknown): Request {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) init.body = JSON.stringify(body)
  return new Request(new URL(url, 'http://localhost:3000'), init)
}

const authedSession = { user: { id: 'p1', email: 't@t.com', name: 'Test User' } }

function allowRateLimit() {
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
}

// ── GET /api/friends ──────────────────────────────────────────────────────────

describe('GET /api/friends', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { GET } = await import('@/app/api/friends/route')
    const res = await GET(makeRequest('/api/friends'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns friends list with counts', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.friendship.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'f1',
        requesterId: 'p1',
        recipientId: 'p2',
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date(),
        requester: { id: 'p1', name: 'Me', avatar: null, xpLevel: 5, position: 'guard' },
        recipient: { id: 'p2', name: 'Friend', avatar: null, xpLevel: 3, position: 'forward' },
      },
    ])
    ;(mockDb.friendship.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: 'accepted', _count: 1 },
    ])

    vi.resetModules()
    const { GET } = await import('@/app/api/friends/route')
    const res = await GET(makeRequest('/api/friends?tab=friends'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.friends).toHaveLength(1)
    expect(body.friends[0].playerId).toBe('p2')
    expect(body.friends[0].name).toBe('Friend')
    expect(body.counts).toEqual({ friends: 1, pending: 0, blocked: 0 })
  })

  it('returns search results when search param provided', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p3', name: 'John Doe', avatar: null, xpLevel: 7, position: 'center' },
    ])
    ;(mockDb.friendship.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    vi.resetModules()
    const { GET } = await import('@/app/api/friends/route')
    const res = await GET(makeRequest('/api/friends?search=John'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.players).toHaveLength(1)
    expect(body.players[0].name).toBe('John Doe')
    expect(body.players[0].friendshipStatus).toBeNull()
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { GET } = await import('@/app/api/friends/route')
    const res = await GET(makeRequest('/api/friends'))
    expect(res.status).toBe(429)
  })

  it('returns pending requests with tab=sent', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.friendship.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'f2',
        requesterId: 'p1',
        recipientId: 'p3',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        requester: { id: 'p1', name: 'Me', avatar: null, xpLevel: 5, position: 'guard' },
        recipient: { id: 'p3', name: 'Pending User', avatar: null, xpLevel: 2, position: 'guard' },
      },
    ])
    ;(mockDb.friendship.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([])

    vi.resetModules()
    const { GET } = await import('@/app/api/friends/route')
    const res = await GET(makeRequest('/api/friends?tab=sent'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.friends).toHaveLength(1)
    expect(body.friends[0].status).toBe('pending')
  })
})