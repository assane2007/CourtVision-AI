import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../player/route'
import { createMockRequest } from './api-test-utils'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockPlayerFindUnique = vi.fn()
const mockPlayerUpdate = vi.fn()
const mockPlayerDelete = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: (...args: unknown[]) => mockPlayerFindUnique(...args),
      update: (...args: unknown[]) => mockPlayerUpdate(...args),
      delete: (...args: unknown[]) => mockPlayerDelete(...args),
    },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authenticatedSession = {
  user: { id: 'player-1', email: 'test@test.com', name: 'Test' },
}

const fullOwnProfile = {
  id: 'player-1',
  email: 'test@test.com',
  name: 'Test',
  position: 'guard',
  level: 'intermediate',
  goals: 'shooting',
  onboarding: true,
  avatar: null,
  createdAt: '2025-01-01T00:00:00Z',
  xp: 1500,
  xpLevel: 5,
  subscriptionStatus: 'free',
  _count: { sessions: 10, favorites: 3, customDrills: 1, trainingPlans: 2 },
}

const publicProfileWithSessions = {
  id: 'player-2',
  name: 'Alice',
  bio: 'Basketball lover',
  position: 'forward',
  level: 'advanced',
  avatar: null,
  coverPhoto: null,
  xp: 3000,
  xpLevel: 10,
  city: 'Paris',
  country: 'France',
  createdAt: '2024-06-01T00:00:00Z',
  profilePublic: true,
  showActivity: true,
  sessions: [
    { id: 's1', totalScore: 85, totalReps: 20, totalDrills: 5, startedAt: '2025-01-10T10:00:00Z' },
  ],
}

const privateProfile = {
  ...publicProfileWithSessions,
  profilePublic: false,
}

const hiddenActivityProfile = {
  ...publicProfileWithSessions,
  profilePublic: true,
  showActivity: false,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimitSuccess = true
})

// ─── GET Tests ────────────────────────────────────────────────────────────────

describe('GET /api/player', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost:3000/api/player'))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET(new Request('http://localhost:3000/api/player'))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited (own profile)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimitSuccess = false

    const res = await GET(new Request('http://localhost:3000/api/player'))
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Trop de requêtes')
  })

  it('returns own full profile when no ?id param', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(fullOwnProfile)

    const res = await GET(new Request('http://localhost:3000/api/player'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('player-1')
    expect(data.email).toBe('test@test.com')
    expect(data._count).toBeDefined()
  })

  it('returns 404 when own profile not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost:3000/api/player'))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Joueur non trouvé')
  })

  it('returns public profile of another player via ?id=', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(publicProfileWithSessions)

    const res = await GET(new Request('http://localhost:3000/api/player?id=player-2'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('player-2')
    expect(data.sessions).toHaveLength(1)
  })

  it('returns 404 when target player not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost:3000/api/player?id=nonexistent'))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Joueur non trouvé')
  })

  it('hides sessions when profile is private (profilePublic=false)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(privateProfile)

    const res = await GET(new Request('http://localhost:3000/api/player?id=player-2'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sessions).toBeUndefined()
  })

  it('hides sessions when showActivity=false', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(hiddenActivityProfile)

    const res = await GET(new Request('http://localhost:3000/api/player?id=player-2'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sessions).toBeUndefined()
  })

  it('returns 429 when rate limited (target player)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimitSuccess = false

    const res = await GET(new Request('http://localhost:3000/api/player?id=player-2'))
    expect(res.status).toBe(429)
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockRejectedValue(new Error('DB connection lost'))

    const res = await GET(new Request('http://localhost:3000/api/player'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ─── PATCH Tests ───────────────────────────────────────────────────────────────

describe('PATCH /api/player', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ name: 'New Name' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimitSuccess = false

    const req = createMockRequest({ name: 'New Name' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Trop de requêtes')
  })

  it('returns 413 when body exceeds 1MB', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest(
      { name: 'New Name' },
      undefined,
      { 'content-length': String(1_000_001) },
      'PATCH',
    )
    const res = await PATCH(req)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error).toBe('Requête trop volumineuse')
  })

  it('returns 400 for invalid field (bad position)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ position: 'goalie' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Position invalide')
  })

  it('returns 400 for invalid field (bad level)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ level: 'expert' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Niveau invalide')
  })

  it('returns 400 for invalid goals', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ goals: 'yoga' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Objectif invalide')
  })

  it('successfully updates profile with valid data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerUpdate.mockResolvedValue({
      id: 'player-1',
      email: 'test@test.com',
      name: 'Updated Name',
      position: 'center',
      level: 'advanced',
      goals: 'defense',
      onboarding: true,
      avatar: null,
    })

    const req = createMockRequest(
      { name: 'Updated Name', position: 'center' },
      undefined,
      undefined,
      'PATCH',
    )
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Updated Name')
    expect(data.position).toBe('center')
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerUpdate.mockRejectedValue(new Error('Update failed'))

    const req = createMockRequest({ name: 'New' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ─── DELETE Tests ──────────────────────────────────────────────────────────────

describe('DELETE /api/player', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ confirmDelete: true }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 with strict rate limit (5/hour)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimitSuccess = false

    const req = createMockRequest({ confirmDelete: true }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Trop de tentatives de suppression')
  })

  it('returns 400 when confirmDelete is not true', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ confirmDelete: false }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Confirmation requise')
  })

  it('returns 400 when confirmDelete is missing', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({}, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Confirmation requise')
  })

  it('successfully deletes account with confirmDelete=true', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerDelete.mockResolvedValue({ id: 'player-1' })

    const req = createMockRequest({ confirmDelete: true }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.message).toBe('Compte supprimé')
  })

  it('returns 500 when database delete fails', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerDelete.mockRejectedValue(new Error('Foreign key constraint'))

    const req = createMockRequest({ confirmDelete: true }, undefined, undefined, 'DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })

  it('handles malformed JSON body gracefully', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    // Use a raw Request with invalid JSON
    const req = new NextRequest('http://localhost:3000/api/player', {
      method: 'DELETE',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await DELETE(req)
    // Body parse fails → body defaults to {} → confirmDelete !== true → 400
    expect(res.status).toBe(400)
  })
})