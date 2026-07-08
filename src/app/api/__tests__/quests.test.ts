import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../quests/route'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockWorkoutSessionCount = vi.fn()
const mockWorkoutSessionDrillFindMany = vi.fn()
const mockWorkoutSessionAggregate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    workoutSession: {
      count: (...args: unknown[]) => mockWorkoutSessionCount(...args),
      aggregate: (...args: unknown[]) => mockWorkoutSessionAggregate(...args),
    },
    workoutSessionDrill: {
      findMany: (...args: unknown[]) => mockWorkoutSessionDrillFindMany(...args),
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

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/quests', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('returns 401 when session has no email', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'test-id' } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 3 daily quests and 1 weekly quest', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    // Mock all the Promise.all calls
    // First call: todaySessions count
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    // Second call: todayDrills findMany
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    // Third call: todayReps aggregate
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    // Fourth call: weekSessions count
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.daily).toHaveLength(3)
    expect(data.weekly).toHaveLength(1)
  })

  it('returns correct quest structure with all fields', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    for (const quest of [...data.daily, ...data.weekly]) {
      expect(quest).toHaveProperty('id')
      expect(quest).toHaveProperty('title')
      expect(quest).toHaveProperty('description')
      expect(quest).toHaveProperty('progress')
      expect(quest).toHaveProperty('target')
      expect(quest).toHaveProperty('completed')
      expect(quest).toHaveProperty('xpReward')
      expect(typeof quest.id).toBe('string')
      expect(typeof quest.title).toBe('string')
      expect(typeof quest.progress).toBe('number')
      expect(typeof quest.target).toBe('number')
      expect(typeof quest.completed).toBe('boolean')
      expect(typeof quest.xpReward).toBe('number')
    }
  })

  it('returns progress 0 for all quests when no data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    for (const quest of data.daily) {
      expect(quest.progress).toBe(0)
      expect(quest.completed).toBe(false)
    }
    for (const quest of data.weekly) {
      expect(quest.progress).toBe(0)
      expect(quest.completed).toBe(false)
    }
  })

  it('marks session quest completed when 1+ session today', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(2) // 2 sessions today
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    const sessionQuest = data.daily.find((q: { id: string }) => q.id === 'session_today')
    expect(sessionQuest).toBeDefined()
    expect(sessionQuest.progress).toBe(1)
    expect(sessionQuest.completed).toBe(true)
    expect(sessionQuest.xpReward).toBe(25)
  })

  it('calculates reps quest progress correctly', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 15 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    const repsQuest = data.daily.find((q: { id: string }) => q.id === 'reps_20')
    expect(repsQuest).toBeDefined()
    expect(repsQuest.progress).toBe(15)
    expect(repsQuest.target).toBe(20)
    expect(repsQuest.completed).toBe(false)
    expect(repsQuest.xpReward).toBe(15)
  })

  it('caps reps progress at target', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 50 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    const repsQuest = data.daily.find((q: { id: string }) => q.id === 'reps_20')
    expect(repsQuest.progress).toBe(20) // capped at target
    expect(repsQuest.completed).toBe(true)
  })

  it('calculates score 80+ quest correctly', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    // One drill with score 85 and one with score 50
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([
      { score: 85 },
      { score: 50 },
    ])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    const scoreQuest = data.daily.find((q: { id: string }) => q.id === 'score_80')
    expect(scoreQuest).toBeDefined()
    expect(scoreQuest.progress).toBe(1) // 1 drill >= 80
    expect(scoreQuest.completed).toBe(true)
    expect(scoreQuest.xpReward).toBe(30)
  })

  it('calculates weekly quest progress correctly', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(2) // 2 sessions this week

    const res = await GET()
    const data = await res.json()

    const weeklyQuest = data.weekly[0]
    expect(weeklyQuest.id).toBe('sessions_3_week')
    expect(weeklyQuest.progress).toBe(2)
    expect(weeklyQuest.target).toBe(3)
    expect(weeklyQuest.completed).toBe(false)
    expect(weeklyQuest.xpReward).toBe(75)
  })

  it('handles null _sum.totalReps as 0', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: null } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    const repsQuest = data.daily.find((q: { id: string }) => q.id === 'reps_20')
    expect(repsQuest.progress).toBe(0)
  })

  it('returns correct daily quest ids', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockWorkoutSessionCount.mockResolvedValueOnce(0)
    mockWorkoutSessionDrillFindMany.mockResolvedValueOnce([])
    mockWorkoutSessionAggregate.mockResolvedValueOnce({ _sum: { totalReps: 0 } })
    mockWorkoutSessionCount.mockResolvedValueOnce(0)

    const res = await GET()
    const data = await res.json()

    const dailyIds = data.daily.map((q: { id: string }) => q.id)
    expect(dailyIds).toContain('session_today')
    expect(dailyIds).toContain('reps_20')
    expect(dailyIds).toContain('score_80')
  })
})