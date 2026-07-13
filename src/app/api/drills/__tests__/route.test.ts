import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn()
const mockCount = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    drill: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    drillFavorite: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })) },
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ success: true })),
}))

vi.mock('@/lib/cache', () => ({
  withCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

describe('GET /api/drills', () => {
  let GET: (req: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const route = await import('@/app/api/drills/route')
    GET = route.GET as (req: Request) => Promise<Response>
  })

  function makeRequest(url = '/api/drills'): Request {
    return new Request(`http://localhost${url}`)
  }

  it('returns 200 with array of drills', async () => {
    mockFindMany.mockResolvedValue([
      { id: '1', nameFr: 'Tir', name: 'Shot', category: 'shooting', difficulty: 'beginner', descriptionFr: '', description: '', instructionsFr: '', instructions: '', durationSec: 60, targetReps: 10, icon: '🏀', isCustom: false },
    ])
    mockCount.mockResolvedValue(1)

    const res = await GET(makeRequest())
    const data = await res.json() as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(Array.isArray(data.drills)).toBe(true)
  })

  it('passes category and difficulty filters to findMany', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await GET(makeRequest('/api/drills?category=shooting&difficulty=beginner'))

    const callArgs = mockFindMany.mock.calls[0][0] as Record<string, unknown>
    expect(JSON.stringify(callArgs)).toContain('shooting')
  })

  it('respects limit param', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await GET(makeRequest('/api/drills?limit=5'))

    const callArgs = mockFindMany.mock.calls[0][0] as Record<string, unknown>
    expect(callArgs.take).toBe(6)
  })

  it('returns 500 on database error', async () => {
    mockFindMany.mockRejectedValue(new Error('DB down'))

    const res = await GET(makeRequest())
    const data = await res.json() as Record<string, unknown>

    expect(res.status).toBe(500)
    expect(data.error).toBeDefined()
  })
})