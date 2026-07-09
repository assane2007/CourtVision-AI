import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../drills/create/route'
import { createMockRequest } from './api-test-utils'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockDrillCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    drill: {
      create: (...args: unknown[]) => mockDrillCreate(...args),
    },
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

vi.mock('@/lib/cache', () => ({
  cacheInvalidatePattern: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const session = {
  user: { id: 'player-123', email: 'player@test.com', name: 'Player' },
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    nameFr: 'Cross-over',
    category: 'ball_handling',
    difficulty: 'intermediate',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
})

describe('POST /api/drills/create', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest(validBody(), undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non authentifié')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'a@b.com' } })
    const req = createMockRequest(validBody(), undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(session)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 600000 })
    const req = createMockRequest(validBody(), undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Trop de requêtes')
  })

  it('returns 413 when body is too large', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const req = createMockRequest(
      validBody(),
      undefined,
      { 'content-length': '2000000' },
      'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error).toBe('Requête trop volumineuse')
  })

  it('returns 400 when nameFr is missing', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const req = createMockRequest(
      { category: 'ball_handling', difficulty: 'intermediate' },
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 400 when category is invalid', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const req = createMockRequest(
      validBody({ category: 'invalid_cat' }),
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Catégorie invalide')
  })

  it('returns 400 when difficulty is invalid', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const req = createMockRequest(
      validBody({ difficulty: 'expert' }),
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Difficulté invalide')
  })

  it('returns 400 when nameFr is too short (1 char)', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const req = createMockRequest(
      validBody({ nameFr: 'A' }),
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('returns 400 when durationSec is below minimum (9)', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const req = createMockRequest(
      validBody({ durationSec: 9 }),
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when targetReps is 0', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const req = createMockRequest(
      validBody({ targetReps: 0 }),
      undefined, undefined, 'POST'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('successfully creates a drill with minimal fields', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const created = {
      id: 'drill-new-1',
      playerId: 'player-123',
      name: 'Cross-over',
      nameFr: 'Cross-over',
      category: 'ball_handling',
      difficulty: 'intermediate',
      description: '',
      descriptionFr: '',
      instructions: '',
      instructionsFr: '',
      durationSec: 30,
      targetReps: 10,
      icon: '🏀',
      isActive: true,
      isCustom: true,
    }
    mockDrillCreate.mockResolvedValue(created)
    const req = createMockRequest(validBody(), undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.drill).toBeDefined()
    expect(data.drill.id).toBe('drill-new-1')
    expect(data.drill.isCustom).toBe(true)
    expect(data.drill.playerId).toBe('player-123')
  })

  it('successfully creates a drill with all optional fields', async () => {
    mockGetServerSession.mockResolvedValue(session)
    const created = {
      id: 'drill-new-2',
      playerId: 'player-123',
      name: 'Crossover Drill',
      nameFr: 'Cross-over',
      category: 'ball_handling',
      difficulty: 'advanced',
      description: 'A great crossover drill',
      descriptionFr: 'Un super exercice de cross-over',
      instructions: 'Start low, cross quickly',
      instructionsFr: 'Restez bas, croisez rapidement',
      durationSec: 45,
      targetReps: 15,
      icon: '⚡',
      isActive: true,
      isCustom: true,
    }
    mockDrillCreate.mockResolvedValue(created)
    const body = validBody({
      name: 'Crossover Drill',
      nameFr: 'Cross-over',
      category: 'ball_handling',
      difficulty: 'advanced',
      description: 'A great crossover drill',
      descriptionFr: 'Un super exercice de cross-over',
      instructions: 'Start low, cross quickly',
      instructionsFr: 'Restez bas, croisez rapidement',
      durationSec: 45,
      targetReps: 15,
      icon: '⚡',
    })
    const req = createMockRequest(body, undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.drill.durationSec).toBe(45)
    expect(data.drill.icon).toBe('⚡')
  })

  it('uses nameFr as name fallback when name is not provided', async () => {
    mockGetServerSession.mockResolvedValue(session)
    mockDrillCreate.mockImplementation((args: { data: Record<string, unknown> }) => {
      expect(args.data.name).toBe('Cross-over')
      return Promise.resolve({ id: 'd1', ...args.data })
    })
    const req = createMockRequest(validBody(), undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('invalidates drills cache on success', async () => {
    const { cacheInvalidatePattern } = await import('@/lib/cache')
    mockGetServerSession.mockResolvedValue(session)
    mockDrillCreate.mockResolvedValue({
      id: 'd1',
      playerId: 'player-123',
      name: 'Test',
      nameFr: 'Test',
      category: 'ball_handling',
      difficulty: 'beginner',
      description: '',
      descriptionFr: '',
      instructions: '',
      instructionsFr: '',
      durationSec: 30,
      targetReps: 10,
      icon: '🏀',
      isActive: true,
      isCustom: true,
    })
    const req = createMockRequest(validBody(), undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(cacheInvalidatePattern).toHaveBeenCalledWith('drills:')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(session)
    mockDrillCreate.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest(validBody(), undefined, undefined, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur lors de la création')
  })
})