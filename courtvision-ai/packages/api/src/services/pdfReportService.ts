/**
 * PDF Report Service — CourtVision AI
 * 
 * Generates structured JSON report data that can be rendered
 * as PDF on the client (mobile: react-native-pdf, web: @react-pdf/renderer)
 * or as server-side PDF with pdfkit if needed.
 * 
 * This service focuses on building the report payload from DB data.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
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

    /**
     * Generate a binary PDF buffer for a session report.
     * Kept dependency-free by using a compact single-page PDF renderer.
     */
    async generateSessionReportPdf(sessionId: string, userId: string): Promise<Buffer> {
        const report = await this.generateSessionReport(sessionId, userId)
        return this.renderPdfFromReport(report)
    }

    private renderPdfFromReport(report: SessionReport): Buffer {
        const lines = this.buildPdfLines(report)
        return this.createSimplePdfDocument(lines)
    }

    private buildPdfLines(report: SessionReport): string[] {
        const lines: string[] = []
        lines.push('CourtVision AI - Scout Session Report')
        lines.push(`Report ID: ${report.reportId}`)
        lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString('en-US')}`)
        lines.push('')
        lines.push(`Player: ${report.player.name}`)
        lines.push(`Position: ${report.player.position || 'N/A'}`)
        lines.push(`Session ID: ${report.session.id}`)
        lines.push(`Session Date: ${new Date(report.session.date).toLocaleDateString('en-US')}`)
        lines.push(`Duration: ${Math.round(report.session.duration / 60)} min`)
        lines.push('')

        if (report.apexScore) {
            lines.push('APEX SCORE')
            lines.push(`Overall: ${report.apexScore.overall} (${report.apexScore.grade})`)
            lines.push(`Shooting: ${report.apexScore.shooting} | Mental: ${report.apexScore.mental}`)
            lines.push(`Consistency: ${report.apexScore.consistency} | Clutch: ${report.apexScore.clutch}`)
            lines.push(`Improvement: ${report.apexScore.improvement}`)
            lines.push('')
        }

        lines.push('SECTION SUMMARY')
        report.sections.forEach((section, index) => {
            lines.push(`${index + 1}. ${section.title} [${section.type}]`)
        })
        lines.push('')

        lines.push('AI INSIGHTS')
        if (report.aiInsights.length === 0) {
            lines.push('- No insights available')
        } else {
            report.aiInsights.forEach((insight) => lines.push(`- ${insight}`))
        }

        return lines
    }

    private createSimplePdfDocument(lines: string[]): Buffer {
        const maxLines = 42
        const safeLines = lines.slice(0, maxLines)

        const contentCommands: string[] = ['BT', '/F1 11 Tf']
        let y = 790
        for (const line of safeLines) {
            const escaped = this.escapePdfText(line)
            contentCommands.push(`1 0 0 1 50 ${y} Tm (${escaped}) Tj`)
            y -= 18
            if (y < 40) {
                break
            }
        }
        contentCommands.push('ET')

        const stream = contentCommands.join('\n')
        const objects = [
            '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
            '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
            '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
            '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
            `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
        ]

        const parts: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')]
        const offsets: number[] = [0]

        let totalLength = parts[0].length
        for (const obj of objects) {
            offsets.push(totalLength)
            const chunk = Buffer.from(obj, 'utf8')
            parts.push(chunk)
            totalLength += chunk.length
        }

        const xrefStart = totalLength
        const xrefRows = offsets
            .map((offset, index) => (index === 0
                ? '0000000000 65535 f '
                : `${String(offset).padStart(10, '0')} 00000 n `))
            .join('\n')

        const trailer = [
            `xref\n0 ${offsets.length}`,
            xrefRows,
            `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>`,
            `startxref\n${xrefStart}`,
            '%%EOF',
        ].join('\n')

        parts.push(Buffer.from(`${trailer}\n`, 'utf8'))
        return Buffer.concat(parts)
    }

    private escapePdfText(value: string): string {
        return value
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/[\r\n]+/g, ' ')
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
