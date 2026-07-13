import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @sentry/nextjs so we can verify it's called when available ─────────
const mockCaptureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  default: { captureException: mockCaptureException },
}))

describe('monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module state between tests
    vi.resetModules()
  })

  it('trackError logs error details to console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError } = await import('@/lib/monitoring')
    trackError('test-context', new Error('something broke'))

    expect(spy).toHaveBeenCalledOnce()
    const logged = JSON.parse(spy.mock.calls[0][0] as string)
    expect(logged.level).toBe('error')
    expect(logged.context).toBe('test-context')
    expect(logged.message).toBe('something broke')
    expect(logged.timestamp).toBeTruthy()
    expect(logged.stack).toContain('something broke')

    spy.mockRestore()
  })

  it('handles Error instances', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError } = await import('@/lib/monitoring')
    const err = new RangeError('invalid range')
    trackError('validation', err)

    const logged = JSON.parse(spy.mock.calls[0][0] as string)
    expect(logged.message).toBe('invalid range')
    expect(logged.stack).toContain('RangeError')

    spy.mockRestore()
  })

  it('handles string errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError } = await import('@/lib/monitoring')
    trackError('api', 'network timeout')

    const logged = JSON.parse(spy.mock.calls[0][0] as string)
    expect(logged.message).toBe('network timeout')
    expect(logged.stack).toBeUndefined()

    spy.mockRestore()
  })

  it('handles unknown error types (number, object)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError } = await import('@/lib/monitoring')

    // Number
    trackError('number-ctx', 42)
    const numLogged = JSON.parse(spy.mock.calls[0][0] as string)
    expect(numLogged.message).toBe('42')

    // Plain object without message property
    trackError('obj-ctx', { code: 500, detail: 'fail' })
    const objLogged = JSON.parse(spy.mock.calls[1][0] as string)
    expect(objLogged.message).toBe('[object Object]')
    expect(objLogged.stack).toBeUndefined()

    spy.mockRestore()
  })

  it('handles null and undefined errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError } = await import('@/lib/monitoring')

    trackError('null-ctx', null)
    const nullLogged = JSON.parse(spy.mock.calls[0][0] as string)
    expect(nullLogged.message).toBe('null')

    trackError('undef-ctx', undefined)
    const undefLogged = JSON.parse(spy.mock.calls[1][0] as string)
    expect(undefLogged.message).toBe('undefined')

    spy.mockRestore()
  })

  it('increments totalErrors counter', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError, getMetrics } = await import('@/lib/monitoring')
    const before = getMetrics().totalErrors

    trackError('ctx1', 'err1')
    trackError('ctx2', 'err2')

    expect(getMetrics().totalErrors).toBe(before + 2)

    spy.mockRestore()
  })

  it('updates lastErrorTime on each trackError call', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError, getMetrics } = await import('@/lib/monitoring')

    trackError('timing', 'first')
    const time1 = getMetrics().lastErrorTime

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 5))

    trackError('timing', 'second')
    const time2 = getMetrics().lastErrorTime

    expect(time1).toBeTruthy()
    expect(time2).toBeTruthy()
    expect(time2).not.toBe(time1)

    spy.mockRestore()
  })

  it('stores errors in recentErrors (bounded to 10)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError, getMetrics } = await import('@/lib/monitoring')

    // Clear any previous state influence by pushing enough errors
    for (let i = 0; i < 15; i++) {
      trackError('batch', `error-${i}`)
    }

    const recent = getMetrics().recentErrors
    expect(recent.length).toBeLessThanOrEqual(10)
    // Most recent should be last
    expect(recent[recent.length - 1].message).toBe('error-14')
    // Each entry should have required fields
    for (const entry of recent) {
      expect(entry).toHaveProperty('context')
      expect(entry).toHaveProperty('message')
      expect(entry).toHaveProperty('timestamp')
    }

    spy.mockRestore()
  })

  it('trackEvent records events', async () => {
    const { trackEvent, getMetrics } = await import('@/lib/monitoring')

    trackEvent('page_view', { path: '/home' })
    trackEvent('button_click', { button: 'start' })

    const recent = getMetrics().recentEvents
    const found = recent.some((e) => e.name === 'page_view' && e.data?.path === '/home')
    expect(found).toBe(true)
  })

  it('getMetrics returns uptimeSeconds as a number', async () => {
    const { getMetrics } = await import('@/lib/monitoring')
    const metrics = getMetrics()
    expect(typeof metrics.uptimeSeconds).toBe('number')
    expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  it('does NOT call Sentry captureException (module not imported by monitoring)', async () => {
    // The monitoring module does not import @sentry/nextjs, so
    // captureException should never be called.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackError } = await import('@/lib/monitoring')
    trackError('sentry-test', new Error('sentry check'))

    // Sentry mock should not have been called because
    // monitoring.ts doesn't import @sentry/nextjs
    expect(mockCaptureException).not.toHaveBeenCalled()

    spy.mockRestore()
  })
})