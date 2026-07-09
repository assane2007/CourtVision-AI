import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH, DELETE } from '../videos/[id]/route'
import { createMockRequest } from './api-test-utils'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockVideoFindFirst = vi.fn()
const mockVideoFindUnique = vi.fn()
const mockVideoUpdate = vi.fn()
const mockVideoDelete = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    video: {
      findFirst: (...args: unknown[]) => mockVideoFindFirst(...args),
      findUnique: (...args: unknown[]) => mockVideoFindUnique(...args),
      update: (...args: unknown[]) => mockVideoUpdate(...args),
      delete: (...args: unknown[]) => mockVideoDelete(...args),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ success: true, retryAfterMs: 0 }),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual,
    unlink: vi.fn().mockResolvedValue(undefined),
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ownerSession = {
  user: { id: 'owner-123', email: 'owner@test.com', name: 'Owner' },
}

const otherSession = {
  user: { id: 'other-456', email: 'other@test.com', name: 'Other' },
}

const testVideoId = 'video-abc-123'

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeOwnerVideo(overrides: Record<string, unknown> = {}) {
  return {
    id: testVideoId,
    playerId: 'owner-123',
    title: 'My Dunk',
    description: 'A great dunk',
    url: 'uploads/videos/video-abc-123.mp4',
    thumbnailUrl: 'uploads/thumbs/video-abc-123.jpg',
    durationSec: 30,
    isPublic: false,
    viewCount: 5,
    tags: '["dunk","highlight"]',
    createdAt: new Date(),
    updatedAt: new Date(),
    player: { id: 'owner-123', name: 'Owner', avatar: null },
    annotations: [],
    highlights: [],
    exports: [],
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/videos/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/videos/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Non autorisé')
  })

  it('returns 401 when session has no user.id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'a@b.com' } })
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(401)
  })

  it('returns 404 when video not found', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindFirst.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Vidéo introuvable')
  })

  it('returns 404 when video belongs to another user and is not public', async () => {
    mockGetServerSession.mockResolvedValue(otherSession)
    mockVideoFindFirst.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(404)
  })

  it('returns video with all relations when owner requests', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindFirst.mockResolvedValue(makeOwnerVideo())
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.video).toBeDefined()
    expect(data.video.id).toBe(testVideoId)
    expect(data.video.player).toBeDefined()
    expect(data.video.annotations).toBeDefined()
    expect(data.video.highlights).toBeDefined()
    expect(data.video.exports).toBeDefined()
  })

  it('returns a public video owned by another user', async () => {
    mockGetServerSession.mockResolvedValue(otherSession)
    mockVideoFindFirst.mockResolvedValue(makeOwnerVideo({ isPublic: true }))
    mockVideoUpdate.mockResolvedValue({})
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.video.id).toBe(testVideoId)
  })

  it('increments view count for non-owners viewing public video', async () => {
    mockGetServerSession.mockResolvedValue(otherSession)
    mockVideoFindFirst.mockResolvedValue(makeOwnerVideo({ isPublic: true, playerId: 'owner-123' }))
    mockVideoUpdate.mockResolvedValue({})
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    // The update should be called to increment view count
    expect(mockVideoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testVideoId },
        data: { viewCount: { increment: 1 } },
      })
    )
  })

  it('does not increment view count for owner', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindFirst.mockResolvedValue(makeOwnerVideo())
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    // update should NOT be called since user is the owner
    expect(mockVideoUpdate).not.toHaveBeenCalled()
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindFirst.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest()
    const res = await GET(req, makeParams(testVideoId))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/videos/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/videos/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest({ title: 'New Title' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(401)
  })

  it('returns 404 when video not found', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue(null)
    const req = createMockRequest({ title: 'New Title' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Vidéo introuvable')
  })

  it('returns 404 when video belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(otherSession)
    mockVideoFindUnique.mockResolvedValue({ playerId: 'owner-123' })
    const req = createMockRequest({ title: 'New Title' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(404)
  })

  it('returns 400 when title is empty string', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({ playerId: 'owner-123' })
    const req = createMockRequest({ title: '   ' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Titre invalide')
  })

  it('returns 400 when title is not a string', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({ playerId: 'owner-123' })
    const req = createMockRequest({ title: 123 }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Titre invalide')
  })

  it('successfully updates title and description', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({ playerId: 'owner-123' })
    mockVideoUpdate.mockResolvedValue(makeOwnerVideo({ title: 'Updated Title', description: 'Updated desc' }))
    const req = createMockRequest(
      { title: 'Updated Title', description: 'Updated desc' },
      undefined, undefined, 'PATCH'
    )
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.video).toBeDefined()
    expect(mockVideoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: testVideoId },
      })
    )
  })

  it('successfully updates isPublic flag', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({ playerId: 'owner-123' })
    mockVideoUpdate.mockResolvedValue(makeOwnerVideo({ isPublic: true }))
    const req = createMockRequest({ isPublic: true }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.video).toBeDefined()
  })

  it('trims title to max 200 characters', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({ playerId: 'owner-123' })
    mockVideoUpdate.mockImplementation((args: { data: Record<string, unknown> }) => {
      // Check that title is sliced
      expect((args.data.title as string).length).toBeLessThanOrEqual(200)
      return Promise.resolve(makeOwnerVideo())
    })
    const longTitle = 'A'.repeat(300)
    const req = createMockRequest({ title: longTitle }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
  })

  it('returns 500 on unexpected error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest({ title: 'Test' }, undefined, undefined, 'PATCH')
    const res = await PATCH(req, makeParams(testVideoId))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/videos/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/videos/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(401)
  })

  it('returns 404 when video not found', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue(null)
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Vidéo introuvable')
  })

  it('returns 404 when video belongs to another user', async () => {
    mockGetServerSession.mockResolvedValue(otherSession)
    mockVideoFindUnique.mockResolvedValue({ playerId: 'owner-123', url: '/uploads/video.mp4', thumbnailUrl: null })
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(404)
  })

  it('returns 400 for path traversal attack on url', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    // Path traversal: url points outside public dir
    mockVideoFindUnique.mockResolvedValue({
      playerId: 'owner-123',
      url: '/../../etc/passwd',
      thumbnailUrl: null,
    })
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Chemin invalide')
  })

  it('returns 400 for path traversal attack on thumbnailUrl', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({
      playerId: 'owner-123',
      url: '/uploads/videos/safe.mp4',
      thumbnailUrl: '/../../etc/shadow',
    })
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Chemin invalide')
  })

  it('successfully deletes video and returns success', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({
      playerId: 'owner-123',
      url: 'uploads/videos/safe-video.mp4',
      thumbnailUrl: 'uploads/thumbs/safe-thumb.jpg',
    })
    mockVideoDelete.mockResolvedValue(makeOwnerVideo())
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockVideoDelete).toHaveBeenCalledWith({ where: { id: testVideoId } })
  })

  it('successfully deletes video with no thumbnail', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({
      playerId: 'owner-123',
      url: 'uploads/videos/video.mp4',
      thumbnailUrl: null,
    })
    mockVideoDelete.mockResolvedValue(makeOwnerVideo())
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('returns 500 on unexpected DB error', async () => {
    mockGetServerSession.mockResolvedValue(ownerSession)
    mockVideoFindUnique.mockResolvedValue({
      playerId: 'owner-123',
      url: 'uploads/videos/video.mp4',
      thumbnailUrl: null,
    })
    mockVideoDelete.mockRejectedValue(new Error('DB crash'))
    const req = createMockRequest()
    const res = await DELETE(req, makeParams(testVideoId))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Erreur serveur')
  })
})