/**
 * Database Module
 *
 * Central database client with connection pooling, slow query logging,
 * and health check utilities. Works with both SQLite (dev) and PostgreSQL (prod).
 *
 * - Uses the same singleton pattern as the original db.ts for hot-reload safety
 * - Adds connection pool configuration for PostgreSQL
 * - Logs queries slower than SLOW_QUERY_THRESHOLD_MS
 * - Provides a healthCheck() function for monitoring
 */

import { Prisma, PrismaClient } from '@prisma/client'

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
  const isPostgres =
    process.env.DATABASE_URL?.startsWith('postgresql://') ||
    process.env.DATABASE_URL?.startsWith('postgres://')

  const logLevels: Array<'query' | 'info' | 'warn' | 'error'> = []

  if (process.env.NODE_ENV === 'development') {
    logLevels.push('warn', 'error')
  } else {
    // In production, only log errors
    logLevels.push('error')
  }

  const client = new PrismaClient({
    log: logLevels.map((level) => ({
      emit: 'event' as const,
      level,
    })),
    ...(isPostgres
      ? {
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
        }
      : {}),
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
  const isPostgres =
    process.env.DATABASE_URL?.startsWith('postgresql://') ||
    process.env.DATABASE_URL?.startsWith('postgres://')

  const start = performance.now()

  try {
    // Run a lightweight query to test connectivity
    await db.$queryRaw`SELECT 1`
    const latencyMs = Math.round(performance.now() - start)

    return {
      status: latencyMs > 1000 ? 'unhealthy' : 'healthy',
      latencyMs,
      provider: isPostgres ? 'postgresql' : 'sqlite',
      ...(isPostgres ? { poolInfo: { connectionLimit: POOL_CONFIG.connection_limit, poolTimeout: POOL_CONFIG.pool_timeout } } : {}),
    }
  } catch {
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'unhealthy',
      latencyMs,
      provider: isPostgres ? 'postgresql' : 'sqlite',
      ...(isPostgres ? { poolInfo: { connectionLimit: POOL_CONFIG.connection_limit, poolTimeout: POOL_CONFIG.pool_timeout } } : {}),
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