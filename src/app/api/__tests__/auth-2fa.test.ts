import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../auth/2fa/verify/route'
import { createMockRequest } from './api-test-utils'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

const mockAuthenticatorVerify = vi.fn()
vi.mock('otplib', () => ({
  authenticator: {
    verify: (...args: unknown[]) => mockAuthenticatorVerify(...args),
    options: {},
  },
}))

const mockPlayerFindUnique = vi.fn()
const mockPlayerUpdate = vi.fn()
const mockBackupCodeFindFirst = vi.fn()
const mockBackupCodeUpdate = vi.fn()
const mockBackupCodeDeleteMany = vi.fn()
const mockBackupCodeCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: (...args: unknown[]) => mockPlayerFindUnique(...args),
      update: (...args: unknown[]) => mockPlayerUpdate(...args),
    },
    twoFactorBackupCode: {
      findFirst: (...args: unknown[]) => mockBackupCodeFindFirst(...args),
      update: (...args: unknown[]) => mockBackupCodeUpdate(...args),
      deleteMany: (...args: unknown[]) => mockBackupCodeDeleteMany(...args),
      create: (...args: unknown[]) => mockBackupCodeCreate(...args),
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

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>()
  const mockCrypto = { ...actual, randomBytes: () => ({ toString: () => 'aabbcc' }) }
  return { ...mockCrypto, default: mockCrypto }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authenticatedSession = {
  user: { id: 'player-1', email: 'test@test.com', name: 'Test' },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
})

describe('POST /api/auth/2fa/verify', () => {
  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ code: '123456' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Authentification requise')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })
    const req = createMockRequest({ code: '123456' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when code is missing', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({}, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Code requis')
  })

  it('returns 400 when code is not a string', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    const req = createMockRequest({ code: 123456 }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Code requis')
  })

  it('returns 400 when 2FA not configured (no secret)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      id: 'player-1',
      twoFactorSecret: null,
      twoFactorEnabled: false,
    })
    const req = createMockRequest({ code: '123456' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('2FA non configurée')
  })

  it('returns 400 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(null)
    const req = createMockRequest({ code: '123456' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('2FA non configurée')
  })

  it('returns 400 when TOTP code is invalid and no backup code', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      id: 'player-1',
      twoFactorSecret: 'SECRET123',
      twoFactorEnabled: false,
    })
    mockAuthenticatorVerify.mockReturnValue(false)
    mockBackupCodeFindFirst.mockResolvedValue(null)

    const req = createMockRequest({ code: '000000' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Code invalide')
  })

  it('returns 200 with valid TOTP code', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      id: 'player-1',
      twoFactorSecret: 'SECRET123',
      twoFactorEnabled: true,
    })
    mockAuthenticatorVerify.mockReturnValue(true)

    const req = createMockRequest({ code: '654321' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Code valide')
    expect(data.valid).toBe(true)
  })

  it('returns 200 when backup code is used and marks it used', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      id: 'player-1',
      twoFactorSecret: 'SECRET123',
      twoFactorEnabled: true,
    })
    mockAuthenticatorVerify.mockReturnValue(false)
    mockBackupCodeFindFirst.mockResolvedValue({
      id: 'backup-1',
      playerId: 'player-1',
      code: 'AABBCC',
      used: false,
    })
    mockBackupCodeUpdate.mockResolvedValue({})

    const req = createMockRequest({ code: 'AABBCC' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('secours')
    expect(data.isBackupCode).toBe(true)
    expect(mockBackupCodeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'backup-1' },
        data: expect.objectContaining({ used: true }),
      }),
    )
  })

  it('returns 200 with backupCodes on setup action', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      id: 'player-1',
      twoFactorSecret: 'SECRET123',
      twoFactorEnabled: false,
    })
    mockAuthenticatorVerify.mockReturnValue(true)
    mockPlayerUpdate.mockResolvedValue({ id: 'player-1', twoFactorEnabled: true })
    mockBackupCodeDeleteMany.mockResolvedValue({ count: 0 })
    mockBackupCodeCreate.mockResolvedValue({})

    const req = createMockRequest({ code: '654321', action: 'setup' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('activée')
    expect(data.twoFactorEnabled).toBe(true)
    expect(data.backupCodes).toBeDefined()
    expect(Array.isArray(data.backupCodes)).toBe(true)
  })

  it('enables 2FA on player when action is setup', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      id: 'player-1',
      twoFactorSecret: 'SECRET123',
      twoFactorEnabled: false,
    })
    mockAuthenticatorVerify.mockReturnValue(true)
    mockPlayerUpdate.mockResolvedValue({ id: 'player-1', twoFactorEnabled: true })
    mockBackupCodeDeleteMany.mockResolvedValue({ count: 0 })
    mockBackupCodeCreate.mockResolvedValue({})

    const req = createMockRequest({ code: '654321', action: 'setup' }, undefined, {}, 'POST')
    await POST(req)

    expect(mockPlayerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'player-1' },
        data: { twoFactorEnabled: true },
      }),
    )
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 30000 })
    const req = createMockRequest({ code: '123456' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('une minute')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockRejectedValue(new Error('DB down'))

    const req = createMockRequest({ code: '123456' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })

  it('calls authenticator.verify with correct token and secret', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue({
      id: 'player-1',
      twoFactorSecret: 'MYSECRET',
      twoFactorEnabled: true,
    })
    mockAuthenticatorVerify.mockReturnValue(true)

    const req = createMockRequest({ code: '999999' }, undefined, {}, 'POST')
    await POST(req)

    expect(mockAuthenticatorVerify).toHaveBeenCalledWith({
      token: '999999',
      secret: 'MYSECRET',
    })
  })
})