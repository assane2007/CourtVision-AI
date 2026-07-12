import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/sanitize', () => ({
  sanitize: (s: string) => s,
}))

const mockDb = {
  player: {
    findUnique: vi.fn(),
  },
  workoutSession: {
    findMany: vi.fn(),
  },
  voiceSession: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({ db: mockDb }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

vi.mock('@/lib/monitoring', () => ({
  trackError: vi.fn(),
}))

vi.mock('@/lib/require-subscription', () => ({
  requireSubscription: vi.fn().mockResolvedValue(true),
  subscriptionError: vi.fn().mockReturnValue({ status: 403 }),
}))

// Mock z-ai-web-dev-sdk
const mockChatCompletionsCreate = vi.fn()
const mockTtsCreate = vi.fn()
vi.mock('z-ai-web-dev-sdk', () => ({
  default: {
    create: vi.fn().mockResolvedValue({
      chat: {
        completions: {
          create: (...args: unknown[]) => mockChatCompletionsCreate(...args),
        },
      },
      audio: {
        tts: {
          create: (...args: unknown[]) => mockTtsCreate(...args),
        },
      },
    }),
  },
}))

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeNextRequest(url: string, body?: unknown): Request {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new Request(new URL(url, 'http://localhost:3000'), init)
}

const authedSession = { user: { id: 'p1', email: 't@t.com' } }

function allowRateLimit() {
  mockRateLimit.mockReturnValue({ success: true, retryAfterMs: 0 })
}

// ── POST /api/ai/voice/coach ──────────────────────────────────────────────────

describe('POST /api/ai/voice/coach', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    allowRateLimit()
  })

  it('returns 401 when not authenticated', async () => {
    vi.resetModules()
    const { POST } = await import('@/app/api/ai/voice/coach/route')
    const res = await POST(makeNextRequest('/api/ai/voice/coach'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('autorisé')
  })

  it('returns 400 when question is empty', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.resetModules()
    const { POST } = await import('@/app/api/ai/voice/coach/route')
    const res = await POST(makeNextRequest('/api/ai/voice/coach', { question: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when question is missing', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.resetModules()
    const { POST } = await import('@/app/api/ai/voice/coach/route')
    const res = await POST(makeNextRequest('/api/ai/voice/coach', {}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when question exceeds 500 chars', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    vi.resetModules()
    const { POST } = await import('@/app/api/ai/voice/coach/route')
    const res = await POST(makeNextRequest('/api/ai/voice/coach', { question: 'a'.repeat(501) }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with AI reply and saves voice session', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Test Player',
      position: 'guard',
      level: 'intermediate',
      goals: 'shooting',
      xpLevel: 5,
    })
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.voiceSession.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'vs1' })

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{
        message: { content: 'Garde le bras droit tendu et relâchez au bon moment!' },
      }],
    })
    mockTtsCreate.mockResolvedValue('base64audio')

    vi.resetModules()
    const mod = await import('@/app/api/ai/voice/coach/route')
    const db = (await import('@/lib/db')).db as typeof mockDb

    const res = await mod.POST(makeNextRequest('/api/ai/voice/coach', { question: 'Comment améliorer mon tir?' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reply).toContain('bras')
    expect(body.audio).toBe('base64audio')
    expect(body.voiceSessionId).toBe('vs1')

    expect(db.voiceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerId: 'p1',
          transcript: 'Comment améliorer mon tir?',
        }),
      }),
    )
  })

  it('returns 200 without audio when TTS fails', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Test',
      position: 'guard',
      level: 'intermediate',
      goals: 'shooting',
      xpLevel: 5,
    })
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(mockDb.voiceSession.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'vs2' })

    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: 'Bon conseil!' } }],
    })
    mockTtsCreate.mockRejectedValue(new Error('TTS unavailable'))

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/voice/coach/route')
    const res = await POST(makeNextRequest('/api/ai/voice/coach', { question: 'Aide moi' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reply).toBe('Bon conseil!')
    expect(body.audio).toBeUndefined()
  })

  it('returns 429 when rate limited', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    mockRateLimit.mockReturnValue({ success: false, retryAfterMs: 60000 })

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/voice/coach/route')
    const res = await POST(makeNextRequest('/api/ai/voice/coach', { question: 'test' }))
    expect(res.status).toBe(429)
  })

  it('returns 404 when player not found', async () => {
    mockGetServerSession.mockResolvedValue(authedSession)
    ;(mockDb.player.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(mockDb.workoutSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    vi.resetModules()
    const { POST } = await import('@/app/api/ai/voice/coach/route')
    const res = await POST(makeNextRequest('/api/ai/voice/coach', { question: 'Conseil?' }))
    expect(res.status).toBe(404)
  })
})