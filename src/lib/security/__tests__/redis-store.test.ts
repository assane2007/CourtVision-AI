import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ioredis — constructor returns an object with the methods RedisStore uses
const mockExec = vi.fn()
const mockConnect = vi.fn()
const mockQuit = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('ioredis', () => {
  function MockRedis(_url: string, _opts?: Record<string, unknown>) {
    return {
      multi: () => ({
        incr: vi.fn().mockReturnThis(),
        pexpire: vi.fn().mockReturnThis(),
        pttl: vi.fn().mockReturnThis(),
        exec: mockExec,
      }),
      connect: mockConnect,
      quit: mockQuit,
      disconnect: mockDisconnect,
      on: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
    }
  }
  return { default: MockRedis }
})

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

describe('RedisStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue(undefined)
  })

  it('constructor accepts a Redis URL', async () => {
    const { RedisStore } = await import('@/lib/security/redis-store')
    const store = new RedisStore('redis://localhost:6379')
    expect(store).toBeDefined()
  })

  it('increment returns count and resetMs via MULTI/EXEC', async () => {
    const { RedisStore } = await import('@/lib/security/redis-store')
    const store = new RedisStore('redis://localhost:6379')

    // [null, 3] for INCR, [null, 1] for PEXPIRE, [null, 50000] for PTTL
    mockExec.mockResolvedValue([[null, 3], [null, 1], [null, 50000]])

    const result = await store.increment('test-key', 60000)
    expect(result.count).toBe(3)
    expect(result.resetMs).toBeGreaterThan(Date.now())
  })

  it('cleanup calls quit and handles errors gracefully', async () => {
    const { RedisStore } = await import('@/lib/security/redis-store')
    const store = new RedisStore('redis://localhost:6379')

    mockQuit.mockRejectedValue(new Error('quit failed'))

    // Should not throw — falls back to disconnect
    await expect(store.cleanup()).resolves.toBeUndefined()
    expect(mockDisconnect).toHaveBeenCalled()
  })
})