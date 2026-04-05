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
import type { ScoutReport } from '@courtvision/shared'

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

    /**
     * Generate a binary PDF buffer from an existing Scout Report payload.
     */
    generateScoutReportPdf(report: ScoutReport): Buffer {
        const lines = this.buildScoutPdfLines(report)
        return this.createSimplePdfDocument(lines)
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

    private buildScoutPdfLines(report: ScoutReport): string[] {
        const lines: string[] = []

        lines.push('CourtVision AI - Scout Report')
        lines.push(`Report ID: ${report.reportId}`)
        lines.push(`Template: ${report.template}`)
        lines.push(`Generated: ${this.formatPdfDate(report.generatedAt)}`)
        lines.push('')

        lines.push('PLAYER PROFILE')
        lines.push(`Name: ${report.player.name}`)
        lines.push(`Position: ${report.player.position || 'N/A'}`)
        if (report.player.height || report.player.weight) {
            lines.push(`Measurements: ${report.player.height || 'N/A'} / ${report.player.weight || 'N/A'}`)
        }
        lines.push(`Scout Grade: ${report.scoutGrade}`)
        lines.push('')

        if (report.apexScore) {
            lines.push('APEX BREAKDOWN')
            lines.push(`Overall: ${report.apexScore.overall} (${report.apexScore.grade})`)
            lines.push(`Shooting: ${report.apexScore.shooting} | Mental: ${report.apexScore.mental}`)
            lines.push(`Consistency: ${report.apexScore.consistency} | Clutch: ${report.apexScore.clutch}`)
            lines.push(`Improvement: ${report.apexScore.improvement} | Trend: ${report.apexScore.trend}`)
            lines.push('')
        }

        lines.push('SEASON SNAPSHOT')
        lines.push(`Sessions: ${report.seasonStats.totalSessions}`)
        lines.push(`Shots: ${report.seasonStats.totalShots}`)
        lines.push(`FG%: ${report.seasonStats.avgFGPct} | 3PT%: ${report.seasonStats.avgThreePct}`)
        lines.push(`Mental Score: ${report.seasonStats.avgMentalScore}`)
        lines.push(`Consistency: ${report.seasonStats.consistencyRating}`)
        if (report.seasonStats.bestGame) {
            lines.push(`Best game: ${this.formatPdfDate(report.seasonStats.bestGame.date)} (${report.seasonStats.bestGame.fgPct}% FG)`)
        }
        lines.push('')

        if (report.shotDna) {
            lines.push('SHOT DNA')
            lines.push(`Purity: ${report.shotDna.purityScore}`)
            lines.push(`Closest NBA: ${report.shotDna.closestNBA} (${report.shotDna.nbaSimilarity}%)`)
            lines.push(`Optimal Zone: ${report.shotDna.optimalZone}`)
            lines.push(`Mechanical Drifts: ${report.shotDna.mechanicalDriftCount}`)
            lines.push('')
        }

        lines.push('STRENGTHS')
        if (report.strengths.length === 0) {
            lines.push('- No strengths reported')
        } else {
            report.strengths.slice(0, 8).forEach((strength) => lines.push(`- ${strength}`))
        }
        lines.push('')

        lines.push('DEVELOPMENT AREAS')
        if (report.weaknesses.length === 0) {
            lines.push('- No weaknesses reported')
        } else {
            report.weaknesses.slice(0, 8).forEach((weakness) => lines.push(`- ${weakness}`))
        }
        lines.push('')

        if (report.nbaComparisons.length > 0) {
            lines.push('NBA COMPARISONS')
            report.nbaComparisons.slice(0, 5).forEach((comparison, index) => {
                lines.push(`${index + 1}. ${comparison.player} (${comparison.similarity}%)`)
                lines.push(`   ${comparison.reason}`)
            })
            lines.push('')
        }

        lines.push('SCOUT NOTES')
        if (report.scoutNotes.length === 0) {
            lines.push('- No scout notes')
        } else {
            report.scoutNotes.forEach((note) => lines.push(`- ${note}`))
        }
        lines.push('')

        lines.push('PROJECTIONS')
        lines.push(`Ceiling: ${report.projections.ceiling}`)
        lines.push(`Floor: ${report.projections.floor}`)
        lines.push(`Timeline: ${report.projections.timeline}`)
        if (report.projections.keyDevelopmentAreas.length > 0) {
            lines.push(`Focus: ${report.projections.keyDevelopmentAreas.join(', ')}`)
        }
        lines.push('')

        lines.push('SECTIONS INCLUDED')
        report.sections.forEach((section, index) => {
            lines.push(`${index + 1}. ${section.title} [${section.type}]`)
        })

        return lines
    }

    private createSimplePdfDocument(lines: string[]): Buffer {
        const wrappedLines = lines.flatMap((line) => this.wrapPdfLine(line))
        const pages = this.paginatePdfLines(wrappedLines)
        const safePages = pages.length > 0 ? pages : [['CourtVision AI report']]

        const pageObjectNumbers = safePages.map((_, index) => 3 + index * 2)
        const contentObjectNumbers = safePages.map((_, index) => 4 + index * 2)
        const fontObjectNumber = 3 + safePages.length * 2
        const totalObjects = fontObjectNumber

        const objectBodies = new Map<number, string>()
        objectBodies.set(1, '<< /Type /Catalog /Pages 2 0 R >>')
        objectBodies.set(2, `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${safePages.length} >>`)

        for (let index = 0; index < safePages.length; index++) {
            const pageObject = pageObjectNumbers[index]
            const contentObject = contentObjectNumbers[index]
            const stream = this.buildPdfPageStream(safePages[index])

            objectBodies.set(pageObject,
                `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObject} 0 R >>`
            )
            objectBodies.set(contentObject,
                `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
            )
        }

        objectBodies.set(fontObjectNumber, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

        const parts: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')]
        const offsets: number[] = new Array(totalObjects + 1).fill(0)

        let totalLength = parts[0].length
        for (let objectId = 1; objectId <= totalObjects; objectId++) {
            const body = objectBodies.get(objectId)
            if (!body) {
                throw new Error(`Missing PDF object body: ${objectId}`)
            }

            offsets[objectId] = totalLength
            const chunk = Buffer.from(`${objectId} 0 obj\n${body}\nendobj\n`, 'utf8')
            parts.push(chunk)
            totalLength += chunk.length
        }

        const xrefStart = totalLength
        const xrefRows = ['0000000000 65535 f ']
        for (let objectId = 1; objectId <= totalObjects; objectId++) {
            xrefRows.push(`${String(offsets[objectId]).padStart(10, '0')} 00000 n `)
        }

        const trailer = [
            `xref\n0 ${totalObjects + 1}`,
            xrefRows.join('\n'),
            `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>`,
            `startxref\n${xrefStart}`,
            '%%EOF',
        ].join('\n')

        parts.push(Buffer.from(`${trailer}\n`, 'utf8'))
        return Buffer.concat(parts)
    }

    private buildPdfPageStream(lines: string[]): string {
        const commands: string[] = ['BT', '/F1 10 Tf']
        let y = 800
        for (const line of lines) {
            const escaped = this.escapePdfText(line)
            commands.push(`1 0 0 1 44 ${y} Tm (${escaped}) Tj`)
            y -= 15
        }
        commands.push('ET')
        return commands.join('\n')
    }

    private paginatePdfLines(lines: string[], maxLinesPerPage = 48): string[][] {
        if (lines.length === 0) {
            return []
        }

        const pages: string[][] = []
        let currentPage: string[] = []

        for (const line of lines) {
            if (currentPage.length >= maxLinesPerPage) {
                pages.push(currentPage)
                currentPage = []
            }
            currentPage.push(line)
        }

        if (currentPage.length > 0) {
            pages.push(currentPage)
        }

        return pages
    }

    private wrapPdfLine(line: string, maxChars = 94): string[] {
        const normalized = String(line || '').replace(/[\r\n]+/g, ' ').trim()
        if (normalized.length === 0) {
            return ['']
        }

        if (normalized.length <= maxChars) {
            return [normalized]
        }

        const words = normalized.split(/\s+/)
        const wrapped: string[] = []
        let current = ''

        for (const word of words) {
            const next = current ? `${current} ${word}` : word
            if (next.length <= maxChars) {
                current = next
                continue
            }

            if (current) {
                wrapped.push(current)
            }

            if (word.length > maxChars) {
                for (let index = 0; index < word.length; index += maxChars) {
                    wrapped.push(word.slice(index, index + maxChars))
                }
                current = ''
            } else {
                current = word
            }
        }

        if (current) {
            wrapped.push(current)
        }

        return wrapped.length > 0 ? wrapped : ['']
    }

    private formatPdfDate(value: string): string {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-US')
    }

    private escapePdfText(value: string): string {
        return value
            .normalize('NFKD')
            .replace(/[^\x20-\x7E]/g, '')
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
