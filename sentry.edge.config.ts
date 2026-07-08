import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1, // Fixed from 1.0 — 10% for edge

  debug: false,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Disable Sentry in development
  enabled: process.env.NODE_ENV === 'production',
})