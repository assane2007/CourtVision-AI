import { PdfReportService, SessionReport } from '../../services/pdfReportService'
import {
    mockDbSession,
    mockDbUser,
    mockDbAnalysis,
    mockDbShots,
    mockDbApexScore,
} from '../fixtures/sessionData.fixture'

/**
 * PDF Report Service — Tests
 *
 * Tests the report generation pipeline: data fetching,
 * section building, insights generation, and edge cases.
 *
 * Pattern: AAA (Arrange → Act → Assert)
 */

// Build a chainable Supabase mock that returns different data per table
function createMockSupabase(overrides: Record<string, any> = {}) {
    const tableData: Record<string, any> = {
        sessions: { data: 'session' in overrides ? overrides.session : mockDbSession, error: null },
        users: { data: 'user' in overrides ? overrides.user : mockDbUser, error: null },
        analyses: { data: 'analysis' in overrides ? overrides.analysis : mockDbAnalysis, error: null },
        shots: { data: 'shots' in overrides ? overrides.shots : mockDbShots, error: null },
        apex_scores: { data: 'apex' in overrides ? overrides.apex : mockDbApexScore, error: null },
    }

    return {
        from: jest.fn((table: string) => {
            const result = tableData[table] || { data: null, error: null }
            const chain: any = {
                select: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue(result),
            }
            // For shots, don't auto-resolve to single — return array
            if (table === 'shots') {
                chain.order = jest.fn().mockResolvedValue(result)
            }
            return chain
        }),
        auth: {
            getUser: jest.fn(),
        },
    } as any
}

describe('PDF Report Service', () => {

    // ── Report structure ────────────────────────────────────

    it('generates a complete SessionReport for a valid session', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report).toBeDefined()
        expect(report.reportId).toContain('report_session-fixture-001')
        expect(report.generatedAt).toBeDefined()
        expect(report.player.name).toBe('Test Player')
        expect(report.session.id).toBe('session-fixture-001')
        expect(report.sections.length).toBeGreaterThan(0)
        expect(report.aiInsights.length).toBeGreaterThan(0)
    })

    it('includes correct player info from DB', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report.player.name).toBe('Test Player')
        expect(report.player.position).toBe('SG')
        expect(report.player.avatarUrl).toContain('player1.jpg')
    })

    it('includes session metadata', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report.session.duration).toBe(3600)
        expect(report.session.location).toBe('Downtown Court')
    })

    it('includes apex score breakdown when available', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report.apexScore).not.toBeNull()
        expect(report.apexScore!.overall).toBe(78)
        expect(report.apexScore!.shooting).toBe(82)
        expect(report.apexScore!.grade).toBe('A-')
    })

    // ── Section types ───────────────────────────────────────

    it('generates shot distribution stats section', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        const statsSection = report.sections.find(s => s.type === 'stats')
        expect(statsSection).toBeDefined()
        expect(statsSection!.data.totalShots).toBe(mockDbShots.length)
        expect(statsSection!.data.made).toBe(3) // s1, s3, s4 are 'made'
    })

    it('generates heatmap section with court coordinates', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        const heatmap = report.sections.find(s => s.type === 'heatmap')
        expect(heatmap).toBeDefined()
        expect(heatmap!.data.points).toHaveLength(mockDbShots.length)
        expect(heatmap!.data.points[0]).toHaveProperty('x')
        expect(heatmap!.data.points[0]).toHaveProperty('y')
        expect(heatmap!.data.points[0]).toHaveProperty('result')
    })

    it('generates AI analysis text section', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        const textSection = report.sections.find(s => s.type === 'text')
        expect(textSection).toBeDefined()
        expect(textSection!.data.summary).toContain('Strong shooting')
    })

    // ── Edge cases ──────────────────────────────────────────

    it('throws "Session not found" for non-existent session', async () => {
        // Arrange
        const supabase = createMockSupabase({
            session: null,
        })
        // Override the from().select().eq().eq().single() chain
        supabase.from = jest.fn((table: string) => {
            if (table === 'sessions') {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
                            }),
                        }),
                    }),
                }
            }
            return createMockSupabase().from(table)
        })
        const service = new PdfReportService(supabase)

        // Act & Assert
        await expect(
            service.generateSessionReport('non-existent-id', 'user-fixture-001')
        ).rejects.toThrow('Session not found')
    })

    it('generates report even when shots are empty', async () => {
        // Arrange
        const supabase = createMockSupabase({ shots: [] })
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert — should not throw, just no shot sections
        expect(report).toBeDefined()
        expect(report.sections.find(s => s.type === 'stats')).toBeUndefined()
    })

    it('generates report when analysis is null', async () => {
        // Arrange
        const supabase = createMockSupabase({ analysis: null })
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report).toBeDefined()
        expect(report.sections.find(s => s.type === 'text')).toBeUndefined()
    })

    it('generates report when apex score is null', async () => {
        // Arrange
        const supabase = createMockSupabase({ apex: null })
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report).toBeDefined()
        expect(report.apexScore).toBeNull()
        expect(report.sections.find(s => s.type === 'comparison')).toBeUndefined()
    })

    it('falls back to username when full_name is missing', async () => {
        // Arrange
        const supabase = createMockSupabase({
            user: { username: 'baller99', full_name: null, position: null, avatar_url: null }
        })
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report.player.name).toBe('baller99')
    })

    // ── AI Insights ─────────────────────────────────────────

    it('generates accuracy insight based on shot percentage', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert — 3/5 = 60% accuracy, should get positive insight
        expect(report.aiInsights.some(i => i.includes('accuracy') || i.includes('shooting'))).toBe(true)
    })

    it('returns placeholder insight when no data is available', async () => {
        // Arrange
        const supabase = createMockSupabase({ shots: [], analysis: null, apex: null })
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert
        expect(report.aiInsights.length).toBeGreaterThan(0)
        expect(report.aiInsights[0]).toContain('Complete more sessions')
    })

    // ── Performance ─────────────────────────────────────────

    it('generates in less than 2 seconds', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const start = Date.now()
        await service.generateSessionReport('session-fixture-001', 'user-fixture-001')
        const duration = Date.now() - start

        // Assert
        expect(duration).toBeLessThan(2000)
    })

    // ── Apex Score consistency ──────────────────────────────

    it('apex score in report matches source data', async () => {
        // Arrange
        const supabase = createMockSupabase()
        const service = new PdfReportService(supabase)

        // Act
        const report = await service.generateSessionReport('session-fixture-001', 'user-fixture-001')

        // Assert — score must be within valid range
        expect(report.apexScore!.overall).toBeGreaterThanOrEqual(0)
        expect(report.apexScore!.overall).toBeLessThanOrEqual(100)
        expect(report.apexScore!.overall).toBe(mockDbApexScore.overall)
    })
})
