/**
 * Health Check System
 *
 * Comprehensive health checks for database, memory, disk, uptime, and cron.
 *
 * Usage:
 *   const result = await runHealthChecks()
 *   // result.status: 'healthy' | 'degraded' | 'unhealthy'
 *   // result.checks: { database: {...}, memory: {...}, disk: {...}, uptime: {...}, lastCron: {...} }
 */

import os from 'node:os';
import { healthCheck as dbHealthCheck } from '@/lib/database';
import { logger } from './logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CheckStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface CheckResult {
  name: string
  status: CheckStatus
  latencyMs?: number
  details?: Record<string, unknown>
  error?: string
}

export interface HealthCheckResult {
  status: CheckStatus
  version: string
  uptime: number
  timestamp: string
  checks: Record<string, CheckResult>
}

// ─── Configuration ──────────────────────────────────────────────────────────

const VERSION = process.env.npm_package_version ?? '0.2.0'

/** Tracks when the last background job/cron ran */
let lastCronTimestamp: string | null = null

/**
 * Register that a cron/background job has run.
 * Call this from your cron jobs so the health check knows they're alive.
 */
export function markCronRan(jobName?: string) {
  lastCronTimestamp = new Date().toISOString()
  logger.info('Cron job executed', 'health:cron', { jobName })
}

// ─── Individual Checks ──────────────────────────────────────────────────────

async function checkDatabase(): Promise<CheckResult> {
  const start = performance.now()
  try {
    const result = await dbHealthCheck()
    const latencyMs = Math.round(performance.now() - start)

    if (result.status === 'healthy') {
      return {
        name: 'database',
        status: result.latencyMs > 500 ? 'degraded' : 'healthy',
        latencyMs: result.latencyMs,
        details: {
          provider: result.provider,
          latencyMs: result.latencyMs,
          ...(result.poolInfo ? { poolInfo: result.poolInfo } : {}),
        },
      }
    }

    return {
      name: 'database',
      status: 'unhealthy',
      latencyMs,
      error: 'Database connection failed',
      details: {
        provider: result.provider,
        latencyMs: result.latencyMs,
      },
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    return {
      name: 'database',
      status: 'unhealthy',
      latencyMs,
      error: err instanceof Error ? err.message : 'Unknown database error',
    }
  }
}

function checkMemory(): CheckResult {
  const mem = process.memoryUsage()
  const totalMb = Math.round(mem.heapTotal / 1024 / 1024)
  const usedMb = Math.round(mem.heapUsed / 1024 / 1024)
  const rssMb = Math.round(mem.rss / 1024 / 1024)
  const usagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100)

  let status: CheckStatus = 'healthy'
  if (usagePercent > 90) {
    status = 'unhealthy'
  } else if (usagePercent > 80) {
    status = 'degraded'
  }

  return {
    name: 'memory',
    status,
    details: {
      heapUsedMb: usedMb,
      heapTotalMb: totalMb,
      rssMb,
      usagePercent,
    },
  }
}

function checkDisk(): CheckResult {
  // Placeholder for production — in a real deployment you'd check
  // actual disk usage via `df` or a native binding.
  // For now, we just report the temp directory status.

  const tmpDir = os.tmpdir()

  return {
    name: 'disk',
    status: 'healthy',
    details: {
      tmpDir,
      note: 'Disk monitoring is a placeholder. Integrate df/statvfs in production.',
    },
  }
}

function checkUptime(): CheckResult {
  const uptime = process.uptime()
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)

  return {
    name: 'uptime',
    status: 'healthy',
    details: {
      uptimeSeconds: Math.round(uptime),
      uptimeDisplay: uptime < 60
        ? `${Math.round(uptime)}s`
        : uptime < 3600
          ? `${minutes}m`
          : `${hours}h ${minutes}m`,
    },
  }
}

function checkLastCron(): CheckResult {
  if (!lastCronTimestamp) {
    return {
      name: 'lastCron',
      status: 'degraded',
      details: {
        note: 'No cron jobs have been registered yet. Ensure background jobs are running.',
      },
    }
  }

  const lastRun = new Date(lastCronTimestamp).getTime()
  const elapsed = Date.now() - lastRun
  const minutesAgo = Math.round(elapsed / 60_000)

  // If no cron has run in 30 minutes, consider it degraded
  let status: CheckStatus = 'healthy'
  if (minutesAgo > 60) {
    status = 'unhealthy'
  } else if (minutesAgo > 30) {
    status = 'degraded'
  }

  return {
    name: 'lastCron',
    status,
    details: {
      lastRun: lastCronTimestamp,
      minutesAgo,
    },
  }
}

// ─── Main Health Check Runner ───────────────────────────────────────────────

/**
 * Run all health checks and return a combined result.
 *
 * @example
 * const result = await runHealthChecks()
 * if (result.status === 'unhealthy') {
 *   // trigger alert / restart
 * }
 */
export async function runHealthChecks(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString()

  const checks: Record<string, CheckResult> = {}

  // Run independent checks in parallel
  const [dbCheck] = await Promise.all([
    checkDatabase(),
  ])

  checks.database = dbCheck
  checks.memory = checkMemory()
  checks.disk = checkDisk()
  checks.uptime = checkUptime()
  checks.lastCron = checkLastCron()

  // Determine overall status
  let overallStatus: CheckStatus = 'healthy'
  for (const check of Object.values(checks)) {
    if (check.status === 'unhealthy') {
      overallStatus = 'unhealthy'
      break
    }
    if (check.status === 'degraded') {
      overallStatus = 'degraded'
    }
  }

  if (overallStatus !== 'healthy') {
    logger.warn('Health check not fully healthy', 'health', {
      status: overallStatus,
      unhealthy: Object.values(checks)
        .filter((c) => c.status !== 'healthy')
        .map((c) => ({ name: c.name, status: c.status })),
    })
  }

  return {
    status: overallStatus,
    version: VERSION,
    uptime: process.uptime(),
    timestamp,
    checks,
  }
}