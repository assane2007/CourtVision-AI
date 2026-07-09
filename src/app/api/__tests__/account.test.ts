import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE, PATCH } from '../account/route'
import { createMockRequest } from './api-test-utils'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockBcryptCompare } = vi.hoisted(() => ({
  mockBcryptCompare: vi.fn().mockResolvedValue(true),
}))

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockPlayerFindUnique = vi.fn()
const mockPlayerUpdate = vi.fn()
const mockPlayerDelete = vi.fn()

const mockTransaction = vi.fn()
// Build a mock transaction client with the same shape as db
function makeTxMock() {
  return {
    xpLog: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    aIChatMessage: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    reactionScore: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    achievement: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    workoutSession: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    workoutSessionDrill: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    drillFavorite: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    trainingPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    trainingPlanDrill: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    drill: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    device: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    emailVerificationToken: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    twoFactorBackupCode: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    offlineAction: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    player: { delete: vi.fn().mockResolvedValue({ id: 'player-1' }) },
  }
}

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: (...args: unknown[]) => mockPlayerFindUnique(...args),
      update: (...args: unknown[]) => mockPlayerUpdate(...args),
      delete: (...args: unknown[]) => mockPlayerDelete(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
    xpLog: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    aIChatMessage: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    reactionScore: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    achievement: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    workoutSession: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    workoutSessionDrill: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    drillFavorite: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    trainingPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    trainingPlanDrill: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    drill: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    device: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    emailVerificationToken: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    twoFactorBackupCode: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    offlineAction: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}))

let mockRateLimitSuccess = true
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ success: mockRateLimitSuccess, retryAfterMs: 0 }),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authenticatedSession = {
  user: { id: 'player-1', email: 'test@test.com', name: 'Test' },
}

const existingPlayer = {
  id: 'player-1',
  password: '$hashed$',
  name: 'Test User',
  email: 'test@test.com',
  accountDeleted: false,
  deletedAt: null,
}

const softDeletedPlayer = {
  ...existingPlayer,
  accountDeleted: true,
  deletedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  email: 'deleted-player-1@anonymized.courtvision.ai',
}

const expiredDeletedPlayer = {
  ...softDeletedPlayer,
  deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimitSuccess = true
  mockBcryptCompare.mockResolvedValue(true)
  mockTransaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(makeTxMock()))
})

// ─── DELETE Tests ──────────────────────────────────────────────────────────────

describe('DELETE /api/account', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ password: 'pass' }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Authentification requise')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })
    const req = createMockRequest({ password: 'pass' }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited (1 per hour)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimitSuccess = false

    const req = createMockRequest({ password: 'pass' }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Trop de requêtes')
    expect(data.error).toContain('une heure')
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(null)

    const req = createMockRequest({ password: 'pass' }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Compte introuvable')
  })

  it('returns 400 when password is incorrect', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(existingPlayer)
    mockBcryptCompare.mockResolvedValue(false)

    const req = createMockRequest({ password: 'wrong-pass' }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Mot de passe incorrect')
  })

  it('performs soft delete by default and anonymizes data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(existingPlayer)
    mockPlayerUpdate.mockResolvedValue(existingPlayer)

    const req = createMockRequest({ password: 'correct-pass' }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('désactivé')
    expect(data.gracePeriodDays).toBe(30)
    expect(data.deletedAt).toBeDefined()

    expect(mockPlayerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'player-1' },
      }),
    )
    const updateCall = mockPlayerUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(updateCall.data.accountDeleted).toBe(true)
    expect(updateCall.data.name).toBe('Utilisateur supprimé')
    expect(updateCall.data.email as string).toContain('anonymized')
  })

  it('performs hard delete when hardDelete=true', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(existingPlayer)

    const req = createMockRequest({ password: 'pass', hardDelete: true }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('définitivement')
  })

  it('passes empty password string when password is undefined', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(existingPlayer)

    const req = createMockRequest({}, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    // Password undefined → bcrypt.compare('', ...) which returns true by default mock
    expect(res.status).toBe(200)
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockRejectedValue(new Error('DB down'))

    const req = createMockRequest({ password: 'pass' }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur interne du serveur')
  })

  it('returns 500 on transaction failure (hard delete)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(existingPlayer)
    mockTransaction.mockRejectedValue(new Error('Transaction failed'))

    const req = createMockRequest({ password: 'pass', hardDelete: true }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur interne du serveur')
  })
})

// ─── PATCH Tests ───────────────────────────────────────────────────────────────

describe('PATCH /api/account', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ action: 'reactivate' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid action', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({ action: 'delete' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Action invalide')
  })

  it('returns 400 when action field is missing', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({}, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Action invalide')
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(null)

    const req = createMockRequest({ action: 'reactivate' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Compte introuvable')
  })

  it('returns 200 with message when account is already active', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(existingPlayer)

    const req = createMockRequest({ action: 'reactivate' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('déjà actif')
  })

  it('successfully reactivates a soft-deleted account within grace period', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(softDeletedPlayer)
    mockPlayerUpdate.mockResolvedValue({ ...softDeletedPlayer, accountDeleted: false, deletedAt: null })

    const req = createMockRequest({ action: 'reactivate' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('réactivé')

    expect(mockPlayerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'player-1' },
      }),
    )
    const updateCall = mockPlayerUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(updateCall.data.accountDeleted).toBe(false)
    expect(updateCall.data.deletedAt).toBeNull()
  })

  it('returns 400 when grace period has expired (> 30 days)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(expiredDeletedPlayer)

    const req = createMockRequest({ action: 'reactivate' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('période de grâce')
  })

  it('handles player with null deletedAt gracefully', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      ...softDeletedPlayer,
      deletedAt: null,
    })
    mockPlayerUpdate.mockResolvedValue(softDeletedPlayer)

    const req = createMockRequest({ action: 'reactivate' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    // deletedAt is null → daysSinceDeletion check skipped → proceeds to reactivate
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('réactivé')
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockRejectedValue(new Error('DB error'))

    const req = createMockRequest({ action: 'reactivate' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur interne du serveur')
  })
})