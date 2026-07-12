import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config so Redis is never used — forces memory strategy
vi.mock('@/lib/config', () => ({
  config: {
    redis: { url: undefined, isEnabled: false },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('RateLimiter (memory strategy)', () => {
  let limiter: InstanceType<typeof import('@/lib/security/rate-limiter').RateLimiter>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    const { RateLimiter } = await import('@/lib/security/rate-limiter')
    limiter = new RateLimiter('memory')
  })

  afterEach(() => {
    vi.useRealTimers()
    // Clean up the limiter's internal timer
    return limiter.destroy()
  })

  // ── check method ──────────────────────────────────────────────────────────

  describe('check', () => {
    it('allows the first request and returns correct headers', async () => {
      const result = await limiter.check('user-1', 'api')
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(60)
      expect(result.remaining).toBe(59) // 60 - 1 (just used)
      expect(result.resetMs).toBeGreaterThan(Date.now())
      expect(result.retryAfterMs).toBeUndefined()
    })

    it('counts requests correctly across multiple calls', async () => {
      // Use a custom config with a low limit for easy testing
      const customConfig = { max: 3, windowMs: 60_000 }
      const r1 = await limiter.check('user-a', customConfig)
      expect(r1.allowed).toBe(true)
      expect(r1.remaining).toBe(2)

      const r2 = await limiter.check('user-a', customConfig)
      expect(r2.allowed).toBe(true)
      expect(r2.remaining).toBe(1)

      const r3 = await limiter.check('user-a', customConfig)
      expect(r3.allowed).toBe(true)
      expect(r3.remaining).toBe(0)
    })

    it('blocks requests when limit is exceeded', async () => {
      const customConfig = { max: 2, windowMs: 60_000 }

      await limiter.check('user-b', customConfig)
      await limiter.check('user-b', customConfig)

      const blocked = await limiter.check('user-b', customConfig)
      expect(blocked.allowed).toBe(false)
      expect(blocked.remaining).toBe(0)
      expect(blocked.retryAfterMs).toBeDefined()
      expect(blocked.retryAfterMs!).toBeGreaterThan(0)
    })

    it('tracks different identifiers independently', async () => {
      const customConfig = { max: 1, windowMs: 60_000 }

      const r1 = await limiter.check('user-x', customConfig)
      expect(r1.allowed).toBe(true)

      const r2 = await limiter.check('user-x', customConfig)
      expect(r2.allowed).toBe(false)

      // Different user should still be allowed
      const r3 = await limiter.check('user-y', customConfig)
      expect(r3.allowed).toBe(true)
    })

    it('accepts preset config names', async () => {
      const authResult = await limiter.check('ip-1', 'auth')
      expect(authResult.limit).toBe(5)
      expect(authResult.allowed).toBe(true)

      const publicResult = await limiter.check('ip-1', 'public')
      expect(publicResult.limit).toBe(120)

      const sensitiveResult = await limiter.check('ip-1', 'sensitive')
      expect(sensitiveResult.limit).toBe(3)
      expect(sensitiveResult.allowed).toBe(true)
    })

    it('resets the counter after the window expires', async () => {
      const customConfig = { max: 1, windowMs: 1000 }

      const r1 = await limiter.check('user-w', customConfig)
      expect(r1.allowed).toBe(true)

      const r2 = await limiter.check('user-w', customConfig)
      expect(r2.allowed).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(1100)

      const r3 = await limiter.check('user-w', customConfig)
      expect(r3.allowed).toBe(true)
      expect(r3.remaining).toBe(0)
    })

    it('returns remaining of 0 when at the limit', async () => {
      const customConfig = { max: 1, windowMs: 60_000 }
      const result = await limiter.check('user-z', customConfig)
      expect(result.remaining).toBe(0) // 1 - 1 = 0
    })
  })

  // ── limit method ──────────────────────────────────────────────────────────

  describe('limit', () => {
    it('returns allowed: true with headers when under limit', async () => {
      const result = await limiter.limit('user-1', 'api')
      expect(result.allowed).toBe(true)
      if (result.allowed) {
        expect(result.headers['X-RateLimit-Limit']).toBe('60')
        expect(result.headers['X-RateLimit-Remaining']).toBe('59')
        expect(result.headers['X-RateLimit-Reset']).toBeDefined()
        expect(result.headers['Retry-After']).toBeUndefined()
      }
    })

    it('returns allowed: false with 429 response when over limit', async () => {
      const customConfig = { max: 1, windowMs: 60_000 }

      await limiter.limit('user-2', customConfig)
      const result = await limiter.limit('user-2', customConfig)

      expect(result.allowed).toBe(false)
      if (!result.allowed) {
        expect(result.response.status).toBe(429)
        expect(result.response.headers.get('Content-Type')).toBe('application/json')
        expect(result.response.headers.get('X-RateLimit-Limit')).toBe('1')
        expect(result.response.headers.get('X-RateLimit-Remaining')).toBe('0')
        expect(result.response.headers.get('Retry-After')).toBeDefined()
        const body = await result.response.json()
        expect(body.error).toContain('Too many requests')
      }
    })

    it('logs a warning when rate limit is exceeded', async () => {
      const { logger } = await import('@/lib/logger')
      const customConfig = { max: 1, windowMs: 60_000 }

      await limiter.limit('user-3', customConfig)
      await limiter.limit('user-3', customConfig)

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        'rate-limiter',
        expect.objectContaining({ identifier: 'user-3' }),
      )
    })
  })

  // ── Preset configs ────────────────────────────────────────────────────────

  describe('RATE_PRESETS', async () => {
    it('exports all expected preset keys', async () => {
      const { RATE_PRESETS } = await import('@/lib/security/rate-limiter')
      expect(RATE_PRESETS).toHaveProperty('auth')
      expect(RATE_PRESETS).toHaveProperty('api')
      expect(RATE_PRESETS).toHaveProperty('upload')
      expect(RATE_PRESETS).toHaveProperty('ai')
      expect(RATE_PRESETS).toHaveProperty('aiFormCheck')
      expect(RATE_PRESETS).toHaveProperty('sensitive')
      expect(RATE_PRESETS).toHaveProperty('public')
      expect(RATE_PRESETS).toHaveProperty('webhook')
    })

    it('auth preset is the strictest (5/min)', async () => {
      const { RATE_PRESETS } = await import('@/lib/security/rate-limiter')
      expect(RATE_PRESETS.auth.max).toBe(5)
      expect(RATE_PRESETS.auth.windowMs).toBe(60_000)
    })

    it('sensitive preset has 15-minute window', async () => {
      const { RATE_PRESETS } = await import('@/lib/security/rate-limiter')
      expect(RATE_PRESETS.sensitive.max).toBe(3)
      expect(RATE_PRESETS.sensitive.windowMs).toBe(15 * 60_000)
    })

    it('public preset is the most permissive (120/min)', async () => {
      const { RATE_PRESETS } = await import('@/lib/security/rate-limiter')
      expect(RATE_PRESETS.public.max).toBe(120)
    })
  })

  // ── Reset ─────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('resets the counter for a given identifier', async () => {
      const customConfig = { max: 1, windowMs: 60_000 }

      await limiter.check('user-r', customConfig)
      const blocked = await limiter.check('user-r', customConfig)
      expect(blocked.allowed).toBe(false)

      await limiter.reset('user-r')

      const allowed = await limiter.check('user-r', customConfig)
      expect(allowed.allowed).toBe(true)
    })
  })

  // ── Cleanup ───────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('cleans up without error', async () => {
      await expect(limiter.destroy()).resolves.toBeUndefined()
    })
  })
})