import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  dataCollection: {
    // Keep default PII collection for debugging; tighten in production
  },

  // Capture 100% of transactions for performance monitoring
  tracesSampleRate: 1.0,

  enableLogs: true,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  enabled: process.env.NODE_ENV === 'production',

  // Ignore non-critical errors
  ignoreErrors: [
    'JWEDecryptionFailed',
    'NEXT_REDIRECT',
    'AbortController is not supported',
  ],
})