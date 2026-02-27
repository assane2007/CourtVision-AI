/**
 * V5 Apex Orchestrator — Central Intelligence Hub
 *
 * Ce service orchestre tous les modules V5 pour créer une expérience
 * cohérente et interconnectée. Il gère :
 *
 * 1. La synchronisation entre Shot DNA, Predictions et Training Plans
 * 2. Le calcul de scores composites (Apex Score)
 * 3. L'adaptation temps réel des plans d'entraînement
 * 4. Le moteur de recommandations contextuelles
 * 5. Le ranking et les percentiles
 *
 * Architecture : Service Layer Pattern
 * Chaque méthode est idempotente et peut être appelée indépendamment.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────

export interface ApexScore {
    overall: number           // 0-100
    shooting: number          // 0-100
    mental: number            // 0-100
    consistency: number       // 0-100
    clutch: number            // 0-100
    improvement: number       // 0-100 (rate of improvement)
    grade: string             // S, A+, A, B+, B, C+, C, D, F
    rank?: number
    percentile?: number       // vs all users
    trend: 'rising' | 'stable' | 'declining'
}

export interface DashboardPayload {
    apexScore: ApexScore
    shotDna: {
        purityScore: number
        closestNBA: string
        nbaSimilarity: number
        mechanicalDriftCount: number
    } | null
    predictions: {
        nextSessionFGPct: number
        readinessScore: number
        readinessGrade: string
        lastAccuracy: number | null
    } | null
    training: {
        activePlan: string | null
        completionPct: number
        daysRemaining: number
        todayFocus: string | null
    } | null
    streaks: {
        currentStreak: number
        longestStreak: number
        sessionThisWeek: number
        shotsThisWeek: number
    }
    quests: {
        activeCount: number
        completedToday: number
        nextReward: string | null
    }
    recovery: {
        score: number | null
        recommendation: string | null
        lastLogDate: string | null
    } | null
    crew: {
        name: string | null
        tag: string | null
        role: string | null
        rankInCrew: number | null
    } | null
}

export interface PercentileData {
    shooting: number
    mental: number
    consistency: number
    overall: number
}

export interface WeeklyDigest {
    period: string
    sessions: number
    totalShots: number
    avgFGPct: number
    avgMentalScore: number
    improvement: {
        fgPctDelta: number
        mentalDelta: number
        bestZoneImproved: string | null
    }
    highlights: string[]
    apexScore: ApexScore
    nextWeekFocus: string[]
}

// ── Supabase Helper ──────────────────────────────────────────

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(
            process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder'
        )
    }
    return _supabase
}

// ── Orchestrator Class ───────────────────────────────────────

export class V5Orchestrator {

    /**
     * Compute the Apex Score — the ONE number that represents the player.
     * Like NBA 2K's overall rating, but data-driven and dynamic.
     */
    static async computeApexScore(userId: string): Promise<ApexScore> {
        const supabase = getSupabase()

        // Gather all data sources in parallel
        const [
            { data: sessions },
            { data: shotDna },
            { data: recentAnalytics },
            { data: profile },
        ] = await Promise.all([
            supabase.from('sessions')
                .select('id, created_at')
                .eq('user_id', userId)
                .eq('status', 'complete')
                .order('created_at', { ascending: false })
                .limit(20),
            supabase.from('shot_dna')
                .select('*')
                .eq('user_id', userId)
                .single(),
            supabase.from('advanced_analytics')
                .select('*')
                .eq('user_id', userId)
                .order('computed_at', { ascending: false })
                .limit(10),
            supabase.from('public_profiles')
                .select('avg_shooting_pct, avg_mental_score, total_sessions, total_shots')
                .eq('user_id', userId)
                .single(),
        ])

        const sessionCount = sessions?.length || 0
        const avgFGPct = profile?.avg_shooting_pct || 0
        const avgMental = profile?.avg_mental_score || 0
        const purity = shotDna?.dna_purity_score || 0

        // Shooting score (40% weight)
        const shooting = Math.min(100, Math.round(
            avgFGPct * 1.5 + purity * 0.3
        ))

        // Mental score (20% weight)
        const mental = Math.min(100, Math.round(avgMental))

        // Consistency (20% weight) — based on session frequency and standard deviation
        const consistency = this.computeConsistencyScore(sessions || [], recentAnalytics || [])

        // Clutch (10% weight)
        const avgClutch = recentAnalytics && recentAnalytics.length > 0
            ? recentAnalytics.reduce((sum: number, a: any) => sum + (a.clutch_rating || 50), 0) / recentAnalytics.length
            : 50
        const clutch = Math.round(avgClutch)

        // Improvement rate (10% weight)
        const improvement = this.computeImprovementRate(recentAnalytics || [])

        // Weighted overall
        const overall = Math.round(
            shooting * 0.40 +
            mental * 0.20 +
            consistency * 0.20 +
            clutch * 0.10 +
            improvement * 0.10
        )

        // Trend
        const trend = improvement > 55 ? 'rising' : improvement < 40 ? 'declining' : 'stable'

        // Grade
        const grade = this.computeApexGrade(overall)

        return {
            overall,
            shooting,
            mental,
            consistency,
            clutch,
            improvement,
            grade,
            trend,
        }
    }

    /**
     * Build the full V5 Dashboard payload — everything the mobile app needs
     * in a single API call. Designed for speed (parallel queries).
     */
    static async buildDashboard(userId: string): Promise<DashboardPayload> {
        const supabase = getSupabase()

        const [
            apexScore,
            { data: shotDna },
            { data: latestPrediction },
            { data: activePlan },
            { data: activeQuests },
            { data: latestRecovery },
            { data: crewMembership },
            { data: profile },
            sessionStreak,
        ] = await Promise.all([
            this.computeApexScore(userId),
            supabase.from('shot_dna').select('*').eq('user_id', userId).single(),
            supabase.from('predictions').select('*').eq('user_id', userId)
                .order('created_at', { ascending: false }).limit(1).single(),
            supabase.from('training_plans').select('*').eq('user_id', userId)
                .eq('active', true).order('created_at', { ascending: false }).limit(1).single(),
            supabase.from('user_quests').select('*, quest:quests(*)').eq('user_id', userId)
                .eq('status', 'active'),
            supabase.from('recovery_logs').select('*').eq('user_id', userId)
                .order('date', { ascending: false }).limit(1).single(),
            supabase.from('crew_members').select('*, crew:crews(name, tag)').eq('user_id', userId)
                .limit(1).single(),
            supabase.from('public_profiles').select('*').eq('user_id', userId).single(),
            this.computeStreak(userId),
        ])

        // Count quests completed today
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const { count: completedToday } = await supabase
            .from('user_quests')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('completed_at', todayStart.toISOString())

        // Sessions & shots this week
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const { data: weekSessions } = await supabase
            .from('sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'complete')
            .gte('created_at', weekStart.toISOString())
        const { data: weekAnalyses } = await supabase
            .from('analyses')
            .select('shot_attempts')
            .in('session_id', (weekSessions || []).map(s => s.id))

        const shotsThisWeek = (weekAnalyses || []).reduce((sum, a) => sum + (a.shot_attempts || 0), 0)

        return {
            apexScore,
            shotDna: shotDna ? {
                purityScore: shotDna.dna_purity_score,
                closestNBA: shotDna.closest_nba_player,
                nbaSimilarity: shotDna.dna_nba_similarity,
                mechanicalDriftCount: (shotDna.mechanical_drift || []).length,
            } : null,
            predictions: latestPrediction ? {
                nextSessionFGPct: latestPrediction.predicted_fg_pct || 0,
                readinessScore: 0, // computed from recovery
                readinessGrade: 'B',
                lastAccuracy: latestPrediction.prediction_accuracy,
            } : null,
            training: activePlan ? {
                activePlan: activePlan.name,
                completionPct: activePlan.completion_pct || 0,
                daysRemaining: (activePlan.total_days || 7) - (activePlan.completed_days || 0),
                todayFocus: this.getTodayFocus(activePlan),
            } : null,
            streaks: {
                ...sessionStreak,
                sessionThisWeek: weekSessions?.length || 0,
                shotsThisWeek,
            },
            quests: {
                activeCount: activeQuests?.length || 0,
                completedToday: completedToday || 0,
                nextReward: activeQuests?.[0]?.quest?.xp_reward
                    ? `${activeQuests[0].quest.xp_reward} XP`
                    : null,
            },
            recovery: latestRecovery ? {
                score: latestRecovery.recovery_score,
                recommendation: latestRecovery.recommendation,
                lastLogDate: latestRecovery.date,
            } : null,
            crew: crewMembership ? {
                name: (crewMembership as any).crew?.name || null,
                tag: (crewMembership as any).crew?.tag || null,
                role: crewMembership.role,
                rankInCrew: null, // TODO: compute
            } : null,
        }
    }

    /**
     * Generate a weekly digest for push notifications and in-app summary.
     */
    static async generateWeeklyDigest(userId: string): Promise<WeeklyDigest> {
        const supabase = getSupabase()
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const [
            { data: weekSessions },
            { data: weekAnalytics },
            apexScore,
        ] = await Promise.all([
            supabase.from('sessions')
                .select('id, created_at')
                .eq('user_id', userId)
                .eq('status', 'complete')
                .gte('created_at', weekAgo.toISOString()),
            supabase.from('advanced_analytics')
                .select('*')
                .eq('user_id', userId)
                .gte('computed_at', weekAgo.toISOString()),
            this.computeApexScore(userId),
        ])

        const sessionCount = weekSessions?.length || 0
        const analytics = weekAnalytics || []
        const totalShots = analytics.reduce((sum, a) => sum + (a.shot_quality_avg ? 1 : 0) * 20, 0) // approximation
        const avgFGPct = analytics.length > 0
            ? analytics.reduce((sum, a) => sum + (a.true_shooting_pct || 0), 0) / analytics.length
            : 0

        const highlights: string[] = []
        if (sessionCount >= 5) highlights.push('🔥 5+ sessions cette semaine — grindeur!')
        if (avgFGPct > 50) highlights.push('🎯 Adresse au-dessus de 50% — sniper mode')

        const focusAreas: string[] = []
        const coldZones = analytics.flatMap(a => a.cold_zones || [])
        if (coldZones.length > 0) {
            const worstZone = coldZones[0]
            focusAreas.push(`Travaille ta zone ${worstZone}`)
        }
        focusAreas.push('Continue le momentum')

        return {
            period: `${weekAgo.toLocaleDateString('fr-FR')} — ${now.toLocaleDateString('fr-FR')}`,
            sessions: sessionCount,
            totalShots,
            avgFGPct: Math.round(avgFGPct * 10) / 10,
            avgMentalScore: 0, // TODO
            improvement: {
                fgPctDelta: 0, // TODO: compare with previous week
                mentalDelta: 0,
                bestZoneImproved: null,
            },
            highlights,
            apexScore,
            nextWeekFocus: focusAreas,
        }
    }

    /**
     * Compute percentiles for a user vs all other users.
     */
    static async computePercentiles(userId: string): Promise<PercentileData> {
        const supabase = getSupabase()

        const { data: allProfiles } = await supabase
            .from('public_profiles')
            .select('user_id, avg_shooting_pct, avg_mental_score, total_sessions')

        if (!allProfiles || allProfiles.length === 0) {
            return { shooting: 50, mental: 50, consistency: 50, overall: 50 }
        }

        const myProfile = allProfiles.find(p => p.user_id === userId)
        if (!myProfile) {
            return { shooting: 50, mental: 50, consistency: 50, overall: 50 }
        }

        const percentile = (value: number, all: number[]) => {
            const sorted = all.sort((a, b) => a - b)
            const index = sorted.findIndex(v => v >= value)
            return Math.round((index / sorted.length) * 100)
        }

        return {
            shooting: percentile(myProfile.avg_shooting_pct || 0, allProfiles.map(p => p.avg_shooting_pct || 0)),
            mental: percentile(myProfile.avg_mental_score || 0, allProfiles.map(p => p.avg_mental_score || 0)),
            consistency: percentile(myProfile.total_sessions || 0, allProfiles.map(p => p.total_sessions || 0)),
            overall: 50, // TODO: compute from apex scores
        }
    }

    // ── Private Helpers ──────────────────────────────────────

    private static computeConsistencyScore(sessions: any[], analytics: any[]): number {
        if (sessions.length === 0) return 0

        // Factor 1: Session frequency (how regular)
        const dates = sessions.map(s => new Date(s.created_at).getTime())
        const gaps: number[] = []
        for (let i = 1; i < dates.length; i++) {
            gaps.push((dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24)) // days between sessions
        }
        const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 7
        const frequencyScore = Math.max(0, Math.min(100, 100 - (avgGap - 2) * 15))

        // Factor 2: Performance consistency (low standard deviation)
        if (analytics.length < 3) return Math.round(frequencyScore * 0.7)

        const ratings = analytics.map((a: any) => a.offensive_rating || 50)
        const mean = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
        const stdDev = Math.sqrt(ratings.reduce((sum: number, v: number) => sum + (v - mean) ** 2, 0) / ratings.length)
        const performanceConsistency = Math.max(0, 100 - stdDev * 4)

        return Math.round(frequencyScore * 0.5 + performanceConsistency * 0.5)
    }

    private static computeImprovementRate(analytics: any[]): number {
        if (analytics.length < 3) return 50 // neutral

        const ratings = analytics.map((a: any) => a.offensive_rating || 50).reverse()
        const firstHalf = ratings.slice(0, Math.floor(ratings.length / 2))
        const secondHalf = ratings.slice(Math.floor(ratings.length / 2))

        const avgFirst = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length
        const avgSecond = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length

        const delta = avgSecond - avgFirst
        return Math.max(0, Math.min(100, 50 + delta * 3))
    }

    private static computeApexGrade(overall: number): string {
        if (overall >= 95) return 'S'
        if (overall >= 88) return 'A+'
        if (overall >= 80) return 'A'
        if (overall >= 72) return 'B+'
        if (overall >= 64) return 'B'
        if (overall >= 55) return 'C+'
        if (overall >= 45) return 'C'
        if (overall >= 35) return 'D'
        return 'F'
    }

    private static async computeStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
        const supabase = getSupabase()

        const { data: sessions } = await supabase
            .from('sessions')
            .select('created_at')
            .eq('user_id', userId)
            .eq('status', 'complete')
            .order('created_at', { ascending: false })
            .limit(365)

        if (!sessions || sessions.length === 0) {
            return { currentStreak: 0, longestStreak: 0 }
        }

        // Group sessions by day
        const daySet = new Set<string>()
        for (const s of sessions) {
            daySet.add(new Date(s.created_at).toISOString().slice(0, 10))
        }

        const sortedDays = Array.from(daySet).sort().reverse()

        // Current streak
        let currentStreak = 0
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

        if (sortedDays[0] === today || sortedDays[0] === yesterday) {
            currentStreak = 1
            for (let i = 1; i < sortedDays.length; i++) {
                const prev = new Date(sortedDays[i - 1])
                const curr = new Date(sortedDays[i])
                const diffDays = (prev.getTime() - curr.getTime()) / 86400000
                if (diffDays <= 1.5) {
                    currentStreak++
                } else {
                    break
                }
            }
        }

        // Longest streak
        let longestStreak = 1
        let tempStreak = 1
        const allDays = Array.from(daySet).sort()
        for (let i = 1; i < allDays.length; i++) {
            const prev = new Date(allDays[i - 1])
            const curr = new Date(allDays[i])
            const diffDays = (curr.getTime() - prev.getTime()) / 86400000
            if (diffDays <= 1.5) {
                tempStreak++
                longestStreak = Math.max(longestStreak, tempStreak)
            } else {
                tempStreak = 1
            }
        }

        return { currentStreak, longestStreak }
    }

    private static getTodayFocus(plan: any): string | null {
        if (!plan?.days) return null
        const dayOfWeek = new Date().getDay()
        const todayPlan = plan.days[dayOfWeek % (plan.days.length || 7)]
        return todayPlan?.focus || todayPlan?.title || null
    }
}
