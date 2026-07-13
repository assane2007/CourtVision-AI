/**
 * Alert Rules Engine
 *
 * Evaluates built-in alert rules against live metrics from the
 * performance monitoring and health check systems.
 *
 * Built-in rules:
 * - error_rate > 5% → critical
 * - avg_response_time > 2s → warning
 * - memory_usage > 85% → critical
 * - db_query_time > 1s → warning
 * - consecutive_failures > 3 → critical
 */

import { getPerformanceStats, type PerformanceStats } from './performance';
import { logger } from './logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AlertSeverity = 'warning' | 'critical'

export interface Alert {
  name: string
  severity: AlertSeverity
  message: string
  value: number
  threshold: number
  timestamp: string
}

interface AlertRule {
  name: string
  severity: AlertSeverity
  evaluate: () => Alert | null
}

// ─── Cooldown Tracking ──────────────────────────────────────────────────────

const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes between repeated alerts
const lastAlertTime = new Map<string, number>()

function isOnCooldown(name: string): boolean {
  const last = lastAlertTime.get(name)
  if (!last) return false
  return Date.now() - last < COOLDOWN_MS
}

function markAlerted(name: string) {
  lastAlertTime.set(name, Date.now())
}

// ─── Consecutive Failure Tracking ───────────────────────────────────────────

let consecutiveFailures = 0
let lastFailureReset = Date.now()

/**
 * Record a successful request (resets consecutive failure counter).
 */
export function recordSuccess() {
  consecutiveFailures = 0
  lastFailureReset = Date.now()
}

/**
 * Record a failed request (increments consecutive failure counter).
 */
export function recordFailure() {
  consecutiveFailures++
}

// ─── Alert Rules ────────────────────────────────────────────────────────────

function createErrorRateRule(stats: PerformanceStats): AlertRule {
  return {
    name: 'high_error_rate',
    severity: 'critical',
    evaluate: () => {
      if (isOnCooldown('high_error_rate')) return null
      if (stats.errorRate > 5) {
        markAlerted('high_error_rate')
        return {
          name: 'high_error_rate',
          severity: 'critical',
          message: `Error rate is ${stats.errorRate}% (threshold: 5%)`,
          value: stats.errorRate,
          threshold: 5,
          timestamp: new Date().toISOString(),
        }
      }
      return null
    },
  }
}

function createResponseTimeRule(stats: PerformanceStats): AlertRule {
  return {
    name: 'high_response_time',
    severity: 'warning',
    evaluate: () => {
      if (isOnCooldown('high_response_time')) return null
      if (stats.avgResponseTime > 2000) {
        markAlerted('high_response_time')
        return {
          name: 'high_response_time',
          severity: 'warning',
          message: `Average response time is ${stats.avgResponseTime}ms (threshold: 2000ms)`,
          value: stats.avgResponseTime,
          threshold: 2000,
          timestamp: new Date().toISOString(),
        }
      }
      return null
    },
  }
}

function createMemoryUsageRule(): AlertRule {
  return {
    name: 'high_memory_usage',
    severity: 'critical',
    evaluate: () => {
      if (isOnCooldown('high_memory_usage')) return null
      const mem = process.memoryUsage()
      const usagePercent = (mem.heapUsed / mem.heapTotal) * 100
      if (usagePercent > 85) {
        markAlerted('high_memory_usage')
        return {
          name: 'high_memory_usage',
          severity: 'critical',
          message: `Memory usage is ${Math.round(usagePercent)}% (threshold: 85%)`,
          value: Math.round(usagePercent),
          threshold: 85,
          timestamp: new Date().toISOString(),
        }
      }
      return null
    },
  }
}

function createDbQueryTimeRule(stats: PerformanceStats): AlertRule {
  return {
    name: 'slow_db_queries',
    severity: 'warning',
    evaluate: () => {
      if (isOnCooldown('slow_db_queries')) return null
      if (stats.dbStats.avgQueryMs > 1000) {
        markAlerted('slow_db_queries')
        return {
          name: 'slow_db_queries',
          severity: 'warning',
          message: `Average DB query time is ${stats.dbStats.avgQueryMs}ms (threshold: 1000ms)`,
          value: stats.dbStats.avgQueryMs,
          threshold: 1000,
          timestamp: new Date().toISOString(),
        }
      }
      return null
    },
  }
}

function createConsecutiveFailuresRule(): AlertRule {
  return {
    name: 'consecutive_failures',
    severity: 'critical',
    evaluate: () => {
      if (isOnCooldown('consecutive_failures')) return null
      // Reset counter if no failures in 5 minutes
      if (Date.now() - lastFailureReset > 5 * 60 * 1000) {
        consecutiveFailures = 0
      }
      if (consecutiveFailures > 3) {
        markAlerted('consecutive_failures')
        return {
          name: 'consecutive_failures',
          severity: 'critical',
          message: `${consecutiveFailures} consecutive failures detected (threshold: 3)`,
          value: consecutiveFailures,
          threshold: 3,
          timestamp: new Date().toISOString(),
        }
      }
      return null
    },
  }
}

// ─── Alert Evaluation ───────────────────────────────────────────────────────

/**
 * Evaluate all alert rules and return any triggered alerts.
 * Each alert is also logged via the structured logger.
 */
export function evaluateAlerts(): Alert[] {
  const stats = getPerformanceStats('1h')

  const rules: AlertRule[] = [
    createErrorRateRule(stats),
    createResponseTimeRule(stats),
    createMemoryUsageRule(),
    createDbQueryTimeRule(stats),
    createConsecutiveFailuresRule(),
  ]

  const alerts: Alert[] = []

  for (const rule of rules) {
    try {
      const alert = rule.evaluate()
      if (alert) {
        alerts.push(alert)
        logger.warn(alert.message, 'alerts', {
          alertName: alert.name,
          severity: alert.severity,
          value: alert.value,
          threshold: alert.threshold,
        })
      }
    } catch (err) {
      logger.error(`Alert rule "${rule.name}" evaluation failed`, 'alerts', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return alerts
}

/**
 * Get the current consecutive failure count.
 */
export function getConsecutiveFailures(): number {
  return consecutiveFailures
}