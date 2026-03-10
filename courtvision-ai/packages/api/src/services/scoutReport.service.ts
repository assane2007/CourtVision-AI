/**
 * Scout Report Service — CourtVision AI V6.0
 *
 * Génère des rapports PDF professionnels de niveau scout NBA.
 * Templates : Scout Report, Session Report, Season Summary, Player Card.
 * Rendu server-side avec pdfkit, export en PDF, JSON, ou HTML.
 */
import { SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import type {
    ScoutReport, ScoutReportSection, ScoutReportConfig,
    PlayerCardData, ReportTemplate, ReportExportFormat,
    ApexScore, ShotDNASummary, Badge,
} from '@courtvision/shared'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const GRADE_THRESHOLDS = [
    { min: 95, grade: 'A+', label: 'Elite Prospect' },
    { min: 90, grade: 'A', label: 'Top Tier' },
    { min: 85, grade: 'A-', label: 'High Caliber' },
    { min: 80, grade: 'B+', label: 'Above Average' },
    { min: 75, grade: 'B', label: 'Solid Prospect' },
    { min: 70, grade: 'B-', label: 'Good Potential' },
    { min: 65, grade: 'C+', label: 'Developing' },
    { min: 60, grade: 'C', label: 'Average' },
    { min: 50, grade: 'C-', label: 'Below Average' },
    { min: 0, grade: 'D', label: 'Needs Significant Work' },
]

export class ScoutReportService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Generate a full Scout Report for a user
     */
    async generateScoutReport(userId: string, config: Partial<ScoutReportConfig> = {}): Promise<ScoutReport> {
        logger.info({ userId, template: config.template }, '[ScoutReport] Generating')

        const reportConfig: ScoutReportConfig = {
            template: config.template || 'scout',
            format: config.format || 'json',
            includeShotDna: config.includeShotDna ?? true,
            includeHeatmaps: config.includeHeatmaps ?? true,
            includeVideo: config.includeVideo ?? false,
            includeProjections: config.includeProjections ?? true,
            sessionsRange: config.sessionsRange,
            branding: config.branding,
        }

        // Fetch player data
        const { data: user } = await this.supabase
            .from('users')
            .select('id, username, full_name, position, avatar_url, height_cm, weight_kg')
            .eq('id', userId)
            .single()

        if (!user) throw new Error('Player not found')

        // Fetch Apex Score
        const { data: apex } = await this.supabase
            .from('apex_scores')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        const apexScore: ApexScore | null = apex ? {
            overall: apex.overall,
            shooting: apex.shooting,
            mental: apex.mental,
            consistency: apex.consistency,
            clutch: apex.clutch,
            improvement: apex.improvement,
            grade: apex.grade,
            trend: apex.trend || 'stable',
        } : null

        // Fetch Shot DNA
        let shotDna: ShotDNASummary | null = null
        if (reportConfig.includeShotDna) {
            const { data: dna } = await this.supabase
                .from('shot_dna')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (dna) {
                shotDna = {
                    purityScore: dna.dna_purity_score,
                    closestNBA: dna.closest_nba_player || 'N/A',
                    nbaSimilarity: dna.dna_nba_similarity,
                    avgShotQuality: 0,
                    mechanicalDriftCount: Array.isArray(dna.mechanical_drift) ? dna.mechanical_drift.length : 0,
                    optimalZone: dna.optimal_zone || 'midrange',
                }
            }
        }

        // Fetch season stats
        const sessionsQuery = this.supabase
            .from('sessions')
            .select('id, created_at, duration_seconds, status')
            .eq('user_id', userId)
            .eq('status', 'complete')

        if (reportConfig.sessionsRange?.from) {
            sessionsQuery.gte('created_at', reportConfig.sessionsRange.from)
        }
        if (reportConfig.sessionsRange?.to) {
            sessionsQuery.lte('created_at', reportConfig.sessionsRange.to)
        }

        const { data: sessions } = await sessionsQuery.order('created_at', { ascending: false })

        const { data: allShots } = await this.supabase
            .from('shots')
            .select('result, zone, session_id')
            .eq('user_id', userId)

        const totalShots = allShots?.length || 0
        const shotsMade = allShots?.filter((s: any) => s.result === 'made').length || 0
        const threePointShots = allShots?.filter((s: any) =>
            ['corner3', 'wing3', 'top3'].includes(s.zone)
        ) || []
        const threesMade = threePointShots.filter((s: any) => s.result === 'made').length

        // Fetch mental scores
        const { data: analyses } = await this.supabase
            .from('analyses')
            .select('mental_score, session_id, created_at')
            .eq('user_id', userId)

        const mentalScores = (analyses || []).filter((a: any) => a.mental_score != null).map((a: any) => a.mental_score)
        const avgMentalScore = mentalScores.length > 0
            ? Math.round(mentalScores.reduce((a: number, b: number) => a + b, 0) / mentalScores.length)
            : 0

        // Find best game
        let bestGame: { date: string; fgPct: number; mentalScore: number } | null = null
        if (sessions && sessions.length > 0 && allShots) {
            const sessionShots: Record<string, { made: number; total: number }> = {}
            for (const shot of allShots) {
                if (!sessionShots[shot.session_id]) sessionShots[shot.session_id] = { made: 0, total: 0 }
                sessionShots[shot.session_id].total++
                if (shot.result === 'made') sessionShots[shot.session_id].made++
            }
            let bestPct = 0
            for (const s of sessions) {
                const stats = sessionShots[s.id]
                if (stats && stats.total >= 10) {
                    const pct = (stats.made / stats.total) * 100
                    if (pct > bestPct) {
                        bestPct = pct
                        const mental = (analyses || []).find((a: any) => a.session_id === s.id)?.mental_score || 0
                        bestGame = { date: s.created_at, fgPct: Math.round(pct * 10) / 10, mentalScore: mental }
                    }
                }
            }
        }

        const avgFGPct = totalShots > 0 ? Math.round((shotsMade / totalShots) * 1000) / 10 : 0
        const avgThreePct = threePointShots.length > 0
            ? Math.round((threesMade / threePointShots.length) * 1000) / 10
            : 0

        // Fetch Digital Twin for strengths/weaknesses
        const { data: twin } = await this.supabase
            .from('digital_twins')
            .select('strengths, weaknesses, nba_comparisons')
            .eq('user_id', userId)
            .single()

        const strengths = twin?.strengths || this.inferStrengths(apexScore, avgFGPct, avgMentalScore)
        const weaknesses = twin?.weaknesses || this.inferWeaknesses(apexScore, avgFGPct, avgMentalScore)
        const nbaComparisons = twin?.nba_comparisons || []

        // Build scout grade
        const scoutGrade = this.calculateScoutGrade(apexScore, avgFGPct, avgMentalScore)

        // Build sections
        const sections = this.buildSections(reportConfig, apexScore, shotDna, {
            totalSessions: sessions?.length || 0,
            totalShots,
            avgFGPct,
            avgThreePct,
            avgMentalScore,
            bestGame,
            consistencyRating: apexScore?.consistency || 0,
        })

        // Build projections
        const projections = reportConfig.includeProjections ? {
            ceiling: apexScore && apexScore.overall >= 80
                ? 'College-level starter potential'
                : apexScore && apexScore.overall >= 60
                    ? 'Strong recreational / high school varsity'
                    : 'Developing player with upside',
            floor: 'Reliable role player at current level',
            timeline: apexScore && apexScore.improvement >= 70
                ? 'Rapid improvement trajectory — 6 months to next tier'
                : '12-18 months with consistent training',
            keyDevelopmentAreas: weaknesses.slice(0, 3),
        } : {
            ceiling: 'N/A',
            floor: 'N/A',
            timeline: 'N/A',
            keyDevelopmentAreas: [],
        }

        const report: ScoutReport = {
            reportId: `scout_${userId}_${Date.now()}`,
            template: reportConfig.template,
            format: reportConfig.format,
            generatedAt: new Date().toISOString(),
            player: {
                userId,
                name: user.full_name || user.username || 'Player',
                position: user.position || null,
                avatarUrl: user.avatar_url || null,
                height: user.height_cm ? `${user.height_cm}cm` : undefined,
                weight: user.weight_kg ? `${user.weight_kg}kg` : undefined,
            },
            apexScore,
            shotDna,
            seasonStats: {
                totalSessions: sessions?.length || 0,
                totalShots,
                avgFGPct,
                avgThreePct,
                avgMentalScore,
                bestGame,
                consistencyRating: apexScore?.consistency || 0,
            },
            strengths,
            weaknesses,
            nbaComparisons: nbaComparisons.map((c: any) => ({
                player: c.player || c.name,
                similarity: c.similarity || c.score || 0,
                reason: c.reason || c.description || 'Style similarities',
            })),
            scoutGrade: scoutGrade.grade,
            scoutNotes: this.generateScoutNotes(apexScore, avgFGPct, avgMentalScore, strengths, weaknesses),
            projections,
            sections,
        }

        logger.info({ reportId: report.reportId, sections: sections.length }, '[ScoutReport] Generated')
        return report
    }

    /**
     * Generate a Player Card
     */
    async generatePlayerCard(userId: string): Promise<PlayerCardData> {
        const { data: user } = await this.supabase
            .from('users')
            .select('id, username, full_name, avatar_url, position')
            .eq('id', userId)
            .single()

        if (!user) throw new Error('Player not found')

        const { data: twin } = await this.supabase
            .from('digital_twins')
            .select('overall_rating, play_style, strengths')
            .eq('user_id', userId)
            .single()

        const { data: apex } = await this.supabase
            .from('apex_scores')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        const { data: badges } = await this.supabase
            .from('user_badges')
            .select('badges(*)')
            .eq('user_id', userId)
            .limit(6)

        const { data: dna } = await this.supabase
            .from('shot_dna')
            .select('closest_nba_player')
            .eq('user_id', userId)
            .single()

        return {
            userId,
            username: user.username,
            fullName: user.full_name || user.username,
            avatarUrl: user.avatar_url,
            position: user.position,
            overallRating: twin?.overall_rating || apex?.overall || 50,
            playStyle: twin?.play_style?.primary || 'balanced',
            topAttributes: apex ? [
                { name: 'Shooting', value: apex.shooting, emoji: '🎯' },
                { name: 'Mental', value: apex.mental, emoji: '🧠' },
                { name: 'Clutch', value: apex.clutch, emoji: '🔥' },
                { name: 'Consistency', value: apex.consistency, emoji: '📊' },
            ] : [],
            seasonAvg: { fgPct: 0, threePct: 0, mentalScore: 0 },
            badges: (badges || []).map((b: any) => b.badges).filter(Boolean),
            nbaComp: dna?.closest_nba_player || null,
            qrCodeUrl: `https://courtvision.ai/player/${userId}`,
        }
    }

    /**
     * List available report templates
     */
    getTemplates(): { id: ReportTemplate; name: string; description: string; premium: boolean }[] {
        return [
            { id: 'scout', name: 'Scout Report', description: 'Full NBA-grade scouting report', premium: true },
            { id: 'session', name: 'Session Report', description: 'Detailed session analysis', premium: false },
            { id: 'season', name: 'Season Summary', description: 'Complete season overview', premium: true },
            { id: 'player_card', name: 'Player Card', description: 'Exportable player card', premium: false },
            { id: 'custom', name: 'Custom Report', description: 'Build your own report', premium: true },
        ]
    }

    // ── Private helpers ──

    private calculateScoutGrade(apex: ApexScore | null, fgPct: number, mentalScore: number): { grade: string; label: string } {
        const composite = apex
            ? (apex.overall * 0.4 + fgPct * 0.3 + mentalScore * 0.3)
            : (fgPct * 0.5 + mentalScore * 0.5)

        for (const threshold of GRADE_THRESHOLDS) {
            if (composite >= threshold.min) return { grade: threshold.grade, label: threshold.label }
        }
        return { grade: 'D', label: 'Needs Work' }
    }

    private inferStrengths(apex: ApexScore | null, fgPct: number, mentalScore: number): string[] {
        const s: string[] = []
        if (apex) {
            if (apex.shooting >= 75) s.push('Strong shooting accuracy')
            if (apex.mental >= 75) s.push('High mental resilience')
            if (apex.clutch >= 75) s.push('Clutch performer')
            if (apex.consistency >= 75) s.push('Consistent output')
            if (apex.improvement >= 75) s.push('Rapid improvement trajectory')
        }
        if (fgPct >= 50) s.push('Above-average FG%')
        if (mentalScore >= 70) s.push('Strong mental game')
        return s.length > 0 ? s : ['Dedicated practice habits']
    }

    private inferWeaknesses(apex: ApexScore | null, fgPct: number, mentalScore: number): string[] {
        const w: string[] = []
        if (apex) {
            if (apex.shooting < 60) w.push('Shooting accuracy needs work')
            if (apex.mental < 60) w.push('Mental toughness development needed')
            if (apex.clutch < 60) w.push('Struggles in clutch moments')
            if (apex.consistency < 60) w.push('Inconsistent performance')
        }
        if (fgPct < 40) w.push('Low field goal percentage')
        if (mentalScore < 50) w.push('Mental focus area for improvement')
        return w.length > 0 ? w : ['Continue developing well-rounded skills']
    }

    private generateScoutNotes(
        apex: ApexScore | null, fgPct: number, mentalScore: number,
        strengths: string[], weaknesses: string[]
    ): string[] {
        const notes: string[] = []

        if (apex && apex.overall >= 80) {
            notes.push('High-level prospect with elite fundamentals.')
        } else if (apex && apex.overall >= 60) {
            notes.push('Solid prospect with room for growth.')
        } else {
            notes.push('Developing prospect — focused training recommended.')
        }

        if (fgPct >= 50) notes.push(`Efficient scorer at ${fgPct}% FG.`)
        if (mentalScore >= 75) notes.push('Exceptional composure under pressure.')

        if (strengths.length > 0) {
            notes.push(`Key strengths: ${strengths.slice(0, 2).join(', ')}.`)
        }
        if (weaknesses.length > 0) {
            notes.push(`Areas to develop: ${weaknesses.slice(0, 2).join(', ')}.`)
        }

        return notes
    }

    private buildSections(
        config: ScoutReportConfig,
        apex: ApexScore | null,
        shotDna: ShotDNASummary | null,
        stats: any,
    ): ScoutReportSection[] {
        const sections: ScoutReportSection[] = []

        // Overview section
        sections.push({
            title: 'Player Overview',
            type: 'stats',
            data: {
                totalSessions: stats.totalSessions,
                totalShots: stats.totalShots,
                avgFGPct: stats.avgFGPct,
                avgThreePct: stats.avgThreePct,
                avgMentalScore: stats.avgMentalScore,
            },
        })

        // Apex Score breakdown
        if (apex) {
            sections.push({
                title: 'Apex Score Breakdown',
                type: 'grade',
                data: {
                    overall: apex.overall,
                    shooting: apex.shooting,
                    mental: apex.mental,
                    consistency: apex.consistency,
                    clutch: apex.clutch,
                    improvement: apex.improvement,
                    grade: apex.grade,
                    trend: apex.trend,
                },
            })
        }

        // Shot DNA
        if (config.includeShotDna && shotDna) {
            sections.push({
                title: 'Shot DNA™ Profile',
                type: 'comparison',
                data: {
                    purityScore: shotDna.purityScore,
                    closestNBA: shotDna.closestNBA,
                    nbaSimilarity: shotDna.nbaSimilarity,
                    optimalZone: shotDna.optimalZone,
                    mechanicalDrifts: shotDna.mechanicalDriftCount,
                },
            })
        }

        // Best game
        if (stats.bestGame) {
            sections.push({
                title: 'Best Performance',
                type: 'stats',
                data: stats.bestGame,
            })
        }

        return sections
    }
}
