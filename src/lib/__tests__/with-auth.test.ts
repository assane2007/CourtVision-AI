import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    player: {
      findUnique: vi.fn(),
    },
  },
}))

// Import NextResponse so we can inspect responses
import { NextResponse } from 'next/server'
import { withAuth, withAdmin, withOptionalAuth } from '@/lib/with-auth'

describe('withAuth', () => {
  const req = new Request('http://localhost/api/test')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAuth(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Non autorisé')
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 401 when session exists but user.id is missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: 'Bob' } })

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAuth(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Non autorisé')
    expect(handler).not.toHaveBeenCalled()
  })

  it('calls handler with session when authenticated', async () => {
    const session = { user: { id: 'player-1', name: 'Alice', email: 'a@b.c' } }
    mockGetServerSession.mockResolvedValue(session)

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAuth(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(req, session, undefined)
    expect(body.ok).toBe(true)
  })

  it('passes through dynamic route context', async () => {
    const session = { user: { id: 'player-1', name: 'Alice' } }
    mockGetServerSession.mockResolvedValue(session)

    const context = { params: Promise.resolve({ id: 'drill-42' }) }
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAuth<{ params: Promise<{ id: string }> }>(handler)

    await wrapped(req, context)

    expect(handler).toHaveBeenCalledWith(req, session, context)
  })

  it('handler receives correct Session type (type safety smoke test)', async () => {
    const session = { user: { id: 'p1', name: 'X', email: 'x@y.z' } }
    mockGetServerSession.mockResolvedValue(session)

    // This test exists primarily for TypeScript compilation —
    // if the types are wrong this won't compile.
    const handler = async (_req: Request, sess: typeof session, _ctx: void) => {
      // Access session properties to verify type
      const userId: string = sess.user.id
      return NextResponse.json({ userId })
    }

    const wrapped = withAuth(handler)
    const res = await wrapped(req)
    const body = await res.json()

    expect(body.userId).toBe('p1')
  })
})

describe('withAdmin', () => {
  const req = new Request('http://localhost/api/admin/test')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAdmin(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Non autorisé')
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not admin', async () => {
    const session = { user: { id: 'player-1', name: 'Bob' } }
    mockGetServerSession.mockResolvedValue(session)

    // Mock db to return a non-admin player
    const { db } = await import('@/lib/db')
    vi.mocked(db.player.findUnique).mockResolvedValue({ role: 'player' } as never)

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAdmin(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Accès non autorisé')
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 when player not found in db', async () => {
    const session = { user: { id: 'ghost', name: 'Ghost' } }
    mockGetServerSession.mockResolvedValue(session)

    const { db } = await import('@/lib/db')
    vi.mocked(db.player.findUnique).mockResolvedValue(null)

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAdmin(handler)

    const res = await wrapped(req)

    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('calls handler when user has admin role', async () => {
    const session = { user: { id: 'admin-1', name: 'Admin' } }
    mockGetServerSession.mockResolvedValue(session)

    const { db } = await import('@/lib/db')
    vi.mocked(db.player.findUnique).mockResolvedValue({ role: 'admin' } as never)

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withAdmin(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(req, session, undefined)
    expect(body.ok).toBe(true)
  })
})

describe('withOptionalAuth', () => {
  const req = new Request('http://localhost/api/optional')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls handler with null session when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const handler = vi.fn().mockImplementation((_req, session) => {
      return NextResponse.json({ isAuthenticated: session !== null })
    })
    const wrapped = withOptionalAuth(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(req, null, undefined)
    expect(body.isAuthenticated).toBe(false)
  })

  it('calls handler with session when authenticated', async () => {
    const session = { user: { id: 'player-1', name: 'Alice' } }
    mockGetServerSession.mockResolvedValue(session)

    const handler = vi.fn().mockImplementation((_req, session) => {
      return NextResponse.json({
        isAuthenticated: session !== null,
        userId: session?.user?.id,
      })
    })
    const wrapped = withOptionalAuth(handler)

    const res = await wrapped(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(req, session, undefined)
    expect(body.isAuthenticated).toBe(true)
    expect(body.userId).toBe('player-1')
  })

  it('passes through context to handler', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const context = { params: Promise.resolve({ id: 'item-99' }) }
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = withOptionalAuth<{ params: Promise<{ id: string }> }>(handler)

    await wrapped(req, context)

    expect(handler).toHaveBeenCalledWith(req, null, context)
  })
})