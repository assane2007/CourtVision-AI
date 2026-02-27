import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
    PredictiveEngine,
    type PerformancePrediction,
    type PredictionInput,
    type HistoricalSession,
} from '@courtvision/ai'

/**
 * Predictive Engine Routes — Prédictions IA Avant Match
 *
 * Prédit la performance du joueur AVANT une session en utilisant l'IA.
 * Première app de basket au monde avec des prédictions pré-match.
 *
 * Inspiré par :
 * - Whoop Readiness Score → Performance Prediction
 * - Apple Health Trends → Pattern Detection
 * - Expected Goals (xG) → Expected FG%
 * - NBA injury prediction models
 *
 * Endpoints :
 * - GET  /readiness             → Score de readiness du joueur
 * - POST /predict               → Prédiction complète pour une session
 * - GET  /history               → Historique des prédictions (prédit vs réel)
 * - GET  /accuracy              → Précision du modèle de prédiction
 * - GET  /patterns              → Patterns comportementaux détectés
 * - POST /validate              → Valider une prédiction avec le résultat réel
 */

const predictSchema = z.object({
    sessionType: z.enum(['match', 'training', 'shootaround']),
    recoveryScore: z.number().min(0).max(100).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    sleepQuality: z.number().min(1).max(5).optional(),
    energyLevel: z.number().min(1).max(10).optional(),
    stressLevel: z.number().min(1).max(5).optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening']).default('afternoon'),
})

const validateSchema = z.object({
    predictionId: z.string().uuid(),
    actualFGPct: z.number().min(0).max(100),
    actualMentalScore: z.number().min(0).max(100),
    actualShotsAttempted: z.number().min(0),
})

export default async function predictRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // GET /readiness — Score de readiness rapide
    // ==========================================
    fastify.get('/readiness', async (request, reply) => {
        try {
            const user = request.user!

            // Récupérer les dernières sessions
            const historicalSessions = await fetchHistoricalSessions(fastify, user.id)

            if (historicalSessions.length < 3) {
                return {
                    data: {
                        readinessScore: 75,
                        readinessGrade: 'B+',
                        confidence: 0.3,
                        message: 'Need at least 3 sessions for accurate readiness prediction',
                        tips: ['Complete more sessions to improve prediction accuracy'],
                    }
                }
            }

            // Récupérer le score de récupération le plus récent
            const { data: recovery } = await fastify.supabase
                .from('recovery_logs')
                .select('overall_score, sleep_hours, sleep_quality, energy_level, stress_level')
                .eq('user_id', user.id)
                .order('logged_at', { ascending: false })
                .limit(1)
                .single()

            const lastSession = historicalSessions[historicalSessions.length - 1]
            const daysSinceLast = lastSession
                ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24))
                : 7

            const engine = new PredictiveEngine()
            const prediction = engine.predict({
                historicalSessions,
                recoveryScore: recovery?.overall_score,
                sleepHours: recovery?.sleep_hours,
                sleepQuality: recovery?.sleep_quality,
                energyLevel: recovery?.energy_level,
                stressLevel: recovery?.stress_level,
                daysSinceLastSession: daysSinceLast,
                dayOfWeek: new Date().getDay(),
                timeOfDay: getTimeOfDay(),
                sessionType: 'training',
            })

            return {
                data: {
                    readinessScore: prediction.readinessScore,
                    readinessGrade: prediction.readinessGrade,
                    predictedFGPct: prediction.predictedFGPct,
                    predictedMentalScore: prediction.predictedMentalScore,
                    confidence: prediction.confidence,
                    riskFactors: prediction.riskFactors,
                    preGameTips: prediction.preGameTips,
                    daysSinceLastSession: daysSinceLast,
                    recoveryData: recovery || null,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /predict — Prédiction complète
    // ==========================================
    fastify.post('/predict', async (request, reply) => {
        try {
            const user = request.user!
            const body = predictSchema.parse(request.body)

            const historicalSessions = await fetchHistoricalSessions(fastify, user.id)

            if (historicalSessions.length < 3) {
                return reply.code(400).send({
                    error: 'Insufficient data',
                    message: 'Need at least 3 completed sessions for prediction',
                    sessionsNeeded: 3 - historicalSessions.length,
                })
            }

            const lastSession = historicalSessions[historicalSessions.length - 1]
            const daysSinceLast = lastSession
                ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24))
                : 7

            const engine = new PredictiveEngine()
            const prediction = engine.predict({
                historicalSessions,
                recoveryScore: body.recoveryScore,
                sleepHours: body.sleepHours,
                sleepQuality: body.sleepQuality,
                energyLevel: body.energyLevel,
                stressLevel: body.stressLevel,
                daysSinceLastSession: daysSinceLast,
                dayOfWeek: new Date().getDay(),
                timeOfDay: body.timeOfDay,
                sessionType: body.sessionType,
            })

            // Sauvegarder la prédiction pour validation ultérieure
            const { data: saved, error: saveError } = await fastify.supabase
                .from('predictions')
                .insert({
                    user_id: user.id,
                    session_type: body.sessionType,
                    predicted_fg_pct: prediction.predictedFGPct,
                    predicted_mental_score: prediction.predictedMentalScore,
                    predicted_fatigue_onset: prediction.predictedFatigueOnset,
                    readiness_score: prediction.readinessScore,
                    readiness_grade: prediction.readinessGrade,
                    confidence: prediction.confidence,
                    input_data: body,
                    prediction_data: prediction,
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single()

            return {
                data: {
                    predictionId: saved?.id,
                    ...prediction,
                },
                message: `Readiness: ${prediction.readinessGrade} — ${prediction.preGameTips[0] || 'Good to go!'}`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /validate — Valider une prédiction post-match
    // ==========================================
    fastify.post('/validate', async (request, reply) => {
        try {
            const user = request.user!
            const body = validateSchema.parse(request.body)

            const { data: prediction, error } = await fastify.supabase
                .from('predictions')
                .select('*')
                .eq('id', body.predictionId)
                .eq('user_id', user.id)
                .single()

            if (error || !prediction) {
                return reply.code(404).send({ error: 'Prediction not found' })
            }

            // Calculer l'accuracy
            const fgDelta = Math.abs(prediction.predicted_fg_pct - body.actualFGPct)
            const mentalDelta = Math.abs(prediction.predicted_mental_score - body.actualMentalScore)
            const fgAccuracy = Math.max(0, 100 - fgDelta * 2)
            const mentalAccuracy = Math.max(0, 100 - mentalDelta * 1.5)
            const overallAccuracy = (fgAccuracy + mentalAccuracy) / 2

            // Update la prédiction avec le résultat réel
            await fastify.supabase.from('predictions').update({
                actual_fg_pct: body.actualFGPct,
                actual_mental_score: body.actualMentalScore,
                actual_shots_attempted: body.actualShotsAttempted,
                accuracy_score: overallAccuracy,
                validated_at: new Date().toISOString(),
            }).eq('id', body.predictionId)

            return {
                data: {
                    overallAccuracy: Math.round(overallAccuracy),
                    fgAccuracy: Math.round(fgAccuracy),
                    mentalAccuracy: Math.round(mentalAccuracy),
                    predicted: {
                        fgPct: prediction.predicted_fg_pct,
                        mentalScore: prediction.predicted_mental_score,
                    },
                    actual: {
                        fgPct: body.actualFGPct,
                        mentalScore: body.actualMentalScore,
                    },
                    grade: overallAccuracy >= 90 ? 'A+' : overallAccuracy >= 80 ? 'A' :
                        overallAccuracy >= 70 ? 'B+' : overallAccuracy >= 60 ? 'B' :
                            overallAccuracy >= 50 ? 'C' : 'D',
                },
                message: `Prediction accuracy: ${Math.round(overallAccuracy)}%`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /history — Historique des prédictions
    // ==========================================
    fastify.get('/history', async (request, reply) => {
        try {
            const user = request.user!
            const query = request.query as any
            const limit = Math.min(parseInt(query.limit) || 20, 50)

            const { data, error } = await fastify.supabase
                .from('predictions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            return {
                data: (data || []).map((p: any) => ({
                    id: p.id,
                    sessionType: p.session_type,
                    predicted: {
                        fgPct: p.predicted_fg_pct,
                        mentalScore: p.predicted_mental_score,
                        readiness: p.readiness_score,
                        grade: p.readiness_grade,
                    },
                    actual: p.validated_at ? {
                        fgPct: p.actual_fg_pct,
                        mentalScore: p.actual_mental_score,
                    } : null,
                    accuracy: p.accuracy_score ?? null,
                    isValidated: !!p.validated_at,
                    createdAt: p.created_at,
                }))
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /accuracy — Statistiques de précision globale
    // ==========================================
    fastify.get('/accuracy', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('predictions')
                .select('accuracy_score, predicted_fg_pct, actual_fg_pct, predicted_mental_score, actual_mental_score')
                .eq('user_id', user.id)
                .not('accuracy_score', 'is', null)

            if (error) throw error
            if (!data || data.length === 0) {
                return { data: { message: 'No validated predictions yet', totalPredictions: 0 } }
            }

            const avgAccuracy = data.reduce((s: number, d: any) => s + d.accuracy_score, 0) / data.length
            const avgFGDelta = data.reduce((s: number, d: any) =>
                s + Math.abs(d.predicted_fg_pct - d.actual_fg_pct), 0) / data.length

            return {
                data: {
                    totalPredictions: data.length,
                    avgAccuracy: Math.round(avgAccuracy * 10) / 10,
                    avgFGDelta: Math.round(avgFGDelta * 10) / 10,
                    grade: avgAccuracy >= 85 ? 'Excellent' : avgAccuracy >= 70 ? 'Good' :
                        avgAccuracy >= 55 ? 'Fair' : 'Learning',
                    reliabilityMessage: data.length >= 10
                        ? 'Predictions are highly reliable with your data history'
                        : `${10 - data.length} more validated sessions to reach optimal accuracy`,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /patterns — Patterns comportementaux
    // ==========================================
    fastify.get('/patterns', async (request, reply) => {
        try {
            const user = request.user!
            const historicalSessions = await fetchHistoricalSessions(fastify, user.id, 30)

            if (historicalSessions.length < 5) {
                return { data: { message: 'Need at least 5 sessions for pattern detection', patterns: [] } }
            }

            // Analyse des patterns par jour de la semaine
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const byDay = dayNames.map((name, i) => {
                const daySessions = historicalSessions.filter(s => new Date(s.date).getDay() === i)
                if (daySessions.length === 0) return { day: name, avgFG: 0, avgMental: 0, count: 0 }
                const avgFG = daySessions.reduce((s, d) => s + d.fgPct, 0) / daySessions.length
                const avgMental = daySessions.reduce((s, d) => s + d.mentalScore, 0) / daySessions.length
                return { day: name, avgFG: Math.round(avgFG * 10) / 10, avgMental: Math.round(avgMental * 10) / 10, count: daySessions.length }
            })

            const bestDay = [...byDay].filter(d => d.count >= 2).sort((a, b) => b.avgFG - a.avgFG)[0]
            const worstDay = [...byDay].filter(d => d.count >= 2).sort((a, b) => a.avgFG - b.avgFG)[0]

            // Trend récent (3 dernières vs 3 précédentes)
            const recent3 = historicalSessions.slice(-3)
            const prev3 = historicalSessions.slice(-6, -3)
            const recentAvg = recent3.reduce((s, d) => s + d.fgPct, 0) / recent3.length
            const prevAvg = prev3.length > 0 ? prev3.reduce((s, d) => s + d.fgPct, 0) / prev3.length : recentAvg
            const trendDirection = recentAvg > prevAvg + 3 ? 'improving' : recentAvg < prevAvg - 3 ? 'declining' : 'stable'

            // Rest day analysis
            const restBenefits = historicalSessions.map((s, i) => {
                if (i === 0) return null
                const prev = historicalSessions[i - 1]
                const daysBetween = Math.floor((new Date(s.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24))
                return { daysBetween, fgPct: s.fgPct, mentalScore: s.mentalScore }
            }).filter(Boolean)

            const withRest = restBenefits.filter((r: any) => r.daysBetween >= 2)
            const withoutRest = restBenefits.filter((r: any) => r.daysBetween <= 1)
            const restEffect = withRest.length > 0 && withoutRest.length > 0
                ? (withRest.reduce((s: number, r: any) => s + r.fgPct, 0) / withRest.length) -
                (withoutRest.reduce((s: number, r: any) => s + r.fgPct, 0) / withoutRest.length)
                : 0

            return {
                data: {
                    byDay,
                    bestDay: bestDay?.day ?? null,
                    worstDay: worstDay?.day ?? null,
                    trendDirection,
                    recentAvgFG: Math.round(recentAvg * 10) / 10,
                    restDayEffect: Math.round(restEffect * 10) / 10,
                    restRecommendation: restEffect > 3
                        ? 'Rest days significantly improve your performance — take at least 1 day off between sessions'
                        : 'No significant rest day effect detected — your recovery is efficient',
                    totalSessionsAnalyzed: historicalSessions.length,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}

// ==========================================
// Helpers
// ==========================================

async function fetchHistoricalSessions(
    fastify: FastifyInstance,
    userId: string,
    limit: number = 20
): Promise<HistoricalSession[]> {
    const { data } = await fastify.supabase
        .from('sessions')
        .select('created_at, type, analyses(shot_attempts, shot_made, mental_score, shot_zones)')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .order('created_at', { ascending: true })
        .limit(limit)

    if (!data) return []

    return data.map((s: any) => {
        const analysis = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
        const attempts = analysis?.shot_attempts ?? 0
        const made = analysis?.shot_made ?? 0
        const zones: Record<string, { attempts: number; made: number }> = {}

        for (const sz of (analysis?.shot_zones || [])) {
            const zone = sz.zone || 'midrange'
            if (!zones[zone]) zones[zone] = { attempts: 0, made: 0 }
            zones[zone].attempts++
            if (sz.outcome === 'made') zones[zone].made++
        }

        return {
            date: s.created_at,
            type: s.type,
            fgPct: attempts > 0 ? (made / attempts) * 100 : 0,
            mentalScore: analysis?.mental_score ?? 50,
            shotsAttempted: attempts,
            fatigueIndex: 0,
            zones: zones as any,
        }
    })
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    return 'evening'
}
