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
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  teamMember: {
    findMany: vi.fn(),
  },
  team: {
    findUnique: vi.fn(),
  },
  friendship: {
    findMany: vi.fn().mockResolvedValue([]),
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

vi.mock('@/lib/cache', () => ({
  withCache: (_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher(),
}))

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeRequest(url: string): Request {
  return new Request(new URL(url, 'http://localhost:3000'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
}

const authedSession = { user: { id: 'p1', email: 't@t.com' } }

function allowRateLimit() {
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
}

// ── GET /api/leaderboard ─────────────────────────────────────────────────────

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(makeRequest('/api/leaderboard'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns 200 with leaderboard sorted by XP', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p2', name: 'Alice Martin', xp: 15000, xpLevel: 12, position: 'guard', sessions: [] },
      { id: 'p3', name: 'Bob Dupont', xp: 10000, xpLevel: 9, position: 'forward', sessions: [] },
      { id: 'p1', name: 'Test User', xp: 5000, xpLevel: 5, position: 'center', sessions: [] },
    ])
    ;(mockDb.player.count as ReturnType<typeof vi.fn>).mockResolvedValue(3)

    vi.resetModules()
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(makeRequest('/api/leaderboard'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaderboard).toHaveLength(3)
    expect(body.leaderboard[0].xp).toBeGreaterThanOrEqual(body.leaderboard[1].xp)
    expect(body.leaderboard[1].xp).toBeGreaterThanOrEqual(body.leaderboard[2].xp)
    expect(body.totalPlayers).toBe(3)
    expect(body.playerRank).toBeDefined()
  })

  it('anonymizes other player names', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p2', name: 'Alice Martin', xp: 15000, xpLevel: 12, position: 'guard', sessions: [] },
      { id: 'p1', name: 'Test User', xp: 5000, xpLevel: 5, position: 'center', sessions: [] },
    ])
    ;(mockDb.player.count as ReturnType<typeof vi.fn>).mockResolvedValue(2)

    vi.resetModules()
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(makeRequest('/api/leaderboard'))
    expect(res.status).toBe(200)
    const body = await res.json()

    const currentUser = body.leaderboard.find((p: { isCurrentUser: boolean }) => p.isCurrentUser)
    expect(currentUser.name).toBe('Test User')

    const other = body.leaderboard.find((p: { isCurrentUser: boolean }) => !p.isCurrentUser)
    expect(other.name).toBe('Alice')
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(makeRequest('/api/leaderboard'))
    expect(res.status).toBe(429)
  })

  it('returns player rank even if not in top 20', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p2', name: 'Alice', xp: 20000, xpLevel: 15, position: 'guard', sessions: [] },
    ])
    // First call: totalPlayers count
    ;(mockDb.player.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(100)
    // Player's own XP
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ xp: 5000 })
    // 5 players have more XP → rank 6
    ;(mockDb.player.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(5)

    vi.resetModules()
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(makeRequest('/api/leaderboard'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.playerRank).toBe(6)
  })

  it('filters by team when teamId provided', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.teamMember.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { playerId: 'p1' },
      { playerId: 'p2' },
    ])
    ;(mockDb.player.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p1', name: 'Test', xp: 5000, xpLevel: 5, position: 'guard', sessions: [] },
      { id: 'p2', name: 'Team Mate', xp: 8000, xpLevel: 7, position: 'forward', sessions: [] },
    ])
    ;(mockDb.team.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ name: 'Super Team' })

    vi.resetModules()
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(makeRequest('/api/leaderboard?teamId=team1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.teamName).toBe('Super Team')
    expect(body.totalPlayers).toBe(2)
  })
})