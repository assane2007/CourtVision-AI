import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  dataCollection: {
    // Keep default PII collection for debugging; tighten in production
  },

  // Capture 10% of transactions in development to reduce memory overhead
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Enable Sentry in ALL environments so errors reach the dashboard
  // Set NEXT_PUBLIC_SENTRY_ENABLED=false to disable
  enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'false',

  // Distributed tracing — define which outgoing requests get trace headers
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.space-z\.ai/,
  ],

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out non-error breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
      return null
    }
    return breadcrumb
  },

  // Ignore non-critical errors
  ignoreErrors: [
    'JWEDecryptionFailed',
    'NEXT_REDIRECT',
    'AbortController is not supported',
  ],
})

// Hook into App Router navigation transitions (App Router only)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart