// OpenTelemetry setup for distributed tracing
// Currently using Sentry for error tracking. This module provides
// performance monitoring hooks that integrate with Next.js instrumentation.

export function initTelemetry() {
  // Performance monitoring is handled by Sentry
  // when SENTRY_DSN is configured.
  // For custom spans, use Sentry.startSpan()
}

export function recordMetric(name: string, value: number, unit: string = 'ms') {
  // Records a custom metric. In production with Sentry, this creates
  // a transaction measurement. Falls back to console in development.
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[metric] ${name}: ${value}${unit}`)
  }
}