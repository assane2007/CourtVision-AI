type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: string
  data?: Record<string, unknown>
  timestamp: string
}

function formatLog(entry: LogEntry): string {
  const { level, message, context, data, timestamp } = entry
  const base = `[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''} ${message}`
  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`
  }
  return base
}

export const logger = {
  debug(message: string, context?: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(formatLog({ level: 'debug', message, context, data, timestamp: new Date().toISOString() }))
    }
  },
  info(message: string, context?: string, data?: Record<string, unknown>) {
    console.warn(formatLog({ level: 'info', message, context, data, timestamp: new Date().toISOString() }))
  },
  warn(message: string, context?: string, data?: Record<string, unknown>) {
    console.warn(formatLog({ level: 'warn', message, context, data, timestamp: new Date().toISOString() }))
  },
  error(message: string, context?: string, data?: Record<string, unknown>) {
    console.error(formatLog({ level: 'error', message, context, data, timestamp: new Date().toISOString() }))
  },
}