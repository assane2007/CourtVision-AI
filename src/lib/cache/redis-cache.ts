/**
 * Redis cache implementation with fallback to in-memory cache.
 *
 * Features:
 * - Uses Node.js built-in `net` module for Redis protocol (no external deps)
 * - Falls back to MemoryCache if Redis is unavailable
 * - Automatic JSON serialization
 * - Key namespacing: cv:{feature}:{key}
 * - Supports tags/invalidation groups
 * - Connection pooling via single persistent TCP connection
 *
 * IMPORTANT: Since we cannot add new npm dependencies, this uses a minimal
 * Redis protocol implementation. In production, replace with ioredis.
 *
 * Server-only module.
 */

import { createConnection, type Socket } from 'node:net'
import { MemoryCache } from './memory-cache'
import type { CacheAdapter, CacheAdapterWithTags, CacheStats, RedisConfig } from './types'

// ── Configuration ──────────────────────────────────────────────────────────────

const DEFAULT_NAMESPACE = 'cv'
const DEFAULT_CONNECT_TIMEOUT = 5000
// max retries handled per-task in queue
const DEFAULT_TTL_MS = 5 * 60 * 1000

// ── Minimal Redis Client ───────────────────────────────────────────────────────

class SimpleRedisClient {
  private socket: Socket | null = null
  private connected = false
  private connecting = false
  private responseQueue: Array<{
    resolve: (value: string | null) => void
    reject: (err: Error) => void
    chunks: Buffer[]
    expectedLength: number
  }> = []
  private buffer = Buffer.alloc(0)
  private url: string
  private connectTimeout: number
  private closed = false

  constructor(url: string, connectTimeout: number) {
    this.url = url
    this.connectTimeout = connectTimeout
  }

  async connect(): Promise<void> {
    if (this.connected || this.closed) return
    if (this.connecting) {
      // Wait for existing connection attempt
      await new Promise<void>((resolve) => {
        const check = () => {
          if (this.connected) resolve()
          else if (this.closed) resolve()
          else setTimeout(check, 50)
        }
        check()
      })
      return
    }

    this.connecting = true

    try {
      const parsed = this.parseUrl(this.url)
      const host = parsed.host || '127.0.0.1'
      const port = parsed.port || 6379

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.socket?.destroy()
          reject(new Error(`Redis connection timeout after ${this.connectTimeout}ms`))
        }, this.connectTimeout)

        this.socket = createConnection({ host, port }, () => {
          clearTimeout(timeout)
          this.connected = true
          this.connecting = false
          resolve()
        })

        this.socket.on('data', (data: Buffer) => {
          this.handleData(data)
        })

        this.socket.on('error', (err: Error) => {
          clearTimeout(timeout)
          this.connected = false
          this.connecting = false
          this.rejectAllPending(err)
        })

        this.socket.on('close', () => {
          this.connected = false
          this.connecting = false
          this.rejectAllPending(new Error('Redis connection closed'))
        })
      })
    } catch (err) {
      this.connecting = false
      throw err
    }
  }

  async command(...args: string[]): Promise<string | null> {
    await this.connect()

    if (!this.socket || !this.connected) {
      throw new Error('Redis not connected')
    }

    return new Promise<string | null>((resolve, reject) => {
      const cmd = this.buildCommand(args)
      this.socket.write(cmd)

      this.responseQueue.push({
        resolve,
        reject,
        chunks: [],
        expectedLength: -1,
      })
    })
  }

  async close(): Promise<void> {
    this.closed = true
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  // ── Private: Redis Protocol ───────────────────────────────────────────────

  private parseUrl(url: string): { host: string; port: number; password?: string } {
    // Parse redis://:password@host:port or redis://host:port
    let rest = url
    if (rest.startsWith('rediss://')) {
      rest = rest.slice(8) // skip rediss://
    } else if (rest.startsWith('redis://')) {
      rest = rest.slice(8)
    }

    let password: string | undefined
    const atIdx = rest.indexOf('@')
    if (atIdx > -1) {
      password = rest.slice(0, atIdx)
      rest = rest.slice(atIdx + 1)
    }

    // Remove path
    const slashIdx = rest.indexOf('/')
    if (slashIdx > -1) {
      rest = rest.slice(0, slashIdx)
    }

    const colonIdx = rest.lastIndexOf(':')
    let host = '127.0.0.1'
    let port = 6379

    if (colonIdx > -1) {
      host = rest.slice(0, colonIdx)
      port = parseInt(rest.slice(colonIdx + 1), 10) || 6379
    } else {
      host = rest || '127.0.0.1'
    }

    return { host, port, password: password || undefined }
  }

  private buildCommand(args: string[]): Buffer {
    const parts: Buffer[] = []
    parts.push(Buffer.from(`*${args.length}\r\n`))

    for (const arg of args) {
      const buf = Buffer.from(arg, 'utf-8')
      parts.push(Buffer.from(`$${buf.length}\r\n`))
      parts.push(buf)
      parts.push(Buffer.from('\r\n'))
    }

    return Buffer.concat(parts)
  }

  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data])

    while (this.responseQueue.length > 0 && this.buffer.length > 0) {
      const pending = this.responseQueue[0]
      const parsed = this.parseResponse()

      if (parsed === null) break // incomplete, wait for more data

      this.responseQueue.shift()
      pending.resolve(parsed)
    }
  }

  private parseResponse(): string | null {
    if (this.buffer.length === 0) return null

    const type = String.fromCharCode(this.buffer[0])

    switch (type) {
      case '+': { // Simple string
        const end = this.findLineEnd(1)
        if (end === -1) return null
        const result = this.buffer.slice(1, end).toString('utf-8')
        this.buffer = this.buffer.slice(end + 2)
        return result
      }

      case '-': { // Error
        const end = this.findLineEnd(1)
        if (end === -1) return null
        const errMsg = this.buffer.slice(1, end).toString('utf-8')
        this.buffer = this.buffer.slice(end + 2)
        throw new Error(`Redis error: ${errMsg}`)
      }

      case ':': { // Integer
        const end = this.findLineEnd(1)
        if (end === -1) return null
        const num = this.buffer.slice(1, end).toString('utf-8')
        this.buffer = this.buffer.slice(end + 2)
        return num
      }

      case '$': { // Bulk string
        const lineEnd = this.findLineEnd(1)
        if (lineEnd === -1) return null
        const lenStr = this.buffer.slice(1, lineEnd).toString('utf-8').trim()
        const len = parseInt(lenStr, 10)

        if (len === -1) {
          this.buffer = this.buffer.slice(lineEnd + 2)
          return null // null bulk string
        }

        const dataStart = lineEnd + 2
        const dataEnd = dataStart + len

        if (this.buffer.length < dataEnd + 2) return null // incomplete

        const result = this.buffer.slice(dataStart, dataEnd).toString('utf-8')
        this.buffer = this.buffer.slice(dataEnd + 2)
        return result
      }

      case '*': { // Array
        const lineEnd = this.findLineEnd(1)
        if (lineEnd === -1) return null
        const countStr = this.buffer.slice(1, lineEnd).toString('utf-8').trim()
        const count = parseInt(countStr, 10)

        if (count === -1) {
          this.buffer = this.buffer.slice(lineEnd + 2)
          return null
        }

        // For simplicity, parse first element for our use cases
        this.buffer = this.buffer.slice(lineEnd + 2)
        return this.parseResponse()
      }

      default:
        // Unknown type, skip byte
        this.buffer = this.buffer.slice(1)
        return null
    }
  }

  private findLineEnd(startOffset: number): number {
    const idx = this.buffer.indexOf('\r\n', startOffset)
    return idx
  }

  private rejectAllPending(err: Error): void {
    for (const pending of this.responseQueue) {
      pending.reject(err)
    }
    this.responseQueue = []
  }
}

// ── Redis Cache Implementation ──────────────────────────────────────────────────

export class RedisCache implements CacheAdapter, CacheAdapterWithTags {
  private client: SimpleRedisClient | null = null
  private fallback: MemoryCache
  private namespace: string
  private usingFallback = true
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    estimatedBytes: 0,
  }

  constructor(config: RedisConfig = { url: process.env.REDIS_URL || '' }) {
    this.namespace = config.namespace || DEFAULT_NAMESPACE

    // Always have a fallback ready
    this.fallback = new MemoryCache()

    if (!config.url) {
      // No Redis URL configured, use fallback
      return
    }

    try {
      this.client = new SimpleRedisClient(
        config.url,
        config.connectTimeout || DEFAULT_CONNECT_TIMEOUT,
      )
      this.usingFallback = false
    } catch {
      // Fallback to memory
      this.usingFallback = true
    }
  }

  private ns(key: string): string {
    return `${this.namespace}:${key}`
  }

  private nsTag(tag: string): string {
    return `${this.namespace}:tag:${tag}`
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.usingFallback || !this.client) {
      return this.fallback.get<T>(key)
    }

    try {
      const raw = await this.client.command('GET', this.ns(key))
      if (raw === null) {
        this.stats.misses++
        return null
      }
      this.stats.hits++
      return JSON.parse(raw) as T
    } catch {
      this.switchToFallback()
      return this.fallback.get<T>(key)
    }
  }

  async set(
    key: string,
    value: unknown,
    ttl: number = DEFAULT_TTL_MS,
    tags: string[] = [],
  ): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.set(key, value, ttl, tags)
    }

    try {
      const ttlSec = Math.max(1, Math.round(ttl / 1000))
      const serialized = JSON.stringify(value)
      await this.client.command('SET', this.ns(key), serialized, 'EX', String(ttlSec))

      // Index tags
      for (const tag of tags) {
        await this.client.command('SADD', this.nsTag(tag), this.ns(key))
      }
    } catch {
      this.switchToFallback()
      return this.fallback.set(key, value, ttl, tags)
    }
  }

  async delete(key: string): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.delete(key)
    }

    try {
      await this.client.command('DEL', this.ns(key))
    } catch {
      this.switchToFallback()
      return this.fallback.delete(key)
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.usingFallback || !this.client) {
      return this.fallback.exists(key)
    }

    try {
      const result = await this.client.command('EXISTS', this.ns(key))
      return result === '1'
    } catch {
      this.switchToFallback()
      return this.fallback.exists(key)
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    if (this.usingFallback || !this.client) {
      return this.fallback.increment(key, amount)
    }

    try {
      const result = await this.client.command('INCRBY', this.ns(key), String(amount))
      this.stats.hits++
      return parseInt(result || '0', 10)
    } catch {
      this.switchToFallback()
      return this.fallback.increment(key, amount)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.usingFallback || !this.client) {
      return this.fallback.keys(pattern)
    }

    try {
      const result = await this.client.command('KEYS', this.ns(pattern))
      if (!result) return []
      // Remove namespace prefix from returned keys
      const prefix = `${this.namespace}:`
      return result
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k))
    } catch {
      this.switchToFallback()
      return this.fallback.keys(pattern)
    }
  }

  async flush(): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.flush()
    }

    try {
      await this.client.command('FLUSHDB')
    } catch {
      this.switchToFallback()
      return this.fallback.flush()
    }
  }

  async healthCheck(): Promise<boolean> {
    if (this.usingFallback || !this.client) {
      return this.fallback.healthCheck()
    }

    try {
      const result = await this.client.command('PING')
      return result === 'PONG'
    } catch {
      return false
    }
  }

  async invalidateTags(tags: string[]): Promise<void> {
    if (this.usingFallback || !this.client) {
      return this.fallback.invalidateTags(tags)
    }

    try {
      for (const tag of tags) {
        const members = await this.client.command('SMEMBERS', this.nsTag(tag))
        if (members) {
          const keys = members.split('\n').filter(Boolean)
          if (keys.length > 0) {
            await this.client.command('DEL', ...keys)
          }
        }
        await this.client.command('DEL', this.nsTag(tag))
      }
    } catch {
      this.switchToFallback()
      return this.fallback.invalidateTags(tags)
    }
  }

  getStats(): CacheStats {
    if (this.usingFallback) {
      return this.fallback.getStats()
    }
    return { ...this.stats }
  }

  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.close()
    }
    await this.fallback.destroy()
  }

  private switchToFallback(): void {
    if (!this.usingFallback) {
      this.usingFallback = true
      // Don't close the client — it may recover
    }
  }
}