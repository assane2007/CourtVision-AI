import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../auth/signup/route'
import { createMockRequest } from './api-test-utils'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

const mockBcryptHash = vi.fn().mockResolvedValue('$hashed')
vi.mock('bcryptjs', () => ({
  default: { hash: (...args: unknown[]) => mockBcryptHash(...args), compare: vi.fn() },
}))

const mockPlayerFindUnique = vi.fn()
const _mockTransaction = vi.fn()
const mockPlayerCreate = vi.fn()
const mockAchievementCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: (...args: unknown[]) => mockPlayerFindUnique(...args),
      create: (...args: unknown[]) => mockPlayerCreate(...args),
    },
    achievement: {
      create: (...args: unknown[]) => mockAchievementCreate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        player: { create: (...args: unknown[]) => mockPlayerCreate(...args) },
        achievement: { create: (...args: unknown[]) => mockAchievementCreate(...args) },
      }),
  },
}))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
})

describe('POST /api/auth/signup', () => {
  it('returns 413 when payload too large', async () => {
    const req = createMockRequest(
      { email: 'a@b.com', password: 'Password1', name: 'Test' },
      undefined,
      { 'content-length': '2000000' },
      'POST',
    )
    const res = await POST(req)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error).toContain('trop volumineuse')
  })

  it('returns 400 when email is missing', async () => {
    const req = createMockRequest({ password: 'Password1', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('returns 400 when password is missing', async () => {
    const req = createMockRequest({ email: 'test@test.com', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('returns 400 when name is missing', async () => {
    const req = createMockRequest({ email: 'test@test.com', password: 'Password1' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('returns 400 when email is invalid', async () => {
    const req = createMockRequest({ email: 'not-an-email', password: 'Password1', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Email')
  })

  it('returns 400 when password is too short', async () => {
    const req = createMockRequest({ email: 'test@test.com', password: 'Short1', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('8')
  })

  it('returns 400 when password lacks uppercase', async () => {
    const req = createMockRequest({ email: 'test@test.com', password: 'password1', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('majuscule')
  })

  it('returns 400 when password lacks number', async () => {
    const req = createMockRequest({ email: 'test@test.com', password: 'Passwordx', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('chiffre')
  })

  it('returns 400 when name is too short', async () => {
    const req = createMockRequest({ email: 'test@test.com', password: 'Password1', name: 'A' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('nom')
  })

  it('returns 409 when email already exists', async () => {
    mockPlayerFindUnique.mockResolvedValue({ id: 'existing', email: 'test@test.com' })
    const req = createMockRequest({ email: 'test@test.com', password: 'Password1', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(409)
    const data = await res.json()
    // Generic message to prevent enumeration
    expect(data.error).toBeDefined()
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })
    const req = createMockRequest({ email: 'test@test.com', password: 'Password1', name: 'Test' }, undefined, {}, 'POST')
    const res = await POST(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('15 minutes')
  })

  it('returns 201 and creates player on success', async () => {
    mockPlayerFindUnique.mockResolvedValue(null)
    mockPlayerCreate.mockResolvedValue({
      id: 'new-player-id',
      email: 'test@test.com',
      name: 'Test User',
      onboarding: false,
    })
    mockAchievementCreate.mockResolvedValue({})

    const req = createMockRequest(
      { email: 'test@test.com', password: 'Password1', name: 'Test User' },
      undefined,
      {},
      'POST',
    )
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('new-player-id')
    expect(data.email).toBe('test@test.com')
    expect(data.name).toBe('Test User')
    expect(data).not.toHaveProperty('password')
  })

  it('calls bcrypt.hash with password and salt rounds 12', async () => {
    mockPlayerFindUnique.mockResolvedValue(null)
    mockPlayerCreate.mockResolvedValue({
      id: 'new-id',
      email: 'test@test.com',
      name: 'Test',
      onboarding: false,
    })
    mockAchievementCreate.mockResolvedValue({})

    const req = createMockRequest(
      { email: 'test@test.com', password: 'Password1', name: 'Test' },
      undefined,
      {},
      'POST',
    )
    await POST(req)

    expect(mockBcryptHash).toHaveBeenCalledWith('Password1', 12)
  })

  it('creates first_login achievement within transaction', async () => {
    mockPlayerFindUnique.mockResolvedValue(null)
    mockPlayerCreate.mockResolvedValue({
      id: 'new-id',
      email: 'test@test.com',
      name: 'Test',
      onboarding: false,
    })
    mockAchievementCreate.mockResolvedValue({})

    const req = createMockRequest(
      { email: 'test@test.com', password: 'Password1', name: 'Test' },
      undefined,
      {},
      'POST',
    )
    await POST(req)

    expect(mockAchievementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'first_login',
          title: 'Premier Pas',
        }),
      }),
    )
  })

  it('returns 500 on database error', async () => {
    mockPlayerFindUnique.mockRejectedValue(new Error('DB connection lost'))
    const req = createMockRequest(
      { email: 'test@test.com', password: 'Password1', name: 'Test' },
      undefined,
      {},
      'POST',
    )
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})