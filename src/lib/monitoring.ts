/**
 * Simple in-memory error tracking and event logging utility.
 * Designed for server-side use only.
 *
 * Enhanced to use the structured logger from the monitoring module
 * and support stats export/import for debugging.
 */

import { logger } from './monitoring/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ErrorEntry {
  context: string
  message: string
  stack?: string
  timestamp: string
}

interface EventEntry {
  name: string
  data?: Record<string, unknown>
  timestamp: string
}

// ─── State ──────────────────────────────────────────────────────────────────

const MAX_ERRORS = 100
const MAX_EVENTS = 200
const errors: ErrorEntry[] = []
const events: EventEntry[] = []
let totalErrors = 0
let lastErrorTime: string | null = null

// ─── Tracking Functions ─────────────────────────────────────────────────────

/**
 * Track an error with structured context.
 * Uses the structured logger internally and sends to Sentry for 500-level errors.
 */
export function trackError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  totalErrors++
  lastErrorTime = new Date().toISOString()

  // Use the structured logger
  logger.error(message, context, {
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    ...(stack ? { stack } : {}),
  })

  // Keep last N errors in memory
  errors.push({ context, message, stack, timestamp: lastErrorTime })
  if (errors.length > MAX_ERRORS) {
    errors.shift()
  }
}

/**
 * Track a non-error event for observability.
 * Uses the structured logger at info level.
 */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  events.push({ name, data, timestamp })

  // Use the structured logger
  logger.info(name, 'event', data)

  // Keep events bounded
  if (events.length > MAX_EVENTS) {
    events.shift()
  }
}

// ─── Metrics ────────────────────────────────────────────────────────────────

/**
 * Get basic monitoring metrics.
 * Returns the same shape as the original implementation for backward compatibility.
 */
export function getMetrics() {
  return {
    totalErrors,
    lastErrorTime,
    recentErrors: errors.slice(-10).map((e) => ({
      context: e.context,
      message: e.message,
      timestamp: e.timestamp,
    })),
    recentEvents: events.slice(-10).map((e) => ({
      name: e.name,
      data: e.data,
      timestamp: e.timestamp,
    })),
    uptimeSeconds: process.uptime(),
  }
}

// ─── Export / Import ────────────────────────────────────────────────────────

/**
 * Export all monitoring data as a JSON-serializable object.
 * Useful for debugging and transferring state between processes.
 */
export function exportMonitoringState() {
  return {
    errors: errors.slice(),
    events: events.slice(),
    totalErrors,
    lastErrorTime,
    exportedAt: new Date().toISOString(),
  }
}

/**
 * Import monitoring state (e.g., from a previous process).
 * Merges errors and events into the current buffers.
 */
export function importMonitoringState(state: {
  errors?: ErrorEntry[]
  events?: EventEntry[]
  totalErrors?: number
  lastErrorTime?: string | null
}): void {
  if (state.errors?.length) {
    for (const entry of state.errors) {
      errors.push(entry)
    }
    while (errors.length > MAX_ERRORS) {
      errors.shift()
    }
  }

  if (state.events?.length) {
    for (const entry of state.events) {
      events.push(entry)
    }
    while (events.length > MAX_EVENTS) {
      events.shift()
    }
  }

  if (typeof state.totalErrors === 'number') {
    totalErrors = state.totalErrors
  }

  if (state.lastErrorTime) {
    lastErrorTime = state.lastErrorTime
  }

  logger.info('Monitoring state imported', 'monitoring', {
    importedErrors: state.errors?.length ?? 0,
    importedEvents: state.events?.length ?? 0,
    totalErrors,
  })
}

/**
 * Reset all monitoring state. Use with caution (mainly for tests).
 */
export function resetMonitoringState(): void {
  errors.length = 0
  events.length = 0
  totalErrors = 0
  lastErrorTime = null
}