/**
 * In-memory LRU cache with TTL support.
 *
 * Features:
 * - Max 10,000 entries with LRU eviction
 * - Per-key TTL (default 5 minutes)
 * - Automatic cleanup every 60 seconds
 * - Memory usage tracking (estimated byte size)
 * - Stats: hits, misses, evictions
 *
 * Server-only module.
 */

import type { CacheAdapter, CacheAdapterWithTags, CacheStats } from './types'

// ── Configuration ──────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ENTRIES = 10_000
const CLEANUP_INTERVAL_MS = 60_000 // 60 seconds
// Estimated per-key overhead included below
const ESTIMATED_OVERHEAD_BYTES = 64 // per-entry overhead

// ── Types ──────────────────────────────────────────────────────────────────────

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
  lastAccessed: number
  byteSize: number
  tags: string[]
}

// ── Implementation ─────────────────────────────────────────────────────────────

export class MemoryCache implements CacheAdapter, CacheAdapterWithTags {
  private store = new Map<string, CacheEntry>()
  private tagIndex = new Map<string, Set<string>>() // tag → set of keys
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private _stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    estimatedBytes: 0,
  }

  constructor() {
    this.startCleanup()
  }

  // ── Core Operations ───────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) {
      this._stats.misses++
      this.updateStats()
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.deleteEntry(key)
      this._stats.misses++
      this.updateStats()
      return null
    }

    // Touch for LRU — move to end of Map
    entry.lastAccessed = Date.now()
    this.store.delete(key)
    this.store.set(key, entry)

    this._stats.hits++
    this.updateStats()
    return entry.value as T
  }

  async set(
    key: string,
    value: unknown,
    ttl: number = DEFAULT_TTL_MS,
    tags: string[] = [],
  ): Promise<void> {
    // Evict LRU entries if at capacity
    while (this.store.size >= MAX_ENTRIES && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey !== undefined) {
        this.deleteEntry(oldestKey as string)
        this._stats.evictions++
      } else {
        break
      }
    }

    // Remove old entry if overwriting
    if (this.store.has(key)) {
      this.deleteEntry(key)
    }

    const byteSize =
      this.estimateBytes(key) + this.estimateBytes(value) + ESTIMATED_OVERHEAD_BYTES

    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
      byteSize,
      tags,
    }

    this.store.set(key, entry)

    // Update tag index
    for (const tag of tags) {
      let keys = this.tagIndex.get(tag)
      if (!keys) {
        keys = new Set()
        this.tagIndex.set(tag, keys)
      }
      keys.add(key)
    }

    this.updateStats()
  }

  async delete(key: string): Promise<void> {
    this.deleteEntry(key)
    this.updateStats()
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.deleteEntry(key)
      return false
    }
    return true
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const entry = this.store.get(key)
    if (!entry || Date.now() > entry.expiresAt) {
      // Initialize to 0 then increment
      await this.set(key, amount, DEFAULT_TTL_MS)
      this.updateStats()
      return amount
    }
    const current = (typeof entry.value === 'number' ? entry.value : 0) + amount
    entry.value = current
    entry.lastAccessed = Date.now()
    this.updateStats()
    return current
  }

  async keys(pattern: string): Promise<string[]> {
    if (!pattern.includes('*')) {
      return this.store.has(pattern) ? [pattern] : []
    }

    const prefix = pattern.slice(0, pattern.indexOf('*'))
    const result: string[] = []
    const now = Date.now()

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        const entry = this.store.get(key)
        if (entry && entry.expiresAt > now) {
          result.push(key)
        }
      }
    }

    return result
  }

  async flush(): Promise<void> {
    this.store.clear()
    this.tagIndex.clear()
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      estimatedBytes: 0,
    }
  }

  async healthCheck(): Promise<boolean> {
    // Memory cache is always healthy
    return true
  }

  // ── Tag-based Invalidation ───────────────────────────────────────────────

  async invalidateTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>()
    for (const tag of tags) {
      const tagKeys = this.tagIndex.get(tag)
      if (tagKeys) {
        for (const key of tagKeys) {
          keysToDelete.add(key)
        }
      }
    }
    for (const key of keysToDelete) {
      this.deleteEntry(key)
    }
    this.updateStats()
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  getStats(): CacheStats {
    return { ...this._stats }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.store.clear()
    this.tagIndex.clear()
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private deleteEntry(key: string): void {
    const entry = this.store.get(key)
    if (entry) {
      // Clean up tag index
      for (const tag of entry.tags) {
        const tagKeys = this.tagIndex.get(tag)
        if (tagKeys) {
          tagKeys.delete(key)
          if (tagKeys.size === 0) {
            this.tagIndex.delete(tag)
          }
        }
      }
    }
    this.store.delete(key)
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      let cleaned = 0
      for (const [key, entry] of this.store) {
        if (entry.expiresAt <= now) {
          this.deleteEntry(key)
          cleaned++
        }
      }
      if (cleaned > 0) {
        this.updateStats()
      }
    }, CLEANUP_INTERVAL_MS)

    // Allow process to exit
    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref()
    }
  }

  private updateStats(): void {
    let totalBytes = 0
    for (const entry of this.store.values()) {
      totalBytes += entry.byteSize
    }
    this._stats.size = this.store.size
    this._stats.estimatedBytes = totalBytes
  }

  private estimateBytes(value: unknown, depth: number = 0): number {
    if (depth > 5) return 0 // prevent infinite recursion

    if (value === null || value === undefined) return 4
    if (typeof value === 'number') return 8
    if (typeof value === 'boolean') return 4
    if (typeof value === 'string') return value.length * 2 // UTF-16

    if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
      return value.byteLength
    }
    if (ArrayBuffer.isView(value)) {
      return value.byteLength
    }

    if (Array.isArray(value)) {
      let size = 40 // array overhead
      for (const item of value) {
        size += this.estimateBytes(item, depth + 1)
      }
      return size
    }

    if (typeof value === 'object') {
      let size = 56 // object overhead
      const obj = value as Record<string, unknown>
      for (const k of Object.keys(obj)) {
        size += k.length * 2 + 8 // key + pointer
        size += this.estimateBytes(obj[k], depth + 1)
      }
      return size
    }

    return 8 // fallback
  }
}