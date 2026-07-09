import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../plans/route'
import { GET as GET_BY_ID, PATCH, DELETE } from '../plans/[id]/route'
import { createMockRequest } from './api-test-utils'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockPlanFindMany = vi.fn()
const mockPlanFindFirst = vi.fn()
const mockPlanCreate = vi.fn()
const mockPlanUpdate = vi.fn()
const mockPlanDelete = vi.fn()
const mockDrillFindMany = vi.fn()
const mockPlanDrillDeleteMany = vi.fn()
const mockPlanDrillCreate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    trainingPlan: {
      findMany: (...args: unknown[]) => mockPlanFindMany(...args),
      findFirst: (...args: unknown[]) => mockPlanFindFirst(...args),
      create: (...args: unknown[]) => mockPlanCreate(...args),
      update: (...args: unknown[]) => mockPlanUpdate(...args),
      delete: (...args: unknown[]) => mockPlanDelete(...args),
    },
    trainingPlanDrill: {
      deleteMany: (...args: unknown[]) => mockPlanDrillDeleteMany(...args),
      create: (...args: unknown[]) => mockPlanDrillCreate(...args),
    },
    drill: {
      findMany: (...args: unknown[]) => mockDrillFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ownerSession = {
  user: { id: 'player-123', email: 'owner@test.com', name: 'Owner' },
}

const otherSession = {
  user: { id: 'player-456', email: 'other@test.com', name: 'Other' },
}

const testPlanId = 'plan-abc-123'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: testPlanId,
    playerId: 'player-123',
    name: 'Morning Routine',
    description: 'Daily morning drills',
    isPublic: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    drills: [],
    _count: { drills: 0 },
    ...overrides,
  }
}

function makePlanWithDrills() {
  return {
    id: testPlanId,
    playerId: 'player-123',
    name: 'Shooting Plan',
    description: null,
    isPublic: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    drills: [
      {
        id: 'tpd-1',
        planId: testPlanId,
        drillId: 'drill-1',
        order: 0,
        drill: { id: 'drill-1', nameFr: 'Tir en suspension', icon: '🎯', category: 'shooting', difficulty: 'advanced', durationSec: 45, targetReps: 10 },
      },
    ],
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/plans
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/plans', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'a@b.com' } })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 600000 })
    const res = await GET()
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Trop de requêtes')
  })

  it('returns empty array when no plans exist', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindMany.mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.plans).toEqual([])
  })

  it('returns list of plans with drills and counts', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindMany.mockResolvedValue([makePlanWithDrills()])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.plans).toHaveLength(1)
    expect(data.plans[0].drills).toHaveLength(1)
    expect(data.plans[0].drills[0].drill.nameFr).toBe('Tir en suspension')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindMany.mockRejectedValue(new Error('DB crash'))
    const res = await GET()
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/plans
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/plans', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ name: 'New Plan' }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 600000 })
    const req = createMockRequest({ name: 'New Plan' }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 413 when body too large', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    const req = createMockRequest(
      { name: 'Plan' },
      undefined,
      { 'content-length': '2000000' },
      'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error).toBe('Requête trop volumineuse')
  })

  it('returns 400 when name is too short', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    const req = createMockRequest({ name: 'A' }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 400 when name is missing', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    const req = createMockRequest({}, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when drillIds has more than 20 items', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    const drillIds = Array.from({ length: 21 }, (_, i) => `drill-${i}`)
    const req = createMockRequest({ name: 'Plan', drillIds }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('successfully creates a plan without drills', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockDrillFindMany.mockResolvedValue([])
    mockPlanCreate.mockResolvedValue(makePlan())
    const req = createMockRequest(
      { name: 'Morning Routine', description: 'Daily drills' },
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.plan).toBeDefined()
    expect(data.plan.playerId).toBe('player-123')
    expect(mockPlanCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Morning Routine',
          description: 'Daily drills',
        }),
      })
    )
  })

  it('successfully creates a plan with valid drill IDs', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockDrillFindMany.mockResolvedValue([
      { id: 'drill-1' },
      { id: 'drill-2' },
    ])
    mockPlanCreate.mockResolvedValue(makePlanWithDrills())
    const req = createMockRequest(
      { name: 'Shooting Plan', drillIds: ['drill-1', 'drill-2'] },
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.plan).toBeDefined()
    // Only valid drill IDs should be used
    expect(mockDrillFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['drill-1', 'drill-2'] },
        }),
      })
    )
  })

  it('creates plan with isPublic default false', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockDrillFindMany.mockResolvedValue([])
    mockPlanCreate.mockImplementation((args: { data: Record<string, unknown> }) => {
      expect(args.data.isPublic).toBe(false)
      return Promise.resolve(makePlan())
    })
    const req = createMockRequest({ name: 'Private Plan' }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('creates plan with isPublic true when specified', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockDrillFindMany.mockResolvedValue([])
    mockPlanCreate.mockImplementation((args: { data: Record<string, unknown> }) => {
      expect(args.data.isPublic).toBe(true)
      return Promise.resolve(makePlan({ isPublic: true }))
    })
    const req = createMockRequest({ name: 'Public Plan', isPublic: true }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockDrillFindMany.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest({ name: 'Plan' }, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/plans/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/plans/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET_BY_ID(req, makeParams(testPlanId))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 600000 })
    const req = createMockRequest()
    const res = await GET_BY_ID(req, makeParams(testPlanId))
    expect(res.status).toBe(429)
  })

  it('returns 404 when plan not found', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET_BY_ID(req, makeParams(testPlanId))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Plan non trouvé')
  })

  it('returns plan owned by current user', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(makePlanWithDrills())
    const req = createMockRequest()
    const res = await GET_BY_ID(req, makeParams(testPlanId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.plan.id).toBe(testPlanId)
    expect(data.plan.drills).toHaveLength(1)
  })

  it('returns public plan owned by another user', async () => {
    mockGetServerSession.mockResolvedValue(otherSession)
    mockPlanFindFirst.mockResolvedValue(makePlanWithDrills())
    const req = createMockRequest()
    const res = await GET_BY_ID(req, makeParams(testPlanId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.plan.id).toBe(testPlanId)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest()
    const res = await GET_BY_ID(req, makeParams(testPlanId))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/plans/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/plans/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ name: 'Updated' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testPlanId))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 600000 })
    const req = createMockRequest({ name: 'Updated' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testPlanId))
    expect(res.status).toBe(429)
  })

  it('returns 404 when plan not found for user', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(null)
    const req = createMockRequest({ name: 'Updated' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testPlanId))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Plan non trouvé')
  })

  it('returns 400 when name is too short', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(makePlan())
    const req = createMockRequest({ name: 'A' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testPlanId))
    expect(res.status).toBe(400)
  })

  it('successfully updates plan name', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(makePlan())
    mockPlanUpdate.mockResolvedValue(makePlan({ name: 'Updated Plan' }))
    const req = createMockRequest({ name: 'Updated Plan' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testPlanId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.plan).toBeDefined()
    expect(mockPlanUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testPlanId },
      })
    )
  })

  it('replaces drills when drillIds provided', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(makePlan())
    mockDrillFindMany.mockResolvedValue([{ id: 'drill-x' }, { id: 'drill-y' }])
    mockTransaction.mockResolvedValue([])
    mockPlanUpdate.mockResolvedValue(makePlan())
    const req = createMockRequest(
      { name: 'Updated', drillIds: ['drill-x', 'drill-y'] },
      undefined, undefined, 'PATCH'
    )
    const res = await PATCH(req, makeParams(testPlanId))
    expect(res.status).toBe(200)
    // Transaction should be called to replace drills
    expect(mockTransaction).toHaveBeenCalled()
    expect(mockPlanDrillDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { planId: testPlanId } })
    )
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest({ name: 'Updated' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testPlanId))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/plans/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/plans/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testPlanId))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 600000 })
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testPlanId))
    expect(res.status).toBe(429)
  })

  it('returns 404 when plan not found for user', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testPlanId))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Plan non trouvé')
  })

  it('successfully deletes plan', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(makePlan())
    mockPlanDelete.mockResolvedValue(makePlan())
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testPlanId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.message).toBe('Plan supprimé')
    expect(mockPlanDelete).toHaveBeenCalledWith({ where: { id: testPlanId } })
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockPlanFindFirst.mockResolvedValue(makePlan())
    mockPlanDelete.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testPlanId))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})