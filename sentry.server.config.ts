import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions sampled

  debug: false,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  // Disable Sentry in development
  enabled: process.env.NODE_ENV === 'production',

  integrations: [
    Sentry.httpIntegration({
      // Trace outgoing HTTP requests to external services
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any),
    Sentry.prismaIntegration(),
  ],

  // Filter out non-critical errors
  ignoreErrors: [
    'JWEDecryptionFailed', // Session expired — not a real error
    'NEXT_REDIRECT',
    'AbortController is not supported',
  ],

  // Set transaction name based on route
  tracesSampler({ samplingContext, parentSampled }) {
    if (parentSampled !== undefined) return parentSampled

    const url = samplingContext?.url || ''
    // Sample health checks less frequently
    if (url.includes('/api/health')) return 0.01
    // Sample static assets less frequently
    if (url.includes('/_next/static')) return 0
    // Default sampling rate
    return 0.1
  },
})