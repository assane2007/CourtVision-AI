import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  dataCollection: {
    // Keep default PII collection for debugging; tighten in production
  },

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Attach local variable values to stack frames (server only)
  includeLocalVariables: true,

  enableLogs: true,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  enabled: process.env.NODE_ENV === 'production',

  integrations: [
    Sentry.prismaIntegration(),
  ],

  // Filter out non-critical errors
  ignoreErrors: [
    'JWEDecryptionFailed',
    'NEXT_REDIRECT',
    'AbortController is not supported',
  ],

  // Sample health checks and static assets less frequently
  tracesSampler({ samplingContext, parentSampled }) {
    if (parentSampled !== undefined) return parentSampled

    const url = samplingContext?.url || ''
    if (url.includes('/api/health')) return 0.01
    if (url.includes('/_next/static')) return 0
    return 0.1
  },
})