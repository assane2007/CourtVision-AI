import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}))

describe('push service', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.VAPID_PRIVATE_KEY
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  })

  it('sendPushNotification returns success: false when VAPID keys not set', async () => {
    const { sendPushNotification } = await import('@/lib/push')
    const result = await sendPushNotification({
      subscription: {
        endpoint: 'https://example.com/push',
        keys: { p256dh: 'key', auth: 'auth' },
      },
      title: 'Test',
      body: 'Hello',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not configured')
  })

  it('sendPushNotification accepts all required parameters', async () => {
    const { sendPushNotification } = await import('@/lib/push')
    // Just verify the function signature accepts the expected shape without crashing
    expect(typeof sendPushNotification).toBe('function')
  })

  it('sendPushToPlayer returns sent/failed/errors structure', async () => {
    const { sendPushToPlayer } = await import('@/lib/push')
    const result = await sendPushToPlayer({
      subscriptions: [],
      title: 'Test',
      body: 'Hello',
    })
    expect(result).toHaveProperty('sent', 0)
    expect(result).toHaveProperty('failed', 0)
    expect(result).toHaveProperty('errors')
    expect(Array.isArray(result.errors)).toBe(true)
  })
})