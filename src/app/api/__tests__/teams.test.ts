import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../teams/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '../teams/[id]/route';
import { createMockRequest } from './api-test-utils';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

const mockTeamFindMany = vi.fn()
const mockTeamFindUnique = vi.fn()
const mockTeamCreate = vi.fn()
const mockTeamUpdate = vi.fn()
const mockTeamDelete = vi.fn()
const mockTeamMemberCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    team: {
      findMany: (...args: unknown[]) => mockTeamFindMany(...args),
      findUnique: (...args: unknown[]) => mockTeamFindUnique(...args),
      create: (...args: unknown[]) => mockTeamCreate(...args),
      update: (...args: unknown[]) => mockTeamUpdate(...args),
      delete: (...args: unknown[]) => mockTeamDelete(...args),
    },
    teamMember: {
      create: (...args: unknown[]) => mockTeamMemberCreate(...args),
    },
  },
}))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authenticatedSession = {
  user: { id: 'player-1', email: 'test@test.com', name: 'Test' },
}

const mockTeam = (overrides: Record<string, unknown> = {}) => ({
  id: 'team-1',
  name: 'Dream Team',
  description: 'A great team',
  logo: null,
  sport: 'basketball',
  isPublic: true,
  maxMembers: 15,
  ownerId: 'player-1',
  createdAt: new Date(),
  owner: { id: 'player-1', name: 'Test', avatar: null },
  _count: { members: 3, challenges: 2 },
  members: [],
  challenges: [],
  ...overrides,
})

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
})

// ── GET /api/teams ────────────────────────────────────────────────────────────

describe('GET /api/teams', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET(req as Request)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'x@y.com' } })
    const req = createMockRequest()
    const res = await GET(req as Request)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })
    const req = createMockRequest()
    const res = await GET(req as Request)
    expect(res.status).toBe(429)
  })

  it('returns public teams when no ?my param', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindMany.mockResolvedValue([mockTeam()])

    const req = createMockRequest()
    const res = await GET(req as Request)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.teams).toHaveLength(1)
    expect(data.teams[0].name).toBe('Dream Team')
    // Should have used isPublic: true in where
    expect(mockTeamFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublic: true }),
      }),
    )
  })

  it('filters by my teams when ?my=true', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindMany.mockResolvedValue([mockTeam()])

    const req = createMockRequest(undefined, { my: 'true' })
    const res = await GET(req as Request)
    expect(res.status).toBe(200)
    expect(mockTeamFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          members: { some: { playerId: 'player-1' } },
        }),
      }),
    )
  })

  it('returns enriched fields including memberCount and challengeCount', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindMany.mockResolvedValue([
      mockTeam({ _count: { members: 5, challenges: 3 } }),
    ])

    const req = createMockRequest()
    const res = await GET(req as Request)
    const data = await res.json()
    expect(data.teams[0].memberCount).toBe(5)
    expect(data.teams[0].challengeCount).toBe(3)
  })

  it('returns 500 on error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindMany.mockRejectedValue(new Error('DB error'))
    const req = createMockRequest()
    const res = await GET(req as Request)
    expect(res.status).toBe(500)
  })
})

// ── POST /api/teams ───────────────────────────────────────────────────────────

describe('POST /api/teams', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ name: 'Team' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })
    const req = createMockRequest({ name: 'Team' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 400 when name is missing', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({}, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Nom')
  })

  it('returns 400 when name is too short (1 char)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({ name: 'A' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates team and adds owner as member', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamCreate.mockResolvedValue(mockTeam())
    mockTeamMemberCreate.mockResolvedValue({})

    const req = createMockRequest({ name: 'Dream Team' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.team).toBeDefined()

    expect(mockTeamMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: 'team-1',
          playerId: 'player-1',
          role: 'owner',
        }),
      }),
    )
  })

  it('defaults isPublic to true and maxMembers to 15', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamCreate.mockResolvedValue(mockTeam())
    mockTeamMemberCreate.mockResolvedValue({})

    const req = createMockRequest({ name: 'My Team' }, undefined, {}, 'POST')
    await POST(req)

    expect(mockTeamCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPublic: true,
          maxMembers: 15,
        }),
      }),
    )
  })

  it('allows isPublic=false and custom maxMembers', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamCreate.mockResolvedValue(mockTeam({ isPublic: false, maxMembers: 20 }))
    mockTeamMemberCreate.mockResolvedValue({})

    const req = createMockRequest({ name: 'Private', isPublic: false, maxMembers: 20 }, undefined, {}, 'POST')
    await POST(req)

    expect(mockTeamCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPublic: false,
          maxMembers: 20,
        }),
      }),
    )
  })

  it('trims name whitespace', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamCreate.mockResolvedValue(mockTeam())
    mockTeamMemberCreate.mockResolvedValue({})

    const req = createMockRequest({ name: '  Team Name  ' }, undefined, {}, 'POST')
    await POST(req)

    expect(mockTeamCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Team Name' }),
      }),
    )
  })
})

// ── GET /api/teams/[id] ──────────────────────────────────────────────────────

describe('GET /api/teams/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when team not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('introuvable')
  })

  it('returns enriched team with leaderboard', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(
      mockTeam({
        members: [
          { player: { id: 'p1', name: 'Alice', avatar: null, xpLevel: 5, position: 'guard', xp: 200 }, role: 'owner', joinedAt: new Date() },
          { player: { id: 'p2', name: 'Bob', avatar: null, xpLevel: 3, position: 'forward', xp: 100 }, role: 'member', joinedAt: new Date() },
        ],
        challenges: [],
      }),
    )

    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.team).toBeDefined()
    expect(data.team.leaderboard).toHaveLength(2)
    // Leaderboard sorted by XP desc
    expect(data.team.leaderboard[0].name).toBe('Alice')
    expect(data.team.leaderboard[0].xp).toBe(200)
  })

  it('calculates totalXp and avgLevel correctly', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(
      mockTeam({
        members: [
          { player: { id: 'p1', name: 'A', avatar: null, xpLevel: 4, position: 'guard', xp: 300 }, role: 'owner', joinedAt: new Date() },
          { player: { id: 'p2', name: 'B', avatar: null, xpLevel: 8, position: 'forward', xp: 500 }, role: 'member', joinedAt: new Date() },
        ],
        challenges: [],
      }),
    )

    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    const data = await res.json()
    expect(data.team.totalXp).toBe(800)
    expect(data.team.avgLevel).toBe(6) // (4+8)/2 = 6
  })

  it('returns 500 on error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockRejectedValue(new Error('DB error'))
    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(500)
  })
})

// ── PATCH /api/teams/[id] ─────────────────────────────────────────────────────

describe('PATCH /api/teams/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ name: 'New' }, undefined, {}, 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when team not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(null)
    const req = createMockRequest({ name: 'New' }, undefined, {}, 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(403)
  })

  it('returns 403 when user is not owner', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(mockTeam({ ownerId: 'other-user' }))
    const req = createMockRequest({ name: 'New' }, undefined, {}, 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(403)
  })

  it('updates team name when user is owner', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(mockTeam({ ownerId: 'player-1' }))
    mockTeamUpdate.mockResolvedValue(mockTeam({ name: 'Updated Team' }))

    const req = createMockRequest({ name: 'Updated Team' }, undefined, {}, 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.team).toBeDefined()

    expect(mockTeamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team-1' },
        data: expect.objectContaining({ name: 'Updated Team' }),
      }),
    )
  })

  it('updates multiple fields at once', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(mockTeam({ ownerId: 'player-1' }))
    mockTeamUpdate.mockResolvedValue(mockTeam())

    const req = createMockRequest(
      { name: 'New Name', description: 'New desc', isPublic: false, maxMembers: 25 },
      undefined,
      {},
      'PATCH',
    )
    const res = await PATCH(req, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(200)

    expect(mockTeamUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New Name',
          description: 'New desc',
          isPublic: false,
          maxMembers: 25,
        }),
      }),
    )
  })

  it('returns 500 on error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(mockTeam({ ownerId: 'player-1' }))
    mockTeamUpdate.mockRejectedValue(new Error('DB error'))
    const req = createMockRequest({ name: 'X' }, undefined, {}, 'PATCH')
    const res = await PATCH(req, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(500)
  })
})

// ── DELETE /api/teams/[id] ────────────────────────────────────────────────────

describe('DELETE /api/teams/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await DELETE(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when team not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await DELETE(req as Request, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(403)
  })

  it('returns 403 when user is not owner', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(mockTeam({ ownerId: 'other-user' }))
    const req = createMockRequest()
    const res = await DELETE(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(403)
  })

  it('deletes team when user is owner', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(mockTeam({ ownerId: 'player-1' }))
    mockTeamDelete.mockResolvedValue({})

    const req = createMockRequest()
    const res = await DELETE(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockTeamDelete).toHaveBeenCalledWith({ where: { id: 'team-1' } })
  })

  it('returns 500 on error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockTeamFindUnique.mockResolvedValue(mockTeam({ ownerId: 'player-1' }))
    mockTeamDelete.mockRejectedValue(new Error('DB error'))
    const req = createMockRequest()
    const res = await DELETE(req as Request, { params: Promise.resolve({ id: 'team-1' }) })
    expect(res.status).toBe(500)
  })
})