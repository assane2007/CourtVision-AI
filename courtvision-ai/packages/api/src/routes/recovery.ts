import { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Recovery & Wellness Routes — Suivi de Récupération Intelligent
 *
 * Première app de basket avec un suivi de récupération intégré,
 * inspiré de Whoop/Apple Health mais spécialisé basket.
 *
 * HomeCourt = 0 recovery tracking
 * CourtVision = Recovery score, sleep impact, injury prevention, wellness AI
 *
 * Inspiré par :
 * - Whoop Recovery (HRV, strain, sleep)
 * - Apple Health (trends, insights)
 * - OURA Ring (readiness)
 * - NBA load management
 *
 * Endpoints :
 * - POST /log                → Logger un état de récupération
 * - GET  /current            → Score de récupération actuel
 * - GET  /history            → Historique de récupération
 * - GET  /trends             → Tendances de récupération
 * - GET  /impact             → Impact de la récupération sur la performance
 * - POST /sleep              → Logger le sommeil
 * - GET  /recommendations    → Recommandations de récupération IA
 * - GET  /load               → Load management (charge d'entraînement)
 * - POST /injury-report      → Reporter une douleur/blessure
 * - GET  /injuries           → Historique des blessures
 */

const logSchema = z.object({
    sleepHours: z.number().min(0).max(24).optional(),
    sleepQuality: z.number().min(1).max(5).optional(),
    energyLevel: z.number().min(1).max(10),
    sorenessLevel: z.number().min(1).max(10).optional(),
    stressLevel: z.number().min(1).max(5).optional(),
    mood: z.enum(['great', 'good', 'okay', 'low', 'terrible']).optional(),
    hydrationLevel: z.enum(['great', 'good', 'moderate', 'poor']).optional(),
    notes: z.string().max(500).optional(),
})

const sleepSchema = z.object({
    hoursSlept: z.number().min(0).max(24),
    quality: z.number().min(1).max(5),
    bedtime: z.string().optional(),
    wakeTime: z.string().optional(),
    interruptions: z.number().min(0).max(20).optional(),
    notes: z.string().max(200).optional(),
})

const injurySchema = z.object({
    bodyPart: z.enum([
        'ankle_left', 'ankle_right', 'knee_left', 'knee_right',
        'hip', 'lower_back', 'shoulder_left', 'shoulder_right',
        'wrist_left', 'wrist_right', 'hamstring_left', 'hamstring_right',
        'quad_left', 'quad_right', 'calf_left', 'calf_right',
        'groin', 'neck', 'finger', 'other'
    ]),
    severity: z.number().min(1).max(10),
    type: z.enum(['soreness', 'strain', 'sprain', 'bruise', 'pain', 'tightness', 'other']),
    description: z.string().max(500).optional(),
    occurredDuring: z.enum(['game', 'practice', 'daily_life', 'warmup', 'other']).optional(),
})

export default async function recoveryRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // POST /log — Logger un état de récupération
    // ==========================================
    fastify.post('/log', async (request, reply) => {
        try {
            const user = request.user!
            const body = logSchema.parse(request.body)

            // Calculer le score de récupération global
            const overallScore = computeRecoveryScore(body)

            const { data, error } = await fastify.supabase
                .from('recovery_logs')
                .insert({
                    user_id: user.id,
                    sleep_hours: body.sleepHours,
                    sleep_quality: body.sleepQuality,
                    energy_level: body.energyLevel,
                    soreness_level: body.sorenessLevel,
                    stress_level: body.stressLevel,
                    mood: body.mood,
                    hydration_level: body.hydrationLevel,
                    overall_score: overallScore,
                    notes: body.notes,
                    logged_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (error) throw error

            // Award XP pour le logging quotidien
            await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 5 })

            // Recommandation rapide
            const recommendation = getQuickRecommendation(overallScore, body)

            return {
                data: {
                    id: data.id,
                    overallScore,
                    grade: scoreToGrade(overallScore),
                    recommendation,
                    trainingAdvice: overallScore >= 75 ? 'full_training' :
                        overallScore >= 50 ? 'modified_training' :
                            overallScore >= 30 ? 'light_activity' : 'rest',
                    xpEarned: 5,
                },
                message: `Recovery score: ${overallScore}/100 (${scoreToGrade(overallScore)})`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /current — Score de récupération actuel
    // ==========================================
    fastify.get('/current', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('recovery_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('logged_at', { ascending: false })
                .limit(1)
                .single()

            if (error || !data) {
                return {
                    data: null,
                    message: 'No recovery data yet. Log your first recovery check-in!',
                    hasLogged: false,
                }
            }

            const hoursAgo = (Date.now() - new Date(data.logged_at).getTime()) / (1000 * 60 * 60)
            const isStale = hoursAgo > 18

            return {
                data: {
                    ...data,
                    grade: scoreToGrade(data.overall_score),
                    isStale,
                    hoursAgo: Math.round(hoursAgo),
                    trainingAdvice: data.overall_score >= 75 ? 'full_training' :
                        data.overall_score >= 50 ? 'modified_training' :
                            data.overall_score >= 30 ? 'light_activity' : 'rest',
                },
                hasLogged: true,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /history — Historique (30 jours)
    // ==========================================
    fastify.get('/history', async (request, reply) => {
        try {
            const user = request.user!
            const query = request.query as any
            const days = Math.min(parseInt(query.days) || 30, 90)

            const since = new Date()
            since.setDate(since.getDate() - days)

            const { data, error } = await fastify.supabase
                .from('recovery_logs')
                .select('*')
                .eq('user_id', user.id)
                .gte('logged_at', since.toISOString())
                .order('logged_at', { ascending: true })

            if (error) throw error

            return {
                data: data || [],
                stats: computeRecoveryStats(data || []),
                period: `${days} days`,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /trends — Tendances Apple Health style
    // ==========================================
    fastify.get('/trends', async (request, reply) => {
        try {
            const user = request.user!

            const since = new Date()
            since.setDate(since.getDate() - 30)

            const { data, error } = await fastify.supabase
                .from('recovery_logs')
                .select('overall_score, sleep_hours, sleep_quality, energy_level, soreness_level, stress_level, logged_at')
                .eq('user_id', user.id)
                .gte('logged_at', since.toISOString())
                .order('logged_at', { ascending: true })

            if (error) throw error
            if (!data || data.length < 5) {
                return { data: { message: 'Need at least 5 logs for trend analysis', trends: [] } }
            }

            // Séparer en 2 moitiés pour comparer
            const half = Math.floor(data.length / 2)
            const older = data.slice(0, half)
            const recent = data.slice(half)

            const avg = (arr: any[], key: string) => {
                const vals = arr.map(d => d[key]).filter((v: any) => v != null)
                return vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : null
            }

            const metrics = ['overall_score', 'sleep_hours', 'sleep_quality', 'energy_level', 'soreness_level', 'stress_level']
            const labels: Record<string, string> = {
                overall_score: 'Recovery Score',
                sleep_hours: 'Sleep Duration',
                sleep_quality: 'Sleep Quality',
                energy_level: 'Energy Level',
                soreness_level: 'Soreness',
                stress_level: 'Stress',
            }

            const trends = metrics.map(metric => {
                const olderAvg = avg(older, metric)
                const recentAvg = avg(recent, metric)
                if (olderAvg == null || recentAvg == null) return null

                const delta = recentAvg - olderAvg
                const isInverted = metric === 'soreness_level' || metric === 'stress_level' // Lower is better

                return {
                    metric: labels[metric],
                    olderAvg: Math.round(olderAvg * 10) / 10,
                    recentAvg: Math.round(recentAvg * 10) / 10,
                    delta: Math.round(delta * 10) / 10,
                    direction: isInverted
                        ? (delta < -0.3 ? 'improving' : delta > 0.3 ? 'declining' : 'stable')
                        : (delta > 0.3 ? 'improving' : delta < -0.3 ? 'declining' : 'stable'),
                    isPositive: isInverted ? delta < 0 : delta > 0,
                }
            }).filter(Boolean)

            return { data: { trends, dataPoints: data.length, periodDays: 30 } }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /impact — Impact récupération → performance
    // ==========================================
    fastify.get('/impact', async (request, reply) => {
        try {
            const user = request.user!

            // Récupérer les logs de récupération et les sessions du même jour
            const [recoveryRes, sessionsRes] = await Promise.all([
                fastify.supabase.from('recovery_logs')
                    .select('overall_score, logged_at')
                    .eq('user_id', user.id)
                    .order('logged_at', { ascending: true })
                    .limit(60),
                fastify.supabase.from('sessions')
                    .select('created_at, analyses(shot_attempts, shot_made, mental_score)')
                    .eq('user_id', user.id).eq('status', 'complete')
                    .order('created_at', { ascending: true })
                    .limit(60),
            ])

            const recoveries = recoveryRes.data || []
            const sessions = sessionsRes.data || []

            if (recoveries.length < 5 || sessions.length < 5) {
                return { data: { message: 'Need more data to analyze recovery impact', correlation: null } }
            }

            // Match recovery logs with same-day sessions
            const pairs: { recovery: number; fgPct: number; mental: number }[] = []

            for (const session of sessions) {
                const sessionDate = session.created_at.slice(0, 10)
                const matchingRecovery = recoveries.find((r: any) => r.logged_at.slice(0, 10) === sessionDate)
                if (matchingRecovery) {
                    const a = Array.isArray(session.analyses) ? session.analyses[0] : session.analyses
                    if (a) {
                        const att = a.shot_attempts ?? 0
                        const made = a.shot_made ?? 0
                        pairs.push({
                            recovery: matchingRecovery.overall_score,
                            fgPct: att > 0 ? (made / att) * 100 : 0,
                            mental: a.mental_score ?? 50,
                        })
                    }
                }
            }

            if (pairs.length < 3) {
                return { data: { message: 'Not enough matching data points', correlation: null } }
            }

            // Simple correlation analysis
            const highRecovery = pairs.filter(p => p.recovery >= 70)
            const lowRecovery = pairs.filter(p => p.recovery < 60)

            const avgHighFG = highRecovery.length > 0
                ? highRecovery.reduce((s, p) => s + p.fgPct, 0) / highRecovery.length : 0
            const avgLowFG = lowRecovery.length > 0
                ? lowRecovery.reduce((s, p) => s + p.fgPct, 0) / lowRecovery.length : 0
            const fgImpact = avgHighFG - avgLowFG

            const avgHighMental = highRecovery.length > 0
                ? highRecovery.reduce((s, p) => s + p.mental, 0) / highRecovery.length : 0
            const avgLowMental = lowRecovery.length > 0
                ? lowRecovery.reduce((s, p) => s + p.mental, 0) / lowRecovery.length : 0

            return {
                data: {
                    dataPoints: pairs.length,
                    highRecoverySessions: highRecovery.length,
                    lowRecoverySessions: lowRecovery.length,
                    fgImpact: {
                        highRecoveryAvgFG: Math.round(avgHighFG * 10) / 10,
                        lowRecoveryAvgFG: Math.round(avgLowFG * 10) / 10,
                        deltaFG: Math.round(fgImpact * 10) / 10,
                        insight: fgImpact > 5
                            ? `Good recovery adds +${Math.round(fgImpact)}% to your shooting`
                            : 'Recovery has moderate impact on your shooting',
                    },
                    mentalImpact: {
                        highRecoveryAvg: Math.round(avgHighMental * 10) / 10,
                        lowRecoveryAvg: Math.round(avgLowMental * 10) / 10,
                        delta: Math.round((avgHighMental - avgLowMental) * 10) / 10,
                    },
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /recommendations — Recommandations IA
    // ==========================================
    fastify.get('/recommendations', async (request, reply) => {
        try {
            const user = request.user!

            const { data: latest } = await fastify.supabase
                .from('recovery_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('logged_at', { ascending: false })
                .limit(1)
                .single()

            if (!latest) {
                return { data: [{ emoji: '📝', text: 'Log your first recovery check-in to get personalized recommendations', priority: 'high' }] }
            }

            const recommendations = generateRecoveryRecommendations(latest)

            return { data: recommendations }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /load — Load management
    // ==========================================
    fastify.get('/load', async (request, reply) => {
        try {
            const user = request.user!

            const since7 = new Date(); since7.setDate(since7.getDate() - 7)
            const since28 = new Date(); since28.setDate(since28.getDate() - 28)

            const [week, month] = await Promise.all([
                fastify.supabase.from('sessions')
                    .select('duration_sec, type')
                    .eq('user_id', user.id).eq('status', 'complete')
                    .gte('created_at', since7.toISOString()),
                fastify.supabase.from('sessions')
                    .select('duration_sec, type')
                    .eq('user_id', user.id).eq('status', 'complete')
                    .gte('created_at', since28.toISOString()),
            ])

            const weekSessions = week.data || []
            const monthSessions = month.data || []

            const weekLoad = weekSessions.reduce((s: number, d: any) => s + (d.duration_sec || 0), 0) / 60
            const monthLoad = monthSessions.reduce((s: number, d: any) => s + (d.duration_sec || 0), 0) / 60
            const weeklyAvg = monthLoad / 4

            const acuteChronicRatio = weeklyAvg > 0 ? weekLoad / weeklyAvg : 1
            const loadStatus = acuteChronicRatio > 1.5 ? 'overtraining' :
                acuteChronicRatio > 1.2 ? 'high' :
                    acuteChronicRatio > 0.8 ? 'optimal' :
                        acuteChronicRatio > 0.5 ? 'low' : 'detraining'

            return {
                data: {
                    weeklyMinutes: Math.round(weekLoad),
                    weeklySessions: weekSessions.length,
                    monthlyMinutes: Math.round(monthLoad),
                    monthlySessions: monthSessions.length,
                    weeklyAvgMinutes: Math.round(weeklyAvg),
                    acuteChronicRatio: Math.round(acuteChronicRatio * 100) / 100,
                    loadStatus,
                    recommendation: loadStatus === 'overtraining'
                        ? 'High injury risk! Take a rest day or deload this week.'
                        : loadStatus === 'high'
                            ? 'Training load is elevated. Monitor recovery closely.'
                            : loadStatus === 'optimal'
                                ? 'Perfect training load — keep it up!'
                                : loadStatus === 'low'
                                    ? 'Training volume is low. Consider adding sessions.'
                                    : 'Risk of losing fitness gains. Increase activity.',
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /injury-report — Reporter une blessure
    // ==========================================
    fastify.post('/injury-report', async (request, reply) => {
        try {
            const user = request.user!
            const body = injurySchema.parse(request.body)

            const { data, error } = await fastify.supabase
                .from('injury_reports')
                .insert({
                    user_id: user.id,
                    body_part: body.bodyPart,
                    severity: body.severity,
                    type: body.type,
                    description: body.description,
                    occurred_during: body.occurredDuring,
                    status: body.severity >= 7 ? 'active' : 'monitoring',
                    reported_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (error) throw error

            // Recommandation basée sur la gravité
            const advice = body.severity >= 7
                ? 'Please see a medical professional. We recommend rest until evaluated.'
                : body.severity >= 4
                    ? 'Monitor this closely. Consider modified training and ice/compression.'
                    : 'Light stretching and recovery exercises recommended. Keep monitoring.'

            return {
                data: { ...data, advice },
                message: `Injury reported. ${advice}`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /injuries — Historique des blessures
    // ==========================================
    fastify.get('/injuries', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('injury_reports')
                .select('*')
                .eq('user_id', user.id)
                .order('reported_at', { ascending: false })
                .limit(20)

            if (error) throw error

            const active = (data || []).filter((i: any) => i.status === 'active')

            return {
                data: data || [],
                activeInjuries: active,
                hasActiveInjury: active.length > 0,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}

// ==========================================
// Helpers
// ==========================================

function computeRecoveryScore(data: any): number {
    let score = 50 // Base

    // Sleep (max +25)
    if (data.sleepHours != null) {
        if (data.sleepHours >= 8) score += 25
        else if (data.sleepHours >= 7) score += 20
        else if (data.sleepHours >= 6) score += 10
        else score -= 10
    }
    if (data.sleepQuality != null) {
        score += (data.sleepQuality - 3) * 5 // -10 to +10
    }

    // Energy (max +15)
    score += (data.energyLevel - 5) * 3 // -12 to +15

    // Soreness (penalty)
    if (data.sorenessLevel != null) {
        score -= Math.max(0, data.sorenessLevel - 3) * 3 // 0 to -21
    }

    // Stress (penalty)
    if (data.stressLevel != null) {
        score -= Math.max(0, data.stressLevel - 2) * 4 // 0 to -12
    }

    // Mood bonus
    const moodBonus: Record<string, number> = { great: 8, good: 4, okay: 0, low: -5, terrible: -10 }
    if (data.mood) score += moodBonus[data.mood] || 0

    // Hydration
    const hydrationBonus: Record<string, number> = { great: 5, good: 2, moderate: 0, poor: -5 }
    if (data.hydrationLevel) score += hydrationBonus[data.hydrationLevel] || 0

    return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreToGrade(score: number): string {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C+'
    if (score >= 40) return 'C'
    if (score >= 30) return 'D'
    return 'F'
}

function getQuickRecommendation(score: number, data: any): string {
    if (score >= 80) return 'You are fully recovered — go all out today! 🔥'
    if (score >= 65) return 'Good recovery. Full training is fine, but listen to your body.'
    if (score >= 50) return 'Moderate recovery. Consider lighter intensity or shorter duration.'
    if (score >= 35) return 'Low recovery. Light shooting or mental work recommended.'
    return 'Poor recovery. Rest day strongly recommended. Focus on sleep and nutrition.'
}

function computeRecoveryStats(logs: any[]) {
    if (logs.length === 0) return null

    const scores = logs.map(l => l.overall_score).filter((s: number) => s != null)
    const avgScore = scores.reduce((s: number, v: number) => s + v, 0) / scores.length
    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)

    const sleepHours = logs.map(l => l.sleep_hours).filter((s: number) => s != null)
    const avgSleep = sleepHours.length > 0
        ? sleepHours.reduce((s: number, v: number) => s + v, 0) / sleepHours.length : null

    return {
        avgScore: Math.round(avgScore * 10) / 10,
        minScore,
        maxScore,
        avgSleep: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
        logsCount: logs.length,
        consistencyPct: Math.round((logs.length / 30) * 100), // % of days logged in 30 days
    }
}

function generateRecoveryRecommendations(latest: any) {
    const recs: { emoji: string; text: string; priority: 'high' | 'medium' | 'low' }[] = []

    if (latest.sleep_hours && latest.sleep_hours < 7) {
        recs.push({
            emoji: '😴',
            text: `You only slept ${latest.sleep_hours}h. Aim for 7-9 hours for optimal recovery and shooting accuracy.`,
            priority: 'high',
        })
    }

    if (latest.soreness_level && latest.soreness_level >= 7) {
        recs.push({
            emoji: '🧊',
            text: 'High soreness detected. Ice bath or contrast therapy + foam rolling recommended.',
            priority: 'high',
        })
    }

    if (latest.stress_level && latest.stress_level >= 4) {
        recs.push({
            emoji: '🧘',
            text: 'Elevated stress. Try 10 minutes of box breathing or meditation before your session.',
            priority: 'medium',
        })
    }

    if (latest.energy_level && latest.energy_level <= 4) {
        recs.push({
            emoji: '⚡',
            text: 'Low energy. Consider a caffeine boost 30 min pre-session, or opt for light shooting only.',
            priority: 'medium',
        })
    }

    if (latest.hydration_level === 'poor') {
        recs.push({
            emoji: '💧',
            text: 'Dehydration kills performance. Drink at least 500ml water before your next session.',
            priority: 'high',
        })
    }

    if (latest.overall_score >= 80) {
        recs.push({
            emoji: '🔥',
            text: 'Great recovery! Today is the day to push hard — your body is ready.',
            priority: 'low',
        })
    }

    if (recs.length === 0) {
        recs.push({
            emoji: '✅',
            text: 'All metrics look balanced. Stay consistent with sleep and hydration.',
            priority: 'low',
        })
    }

    return recs
}
