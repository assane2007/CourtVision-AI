/**
 * CourtVision AI — Centralized Configuration Module
 *
 * Server-side only. Reads and validates all environment variables,
 * provides typed access grouped by domain, and prevents mutation
 * via Object.freeze().
 *
 * Usage:
 *   import { config, validateConfig } from '@/lib/config'
 *   if (config.stripe.isEnabled) { ... }
 */

import { randomBytes } from 'node:crypto'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AppConfig {
  env: {
    nodeEnv: string
    isDev: boolean
    isProd: boolean
    port: number
    hostname: string
  }
  database: {
    url: string
    provider: 'sqlite' | 'postgresql'
  }
  auth: {
    secret: string
    url: string
    jwtSecret: string
  }
  sentry: {
    dsn: string
    publicDsn: string
    enabled: boolean
    release: string | undefined
    authToken: string | undefined
  }
  stripe: {
    secretKey: string | undefined
    publishableKey: string | undefined
    webhookSecret: string | undefined
    isEnabled: boolean
  }
  redis: {
    url: string | undefined
    isEnabled: boolean
  }
  storage: {
    provider: 'local' | 's3'
    s3: {
      bucket: string | undefined
      region: string
      accessKey: string
      secretKey: string
      endpoint: string | undefined
    }
  }
  security: {
    encryptionKey: string
    allowedOrigins: string[]
    devShowResetToken: boolean
  }
  notifications: {
    vapidPrivateKey: string | undefined
    vapidPublicKey: string | undefined
  }
  logging: {
    level: string
    logQueries: boolean
  }
  email: {
    appUrl: string
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const

function isPostgresqlUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}

function requireEnv(name: string, message?: string): string {
  const value = process.env[name]
  if (!value && !process.env.SKIP_ENV_VALIDATION) {
    throw new Error(
      message ?? `FATAL: ${name} is not set. Please add it to your .env file.`
    )
  }
  return value || ''
}

// ─── Build Config ───────────────────────────────────────────────────────────

const nodeEnv = process.env.NODE_ENV || 'development'
const isProd = nodeEnv === 'production'
const isDev = nodeEnv === 'development'

// Database
const databaseUrl = isProd
  ? requireEnv('DATABASE_URL')
  : (process.env.DATABASE_URL || 'file:./db/courtvision.db')

// Auth
const nextauthSecret = isProd
  ? (() => {
      const secret = requireEnv('NEXTAUTH_SECRET')
      if (secret.length < 32) {
        throw new Error(
          'FATAL: NEXTAUTH_SECRET must be at least 32 characters. Generate one with:\n' +
          '  openssl rand -base64 48'
        )
      }
      return secret
    })()
  : (process.env.NEXTAUTH_SECRET || 'dev-secret-do-not-use-in-production-32chars!')

const nextauthUrl = isProd
  ? requireEnv('NEXTAUTH_URL')
  : (process.env.NEXTAUTH_URL || 'http://localhost:3000')

const jwtSecret = process.env.JWT_SECRET || nextauthSecret

// Sentry
const sentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'false'

// Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || undefined
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || undefined
const stripeIsEnabled = !!(stripeSecretKey && stripePublishableKey)

// Redis
const redisUrl = process.env.REDIS_URL || undefined

// Storage
const s3Bucket = process.env.S3_BUCKET || undefined
const storageProvider: 'local' | 's3' = s3Bucket ? 's3' : 'local'

// Security — Encryption key
let encryptionKey: string
if (process.env.ENCRYPTION_KEY) {
  encryptionKey = process.env.ENCRYPTION_KEY
  const keyBuffer = Buffer.from(encryptionKey, 'hex')
  if (keyBuffer.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars). Got ${keyBuffer.length} bytes.`
    )
  }
} else if (isProd) {
  throw new Error(
    'FATAL: ENCRYPTION_KEY is not set. Generate one with:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  )
} else {
  encryptionKey = randomBytes(32).toString('hex')
  console.warn(
    '[CONFIG] Auto-generated ENCRYPTION_KEY for development. Do NOT use in production.'
  )
}

// Security — Allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : []

// Logging
const logLevel = (() => {
  const envLevel = process.env.LOG_LEVEL
  if (envLevel && VALID_LOG_LEVELS.includes(envLevel as typeof VALID_LOG_LEVELS[number])) {
    return envLevel
  }
  return isProd ? 'info' : 'debug'
})()

const logQueries = isDev || process.env.LOG_QUERIES === 'true'

// Email
const emailAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || nextauthUrl

// ─── Assemble & Freeze ──────────────────────────────────────────────────────

const rawConfig: AppConfig = {
  env: {
    nodeEnv,
    isDev,
    isProd,
    port: parseInt(process.env.PORT || '3000', 10),
    hostname: process.env.HOSTNAME || '0.0.0.0',
  },
  database: {
    url: databaseUrl,
    provider: isPostgresqlUrl(databaseUrl) ? 'postgresql' : 'sqlite',
  },
  auth: {
    secret: nextauthSecret,
    url: nextauthUrl,
    jwtSecret,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    publicDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    enabled: sentryEnabled,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    authToken: process.env.SENTRY_AUTH_TOKEN || undefined,
  },
  stripe: {
    secretKey: stripeSecretKey,
    publishableKey: stripePublishableKey,
    webhookSecret: stripeWebhookSecret,
    isEnabled: stripeIsEnabled,
  },
  redis: {
    url: redisUrl,
    isEnabled: !!redisUrl,
  },
  storage: {
    provider: storageProvider,
    s3: {
      bucket: s3Bucket,
      region: process.env.S3_REGION || 'auto',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
      endpoint: process.env.S3_ENDPOINT || undefined,
    },
  },
  security: {
    encryptionKey,
    allowedOrigins,
    devShowResetToken: isDev && process.env.DEV_SHOW_RESET_TOKEN === 'true',
  },
  notifications: {
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || undefined,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || undefined,
  },
  logging: {
    level: logLevel,
    logQueries,
  },
  email: {
    appUrl: emailAppUrl,
  },
}

/**
 * Deep-freeze an object so it cannot be mutated.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') return obj

  Object.keys(obj as object).forEach((key) => {
    const value = (obj as Record<string, unknown>)[key]
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value)
    }
  })

  return Object.freeze(obj) as Readonly<T>
}

/**
 * The application configuration object.
 *
 * Typed, frozen, and organized by domain. Import and use directly:
 *
 * @example
 *   import { config } from '@/lib/config'
 *   console.log(config.database.provider) // 'sqlite' | 'postgresql'
 *   console.log(config.stripe.isEnabled)  // true | false
 */
export const config: Readonly<AppConfig> = deepFreeze(rawConfig)

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate the configuration and log warnings for missing optional vars.
 *
 * Call this at server startup (e.g., in instrumentation.ts or a layout)
 * to get a clear picture of what's configured vs. using defaults.
 *
 * @returns An array of warning strings (empty if everything is fine).
 */
export function validateConfig(): string[] {
  const warnings: string[] = []

  const warn = (msg: string) => {
    warnings.push(msg)
    console.warn(`[CONFIG] ⚠  ${msg}`)
  }

  // ── Optional vars that should be set in production ──

  if (isProd && !process.env.JWT_SECRET) {
    warn('JWT_SECRET is not set — falling back to NEXTAUTH_SECRET. For security, use a separate key in production.')
  }

  if (isProd && !process.env.ENCRYPTION_KEY) {
    // This would have already thrown, but just in case
    warn('ENCRYPTION_KEY is not set.')
  }

  // Sentry
  if (!process.env.SENTRY_DSN) {
    warn('SENTRY_DSN is not set — server-side error tracking disabled.')
  }
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    warn('NEXT_PUBLIC_SENTRY_DSN is not set — client-side error tracking disabled.')
  }
  if (!process.env.SENTRY_AUTH_TOKEN) {
    warn('SENTRY_AUTH_TOKEN is not set — source map uploads will fail during build.')
  }

  // Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    warn('STRIPE_SECRET_KEY is not set — payment features disabled.')
  }
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — client-side Stripe disabled.')
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warn('STRIPE_WEBHOOK_SECRET is not set — Stripe webhook verification will fail.')
  }

  // Redis
  if (!process.env.REDIS_URL) {
    warn('REDIS_URL is not set — using in-memory cache and rate limiter.')
  }

  // S3
  if (!process.env.S3_BUCKET) {
    warn('S3_BUCKET is not set — using local filesystem storage.')
  } else {
    if (!process.env.S3_ACCESS_KEY) {
      warn('S3_BUCKET is set but S3_ACCESS_KEY is missing — S3 uploads will fail.')
    }
    if (!process.env.S3_SECRET_KEY) {
      warn('S3_BUCKET is set but S3_SECRET_KEY is missing — S3 uploads will fail.')
    }
  }

  // Notifications
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) {
    warn('VAPID keys are not set — web push notifications disabled.')
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — client push subscription will use a dummy key.')
  }

  // Email
  if (!process.env.RESEND_API_KEY) {
    warn('RESEND_API_KEY is not set — email sending is mocked (console only).')
  }

  // CORS
  if (isProd && !process.env.ALLOWED_ORIGINS) {
    warn('ALLOWED_ORIGINS is not set — CORS will be restrictive in production.')
  }

  // Sentry release
  if (!process.env.NEXT_PUBLIC_SENTRY_RELEASE) {
    warn('NEXT_PUBLIC_SENTRY_RELEASE is not set — Sentry releases will not be tagged.')
  }

  if (warnings.length === 0) {
    console.warn('[CONFIG] ✓ All configuration validated successfully.')
  } else {
    console.warn(`[CONFIG] ${warnings.length} warning(s) found.`)
  }

  return warnings
}

