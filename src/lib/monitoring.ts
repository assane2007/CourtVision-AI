/**
 * Simple in-memory error tracking and event logging utility.
 * Designed for server-side use only.
 */

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

const MAX_ERRORS = 100
const errors: ErrorEntry[] = []
const events: EventEntry[] = []
let totalErrors = 0
let lastErrorTime: string | null = null

/**
 * Track an error with structured context.
 */
export function trackError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  totalErrors++
  lastErrorTime = new Date().toISOString()

  // Structured console output
  console.error(
    JSON.stringify({
      level: 'error',
      context,
      message,
      timestamp: lastErrorTime,
      ...(stack ? { stack } : {}),
    }),
  )

  // Keep last N errors in memory
  errors.push({ context, message, stack, timestamp: lastErrorTime })
  if (errors.length > MAX_ERRORS) {
    errors.shift()
  }
}

/**
 * Track a non-error event for observability.
 */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  events.push({ name, data, timestamp })

  // Keep events bounded
  if (events.length > 200) {
    events.shift()
  }
}

/**
 * Get basic monitoring metrics.
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