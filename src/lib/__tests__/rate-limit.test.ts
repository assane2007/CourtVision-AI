import { describe, it, expect, beforeEach, vi } from 'vitest'

// Reset the module between tests to get a fresh rate limiter
describe('rate-limit', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('allows requests under the limit', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const result = rateLimit('test-user', 5, 60000)
    expect(result.success).toBe(true)
    expect(result.retryAfterMs).toBe(0)
  })

  it('blocks requests over the limit', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    // Use up all 3 attempts
    rateLimit('test-blocked', 3, 60000)
    rateLimit('test-blocked', 3, 60000)
    rateLimit('test-blocked', 3, 60000)
    // 4th should be blocked
    const result = rateLimit('test-blocked', 3, 60000)
    expect(result.success).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets after window expires', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    // Use up attempts with a 1ms window
    rateLimit('test-expire', 2, 1)
    rateLimit('test-expire', 2, 1)
    const blocked = rateLimit('test-expire', 2, 1)
    expect(blocked.success).toBe(false)

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 10))
    const result = rateLimit('test-expire', 2, 1)
    expect(result.success).toBe(true)
  })

  it('isolates different identifiers', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    rateLimit('user-a', 1, 60000)
    const blocked = rateLimit('user-a', 1, 60000)
    expect(blocked.success).toBe(false)

    // Different user should not be affected
    const result = rateLimit('user-b', 1, 60000)
    expect(result.success).toBe(true)
  })

  it('respects custom maxAttempts', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    for (let i = 0; i < 10; i++) {
      rateLimit('test-custom', 10, 60000)
    }
    const result = rateLimit('test-custom', 10, 60000)
    expect(result.success).toBe(false)
  })
})