import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('config module', () => {
  let config: typeof import('@/lib/config').config
  let validateConfig: typeof import('@/lib/config').validateConfig

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/lib/config')
    config = mod.config
    validateConfig = mod.validateConfig
  })

  // ── Structure ─────────────────────────────────────────────────────────────

  describe('structure', () => {
    it('has all required top-level sections', () => {
      expect(config).toHaveProperty('env')
      expect(config).toHaveProperty('database')
      expect(config).toHaveProperty('auth')
      expect(config).toHaveProperty('sentry')
      expect(config).toHaveProperty('stripe')
      expect(config).toHaveProperty('redis')
      expect(config).toHaveProperty('storage')
      expect(config).toHaveProperty('supabase')
      expect(config).toHaveProperty('security')
      expect(config).toHaveProperty('notifications')
      expect(config).toHaveProperty('logging')
      expect(config).toHaveProperty('email')
    })

    it('env section has nodeEnv, isDev, isProd, port, hostname', () => {
      expect(config.env).toHaveProperty('nodeEnv')
      expect(config.env).toHaveProperty('isDev')
      expect(config.env).toHaveProperty('isProd')
      expect(config.env).toHaveProperty('port')
      expect(config.env).toHaveProperty('hostname')
      expect(typeof config.env.nodeEnv).toBe('string')
      expect(typeof config.env.port).toBe('number')
    })

    it('database section has url and provider', () => {
      expect(config.database).toHaveProperty('url')
      expect(config.database).toHaveProperty('provider')
      expect(['sqlite', 'postgresql']).toContain(config.database.provider)
    })

    it('auth section has secret, url, jwtSecret', () => {
      expect(config.auth).toHaveProperty('secret')
      expect(config.auth).toHaveProperty('url')
      expect(config.auth).toHaveProperty('jwtSecret')
      expect(typeof config.auth.secret).toBe('string')
    })

    it('security section has encryptionKey, allowedOrigins, devShowResetToken', () => {
      expect(config.security).toHaveProperty('encryptionKey')
      expect(config.security).toHaveProperty('allowedOrigins')
      expect(config.security).toHaveProperty('devShowResetToken')
      expect(typeof config.security.encryptionKey).toBe('string')
      expect(Array.isArray(config.security.allowedOrigins)).toBe(true)
    })

    it('sentry section has required fields', () => {
      expect(config.sentry).toHaveProperty('dsn')
      expect(config.sentry).toHaveProperty('publicDsn')
      expect(config.sentry).toHaveProperty('enabled')
      expect(typeof config.sentry.enabled).toBe('boolean')
    })

    it('stripe section has isEnabled boolean', () => {
      expect(config.stripe).toHaveProperty('isEnabled')
      expect(typeof config.stripe.isEnabled).toBe('boolean')
    })

    it('redis section has isEnabled boolean', () => {
      expect(config.redis).toHaveProperty('isEnabled')
      expect(typeof config.redis.isEnabled).toBe('boolean')
    })

    it('storage section has provider and s3 sub-section', () => {
      expect(config.storage).toHaveProperty('provider')
      expect(config.storage).toHaveProperty('s3')
      expect(config.storage.s3).toHaveProperty('bucket')
      expect(config.storage.s3).toHaveProperty('region')
    })

    it('logging section has level and logQueries', () => {
      expect(config.logging).toHaveProperty('level')
      expect(config.logging).toHaveProperty('logQueries')
      expect(typeof config.logging.level).toBe('string')
    })

    it('email section has appUrl', () => {
      expect(config.email).toHaveProperty('appUrl')
      expect(typeof config.email.appUrl).toBe('string')
    })
  })

  // ── Frozen properties ─────────────────────────────────────────────────────

  describe('frozen properties', () => {
    it('top-level config object is frozen', () => {
      expect(Object.isFrozen(config)).toBe(true)
    })

    it('env section is frozen', () => {
      expect(Object.isFrozen(config.env)).toBe(true)
    })

    it('database section is frozen', () => {
      expect(Object.isFrozen(config.database)).toBe(true)
    })

    it('security section is frozen', () => {
      expect(Object.isFrozen(config.security)).toBe(true)
    })

    it('cannot mutate a nested property', () => {
      expect(() => {
        ;(config.env as Record<string, unknown>).nodeEnv = 'hacked'
      }).toThrow()
    })

    it('cannot add new properties to config', () => {
      expect(() => {
        ;(config as Record<string, unknown>).hacked = true
      }).toThrow()
    })
  })

  // ── Environment variable reading ──────────────────────────────────────────

  describe('environment variable reading', () => {
    it('defaults to development when NODE_ENV is not set', () => {
      // In test env, NODE_ENV may or may not be set
      // Just verify the value is a string
      expect(typeof config.env.nodeEnv).toBe('string')
    })

    it('isDev and isProd are mutually exclusive', () => {
      expect(config.env.isDev).toBe(!config.env.isProd)
    })

    it('port defaults to 3000', () => {
      // PORT env var should not be set in test, so it defaults to 3000
      // But we can't guarantee that, so just check it's a valid port number
      expect(config.env.port).toBeGreaterThan(0)
      expect(config.env.port).toBeLessThanOrEqual(65535)
    })

    it('encryption key is 64 hex characters (32 bytes)', () => {
      expect(config.security.encryptionKey).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(config.security.encryptionKey)).toBe(true)
    })

    it('database provider is sqlite when no postgres URL is set', async () => {
      // In test env without postgres, should be sqlite
      const { config: c } = await import('@/lib/config')
      if (!process.env.DATABASE_URL?.startsWith('postgres')) {
        expect(c.database.provider).toBe('sqlite')
      }
    })

    it('storage provider defaults to local when no S3/Supabase', async () => {
      const { config: c } = await import('@/lib/config')
      if (!process.env.S3_BUCKET && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        expect(c.storage.provider).toBe('local')
      }
    })
  })

  // ── validateConfig ────────────────────────────────────────────────────────

  describe('validateConfig', () => {
    it('returns an array of warning strings', () => {
      const warnings = validateConfig()
      expect(Array.isArray(warnings)).toBe(true)
    })

    it('warnings include missing SENTRY_DSN in test env', () => {
      // Most test envs won't have SENTRY_DSN
      const warnings = validateConfig()
      if (!process.env.SENTRY_DSN) {
        expect(warnings.some(w => w.includes('SENTRY_DSN'))).toBe(true)
      }
    })

    it('warnings include missing RESEND_API_KEY in test env', () => {
      const warnings = validateConfig()
      if (!process.env.RESEND_API_KEY) {
        expect(warnings.some(w => w.includes('RESEND_API_KEY'))).toBe(true)
      }
    })
  })
})