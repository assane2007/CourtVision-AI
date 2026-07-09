import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

const mockDb = {
  player: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

const mockStripeCreate = vi.fn().mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/c/cs_test_123' })
const mockCustomerCreate = vi.fn().mockResolvedValue({ id: 'cus_existing' })

vi.mock('stripe', () => {
  function MockStripe(this: unknown) {
    return {
      customers: { create: (...args: unknown[]) => mockCustomerCreate(...args) },
      checkout: {
        sessions: { create: (...args: unknown[]) => mockStripeCreate(...args) },
      },
    }
  }
  return { default: MockStripe }
})

const authedSession = { user: { id: 'p1', email: 't@t.com' } }

function allowRateLimit() {
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeNextRequest(url: string, body?: unknown): Request {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new Request(new URL(url, 'http://localhost:3000'), init)
}

// ── POST /api/stripe/checkout ─────────────────────────────────────────────────

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
    vi.unstubAllEnvs()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const res = await POST(makeNextRequest('/api/stripe/checkout', { priceId: 'pro_monthly' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns demo URL when Stripe is not configured', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')

    vi.resetModules()
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const res = await POST(makeNextRequest('/api/stripe/checkout', { priceId: 'pro_monthly' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain('demo_checkout=1')
    expect(body.url).toContain('plan=pro_monthly')
  })

  it('returns 400 for invalid priceId', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)

    vi.resetModules()
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const res = await POST(makeNextRequest('/api/stripe/checkout', { priceId: 'invalid_plan' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('invalide')
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const res = await POST(makeNextRequest('/api/stripe/checkout', { priceId: 'pro_monthly' }))
    expect(res.status).toBe(429)
  })

  it('returns checkout URL when Stripe is configured', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake_key')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')

    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'p1',
      email: 't@t.com',
      name: 'Test Player',
      stripeCustomerId: 'cus_existing',
    })

    vi.resetModules()
    const { POST } = await import('@/app/api/stripe/checkout/route')
    const res = await POST(makeNextRequest('/api/stripe/checkout', { priceId: 'elite_annual' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://checkout.stripe.com/c/cs_test_123')

    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        mode: 'subscription',
        metadata: expect.objectContaining({ tier: 'elite' }),
      }),
    )
  })

  it('creates new Stripe customer if none exists', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake_key')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')

    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'p1',
      email: 't@t.com',
      name: 'Test Player',
      stripeCustomerId: null,
    })
    ;(mockDb.player.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    vi.resetModules()
    const mod = await import('@/app/api/stripe/checkout/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const res = await mod.POST(makeNextRequest('/api/stripe/checkout', { priceId: 'pro_monthly' }))
    expect(res.status).toBe(200)

    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 't@t.com',
        name: 'Test Player',
      }),
    )

    expect(db.player.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { stripeCustomerId: 'cus_existing' },
      }),
    )
  })
})