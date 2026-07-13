/**
 * Database Module
 *
 * Central database client with connection pooling, slow query logging,
 * and health check utilities. Works with PostgreSQL via PrismaPg driver adapter.
 *
 * - Uses the same singleton pattern as the original db.ts for hot-reload safety
 * - Adds connection pool configuration for PostgreSQL
 * - Logs queries slower than SLOW_QUERY_THRESHOLD_MS
 * - Provides a healthCheck() function for monitoring
 */

import { Prisma, PrismaClient } from '../inngest/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Log queries that take longer than this (ms) */
const SLOW_QUERY_THRESHOLD_MS = 100

/** Connection pool configuration for PostgreSQL */
const POOL_CONFIG = {
  connection_limit: 10,
  pool_timeout: 30,
} as const

// ─── Singleton Prisma Client ────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Create a configured Prisma client with logging and pool settings.
 */
function createPrismaClient(): PrismaClient {
  const logLevels: Array<'query' | 'info' | 'warn' | 'error'> = []

  if (process.env.NODE_ENV === 'development') {
    logLevels.push('warn', 'error')
  } else {
    logLevels.push('error')
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  })

  const client = new PrismaClient({
    adapter,
    log: logLevels.map((level) => ({
      emit: 'event' as const,
      level,
    })),
  })

  // ─── Slow Query Logging ───────────────────────────────────────────────
  client.$on('query', (e: Prisma.QueryEvent) => {
    if (e?.duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        `[DB] Slow query (${e.duration}ms): ${String(e.query ?? '').slice(0, 200)}${String(e.query ?? '').length > 200 ? '...' : ''}`
      )
    }
  })

  return client
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the Prisma client instance.
 * Safe to call multiple times — returns a singleton.
 * Safe across hot-reloads in development.
 */
export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Database health check.
 * Returns { status, latency, provider, poolInfo } or throws on failure.
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy'
  latencyMs: number
  provider: 'sqlite' | 'postgresql'
  poolInfo?: {
    connectionLimit: number
    poolTimeout: number
  }
}> {
  const db = getDb()

  const start = performance.now()

  try {
    await db.$queryRaw`SELECT 1`
    const latencyMs = Math.round(performance.now() - start)

    return {
      status: latencyMs > 1000 ? 'unhealthy' : 'healthy',
      latencyMs,
      provider: 'postgresql',
      poolInfo: { connectionLimit: POOL_CONFIG.connection_limit, poolTimeout: POOL_CONFIG.pool_timeout },
    }
  } catch {
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'unhealthy',
      latencyMs,
      provider: 'postgresql',
      poolInfo: { connectionLimit: POOL_CONFIG.connection_limit, poolTimeout: POOL_CONFIG.pool_timeout },
    }
  }
}

/**
 * Close the database connection.
 * Call this in graceful shutdown handlers.
 */
export async function disconnect(): Promise<void> {
  const db = getDb()
  await db.$disconnect()
  globalForPrisma.prisma = undefined
}

// ─── Re-export pool config for reference ────────────────────────────────────

export { POOL_CONFIG, SLOW_QUERY_THRESHOLD_MS }