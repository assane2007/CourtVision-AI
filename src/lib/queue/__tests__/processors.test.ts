import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNotificationCreate = vi.fn().mockResolvedValue({ id: 'notif-1' })
const mockVideoFindUnique = vi.fn()
const mockPushSubscriptionFindMany = vi.fn()
const mockPlayerFindUnique = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    notification: { create: mockNotificationCreate },
    video: { findUnique: mockVideoFindUnique },
    pushSubscription: { findMany: mockPushSubscriptionFindMany },
    player: { findUnique: mockPlayerFindUnique },
  },
}))

const mockAnalyzeFrames = vi.fn()
const mockFormAnalyze = vi.fn()
const mockPredict = vi.fn()

vi.mock('@/lib/ai/pipeline', () => ({
  aiPipeline: {
    video: { analyzeFrames: mockAnalyzeFrames },
    form: { analyze: mockFormAnalyze },
    predictions: { predict: mockPredict },
  },
}))

vi.mock('@/lib/video/frame-extractor', () => ({
  isFfmpegAvailable: vi.fn().mockReturnValue(false),
  extractFramesFromVideo: vi.fn(),
}))

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'email-1' }),
}))

vi.mock('@/lib/push', () => ({
  sendPushToPlayer: vi.fn().mockResolvedValue({ sent: 2, failed: 0, errors: [] }),
}))

vi.mock('@/lib/cache/helpers', () => ({
  invalidateTags: vi.fn().mockResolvedValue(undefined),
}))

// ── Tests ────────────────────────────────────────────────────────────────────

describe('queue processors', () => {
  let processVideoAnalysis: typeof import('@/lib/queue/processors').processVideoAnalysis
  let processFormAnalysis: typeof import('@/lib/queue/processors').processFormAnalysis
  let processNotificationSend: typeof import('@/lib/queue/processors').processNotificationSend
  let processExportGeneration: typeof import('@/lib/queue/processors').processExportGeneration
  let processInsightRefresh: typeof import('@/lib/queue/processors').processInsightRefresh

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/lib/queue/processors')
    processVideoAnalysis = mod.processVideoAnalysis
    processFormAnalysis = mod.processFormAnalysis
    processNotificationSend = mod.processNotificationSend
    processExportGeneration = mod.processExportGeneration
    processInsightRefresh = mod.processInsightRefresh
  })

  // ── processVideoAnalysis ──────────────────────────────────────────────────

  describe('processVideoAnalysis', () => {
    it('returns empty result when ffmpeg is not available', async () => {
      const result = await processVideoAnalysis({
        videoId: 'vid-1',
        playerId: 'p1',
      })
      expect(result.videoId).toBe('vid-1')
      expect(result.poses).toEqual([])
      expect(result.shots).toEqual([])
      expect(result.highlights).toEqual([])
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('returns empty result when video not found in DB', async () => {
      const { isFfmpegAvailable } = await import('@/lib/video/frame-extractor')
      vi.mocked(isFfmpegAvailable).mockReturnValue(true)

      mockVideoFindUnique.mockResolvedValue(null)

      const result = await processVideoAnalysis({
        videoId: 'vid-missing',
        playerId: 'p1',
      })
      expect(result.videoId).toBe('vid-missing')
      expect(result.shots).toEqual([])
    })

    it('returns empty result when video file cannot be read', async () => {
      const { isFfmpegAvailable, existsSync } = await import('@/lib/video/frame-extractor')
      vi.mocked(isFfmpegAvailable).mockReturnValue(true)
      mockVideoFindUnique.mockResolvedValue({ url: '/uploads/missing.mp4', playerId: 'p1' })

      // existsSync returns false (already mocked above)
      const result = await processVideoAnalysis({
        videoId: 'vid-nofile',
        playerId: 'p1',
      })
      expect(result.shots).toEqual([])
    })

    it('returns empty result on unexpected error (graceful degradation)', async () => {
      const { isFfmpegAvailable } = await import('@/lib/video/frame-extractor')
      vi.mocked(isFfmpegAvailable).mockReturnValue(true)
      mockVideoFindUnique.mockRejectedValue(new Error('DB connection lost'))

      const result = await processVideoAnalysis({
        videoId: 'vid-err',
        playerId: 'p1',
      })
      expect(result.videoId).toBe('vid-err')
      expect(result.poses).toEqual([])
    })
  })

  // ── processFormAnalysis ───────────────────────────────────────────────────

  describe('processFormAnalysis', () => {
    it('returns zero-score placeholder when no frame data provided', async () => {
      const result = await processFormAnalysis({
        videoId: 'vid-2',
        playerId: 'p1',
        frameData: undefined,
      })
      expect(result.score).toBe(0)
      expect(result.videoId).toBe('vid-2')
      expect(result.feedback).toContain('No frame data')
      expect(result.issues).toEqual([])
      expect(result.goodPoints).toEqual([])
    })

    it('calls AI pipeline and returns analysis result', async () => {
      mockFormAnalyze.mockResolvedValue({
        overallScore: 82,
        feedback: 'Good follow-through',
        issues: ['Elbow slightly off'],
        goodPoints: ['Stable base'],
      })

      const result = await processFormAnalysis({
        videoId: 'vid-3',
        playerId: 'p1',
        frameData: 'base64imagedata',
        drillId: 'free_throw',
      })

      expect(result.score).toBe(82)
      expect(result.feedback).toBe('Good follow-through')
      expect(result.issues).toEqual(['Elbow slightly off'])
      expect(result.goodPoints).toEqual(['Stable base'])
      expect(mockFormAnalyze).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'p1',
          imageBase64: 'base64imagedata',
          drillName: 'free_throw',
          category: 'shooting',
        }),
      )
    })

    it('uses default drillId when not provided', async () => {
      mockFormAnalyze.mockResolvedValue({
        overallScore: 70,
        feedback: 'OK',
        issues: [],
        goodPoints: [],
      })

      await processFormAnalysis({
        videoId: 'vid-4',
        playerId: 'p1',
        frameData: 'data',
      })

      expect(mockFormAnalyze).toHaveBeenCalledWith(
        expect.objectContaining({
          drillName: 'free_shooting',
        }),
      )
    })

    it('returns error result when AI pipeline throws', async () => {
      mockFormAnalyze.mockRejectedValue(new Error('AI service unavailable'))

      const result = await processFormAnalysis({
        videoId: 'vid-5',
        playerId: 'p1',
        frameData: 'data',
      })

      expect(result.score).toBe(0)
      expect(result.feedback).toContain('Analysis failed')
      expect(result.feedback).toContain('AI service unavailable')
      expect(result.issues).toEqual([])
    })
  })

  // ── processNotificationSend ───────────────────────────────────────────────

  describe('processNotificationSend', () => {
    it('creates in-app notification in database', async () => {
      await processNotificationSend({
        playerId: 'p1',
        title: 'Test Title',
        body: 'Test Body',
        type: 'in_app',
        data: { url: '/dashboard' },
      })

      expect(mockNotificationCreate).toHaveBeenCalledWith({
        data: {
          playerId: 'p1',
          type: 'system',
          title: 'Test Title',
          body: 'Test Body',
          data: JSON.stringify({ url: '/dashboard' }),
        },
      })
    })

    it('handles missing data gracefully for in_app', async () => {
      await processNotificationSend({
        playerId: 'p1',
        title: 'No Data',
        body: 'Body',
        type: 'in_app',
      })

      expect(mockNotificationCreate).toHaveBeenCalledWith({
        data: {
          playerId: 'p1',
          type: 'system',
          title: 'No Data',
          body: 'Body',
          data: JSON.stringify({}),
        },
      })
    })

    it('sends push notification to player subscriptions', async () => {
      mockPushSubscriptionFindMany.mockResolvedValue([
        { endpoint: 'https://push.example.com/1', p256dh: 'k1', auth: 'a1' },
        { endpoint: 'https://push.example.com/2', p256dh: 'k2', auth: 'a2' },
      ])

      await processNotificationSend({
        playerId: 'p1',
        title: 'Push Title',
        body: 'Push Body',
        type: 'push',
        data: { url: '/matches' },
      })

      const { sendPushToPlayer } = await import('@/lib/push')
      expect(sendPushToPlayer).toHaveBeenCalledWith({
        subscriptions: [
          { endpoint: 'https://push.example.com/1', keys: { p256dh: 'k1', auth: 'a1' } },
          { endpoint: 'https://push.example.com/2', keys: { p256dh: 'k2', auth: 'a2' } },
        ],
        title: 'Push Title',
        body: 'Push Body',
        url: '/matches',
      })
    })

    it('handles push with no subscriptions gracefully', async () => {
      mockPushSubscriptionFindMany.mockResolvedValue([])

      await expect(
        processNotificationSend({
          playerId: 'p1',
          title: 'Title',
          body: 'Body',
          type: 'push',
        }),
      ).resolves.toBeUndefined()
    })

    it('sends email notification when player has email', async () => {
      mockPlayerFindUnique.mockResolvedValue({ email: 'user@test.com', name: 'Test User' })

      await processNotificationSend({
        playerId: 'p1',
        title: 'Email Title',
        body: '<p>Email Body</p>',
        type: 'email',
      })

      const { sendEmail } = await import('@/lib/email')
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: 'Email Title',
        html: '<p>Email Body</p>',
      })
    })

    it('handles email when player has no email', async () => {
      mockPlayerFindUnique.mockResolvedValue({ email: null, name: 'No Email' })

      await expect(
        processNotificationSend({
          playerId: 'p1',
          title: 'Title',
          body: 'Body',
          type: 'email',
        }),
      ).resolves.toBeUndefined()
    })

    it('handles email when player not found', async () => {
      mockPlayerFindUnique.mockResolvedValue(null)

      await expect(
        processNotificationSend({
          playerId: 'p1',
          title: 'Title',
          body: 'Body',
          type: 'email',
        }),
      ).resolves.toBeUndefined()
    })

    it('handles push error without throwing', async () => {
      mockPushSubscriptionFindMany.mockRejectedValue(new Error('DB down'))

      await expect(
        processNotificationSend({
          playerId: 'p1',
          title: 'Title',
          body: 'Body',
          type: 'push',
        }),
      ).resolves.toBeUndefined()
    })

    it('handles email error without throwing', async () => {
      mockPlayerFindUnique.mockRejectedValue(new Error('DB down'))

      await expect(
        processNotificationSend({
          playerId: 'p1',
          title: 'Title',
          body: 'Body',
          type: 'email',
        }),
      ).resolves.toBeUndefined()
    })
  })

  // ── processExportGeneration ───────────────────────────────────────────────

  describe('processExportGeneration', () => {
    it('returns a result with a valid UUID exportId', async () => {
      const result = await processExportGeneration({
        videoId: 'vid-6',
        playerId: 'p1',
        format: 'mp4',
        quality: 'high',
        annotations: true,
      })

      expect(result.videoId).toBe('vid-6')
      expect(result.exportId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
      expect(result.format).toBe('mp4')
      expect(result.sizeBytes).toBe(0) // placeholder
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('works for gif format', async () => {
      const result = await processExportGeneration({
        videoId: 'vid-7',
        playerId: 'p1',
        format: 'gif',
        quality: 'low',
      })
      expect(result.format).toBe('gif')
      expect(result.exportId).toBeDefined()
    })

    it('works for webm format', async () => {
      const result = await processExportGeneration({
        videoId: 'vid-8',
        playerId: 'p1',
        format: 'webm',
        quality: 'medium',
      })
      expect(result.format).toBe('webm')
    })
  })

  // ── processInsightRefresh ─────────────────────────────────────────────────

  describe('processInsightRefresh', () => {
    it('calls AI prediction and invalidates cache', async () => {
      mockPredict.mockResolvedValue(null)

      await processInsightRefresh({
        playerId: 'p1',
        force: true,
      })

      expect(mockPredict).toHaveBeenCalledWith('p1', 'performance_trend', 'free', 'fr')

      const { invalidateTags } = await import('@/lib/cache/helpers')
      expect(invalidateTags).toHaveBeenCalledWith(['insights:p1'])
    })

    it('invalidates cache even when prediction fails', async () => {
      mockPredict.mockRejectedValue(new Error('AI down'))

      await processInsightRefresh({
        playerId: 'p2',
        force: false,
      })

      const { invalidateTags } = await import('@/lib/cache/helpers')
      expect(invalidateTags).toHaveBeenCalledWith(['insights:p2'])
    })

    it('handles cache invalidation error without throwing', async () => {
      mockPredict.mockResolvedValue(null)

      // Re-mock cache helpers to throw
      const { invalidateTags } = await import('@/lib/cache/helpers')
      vi.mocked(invalidateTags).mockRejectedValueOnce(new Error('Cache error'))

      await expect(
        processInsightRefresh({ playerId: 'p3' }),
      ).resolves.toBeUndefined()
    })
  })
})