import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../scouting/route'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockPlayerFindUnique = vi.fn()
const mockSessionDrillFindMany = vi.fn()
const mockSessionCount = vi.fn()
const mockSessionFindFirst = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    player: { findUnique: (...args: unknown[]) => mockPlayerFindUnique(...args) },
    workoutSessionDrill: { findMany: (...args: unknown[]) => mockSessionDrillFindMany(...args) },
    workoutSession: {
      count: (...args: unknown[]) => mockSessionCount(...args),
      findFirst: (...args: unknown[]) => mockSessionFindFirst(...args),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ success: true, retryAfterMs: 0 }),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authenticatedSession = {
  user: { id: 'test-id', email: 'test@test.com', name: 'Test' },
}

function makeSessionDrill(overrides: {
  sessionId?: string
  drillCategory?: string
  score?: number
  reps?: number
  createdAt?: Date
}) {
  return {
    id: 'drill-' + Math.random().toString(36).slice(2),
    sessionId: overrides.sessionId ?? 'session-1',
    drillId: 'drill-1',
    reps: overrides.reps ?? 10,
    score: overrides.score ?? 75,
    durationMs: 30000,
    formFeedback: '{}',
    createdAt: overrides.createdAt ?? new Date('2025-01-15T10:00:00Z'),
    drill: { category: overrides.drillCategory ?? 'shooting' },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/scouting', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Joueur introuvable')
  })

  it('returns correct structure with categories, grade, overallScore', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test Player',
      position: 'guard',
      xp: 500,
      xpLevel: 5,
    })
    mockSessionDrillFindMany.mockResolvedValue([
      makeSessionDrill({ drillCategory: 'shooting', score: 80, reps: 10, sessionId: 's1' }),
      makeSessionDrill({ drillCategory: 'shooting', score: 90, reps: 8, sessionId: 's1' }),
      makeSessionDrill({ drillCategory: 'defense', score: 70, reps: 12, sessionId: 's2' }),
      makeSessionDrill({ drillCategory: 'ball_handling', score: 60, reps: 15, sessionId: 's2' }),
      makeSessionDrill({ drillCategory: 'pocket_ball', score: 65, reps: 10, sessionId: 's3' }),
    ])
    mockSessionCount.mockResolvedValue(3)
    mockSessionFindFirst.mockResolvedValue({ startedAt: new Date('2025-01-15T10:00:00Z') })

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()

    // Structure checks
    expect(data).toHaveProperty('player')
    expect(data).toHaveProperty('categories')
    expect(data).toHaveProperty('overallGrade')
    expect(data).toHaveProperty('overallScore')
    expect(data).toHaveProperty('totalWorkouts')
    expect(data).toHaveProperty('totalReps')
    expect(data).toHaveProperty('lastActive')
    expect(data).toHaveProperty('levelAvg')

    // Player info
    expect(data.player.name).toBe('Test Player')
    expect(data.player.level).toBe(5)
    expect(data.player.xp).toBe(500)

    // Total workouts from count
    expect(data.totalWorkouts).toBe(3)

    // Categories count (6 radar axes)
    expect(data.categories).toHaveLength(6)

    // Overall score should be > 0
    expect(data.overallScore).toBeGreaterThan(0)
    expect(data.overallGrade).toBeTruthy()
  })

  it('maps categories correctly: shooting → TIR, defense → DÉFENSE, etc.', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test', position: 'guard', xp: 0, xpLevel: 1,
    })
    mockSessionDrillFindMany.mockResolvedValue([
      makeSessionDrill({ drillCategory: 'shooting', score: 80, sessionId: 's1' }),
      makeSessionDrill({ drillCategory: 'defense', score: 70, sessionId: 's2' }),
      makeSessionDrill({ drillCategory: 'ball_handling', score: 60, sessionId: 's3' }),
      makeSessionDrill({ drillCategory: 'speed_change', score: 85, sessionId: 's4' }),
      makeSessionDrill({ drillCategory: 'footwork', score: 75, sessionId: 's5' }),
      makeSessionDrill({ drillCategory: 'conditioning', score: 90, sessionId: 's6' }),
      makeSessionDrill({ drillCategory: 'pocket_ball', score: 65, sessionId: 's7' }),
    ])
    mockSessionCount.mockResolvedValue(7)
    mockSessionFindFirst.mockResolvedValue({ startedAt: new Date() })

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)

    const catMap: Record<string, string> = {}
    for (const cat of data.categories) {
      catMap[cat.key] = cat.name
    }

    expect(catMap['shooting']).toBe('TIR')
    expect(catMap['dribble']).toBe('DRIBBLE')
    expect(catMap['vitesse']).toBe('VITESSE')
    expect(catMap['defense']).toBe('DÉFENSE')
    expect(catMap['placement']).toBe('PLACEMENT')
    expect(catMap['endurance']).toBe('ENDURANCE')
  })

  it('aggregates ball_handling and pocket_ball into DRIBBLE', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test', position: 'guard', xp: 0, xpLevel: 1,
    })
    mockSessionDrillFindMany.mockResolvedValue([
      makeSessionDrill({ drillCategory: 'ball_handling', score: 60, reps: 10, sessionId: 's1' }),
      makeSessionDrill({ drillCategory: 'pocket_ball', score: 80, reps: 12, sessionId: 's2' }),
    ])
    mockSessionCount.mockResolvedValue(2)
    mockSessionFindFirst.mockResolvedValue({ startedAt: new Date() })

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)

    const dribble = data.categories.find((c: { key: string }) => c.key === 'dribble')
    expect(dribble).toBeDefined()
    // Both ball_handling(60) + pocket_ball(80) → avg = 70
    expect(dribble.avgScore).toBe(70)
    expect(dribble.totalReps).toBe(22) // 10 + 12
  })

  it('returns zeros for empty data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Empty', position: 'guard', xp: 0, xpLevel: 1,
    })
    mockSessionDrillFindMany.mockResolvedValue([])
    mockSessionCount.mockResolvedValue(0)
    mockSessionFindFirst.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()

    // All categories should have 0 values
    for (const cat of data.categories) {
      expect(cat.avgScore).toBe(0)
      expect(cat.totalReps).toBe(0)
      expect(cat.totalSessions).toBe(0)
      expect(cat.lastScores).toEqual([])
    }

    expect(data.overallScore).toBe(0)
    expect(data.overallGrade).toBe('F')
    expect(data.totalWorkouts).toBe(0)
    expect(data.totalReps).toBe(0)
    expect(data.lastActive).toBeNull()
  })

  it('computes overall grade correctly', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test', position: 'guard', xp: 0, xpLevel: 1,
    })
    // All shooting drills score 95 → overall should be S
    mockSessionDrillFindMany.mockResolvedValue([
      makeSessionDrill({ drillCategory: 'shooting', score: 95, sessionId: 's1' }),
    ])
    mockSessionCount.mockResolvedValue(1)
    mockSessionFindFirst.mockResolvedValue({ startedAt: new Date() })

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.overallGrade).toBe('S')
  })

  it('includes levelAvg based on player xpLevel', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test', position: 'guard', xp: 0, xpLevel: 10,
    })
    mockSessionDrillFindMany.mockResolvedValue([])
    mockSessionCount.mockResolvedValue(0)
    mockSessionFindFirst.mockResolvedValue(null)

    const res = await GET()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.levelAvg).toBe(68) // level 10 benchmark
  })

  it('computes trend as stable for insufficient data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test', position: 'guard', xp: 0, xpLevel: 1,
    })
    mockSessionDrillFindMany.mockResolvedValue([
      makeSessionDrill({ drillCategory: 'shooting', score: 75, sessionId: 's1' }),
    ])
    mockSessionCount.mockResolvedValue(1)
    mockSessionFindFirst.mockResolvedValue({ startedAt: new Date() })

    const res = await GET()
    const data = await res.json()
    const shooting = data.categories.find((c: { key: string }) => c.key === 'shooting')
    // Only 1 score → trend should be stable
    expect(shooting.trend).toBe('stable')
  })

  it('computes trend as up for improving scores', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test', position: 'guard', xp: 0, xpLevel: 1,
    })
    mockSessionDrillFindMany.mockResolvedValue([
      makeSessionDrill({ drillCategory: 'shooting', score: 60, sessionId: 's1', createdAt: new Date('2025-01-10T10:00:00Z') }),
      makeSessionDrill({ drillCategory: 'shooting', score: 65, sessionId: 's2', createdAt: new Date('2025-01-11T10:00:00Z') }),
      makeSessionDrill({ drillCategory: 'shooting', score: 85, sessionId: 's3', createdAt: new Date('2025-01-12T10:00:00Z') }),
    ])
    mockSessionCount.mockResolvedValue(3)
    mockSessionFindFirst.mockResolvedValue({ startedAt: new Date() })

    const res = await GET()
    const data = await res.json()
    const shooting = data.categories.find((c: { key: string }) => c.key === 'shooting')
    // Scores: 60, 65, 85 → improving, diff > 3
    expect(shooting.trend).toBe('up')
  })

  it('counts distinct sessions per category', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      name: 'Test', position: 'guard', xp: 0, xpLevel: 1,
    })
    mockSessionDrillFindMany.mockResolvedValue([
      makeSessionDrill({ drillCategory: 'shooting', score: 80, sessionId: 's1' }),
      makeSessionDrill({ drillCategory: 'shooting', score: 85, sessionId: 's1' }),
      makeSessionDrill({ drillCategory: 'shooting', score: 70, sessionId: 's2' }),
    ])
    mockSessionCount.mockResolvedValue(2)
    mockSessionFindFirst.mockResolvedValue({ startedAt: new Date() })

    const res = await GET()
    const data = await res.json()
    const shooting = data.categories.find((c: { key: string }) => c.key === 'shooting')
    // 3 drills in 2 distinct sessions
    expect(shooting.totalSessions).toBe(2)
    expect(shooting.totalReps).toBe(30) // 10+10+10
  })
})