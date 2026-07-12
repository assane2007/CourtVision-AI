import { describe, it, expect, beforeEach, vi } from 'vitest';
 describe('cache', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('stores and retrieves values', async () => {
    const { cacheSet, cacheGet } = await import('@/lib/cache')
    cacheSet('test-key', { value: 'hello' }, 60000)
    expect(cacheGet('test-key')).toEqual({ value: 'hello' })
  })

  it('returns null for missing keys', async () => {
    const { cacheGet } = await import('@/lib/cache')
    expect(cacheGet('nonexistent')).toBeNull()
  })

  it('expires entries after TTL', async () => {
    const { cacheSet, cacheGet } = await import('@/lib/cache')
    cacheSet('test-ttl', 'data', 1) // 1ms TTL
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(cacheGet('test-ttl')).toBeNull()
  })

  it('evicts oldest entries when at capacity', async () => {
    const { cacheSet, cacheGet } = await import('@/lib/cache')
    // The cache has MAX_ENTRIES = 500, but we test the eviction logic
    // by filling and checking the oldest is evicted
    for (let i = 0; i < 510; i++) {
      cacheSet(`evict-test-${i}`, `value-${i}`, 60000)
    }
    // The first entries should have been evicted
    expect(cacheGet('evict-test-0')).toBeNull()
    // The latest entries should still be there
    expect(cacheGet('evict-test-509')).toBe('value-509')
  })

  it('withCache returns cached value on second call', async () => {
    const { withCache } = await import('@/lib/cache')
    let callCount = 0
    const fetcher = async () => {
      callCount++
      return 'fetched-data'
    }

    const result1 = await withCache('withcache-test', 60000, fetcher)
    const result2 = await withCache('withcache-test', 60000, fetcher)

    expect(result1).toBe('fetched-data')
    expect(result2).toBe('fetched-data')
    expect(callCount).toBe(1) // fetcher called only once
  })

  it('cacheInvalidate removes specific keys', async () => {
    const { cacheSet, cacheGet, cacheInvalidate } = await import('@/lib/cache')
    cacheSet('inv-test-a', 'value-a', 60000)
    cacheSet('inv-test-b', 'value-b', 60000)

    cacheInvalidate('inv-test-a')
    expect(cacheGet('inv-test-a')).toBeNull()
    expect(cacheGet('inv-test-b')).toBe('value-b')
  })

  it('cacheInvalidatePattern removes matching keys', async () => {
    const { cacheSet, cacheGet, cacheInvalidatePattern } = await import('@/lib/cache')
    cacheSet('user:1:data', 'a', 60000)
    cacheSet('user:2:data', 'b', 60000)
    cacheSet('user:1:settings', 'c', 60000)
    cacheSet('other:1:data', 'd', 60000)

    cacheInvalidatePattern('user:1:*')
    expect(cacheGet('user:1:data')).toBeNull()
    expect(cacheGet('user:1:settings')).toBeNull()
    expect(cacheGet('user:2:data')).toBe('b') // not affected
    expect(cacheGet('other:1:data')).toBe('d') // not affected
  })
})