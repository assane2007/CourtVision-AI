import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: vi.fn(),
    },
    xpLog: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ success: true, retryAfterMs: 0 })),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

// ── Helper to create NextRequest ───────────────────────────────────────────────

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(new URL(url, 'http://localhost:3000'), init)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/xp', () => {
  it('returns 410 (Gone) — endpoint is disabled', async () => {
    // Reset modules to pick up fresh mocks
    vi.resetModules()

    // Re-import with fresh mocks
    const { GET, POST } = await import('@/app/api/xp/route')

    const res = await POST()
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toContain('désactivé')
  })
})

describe('GET /api/xp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    vi.resetModules()
    const { GET } = await import('@/app/api/xp/route')

    const res = await GET(makeRequest('/api/xp') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Non autorisé')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })

    vi.resetModules()
    const { GET } = await import('@/app/api/xp/route')

    const res = await GET(makeRequest('/api/xp') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
  })

  it('returns player XP and logs when authenticated', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'player-1', email: 'test@test.com' },
    })

    // Re-import to pick up fresh session mock
    vi.resetModules()
    const mod = await import('@/app/api/xp/route')
    const db = (await import('@/lib/db')).db

    // Setup DB mocks
    ;(db.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      xp: 500,
      xpLevel: 4,
    })
    ;(db.xpLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'log-1', amount: 50, source: 'workout', description: 'test', createdAt: new Date() },
    ])

    const res = await mod.GET(makeRequest('/api/xp?limit=10') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.xp).toBe(500)
    expect(body.level).toBe(4)
    expect(body.logs).toHaveLength(1)
    expect(db.player.findUnique).toHaveBeenCalledWith({
      where: { id: 'player-1' },
      select: { xp: true, xpLevel: true },
    })
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'ghost-id', email: 'ghost@test.com' },
    })

    vi.resetModules()
    const mod = await import('@/app/api/xp/route')
    const db = (await import('@/lib/db')).db

    ;(db.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(db.xpLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const res = await mod.GET(makeRequest('/api/xp') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('introuvable')
  })

  it('respects limit parameter (clamped to 1-50)', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'player-1', email: 'test@test.com' },
    })

    vi.resetModules()
    const mod = await import('@/app/api/xp/route')
    const db = (await import('@/lib/db')).db

    ;(db.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ xp: 0, xpLevel: 1 })

    // Request with limit=100 → should be clamped to 50
    const res = await mod.GET(makeRequest('/api/xp?limit=100') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(200)
    expect(db.xpLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    )
  })
})