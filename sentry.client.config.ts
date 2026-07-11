import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'false',

  // Match the app's domain in production
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.space-z\.ai/,
    /^(https:\/\/)?(www\.)?courtvision\.ai/,
    /^(https:\/\/)?(www\.)?courtvision-app\.vercel\.app/,
  ],

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
      return null
    }
    return breadcrumb
  },

  ignoreErrors: [
    'JWEDecryptionFailed',
    'NEXT_REDIRECT',
    'AbortController is not supported',
  ],
})