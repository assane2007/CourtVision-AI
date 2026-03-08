/**
 * @courtvision/shared — Structured logger for all packages.
 * Replaces console.log with structured JSON logging in production
 * and pretty-printed output in development.
 *
 * Usage:
 *   import { logger } from '@courtvision/shared'
 *   logger.info({ userId, sessionId }, 'Session created')
 *
 * @module logger
 */

/* eslint-disable no-console */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
const serviceName = process.env.SERVICE_NAME || 'courtvision'
const isProduction = process.env.NODE_ENV === 'production'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, context: LogContext, message: string): string {
  if (isProduction) {
    // Structured JSON for production log aggregation (Sentry, Datadog, etc.)
    return JSON.stringify({
      level,
      service: serviceName,
      msg: message,
      time: new Date().toISOString(),
      ...context,
    })
  }

  // Pretty format for development
  const prefix = {
    debug: '\x1b[90m[DEBUG]\x1b[0m',
    info: '\x1b[36m[INFO]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
  }
  const ctxStr = Object.keys(context).length
    ? ` ${JSON.stringify(context)}`
    : ''
  return `${prefix[level]} ${message}${ctxStr}`
}

/**
 * Structured logger — drop-in replacement for console.log.
 * In production, outputs JSON. In dev, outputs pretty-printed colored text.
 */
export const logger = {
  debug(context: LogContext | string, message?: string): void {
    if (!shouldLog('debug')) return
    const [ctx, msg] = typeof context === 'string' ? [{}, context] : [context, message || '']
    console.debug(formatMessage('debug', ctx, msg))
  },

  info(context: LogContext | string, message?: string): void {
    if (!shouldLog('info')) return
    const [ctx, msg] = typeof context === 'string' ? [{}, context] : [context, message || '']
    console.info(formatMessage('info', ctx, msg))
  },

  warn(context: LogContext | string, message?: string): void {
    if (!shouldLog('warn')) return
    const [ctx, msg] = typeof context === 'string' ? [{}, context] : [context, message || '']
    console.warn(formatMessage('warn', ctx, msg))
  },

  error(context: LogContext | string, message?: string): void {
    if (!shouldLog('error')) return
    const [ctx, msg] = typeof context === 'string' ? [{}, context] : [context, message || '']
    console.error(formatMessage('error', ctx, msg))
  },

  /** Create a child logger with bound context (e.g., requestId, userId) */
  child(baseContext: LogContext) {
    return {
      debug: (ctx: LogContext | string, msg?: string) => {
        const [c, m] = typeof ctx === 'string' ? [{}, ctx] : [ctx, msg || '']
        logger.debug({ ...baseContext, ...c }, m)
      },
      info: (ctx: LogContext | string, msg?: string) => {
        const [c, m] = typeof ctx === 'string' ? [{}, ctx] : [ctx, msg || '']
        logger.info({ ...baseContext, ...c }, m)
      },
      warn: (ctx: LogContext | string, msg?: string) => {
        const [c, m] = typeof ctx === 'string' ? [{}, ctx] : [ctx, msg || '']
        logger.warn({ ...baseContext, ...c }, m)
      },
      error: (ctx: LogContext | string, msg?: string) => {
        const [c, m] = typeof ctx === 'string' ? [{}, ctx] : [ctx, msg || '']
        logger.error({ ...baseContext, ...c }, m)
      },
    }
  },
}
