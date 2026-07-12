/**
 * Structured JSON Logger for Production
 *
 * - Outputs structured JSON in production, pretty-printed in development
 * - Each log entry: { timestamp, level, message, context, traceId, userId, requestId, data, duration_ms }
 * - Supports child loggers with context: logger.child('auth').info('login success')
 * - Automatic trace ID propagation (from Sentry or generated)
 * - Performance timing: logger.time('db-query', () => db.user.findMany(...))
 * - Log levels: debug, info, warn, error, fatal
 * - Fatal logs trigger Sentry capture
 * - Log batching (flush every 5s or 100 entries)
 */

import * as Sentry from '@sentry/nextjs';
import { config } from '@/lib/config';

// ─── Types ──────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  traceId?: string
  userId?: string
  requestId?: string
  data?: Record<string, unknown>
  duration_ms?: number
}

interface PendingLog extends LogEntry {
  id: number
}

interface ChildLoggerOptions {
  context: string
  userId?: string
  traceId?: string
  requestId?: string
}

// ─── Configuration ──────────────────────────────────────────────────────────

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

const MIN_LEVEL: LogLevel = config.logging.level as LogLevel

const BATCH_FLUSH_INTERVAL_MS = 5_000
const BATCH_MAX_SIZE = 100

// ─── Log Buffer (batching) ──────────────────────────────────────────────────

const logBuffer: PendingLog[] = []
let logIdCounter = 0
let flushTimer: ReturnType<typeof setInterval> | null = null

function ensureFlushTimer() {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flushLogBuffer()
  }, BATCH_FLUSH_INTERVAL_MS)
  flushTimer.unref()
}

function flushLogBuffer() {
  if (logBuffer.length === 0) return
  const batch = logBuffer.splice(0)
  for (const entry of batch) {
    writeLog(entry)
  }
}

// ─── Formatting ─────────────────────────────────────────────────────────────

function formatPretty(entry: LogEntry): string {
  const { level, message, context, timestamp, duration_ms } = entry
  const ts = timestamp.replace('T', ' ').replace('Z', '')
  const ctx = context ? ` [${context}]` : ''
  const dur = duration_ms !== undefined ? ` ${duration_ms}ms` : ''
  const base = `[${ts}] [${level.toUpperCase().padEnd(5)}]${ctx} ${message}${dur}`
  if (entry.data && Object.keys(entry.data).length > 0) {
    return `${base} ${JSON.stringify(entry.data)}`
  }
  return base
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function writeLog(entry: LogEntry) {
  const isProd = process.env.NODE_ENV === 'production'
  const formatted = isProd ? formatJson(entry) : formatPretty(entry)

  switch (entry.level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(formatted)
      break
    case 'info':
      // eslint-disable-next-line no-console
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error': case'fatal':
      console.error(formatted)
      break
  }
}

// ─── Trace ID Helpers ───────────────────────────────────────────────────────

function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getSentryTraceId(): string | undefined {
  try {
    const scope = Sentry.getCurrentScope()
    const traceId = scope.getPropagationContext().traceId
    if (traceId && traceId !== '00000000000000000000000000000000') {
      return traceId
    }
  } catch {
    // Sentry not available
  }
  return undefined
}

// ─── Async Local Storage for request context ────────────────────────────────

import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId?: string
  userId?: string
  traceId?: string
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

function getRequestContext(): RequestContext {
  return requestContextStorage.getStore() ?? {}
}

// ─── Logger Core ────────────────────────────────────────────────────────────

function createLogEntry(
  level: LogLevel,
  message: string,
  options?: {
    context?: string
    data?: Record<string, unknown>
    duration_ms?: number
    userId?: string
    traceId?: string
    requestId?: string
  },
): PendingLog {
  const reqCtx = getRequestContext()

  const entry: PendingLog = {
    id: ++logIdCounter,
    timestamp: new Date().toISOString(),
    level,
    message,
    context: options?.context,
    traceId: options?.traceId ?? reqCtx.traceId ?? getSentryTraceId() ?? generateTraceId(),
    userId: options?.userId ?? reqCtx.userId,
    requestId: options?.requestId ?? reqCtx.requestId,
    data: options?.data,
    duration_ms: options?.duration_ms,
  }

  return entry
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL]
}

function enqueue(entry: PendingLog) {
  logBuffer.push(entry)
  ensureFlushTimer()

  // Flush immediately if we hit the batch size
  if (logBuffer.length >= BATCH_MAX_SIZE) {
    flushLogBuffer()
  }
}

// ─── Public Logger API ──────────────────────────────────────────────────────

const loggerCore = {
  debug(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('debug')) return
    enqueue(createLogEntry('debug', message, { context, data }))
  },

  info(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('info')) return
    enqueue(createLogEntry('info', message, { context, data }))
  },

  warn(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('warn')) return
    enqueue(createLogEntry('warn', message, { context, data }))
  },

  error(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('error')) return
    // Errors flush immediately
    writeLog(createLogEntry('error', message, { context, data }))
  },

  fatal(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('fatal')) return
    const entry = createLogEntry('fatal', message, { context, data })
    writeLog(entry)

    // Fatal always sends to Sentry
    try {
      Sentry.captureMessage(message, {
        level: 'fatal',
        tags: { context: context ?? 'unknown' },
        extra: data,
      })
    } catch {
      // Sentry not available — already logged to console
    }
  },

  /**
   * Create a child logger with pre-set context.
   *
   * @example
   * const authLogger = logger.child('auth')
   * authLogger.info('login success')  // logs with context: 'auth'
   */
  child(context: string): ChildLogger {
    return new ChildLogger(context)
  },

  /**
   * Time an async operation and log the result.
   *
   * @example
   * const users = await logger.time('db-query', () => db.user.findMany())
   */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    level: LogLevel = 'debug',
  ): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration_ms = Math.round(performance.now() - start)
      enqueue(createLogEntry(level, `${label} completed`, {
        context: 'timing',
        duration_ms,
      }))
      return result
    } catch (error) {
      const duration_ms = Math.round(performance.now() - start)
      const entry = createLogEntry('error', `${label} failed`, {
        context: 'timing',
        duration_ms,
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
      writeLog(entry)
      throw error
    }
  },

  /**
   * Manually flush the log buffer. Call before process exit.
   */
  flush() {
    flushLogBuffer()
  },
}

// ─── Child Logger Class ─────────────────────────────────────────────────────

class ChildLogger {
  private readonly parentContext: string
  private _userId?: string
  private _traceId?: string
  private _requestId?: string

  constructor(context: string) {
    this.parentContext = context
  }

  setUserId(userId: string): this {
    this._userId = userId
    return this
  }

  setTraceId(traceId: string): this {
    this._traceId = traceId
    return this
  }

  setRequestId(requestId: string): this {
    this._requestId = requestId
    return this
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (!shouldLog('debug')) return
    enqueue(createLogEntry('debug', message, {
      context: this.parentContext,
      data,
      userId: this._userId,
      traceId: this._traceId,
      requestId: this._requestId,
    }))
  }

  info(message: string, data?: Record<string, unknown>) {
    if (!shouldLog('info')) return
    enqueue(createLogEntry('info', message, {
      context: this.parentContext,
      data,
      userId: this._userId,
      traceId: this._traceId,
      requestId: this._requestId,
    }))
  }

  warn(message: string, data?: Record<string, unknown>) {
    if (!shouldLog('warn')) return
    enqueue(createLogEntry('warn', message, {
      context: this.parentContext,
      data,
      userId: this._userId,
      traceId: this._traceId,
      requestId: this._requestId,
    }))
  }

  error(message: string, data?: Record<string, unknown>) {
    if (!shouldLog('error')) return
    writeLog(createLogEntry('error', message, {
      context: this.parentContext,
      data,
      userId: this._userId,
      traceId: this._traceId,
      requestId: this._requestId,
    }))
  }

  fatal(message: string, data?: Record<string, unknown>) {
    if (!shouldLog('fatal')) return
    const entry = createLogEntry('fatal', message, {
      context: this.parentContext,
      data,
      userId: this._userId,
      traceId: this._traceId,
      requestId: this._requestId,
    })
    writeLog(entry)
    try {
      Sentry.captureMessage(message, {
        level: 'fatal',
        tags: { context: this.parentContext },
        extra: data,
      })
    } catch {
      // Sentry not available
    }
  }

  /**
   * Time an async operation within this child logger's context.
   */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    level: LogLevel = 'debug',
  ): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration_ms = Math.round(performance.now() - start)
      enqueue(createLogEntry(level, `${label} completed`, {
        context: this.parentContext,
        duration_ms,
        userId: this._userId,
        traceId: this._traceId,
        requestId: this._requestId,
      }))
      return result
    } catch (error) {
      const duration_ms = Math.round(performance.now() - start)
      writeLog(createLogEntry('error', `${label} failed`, {
        context: this.parentContext,
        duration_ms,
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
        userId: this._userId,
        traceId: this._traceId,
        requestId: this._requestId,
      }))
      throw error
    }
  }

  child(subContext: string): ChildLogger {
    const combined = this.parentContext
      ? `${this.parentContext}:${subContext}`
      : subContext
    const child = new ChildLogger(combined)
    child._userId = this._userId
    child._traceId = this._traceId
    child._requestId = this._requestId
    return child
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────

export type { LogEntry, LogLevel, ChildLoggerOptions }
export { ChildLogger }

export const logger = loggerCore

// Graceful shutdown: flush logs before exit
if (typeof process !== 'undefined') {
  const shutdownHandlers = ['SIGTERM', 'SIGINT'] as const
  for (const signal of shutdownHandlers) {
    process.on(signal, () => {
      loggerCore.flush()
    })
  }
}