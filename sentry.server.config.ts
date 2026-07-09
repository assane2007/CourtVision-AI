import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  dataCollection: {
    // Keep default PII collection for debugging; tighten in production
  },

  // Capture 10% of transactions in development to reduce memory overhead
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,

  // Attach local variable values to stack frames (server only)
  includeLocalVariables: true,

  enableLogs: true,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Enable Sentry in ALL environments so errors reach the dashboard
  // Set NEXT_PUBLIC_SENTRY_ENABLED=false to disable
  enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'false',

  integrations: [
    Sentry.prismaIntegration(),
  ],

  // Ignore non-critical errors
  ignoreErrors: [
    'JWEDecryptionFailed',
    'NEXT_REDIRECT',
    'AbortController is not supported',
  ],
})