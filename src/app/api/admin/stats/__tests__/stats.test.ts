import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireAuth = vi.fn()

vi.mock('@/lib/guards/auth.guard', () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock('@/lib/middleware/error-handler', () => ({
  toErrorResponse: (err: unknown) => {
    const status = (err as { statusCode?: number })?.statusCode ?? 500
    const message =
      (err as { message?: string })?.message ?? 'Internal error'
    const code = (err as { code?: string })?.code ?? 'INTERNAL_ERROR'
    return new Response(
      JSON.stringify({ success: false, error: { code, message } }),
      { status, headers: { 'Content-Type': 'application/json' } },
    )
  },
  AppError: class extends Error {
    statusCode: number
    code: string
    constructor(code: string, message: string, _details?: unknown) {
      super(message)
      this.code = code
      // Map well-known codes to status codes
      const map: Record<string, number> = {
        AUTH_REQUIRED: 401,
        ADMIN_ONLY: 403,
        FORBIDDEN: 403,
      }
      this.statusCode = map[code] ?? 500
    }
  },
  ErrorCode: {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    ADMIN_ONLY: 'ADMIN_ONLY',
    FORBIDDEN: 'FORBIDDEN',
  },
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRequireAuth.mockReset()
  })

  it('returns 401 without auth', async () => {
    mockRequireAuth.mockRejectedValue({ statusCode: 401, message: 'Non autorisé' })
    const { GET } = await import('@/app/api/admin/stats/route')
    const res = await GET(new Request('http://localhost/api/admin/stats'), {
      params: Promise.resolve({}),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    mockRequireAuth.mockResolvedValue({
      playerId: 'p1', role: 'user', email: '', name: '', authLevel: 'basic',
    })
    const { GET } = await import('@/app/api/admin/stats/route')
    const res = await GET(new Request('http://localhost/api/admin/stats'), {
      params: Promise.resolve({}),
    })
    expect(res.status).toBe(403)
  })

  it('returns 200 with stats structure for admin', async () => {
    mockRequireAuth.mockResolvedValue({
      playerId: 'p1', role: 'admin', email: 'a@b.com', name: 'Admin', authLevel: 'verified',
    })
    const { GET } = await import('@/app/api/admin/stats/route')
    const res = await GET(new Request('http://localhost/api/admin/stats'), {
      params: Promise.resolve({}),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('overview')
    expect(body).toHaveProperty('signups30d')
    expect(body).toHaveProperty('aiUsageByType')
    expect(body).toHaveProperty('subscriptionDist')
    expect(body).toHaveProperty('recentSignups')
    expect(body).toHaveProperty('systemHealth')
  })
})