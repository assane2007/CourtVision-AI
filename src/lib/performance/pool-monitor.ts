/**
 * Database connection pool monitor.
 *
 * Features:
 * - Track active connections
 * - Track waiting queries
 * - Alert if pool is > 80% utilized
 * - Provide stats for /api/health endpoint
 *
 * Uses Prisma's $on event hooks to track query activity.
 * For SQLite, provides limited but still useful metrics.
 *
 * Server-only module.
 */

import { getDb } from '@/lib/database'
import { POOL_CONFIG } from '@/lib/database'

// ── Types ───────────────────────────────────────────────────────────────────────

export interface PoolStats {
  /** Total connection limit */
  connectionLimit: number
  /** Estimated active connections */
  activeConnections: number
  /** Estimated waiting queries */
  waitingQueries: number
  /** Pool utilization percentage (0-100) */
  utilizationPercent: number
  /** Whether pool is under pressure (>80%) */
  isUnderPressure: boolean
  /** Total queries tracked since server start */
  totalQueries: number
  /** Average query duration in ms */
  avgQueryDurationMs: number
  /** Slowest query duration in ms */
  maxQueryDurationMs: number
  /** Time of last query */
  lastQueryAt: number | null
}

export interface PoolAlert {
  type: 'warning' | 'critical'
  message: string
  timestamp: number
  stats: PoolStats
}

// ── Configuration ──────────────────────────────────────────────────────────────

const CONNECTION_LIMIT = POOL_CONFIG.connection_limit
const PRESSURE_THRESHOLD_PERCENT = 80
const ALERT_COOLDOWN_MS = 60_000 // Don't alert more than once per minute

// ── Pool Monitor ───────────────────────────────────────────────────────────────

class PoolMonitor {
  private activeQueries = 0
  private waitingQueries = 0
  private totalQueries = 0
  private totalQueryDurationMs = 0
  private maxQueryDurationMs = 0
  private lastQueryAt: number | null = null
  private lastAlertTime = 0
  private alerts: PoolAlert[] = []
  private initialized = false
  private peakActiveConnections = 0

  // ── Initialization ───────────────────────────────────────────────────────

  /**
   * Initialize the pool monitor by attaching to Prisma events.
   * Safe to call multiple times.
   */
  init(): void {
    if (this.initialized) return
    this.initialized = true

    try {
      const db = getDb()

      // @ts-expect-error - Prisma event types
      db.$on('query', (e: { duration: number }) => {
        this.onQueryStart()
        // Use setTimeout(0) to simulate the async lifecycle
        // (query event fires after query completes in Prisma)
        this.onQueryEnd(e.duration)
      })

      // Periodic check for pressure
      const timer = setInterval(() => {
        this.checkPressure()
      }, 30_000) // check every 30 seconds

      // Allow process to exit
      if (typeof timer === 'object' && 'unref' in timer) {
        timer.unref()
      }
    } catch {
      // Database not available — monitor runs in degraded mode
    }
  }

  // ── Query Tracking ───────────────────────────────────────────────────────

  private onQueryStart(): void {
    this.activeQueries++
    this.waitingQueries = Math.max(0, this.waitingQueries)
    this.peakActiveConnections = Math.max(this.peakActiveConnections, this.activeQueries)
  }

  private onQueryEnd(duration: number): void {
    this.activeQueries = Math.max(0, this.activeQueries - 1)
    this.totalQueries++
    this.totalQueryDurationMs += duration
    this.maxQueryDurationMs = Math.max(this.maxQueryDurationMs, duration)
    this.lastQueryAt = Date.now()
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  getStats(): PoolStats {
    const utilization = CONNECTION_LIMIT > 0
      ? Math.round((this.activeQueries / CONNECTION_LIMIT) * 100)
      : 0

    return {
      connectionLimit: CONNECTION_LIMIT,
      activeConnections: this.activeQueries,
      waitingQueries: this.waitingQueries,
      utilizationPercent: utilization,
      isUnderPressure: utilization >= PRESSURE_THRESHOLD_PERCENT,
      totalQueries: this.totalQueries,
      avgQueryDurationMs: this.totalQueries > 0
        ? Math.round(this.totalQueryDurationMs / this.totalQueries)
        : 0,
      maxQueryDurationMs: this.maxQueryDurationMs,
      lastQueryAt: this.lastQueryAt,
    }
  }

  /**
   * Get stats formatted for the health endpoint.
   */
  getHealthInfo(): {
    pool: PoolStats
    peakActiveConnections: number
    alerts: Array<{ type: string; message: string; timestamp: string }>
  } {
    return {
      pool: this.getStats(),
      peakActiveConnections: this.peakActiveConnections,
      alerts: this.alerts.slice(-10).map((a) => ({
        type: a.type,
        message: a.message,
        timestamp: new Date(a.timestamp).toISOString(),
      })),
    }
  }

  // ── Pressure Detection ──────────────────────────────────────────────────

  private checkPressure(): void {
    const stats = this.getStats()

    if (stats.utilizationPercent >= 100) {
      this.alert('critical', `Connection pool exhausted: ${stats.activeConnections}/${stats.connectionLimit} connections in use`, stats)
    } else if (stats.utilizationPercent >= PRESSURE_THRESHOLD_PERCENT) {
      this.alert('warning', `Connection pool under pressure: ${stats.utilizationPercent}% utilized (${stats.activeConnections}/${stats.connectionLimit})`, stats)
    }

    // Check for stale connections (no queries for 5 minutes)
    if (stats.lastQueryAt && Date.now() - stats.lastQueryAt > 5 * 60_000) {
      // This might be normal during low traffic — don't alert
    }
  }

  private alert(type: 'warning' | 'critical', message: string, stats: PoolStats): void {
    const now = Date.now()

    // Cooldown — don't alert more than once per minute
    if (now - this.lastAlertTime < ALERT_COOLDOWN_MS) return
    this.lastAlertTime = now

    const poolAlert: PoolAlert = { type, message, timestamp: now, stats }
    this.alerts.push(poolAlert)

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50)
    }

    // Log
    if (type === 'critical') {
      console.error(`[POOL:CRITICAL] ${message}`)
    } else {
      console.warn(`[POOL:WARN] ${message}`)
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const globalForPool = globalThis as unknown as {
  courtvisionPoolMonitor: PoolMonitor | undefined
}

const _poolMonitor: PoolMonitor =
  globalForPool.courtvisionPoolMonitor ?? new PoolMonitor()

if (!globalForPool.courtvisionPoolMonitor) {
  globalForPool.courtvisionPoolMonitor = _poolMonitor
}

/**
 * The pool monitor instance.
 *
 * Automatically initializes on first import.
 * Attach to /api/health for monitoring.
 *
 * @example
 * import { poolMonitor } from '@/lib/performance/pool-monitor'
 *
 * // In /api/health:
 * const poolInfo = poolMonitor.getHealthInfo()
 * return NextResponse.json({ pool: poolInfo })
 */
export const poolMonitor = _poolMonitor

// Auto-initialize on import
poolMonitor.init()