/**
 * Prisma query logging middleware.
 *
 * Features:
 * - Logs all queries > 100ms as warnings
 * - Logs all queries > 1000ms as errors
 * - Tracks query counts per request
 * - Reports at end of request: "Query stats: 12 queries, 45ms avg, 230ms total"
 * - Only active in development or when LOG_QUERIES=true
 *
 * Server-only module.
 */

import { config } from '@/lib/config'

// ── Configuration ──────────────────────────────────────────────────────────────

const SLOW_QUERY_THRESHOLD_MS = 100
const VERY_SLOW_QUERY_THRESHOLD_MS = 1000
const MAX_QUERY_LOG_LENGTH = 300

// ── Per-Request Query Tracking ─────────────────────────────────────────────────

interface QueryRecord {
  query: string
  duration: number
  timestamp: number
}

/**
 * Per-request query stats tracker.
 * Usage in an API route:
 *
 * @example
 * import { RequestQueryTracker } from '@/lib/performance/query-logger'
 *
 * export async function GET(req: NextRequest) {
 *   const tracker = RequestQueryTracker.start()
 *   try {
 *     const data = await db.player.findMany(...)
 *     return NextResponse.json(data)
 *   } finally {
 *     tracker.report()
 *   }
 * }
 */
export class RequestQueryTracker {
  private queries: QueryRecord[] = []
  private startTime: number

  private constructor() {
    this.startTime = Date.now()
  }

  static start(): RequestQueryTracker {
    return new RequestQueryTracker()
  }

  record(query: string, duration: number): void {
    this.queries.push({
      query: query.slice(0, MAX_QUERY_LOG_LENGTH),
      duration,
      timestamp: Date.now(),
    })
  }

  getStats(): {
    count: number
    avgMs: number
    totalMs: number
    maxMs: number
    slowQueries: number
    verySlowQueries: number
  } {
    if (this.queries.length === 0) {
      return { count: 0, avgMs: 0, totalMs: 0, maxMs: 0, slowQueries: 0, verySlowQueries: 0 }
    }

    const totalMs = this.queries.reduce((sum, q) => sum + q.duration, 0)
    const maxMs = Math.max(...this.queries.map((q) => q.duration))
    const slowQueries = this.queries.filter((q) => q.duration > SLOW_QUERY_THRESHOLD_MS).length
    const verySlowQueries = this.queries.filter((q) => q.duration > VERY_SLOW_QUERY_THRESHOLD_MS).length

    return {
      count: this.queries.length,
      avgMs: Math.round(totalMs / this.queries.length),
      totalMs: Math.round(totalMs),
      maxMs,
      slowQueries,
      verySlowQueries,
    }
  }

  /**
   * Log query stats summary and return the stats.
   */
  report(): ReturnType<RequestQueryTracker['getStats']> {
    const stats = this.getStats()
    const elapsed = Date.now() - this.startTime

    if (stats.count > 0) {
      const msg = `Query stats: ${stats.count} queries, ${stats.avgMs}ms avg, ${stats.totalMs}ms total, ${stats.maxMs}ms max, ${elapsed}ms wall`

      if (stats.verySlowQueries > 0) {
        console.error(`[DB] ${msg} (${stats.verySlowQueries} VERY SLOW)`)
      } else if (stats.slowQueries > 0) {
        console.warn(`[DB] ${msg} (${stats.slowQueries} slow)`)
      } else {
        console.warn(`[DB] ${msg}`)
      }

      // Log slowest queries
      const sorted = [...this.queries].sort((a, b) => b.duration - a.duration)
      const topSlow = sorted.filter((q) => q.duration > SLOW_QUERY_THRESHOLD_MS).slice(0, 3)
      for (const q of topSlow) {
        if (q.duration > VERY_SLOW_QUERY_THRESHOLD_MS) {
          console.error(`[DB:ERROR] ${q.duration}ms: ${q.query}`)
        } else {
          console.warn(`[DB:WARN] ${q.duration}ms: ${q.query}`)
        }
      }
    }

    return stats
  }
}

// ── Global Query Logger (Prisma Middleware) ─────────────────────────────────────

/**
 * Active request trackers by async context.
 * Since Node.js doesn't have native async context without async_hooks,
 * we use a simple Map keyed by request-start time as a heuristic.
 *
 * For proper per-request tracking, use RequestQueryTracker directly.
 */
let globalTracker: RequestQueryTracker | null = null

/**
 * Get or create the global query tracker.
 * This is a simplified version — for accurate per-request tracking,
 * use RequestQueryTracker.start() in each route handler.
 */
export function getGlobalTracker(): RequestQueryTracker {
  if (!globalTracker) {
    globalTracker = RequestQueryTracker.start()
  }
  return globalTracker
}

/**
 * Log a query event from Prisma middleware.
 */
export function logQueryEvent(query: string, duration: number): void {
  const isEnabled = config.logging.logQueries
  if (!isEnabled) return

  // Track in global tracker
  const tracker = getGlobalTracker()
  tracker.record(query, duration)

  // Immediate logging for very slow queries
  if (duration > VERY_SLOW_QUERY_THRESHOLD_MS) {
    console.error(
      `[DB:ERROR] Very slow query (${duration}ms): ${query.slice(0, MAX_QUERY_LOG_LENGTH)}`,
    )
  } else if (duration > SLOW_QUERY_THRESHOLD_MS) {
    console.warn(
      `[DB:WARN] Slow query (${duration}ms): ${query.slice(0, MAX_QUERY_LOG_LENGTH)}`,
    )
  }
}

/**
 * Install Prisma query logging on a Prisma client instance.
 *
 * @example
 * import { installQueryLogger } from '@/lib/performance/query-logger'
 * import { getDb } from '@/lib/database'
 *
 * const db = getDb()
 * installQueryLogger(db)
 */
export function installQueryLogger(prisma: { $on: (event: string, callback: (e: { query: string; duration: number }) => void) => void }): void {
  const isEnabled = config.logging.logQueries
  if (!isEnabled) return

  // @ts-expect-error - Prisma event types
  prisma.$on('query', (e: { query: string; duration: number; params: string; target: string }) => {
    logQueryEvent(e.query, e.duration)
  })
}

/**
 * Report global query stats and reset the tracker.
 * Call at the end of a request lifecycle.
 */
export function reportGlobalStats(): void {
  if (globalTracker) {
    globalTracker.report()
    globalTracker = null
  }
}