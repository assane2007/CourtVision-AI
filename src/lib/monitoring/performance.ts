/**
 * Performance Monitoring
 *
 * In-memory circular buffer (last 1000 entries) for tracking:
 * - API calls (endpoint, method, duration, status)
 * - DB queries (model, operation, duration)
 * - AI requests (type, model, duration, tokens)
 *
 * Exposes stats via getPerformanceStats() for the monitoring API.
 */

import { logger } from './logger'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApiCallEntry {
  type: 'api'
  timestamp: number
  endpoint: string
  method: string
  durationMs: number
  statusCode: number
}

interface DbQueryEntry {
  type: 'db'
  timestamp: number
  model: string
  operation: string
  durationMs: number
}

interface AiRequestEntry {
  type: 'ai'
  timestamp: number
  aiType: string
  model: string
  durationMs: number
  tokensUsed?: number
}

type PerformanceEntry = ApiCallEntry | DbQueryEntry | AiRequestEntry

export interface PerformanceStats {
  period: string
  requestCount: number
  avgResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  endpointBreakdown: Record<string, {
    count: number
    avgMs: number
    errorCount: number
  }>
  dbStats: {
    avgQueryMs: number
    slowQueries: number
    topModels: Array<{ model: string; avgMs: number; count: number }>
  }
  aiStats: {
    avgDurationMs: number
    totalTokens: number
    requestCount: number
  }
}

// ─── Circular Buffer ────────────────────────────────────────────────────────

const BUFFER_SIZE = 1000
const buffer: (PerformanceEntry | null)[] = new Array(BUFFER_SIZE).fill(null)
let writeIndex = 0
// totalCount tracks the total number of entries ever pushed, useful for
// determining buffer wrap-around. Exported for diagnostics.
export let totalCount = 0

function pushEntry(entry: PerformanceEntry) {
  buffer[writeIndex] = entry
  writeIndex = (writeIndex + 1) % BUFFER_SIZE
  totalCount++
}

/**
 * Get all valid (non-null) entries from the buffer.
 */
function getAllEntries(): PerformanceEntry[] {
  const entries: PerformanceEntry[] = []
  for (let i = 0; i < BUFFER_SIZE; i++) {
    const entry = buffer[i]
    if (entry) entries.push(entry)
  }
  return entries
}

/**
 * Filter entries to a time period.
 */
function filterByPeriod(entries: PerformanceEntry[], periodMs: number): PerformanceEntry[] {
  const cutoff = Date.now() - periodMs
  return entries.filter((e) => e.timestamp >= cutoff)
}

// ─── Tracking Functions ─────────────────────────────────────────────────────

/**
 * Track an API call.
 *
 * @example
 * trackApiCall('/api/drills', 'GET', 45, 200)
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  durationMs: number,
  statusCode: number,
): void {
  pushEntry({
    type: 'api',
    timestamp: Date.now(),
    endpoint,
    method,
    durationMs,
    statusCode,
  })
}

/**
 * Track a database query.
 *
 * @example
 * trackDbQuery('Player', 'findMany', 23)
 */
export function trackDbQuery(
  model: string,
  operation: string,
  durationMs: number,
): void {
  pushEntry({
    type: 'db',
    timestamp: Date.now(),
    model,
    operation,
    durationMs,
  })

  // Log slow queries
  if (durationMs > 1000) {
    logger.warn('Slow database query', 'performance:db', {
      model,
      operation,
      durationMs,
    })
  }
}

/**
 * Track an AI/LLM request.
 *
 * @example
 * trackAiRequest('form-check', 'gpt-4o', 2500, 1500)
 */
export function trackAiRequest(
  aiType: string,
  model: string,
  durationMs: number,
  tokensUsed?: number,
): void {
  pushEntry({
    type: 'ai',
    timestamp: Date.now(),
    aiType,
    model,
    durationMs,
    tokensUsed,
  })
}

// ─── Stats Computation ──────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.min(idx, sorted.length - 1)]
}

const PERIODS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

/**
 * Get performance statistics for a given time period.
 *
 * @param period - '1h' | '24h' | '7d' (default: '1h')
 */
export function getPerformanceStats(period: '1h' | '24h' | '7d' = '1h'): PerformanceStats {
  const allEntries = getAllEntries()
  const periodMs = PERIODS[period] ?? PERIODS['1h']
  const entries = filterByPeriod(allEntries, periodMs)

  // ── API Stats ───────────────────────────────────────────────────────
  const apiEntries = entries.filter((e): e is ApiCallEntry => e.type === 'api')

  const apiDurations = apiEntries.map((e) => e.durationMs).sort((a, b) => a - b)
  const apiErrors = apiEntries.filter((e) => e.statusCode >= 400)
  const errorRate = apiEntries.length > 0
    ? Math.round((apiErrors.length / apiEntries.length) * 10000) / 100
    : 0

  // Endpoint breakdown
  const endpointMap = new Map<string, { durations: number[]; errorCount: number }>()
  for (const entry of apiEntries) {
    const key = `${entry.method} ${entry.endpoint}`
    const existing = endpointMap.get(key) ?? { durations: [], errorCount: 0 }
    existing.durations.push(entry.durationMs)
    if (entry.statusCode >= 400) existing.errorCount++
    endpointMap.set(key, existing)
  }

  const endpointBreakdown: PerformanceStats['endpointBreakdown'] = {}
  for (const [key, val] of endpointMap) {
    endpointBreakdown[key] = {
      count: val.durations.length,
      avgMs: Math.round(val.durations.reduce((s, d) => s + d, 0) / val.durations.length),
      errorCount: val.errorCount,
    }
  }

  // ── DB Stats ─────────────────────────────────────────────────────────
  const dbEntries = entries.filter((e): e is DbQueryEntry => e.type === 'db')
  const dbDurations = dbEntries.map((e) => e.durationMs)
  const slowQueries = dbEntries.filter((e) => e.durationMs > 500)

  const modelMap = new Map<string, { durations: number[]; count: number }>()
  for (const entry of dbEntries) {
    const existing = modelMap.get(entry.model) ?? { durations: [], count: 0 }
    existing.durations.push(entry.durationMs)
    existing.count++
    modelMap.set(entry.model, existing)
  }

  const topModels = Array.from(modelMap.entries())
    .map(([model, val]) => ({
      model,
      avgMs: Math.round(val.durations.reduce((s, d) => s + d, 0) / val.durations.length),
      count: val.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── AI Stats ─────────────────────────────────────────────────────────
  const aiEntries = entries.filter((e): e is AiRequestEntry => e.type === 'ai')
  const aiDurations = aiEntries.map((e) => e.durationMs)
  const totalTokens = aiEntries.reduce((s, e) => s + (e.tokensUsed ?? 0), 0)

  return {
    period,
    requestCount: apiEntries.length,
    avgResponseTime: apiDurations.length > 0
      ? Math.round(apiDurations.reduce((s, d) => s + d, 0) / apiDurations.length)
      : 0,
    p95ResponseTime: percentile(apiDurations, 95),
    p99ResponseTime: percentile(apiDurations, 99),
    errorRate,
    endpointBreakdown,
    dbStats: {
      avgQueryMs: dbDurations.length > 0
        ? Math.round(dbDurations.reduce((s, d) => s + d, 0) / dbDurations.length)
        : 0,
      slowQueries: slowQueries.length,
      topModels,
    },
    aiStats: {
      avgDurationMs: aiDurations.length > 0
        ? Math.round(aiDurations.reduce((s, d) => s + d, 0) / aiDurations.length)
        : 0,
      totalTokens,
      requestCount: aiEntries.length,
    },
  }
}

/**
 * Export all raw performance entries (for debugging / import).
 */
export function exportPerformanceEntries(): PerformanceEntry[] {
  return getAllEntries()
}