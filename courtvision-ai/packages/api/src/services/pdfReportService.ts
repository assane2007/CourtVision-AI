/**
 * PDF Report Service — CourtVision AI
 * 
 * Generates structured JSON report data that can be rendered
 * as PDF on the client (mobile: react-native-pdf, web: @react-pdf/renderer)
 * or as server-side PDF with pdfkit if needed.
 * 
 * This service focuses on building the report payload from DB data.
 */
import { SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

export interface ReportSection {
    title: string
    type: 'stats' | 'chart' | 'text' | 'comparison' | 'heatmap'
    data: Record<string, any>
}

export interface SessionReport {
    reportId: string
    generatedAt: string
    player: {
        name: string
        position: string | null
        avatarUrl: string | null
    }
    session: {
        id: string
        date: string
        duration: number
        location: string | null
    }
    apexScore: {
        overall: number
        shooting: number
        mental: number
        consistency: number
        clutch: number
        improvement: number
        grade: string
    } | null
    sections: ReportSection[]
    aiInsights: string[]
}

export class PdfReportService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Generate a full session report payload.
     * This JSON can be serialized and sent to client for PDF rendering.
     */
    async generateSessionReport(sessionId: string, userId: string): Promise<SessionReport> {
        logger.info({ sessionId, userId }, '[PDF] Generating session report')

        // Fetch session
        const { data: session, error: sessionErr } = await this.supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single()

        if (sessionErr || !session) {
            throw new Error('Session not found')
        }

        // Fetch user profile
        const { data: user } = await this.supabase
            .from('users')
            .select('username, full_name, position, avatar_url')
            .eq('id', userId)
            .single()

        // Fetch analysis data
        const { data: analysis } = await this.supabase
            .from('analyses')
            .select('*')
            .eq('session_id', sessionId)
            .single()

        // Fetch shots for this session
        const { data: shots } = await this.supabase
            .from('shots')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true })

        // Fetch apex score
        const { data: apex } = await this.supabase
            .from('apex_scores')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        // Build report sections
        const sections: ReportSection[] = []

        // 1. Shot distribution
        if (shots && shots.length > 0) {
            const made = shots.filter((s: any) => s.result === 'made').length
            const total = shots.length
            const zones = this.groupShotsByZone(shots)

            sections.push({
                title: 'Shot Distribution',
                type: 'stats',
                data: {
                    totalShots: total,
                    made,
                    missed: total - made,
                    accuracy: total > 0 ? Math.round((made / total) * 1000) / 10 : 0,
                    zones,
                }
            })

            // 2. Shot chart / heatmap data
            sections.push({
                title: 'Shot Heatmap',
                type: 'heatmap',
                data: {
                    points: shots.map((s: any) => ({
                        x: s.court_x,
                        y: s.court_y,
                        result: s.result,
                        zone: s.zone,
                    }))
                }
            })
        }

        // 3. Analysis summary
        if (analysis) {
            sections.push({
                title: 'AI Analysis Summary',
                type: 'text',
                data: {
                    summary: analysis.summary || 'No analysis available.',
                    keyFindings: analysis.key_findings || [],
                    formScore: analysis.form_score,
                    consistencyScore: analysis.consistency_score,
                }
            })
        }

        // 4. Apex comparison
        if (apex) {
            sections.push({
                title: 'Apex Score Breakdown',
                type: 'comparison',
                data: {
                    overall: apex.overall,
                    shooting: apex.shooting,
                    mental: apex.mental,
                    consistency: apex.consistency,
                    clutch: apex.clutch,
                    improvement: apex.improvement,
                    grade: apex.grade,
                }
            })
        }

        // Generate AI insights
        const aiInsights = this.generateInsights(shots, analysis, apex)

        const report: SessionReport = {
            reportId: `report_${sessionId}_${Date.now()}`,
            generatedAt: new Date().toISOString(),
            player: {
                name: user?.full_name || user?.username || 'Player',
                position: user?.position || null,
                avatarUrl: user?.avatar_url || null,
            },
            session: {
                id: session.id,
                date: session.created_at || session.date,
                duration: session.duration_seconds || 0,
                location: session.location || null,
            },
            apexScore: apex ? {
                overall: apex.overall,
                shooting: apex.shooting,
                mental: apex.mental,
                consistency: apex.consistency,
                clutch: apex.clutch,
                improvement: apex.improvement,
                grade: apex.grade,
            } : null,
            sections,
            aiInsights,
        }

        logger.info({ reportId: report.reportId, sections: sections.length }, '[PDF] Report generated')
        return report
    }

    private groupShotsByZone(shots: any[]): Record<string, { made: number; total: number }> {
        const zones: Record<string, { made: number; total: number }> = {}
        for (const shot of shots) {
            const zone = shot.zone || 'unknown'
            if (!zones[zone]) zones[zone] = { made: 0, total: 0 }
            zones[zone].total++
            if (shot.result === 'made') zones[zone].made++
        }
        return zones
    }

    private generateInsights(shots: any[] | null, analysis: any, apex: any): string[] {
        const insights: string[] = []

        if (shots && shots.length > 0) {
            const made = shots.filter((s: any) => s.result === 'made').length
            const pct = Math.round((made / shots.length) * 100)

            if (pct >= 50) {
                insights.push(`Strong shooting session: ${pct}% accuracy across ${shots.length} shots.`)
            } else {
                insights.push(`Accuracy at ${pct}%. Focus on form consistency for improvement.`)
            }

            // Check 3-point performance
            const threes = shots.filter((s: any) => s.zone?.includes('3pt') || s.distance > 22)
            if (threes.length > 5) {
                const threePct = Math.round((threes.filter((s: any) => s.result === 'made').length / threes.length) * 100)
                insights.push(`3-point shooting: ${threePct}% on ${threes.length} attempts.`)
            }
        }

        if (apex?.clutch && apex.clutch < 60) {
            insights.push('Clutch performance needs work. Practice pressure-scenario drills.')
        }

        if (analysis?.form_score && analysis.form_score > 80) {
            insights.push('Shooting form is excellent. Maintain current mechanics.')
        }

        if (insights.length === 0) {
            insights.push('Complete more sessions to unlock personalized AI insights.')
        }

        return insights
    }
}
