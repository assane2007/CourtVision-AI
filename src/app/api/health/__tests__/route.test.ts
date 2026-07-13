import { describe, it, expect, vi, beforeEach } from 'vitest';
 vi.mock('@/lib/monitoring/health', () => ({
  runHealthChecks: vi.fn(),
}))

vi.mock('@/lib/monitoring/alerts', () => ({
  evaluateAlerts: vi.fn(() => []),
}))

describe('GET /api/health', () => {
  let GET: (req: Request) => Promise<Response>
  let mockedRunHealthChecks: ReturnType<typeof vi.mocked<typeof import('@/lib/monitoring/health').runHealthChecks>>

  beforeEach(async () => {
    vi.clearAllMocks()
    const healthMod = await import('@/lib/monitoring/health')
    mockedRunHealthChecks = vi.mocked(healthMod.runHealthChecks)
    const route = await import('@/app/api/health/route')
    GET = route.GET as (req: Request) => Promise<Response>
  })

  function makeRequest(url = '/api/health'): Request {
    return new Request(url, { headers: { host: 'localhost' } })
  }

  it('returns 200 with status "ok" when healthy', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'healthy',
      timestamp: '2025-01-01T00:00:00.000Z',
      uptime: 12345,
      version: '1.0.0',
      checks: { database: { status: 'healthy' } },
    })

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe('ok')
  })

  it('returns timestamp and version info', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'healthy',
      timestamp: '2025-06-15T12:00:00Z',
      uptime: 9999,
      version: '2.3.4',
      checks: { database: { status: 'healthy' } },
    })

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(data.timestamp).toBe('2025-06-15T12:00:00Z')
    expect(data.version).toBe('2.3.4')
    expect(data.uptime).toBe(9999)
  })

  it('returns db status as "connected" when database is healthy', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'healthy',
      timestamp: '2025-01-01T00:00:00.000Z',
      uptime: 100,
      version: '1.0.0',
      checks: { database: { status: 'healthy' } },
    })

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(data.db).toBe('connected')
  })

  it('returns 503 and status "error" when unhealthy', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'unhealthy',
      timestamp: '2025-01-01T00:00:00.000Z',
      uptime: 0,
      version: '1.0.0',
      checks: { database: { status: 'unhealthy' } },
    })

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(data.status).toBe('error')
    expect(data.db).toBe('error')
  })

  it('sets Cache-Control to no-store', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'healthy',
      timestamp: '2025-01-01T00:00:00.000Z',
      uptime: 1,
      version: '1.0.0',
      checks: {},
    })

    const res = await GET(makeRequest())

    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})