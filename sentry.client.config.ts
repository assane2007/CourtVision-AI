import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions sampled in production

  // Session Replay
  // Note: Requires ` Replay` integration to be added in instrumentation-client.ts
  replaysSessionSampleRate: 0, // Don't record full sessions
  replaysOnErrorSampleRate: 1.0, // Record all error sessions

  debug: false,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Disable Sentry in development
  enabled: process.env.NODE_ENV === 'production',

  // Integrations
  integrations: [
    // Default browser integrations + any custom ones
    Sentry.browserTracingIntegration({
      // Trace fetch and XHR requests
      traceFetch: true,
      traceXHR: true,
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out non-error events (e.g., console.warn)
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
      return null
    }
    return breadcrumb
  },

  // Ignore specific errors
  ignoreErrors: [
    'JWEDecryptionFailed', // Session expired — not a real error
    'NEXT_REDIRECT', // Normal Next.js redirect
    'AbortController is not supported', // Edge runtime limitation
  ],
})