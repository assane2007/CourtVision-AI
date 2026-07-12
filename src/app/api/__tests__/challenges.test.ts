import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../challenges/route';
import { GET as GET_BY_ID } from '../challenges/[id]/route';
import { createMockRequest } from './api-test-utils';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

const mockChallengeFindMany = vi.fn()
const mockChallengeFindUnique = vi.fn()
const mockChallengeCreate = vi.fn()
const mockChallengeParticipantFindUnique = vi.fn()
const mockChallengeParticipantFindMany = vi.fn().mockResolvedValue([])
const mockTeamFindUnique = vi.fn()
const mockTeamChallengeCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    challenge: {
      findMany: (...args: unknown[]) => mockChallengeFindMany(...args),
      findUnique: (...args: unknown[]) => mockChallengeFindUnique(...args),
      create: (...args: unknown[]) => mockChallengeCreate(...args),
    },
    challengeParticipant: {
      findUnique: (...args: unknown[]) => mockChallengeParticipantFindUnique(...args),
      findMany: (...args: unknown[]) => mockChallengeParticipantFindMany(...args),
    },
    team: {
      findUnique: (...args: unknown[]) => mockTeamFindUnique(...args),
    },
    teamChallenge: {
      create: (...args: unknown[]) => mockTeamChallengeCreate(...args),
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

const mockChallenge = (overrides: Record<string, unknown> = {}) => ({
  id: 'chal-1',
  title: 'Score 50 Points',
  description: 'Score at least 50 points in a single session',
  type: 'drill_score',
  targetValue: 50,
  unit: 'points',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  isPublic: true,
  xpReward: 100,
  creatorId: 'player-1',
  createdAt: new Date(),
  creator: { id: 'player-1', name: 'Test', avatar: null },
  _count: { participants: 5 },
  teamChallenges: [],
  participants: [],
  ...overrides,
})

const now = new Date()
const _pastDate = new Date(now.getTime() - 86400000)
const _futureDate = new Date(now.getTime() + 86400000)

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
})

// ── GET /api/challenges ───────────────────────────────────────────────────────

describe('GET /api/challenges', () => {
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

  it('defaults to active tab (startDate <= now, endDate >= now)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindMany.mockResolvedValue([mockChallenge()])
    mockChallengeParticipantFindUnique.mockResolvedValue(null)

    const req = createMockRequest()
    const res = await GET(req as Request)
    expect(res.status).toBe(200)

    expect(mockChallengeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublic: true,
          startDate: { lte: expect.any(Date) },
          endDate: { gte: expect.any(Date) },
        }),
      }),
    )
  })

  it('filters upcoming challenges when tab=upcoming', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindMany.mockResolvedValue([mockChallenge()])
    mockChallengeParticipantFindUnique.mockResolvedValue(null)

    const req = createMockRequest(undefined, { tab: 'upcoming' })
    const res = await GET(req as Request)
    expect(res.status).toBe(200)

    expect(mockChallengeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startDate: { gt: expect.any(Date) },
        }),
      }),
    )
  })

  it('filters completed challenges when tab=completed', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindMany.mockResolvedValue([mockChallenge()])
    mockChallengeParticipantFindUnique.mockResolvedValue(null)

    const req = createMockRequest(undefined, { tab: 'completed' })
    const res = await GET(req as Request)
    expect(res.status).toBe(200)

    expect(mockChallengeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          endDate: { lt: expect.any(Date) },
        }),
      }),
    )
  })

  it('filters by creator when tab=my', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindMany.mockResolvedValue([mockChallenge()])
    mockChallengeParticipantFindUnique.mockResolvedValue(null)

    const req = createMockRequest(undefined, { tab: 'my' })
    const res = await GET(req as Request)
    expect(res.status).toBe(200)

    expect(mockChallengeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          creatorId: 'player-1',
        }),
      }),
    )
  })

  it('enriches challenges with isJoined and myProgress', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindMany.mockResolvedValue([mockChallenge()])
    mockChallengeParticipantFindMany.mockResolvedValue([{
      challengeId: 'chal-1',
      currentValue: 30,
      completed: false,
    }])

    const req = createMockRequest()
    const res = await GET(req as Request)
    const data = await res.json()
    expect(data.challenges[0].isJoined).toBe(true)
    expect(data.challenges[0].myProgress).toBe(30)
    expect(data.challenges[0].isCompleted).toBe(false)
  })

  it('shows isJoined=false when no participation', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindMany.mockResolvedValue([mockChallenge()])
    mockChallengeParticipantFindMany.mockResolvedValue([])

    const req = createMockRequest()
    const res = await GET(req as Request)
    const data = await res.json()
    expect(data.challenges[0].isJoined).toBe(false)
    expect(data.challenges[0].myProgress).toBe(0)
  })

  it('returns 500 on error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindMany.mockRejectedValue(new Error('DB error'))
    const req = createMockRequest()
    const res = await GET(req as Request)
    expect(res.status).toBe(500)
  })
})

// ── POST /api/challenges ──────────────────────────────────────────────────────

describe('POST /api/challenges', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ title: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })
    const req = createMockRequest({ title: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({ title: 'Only title' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('champs')
  })

  it('returns 400 for invalid type', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const body = {
      title: 'Test',
      description: 'Desc',
      type: 'invalid_type',
      targetValue: 10,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Type')
  })

  it('creates challenge with valid data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeCreate.mockResolvedValue(mockChallenge())

    const body = {
      title: 'Score 50',
      description: 'Score 50 points',
      type: 'drill_score',
      targetValue: 50,
      unit: 'points',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.challenge).toBeDefined()
    expect(data.challenge.title).toBe('Score 50 Points')
  })

  it('defaults isPublic to true and xpReward to 100', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeCreate.mockResolvedValue(mockChallenge())

    const body = {
      title: 'Test',
      description: 'Desc',
      type: 'total_reps',
      targetValue: 100,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    await POST(req)

    expect(mockChallengeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPublic: true,
          xpReward: 100,
        }),
      }),
    )
  })

  it('defaults unit to reps when not provided', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeCreate.mockResolvedValue(mockChallenge())

    const body = {
      title: 'Reps Challenge',
      description: 'Do 200 reps',
      type: 'total_reps',
      targetValue: 200,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    await POST(req)

    expect(mockChallengeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unit: 'reps' }),
      }),
    )
  })

  it('links to team when teamId is provided and team exists', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeCreate.mockResolvedValue(mockChallenge())
    mockTeamFindUnique.mockResolvedValue({ id: 'team-1' })
    mockTeamChallengeCreate.mockResolvedValue({})

    const body = {
      title: 'Team Challenge',
      description: 'Desc',
      type: 'streak',
      targetValue: 7,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      teamId: 'team-1',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)

    expect(mockTeamChallengeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { teamId: 'team-1', challengeId: 'chal-1' },
      }),
    )
  })

  it('does not link to team when teamId provided but team does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeCreate.mockResolvedValue(mockChallenge())
    mockTeamFindUnique.mockResolvedValue(null)

    const body = {
      title: 'Orphan Challenge',
      description: 'Desc',
      type: 'speed',
      targetValue: 10,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      teamId: 'nonexistent-team',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    await POST(req)

    expect(mockTeamChallengeCreate).not.toHaveBeenCalled()
  })

  it('trims title and description', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeCreate.mockResolvedValue(mockChallenge())

    const body = {
      title: '  Trimmed Title  ',
      description: '  Trimmed Description  ',
      type: 'custom',
      targetValue: 5,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    await POST(req)

    expect(mockChallengeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Trimmed Title',
          description: 'Trimmed Description',
        }),
      }),
    )
  })

  it('returns 500 on error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeCreate.mockRejectedValue(new Error('DB error'))
    const body = {
      title: 'Test',
      description: 'Desc',
      type: 'drill_score',
      targetValue: 10,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    }
    const req = createMockRequest(body, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

// ── GET /api/challenges/[id] ──────────────────────────────────────────────────

describe('GET /api/challenges/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'chal-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when challenge not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindUnique.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toContain('introuvable')
  })

  it('returns challenge details with leaderboard', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindUnique.mockResolvedValue(
      mockChallenge({
        participants: [
          { player: { id: 'p1', name: 'Alice', avatar: null, xpLevel: 5 }, currentValue: 80, completed: true, completedAt: new Date(), rank: null },
          { player: { id: 'p2', name: 'Bob', avatar: null, xpLevel: 3 }, currentValue: 30, completed: false, completedAt: null, rank: null },
        ],
        teamChallenges: [{ team: { id: 't1', name: 'Team A', logo: null } }],
      }),
    )
    mockChallengeParticipantFindUnique.mockResolvedValue({
      currentValue: 50,
      completed: false,
      completedAt: null,
    })

    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'chal-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.challenge).toBeDefined()
    expect(data.challenge.leaderboard).toHaveLength(2)
    // Sorted by currentValue desc
    expect(data.challenge.leaderboard[0].name).toBe('Alice')
    expect(data.challenge.leaderboard[0].currentValue).toBe(80)
    expect(data.challenge.teams).toHaveLength(1)
  })

  it('includes myParticipation when user is a participant', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindUnique.mockResolvedValue(
      mockChallenge({ targetValue: 50, participants: [] }),
    )
    mockChallengeParticipantFindUnique.mockResolvedValue({
      currentValue: 25,
      completed: false,
      completedAt: null,
    })

    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'chal-1' }) })
    const data = await res.json()
    expect(data.challenge.myParticipation).not.toBeNull()
    expect(data.challenge.myParticipation!.progressPercent).toBe(50) // 25/50 * 100
    expect(data.challenge.myParticipation!.currentValue).toBe(25)
  })

  it('myParticipation is null when user not a participant', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindUnique.mockResolvedValue(
      mockChallenge({ participants: [] }),
    )
    mockChallengeParticipantFindUnique.mockResolvedValue(null)

    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'chal-1' }) })
    const data = await res.json()
    expect(data.challenge.myParticipation).toBeNull()
  })

  it('caps progressPercent at 100', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindUnique.mockResolvedValue(
      mockChallenge({ targetValue: 50, participants: [] }),
    )
    mockChallengeParticipantFindUnique.mockResolvedValue({
      currentValue: 999, // way over target
      completed: true,
      completedAt: new Date(),
    })

    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'chal-1' }) })
    const data = await res.json()
    expect(data.challenge.myParticipation!.progressPercent).toBe(100)
  })

  it('assigns rank based on sorted order when participant has no rank', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindUnique.mockResolvedValue(
      mockChallenge({
        participants: [
          { player: { id: 'p3', name: 'C', avatar: null, xpLevel: 1 }, currentValue: 10, completed: false, completedAt: null, rank: null },
          { player: { id: 'p1', name: 'A', avatar: null, xpLevel: 5 }, currentValue: 80, completed: true, completedAt: new Date(), rank: null },
          { player: { id: 'p2', name: 'B', avatar: null, xpLevel: 3 }, currentValue: 30, completed: false, completedAt: null, rank: null },
        ],
        teamChallenges: [],
      }),
    )
    mockChallengeParticipantFindUnique.mockResolvedValue(null)

    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'chal-1' }) })
    const data = await res.json()
    expect(data.challenge.leaderboard[0].rank).toBe(1)
    expect(data.challenge.leaderboard[0].name).toBe('A')
    expect(data.challenge.leaderboard[1].rank).toBe(2)
    expect(data.challenge.leaderboard[2].rank).toBe(3)
  })

  it('returns 500 on error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockChallengeFindUnique.mockRejectedValue(new Error('DB error'))
    const req = createMockRequest()
    const res = await GET_BY_ID(req as Request, { params: Promise.resolve({ id: 'chal-1' }) })
    expect(res.status).toBe(500)
  })
})