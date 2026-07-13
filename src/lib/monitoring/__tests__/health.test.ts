import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database health check
const mockDbHealthCheck = vi.fn()
vi.mock('@/lib/database', () => ({
  healthCheck: mockDbHealthCheck,
}))

// Mock logger
vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('health check module', () => {
  let runHealthChecks: typeof import('@/lib/monitoring/health').runHealthChecks
  let markCronRan: typeof import('@/lib/monitoring/health').markCronRan

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    const mod = await import('@/lib/monitoring/health')
    runHealthChecks = mod.runHealthChecks
    markCronRan = mod.markCronRan
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── runHealthChecks ───────────────────────────────────────────────────────

  describe('runHealthChecks', () => {
    it('returns a result with the expected top-level fields', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 5,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('uptime')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('checks')
    })

    it('includes all check types', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 5,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result.checks).toHaveProperty('database')
      expect(result.checks).toHaveProperty('memory')
      expect(result.checks).toHaveProperty('disk')
      expect(result.checks).toHaveProperty('uptime')
      expect(result.checks).toHaveProperty('lastCron')
    })

    it('reports healthy when DB is healthy and no other issues', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 10,
        provider: 'sqlite',
      })

      // Mark a recent cron so lastCron is healthy
      markCronRan('test-job')

      const result = await runHealthChecks()
      expect(result.status).toBe('healthy')
    })

    it('reports unhealthy when DB health check fails', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 5000,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result.checks.database.status).toBe('unhealthy')
      expect(result.checks.database.error).toBe('Database connection failed')
      expect(result.status).toBe('unhealthy')
    })

    it('reports degraded when DB latency > 500ms', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 800,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result.checks.database.status).toBe('degraded')
      expect(result.status).toBe('degraded')
    })

    it('handles DB health check throwing an error', async () => {
      mockDbHealthCheck.mockRejectedValue(new Error('Connection refused'))

      const result = await runHealthChecks()
      expect(result.checks.database.status).toBe('unhealthy')
      expect(result.checks.database.error).toBe('Connection refused')
      expect(result.status).toBe('unhealthy')
    })

    it('reports healthy memory when usage is low', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result.checks.memory.status).toBe('healthy')
      expect(result.checks.memory.details).toHaveProperty('heapUsedMb')
      expect(result.checks.memory.details).toHaveProperty('heapTotalMb')
      expect(result.checks.memory.details).toHaveProperty('rssMb')
      expect(result.checks.memory.details).toHaveProperty('usagePercent')
    })

    it('disk check always returns healthy (placeholder)', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result.checks.disk.status).toBe('healthy')
      expect(result.checks.disk.details).toHaveProperty('tmpDir')
    })

    it('uptime check always returns healthy', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result.checks.uptime.status).toBe('healthy')
      expect(result.checks.uptime.details).toHaveProperty('uptimeSeconds')
      expect(result.checks.uptime.details).toHaveProperty('uptimeDisplay')
    })

    it('uptime display formats correctly for seconds', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      const display = result.checks.uptime.details.uptimeDisplay as string
      // Process has been running some time, should be a string with 's', 'm', or 'h'
      expect(typeof display).toBe('string')
      expect(display.length).toBeGreaterThan(0)
    })

    it('version defaults to 0.2.0', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(result.version).toBe('0.2.0')
    })

    it('timestamp is a valid ISO string', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      expect(new Date(result.timestamp).getTime()).not.toBeNaN()
    })

    it('overall unhealthy takes precedence over degraded', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 5000,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      // DB is unhealthy → overall is unhealthy even if others are ok
      expect(result.status).toBe('unhealthy')
    })
  })

  // ── markCronRan ───────────────────────────────────────────────────────────

  describe('markCronRan', () => {
    it('updates lastCron check to healthy', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      // Before marking cron — should be degraded
      const before = await runHealthChecks()
      expect(before.checks.lastCron.status).toBe('degraded')

      // Mark a cron run
      markCronRan('daily-insights')

      // After marking — should be healthy
      const after = await runHealthChecks()
      expect(after.checks.lastCron.status).toBe('healthy')
      expect(after.checks.lastCron.details.lastRun).toBeDefined()
    })

    it('logs the job name', async () => {
      const { logger } = await import('@/lib/monitoring/logger')
      markCronRan('test-cron')
      expect(logger.info).toHaveBeenCalledWith(
        'Cron job executed',
        'health:cron',
        { jobName: 'test-cron' },
      )
    })

    it('lastCron becomes degraded after 30 minutes', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      markCronRan('test-job')
      vi.advanceTimersByTime(31 * 60_000)

      const result = await runHealthChecks()
      expect(result.checks.lastCron.status).toBe('degraded')
    })

    it('lastCron becomes unhealthy after 60 minutes', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      markCronRan('test-job')
      vi.advanceTimersByTime(61 * 60_000)

      const result = await runHealthChecks()
      expect(result.checks.lastCron.status).toBe('unhealthy')
    })

    it('minutesAgo is reported correctly', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      markCronRan('test-job')
      vi.advanceTimersByTime(10 * 60_000)

      const result = await runHealthChecks()
      expect(result.checks.lastCron.details.minutesAgo).toBe(10)
    })
  })

  // ── Check result shape ────────────────────────────────────────────────────

  describe('check result types', () => {
    it('each check has name and status', async () => {
      mockDbHealthCheck.mockResolvedValue({
        status: 'healthy',
        latencyMs: 1,
        provider: 'sqlite',
      })

      const result = await runHealthChecks()
      for (const [key, check] of Object.entries(result.checks)) {
        expect(check.name).toBe(key)
        expect(['healthy', 'degraded', 'unhealthy']).toContain(check.status)
      }
    })
  })
})