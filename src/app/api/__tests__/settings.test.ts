import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '../settings/route';
import { createMockRequest } from './api-test-utils';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockPlayerFindUnique = vi.fn()
const mockPlayerUpdate = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: (...args: unknown[]) => mockPlayerFindUnique(...args),
      update: (...args: unknown[]) => mockPlayerUpdate(...args),
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

const settingsData = {
  weeklyGoalSessions: 4,
  weeklyGoalReps: 150,
  preferredRestSec: 30,
  soundEnabled: true,
  hapticsEnabled: false,
  language: 'fr',
  notifStreak: true,
  notifChallenge: false,
  notifAchievement: true,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimitSuccess = true
})

// ─── GET Tests ────────────────────────────────────────────────────────────────

describe('GET /api/settings', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost:3000/api/settings'))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET(new Request('http://localhost:3000/api/settings'))
    expect(res.status).toBe(401)
  })

  it('returns user settings on success', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(settingsData)

    const res = await GET(new Request('http://localhost:3000/api/settings'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings).toBeDefined()
    expect(data.settings.weeklyGoalSessions).toBe(4)
    expect(data.settings.language).toBe('fr')
    expect(data.settings.soundEnabled).toBe(true)
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost:3000/api/settings'))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Joueur introuvable')
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerFindUnique.mockRejectedValue(new Error('DB connection lost'))

    const res = await GET(new Request('http://localhost:3000/api/settings'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ─── PATCH Tests ───────────────────────────────────────────────────────────────

describe('PATCH /api/settings', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ language: 'en' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 413 when body exceeds 10KB', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest(
      { language: 'en' },
      undefined,
      { 'content-length': '10001' },
      'PATCH',
    )
    const res = await PATCH(req)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.error).toBe('Requête trop volumineuse.')
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockRateLimitSuccess = false

    const req = createMockRequest({ language: 'en' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Trop de requêtes')
  })

  it('returns 400 for empty body (no fields)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({}, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Au moins un champ est requis.')
  })

  it('returns 400 for invalid position', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ position: 'goalie' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Position invalide')
  })

  it('returns 400 for invalid language', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ language: 'de' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('fr')
    expect(data.error).toContain('en')
  })

  it('returns 400 for invalid weeklyGoalSessions (0)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ weeklyGoalSessions: 0 }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid weeklyGoalReps (> 500)', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)

    const req = createMockRequest({ weeklyGoalReps: 501 }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('successfully updates settings with valid data', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerUpdate.mockResolvedValue({
      ...settingsData,
      language: 'en',
      weeklyGoalSessions: 5,
    })

    const req = createMockRequest(
      { language: 'en', weeklyGoalSessions: 5 },
      undefined,
      undefined,
      'PATCH',
    )
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings.language).toBe('en')
    expect(data.settings.weeklyGoalSessions).toBe(5)

    // Verify update was called with correct data
    expect(mockPlayerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'player-1' },
      }),
    )
  })

  it('successfully updates notification preferences', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerUpdate.mockResolvedValue({
      ...settingsData,
      notifStreak: false,
      notifChallenge: true,
    })

    const req = createMockRequest(
      { notifStreak: false, notifChallenge: true },
      undefined,
      undefined,
      'PATCH',
    )
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings.notifStreak).toBe(false)
    expect(data.settings.notifChallenge).toBe(true)
  })

  it('successfully updates rest and sound settings', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerUpdate.mockResolvedValue({
      ...settingsData,
      preferredRestSec: 60,
      soundEnabled: false,
      hapticsEnabled: true,
    })

    const req = createMockRequest(
      { preferredRestSec: 60, soundEnabled: false, hapticsEnabled: true },
      undefined,
      undefined,
      'PATCH',
    )
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.settings.preferredRestSec).toBe(60)
    expect(data.settings.soundEnabled).toBe(false)
    expect(data.settings.hapticsEnabled).toBe(true)
  })

  it('returns 500 on database error', async () => {
    mockGetServerSession.mockResolvedValue(authenticatedSession)
    mockPlayerUpdate.mockRejectedValue(new Error('Update failed'))

    const req = createMockRequest({ language: 'en' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})