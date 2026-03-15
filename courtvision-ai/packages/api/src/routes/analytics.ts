import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
    AdvancedAnalyticsEngine,
    type AdvancedAnalyticsResult,
} from '@courtvision/ai'

/**
 * Advanced Analytics Routes — Métriques NBA-Grade
 *
 * Des statistiques avancées que même les apps NBA ne proposent pas
 * au grand public : True Shooting%, eFG%, Clutch Rating, Momentum,
 * Hot/Cold zones, Court Balance, etc.
 *
 * HomeCourt = FG% basique
 * CourtVision = Cleaning The Glass + Second Spectrum + NBA Analytics
 *
 * Inspiré par :
 * - NBA Second Spectrum
 * - Basketball Reference Advanced Stats
 * - Cleaning The Glass
 * - Synergy Sports
 *
 * Endpoints :
 * - GET  /session/:id           → Analytics avancées d'une session
 * - GET  /career                → Career stats (agrégées)
 * - GET  /hot-cold-zones        → Hot/cold zones agrégées
 * - GET  /clutch                → Statistiques clutch
 * - GET  /momentum/:sessionId   → Momentum shifts d'une session
 * - GET  /efficiency            → Efficiency breakdown
 * - GET  /comparisons           → Comparaison avec la base joueurs
 * - GET  /trends                → Tendances sur 30 jours
 * - GET  /game-score            → Game Score (metric inspirée Hollinger)
 */

export default async function analyticsRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    const sessionIdParamsSchema = z.object({ id: z.string().uuid() })
    const sessionIdParamsSchema2 = z.object({ sessionId: z.string().uuid() })
    const hotColdQuerySchema = z.object({ sessions: z.coerce.number().int().min(1).max(50).default(10) })

    // ==========================================
    // GET /session/:id — Analytics d'une session
    // ==========================================
    fastify.get('/session/:id', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = sessionIdParamsSchema.parse(request.params)

            // Vérifier la session
            const { data: session, error: sessionErr } = await fastify.supabase
                .from('sessions')
                .select('user_id, analyses(*)')
                .eq('id', id)
                .single()

            if (sessionErr || !session || session.user_id !== user.id) {
                return reply.code(404).send({ error: 'Session not found' })
            }

            const analysis = Array.isArray(session.analyses) ? session.analyses[0] : session.analyses
            if (!analysis) {
                return reply.code(404).send({ error: 'No analysis available for this session' })
            }

            // Construire les ShotResult pour l'engine
            const shots = (analysis.shot_zones || []).map((sz: any, i: number) => ({
                timestamp: `00:${String(i).padStart(2, '0')}`,
                zone: sz.zone || 'midrange',
                outcome: sz.outcome || 'missed',
                posture: sz.posture || {},
                quarter: sz.quarter ?? Math.ceil((i + 1) / Math.max(1, Math.floor((analysis.shot_zones || []).length / 4))),
            }))

            const result = AdvancedAnalyticsEngine.compute(shots, {
                bodyLanguageScore: analysis.mental_score || 50,
                mentalFragilityScore: 50,
                timeline: shots.map((_: any, i: number) => ({ mentalScore: analysis.mental_score || 50 })),
                fatigueIndex: 0,
            } as any, (analysis.shot_zones || []).length * 10 || 600)

            // Sauvegarder les analytics avancées
            await fastify.supabase.from('advanced_analytics').upsert({
                session_id: id,
                user_id: user.id,
                analytics_data: result,
                computed_at: new Date().toISOString(),
            }, { onConflict: 'session_id' })

            return { data: result }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /career — Career stats agrégées
    // ==========================================
    fastify.get('/career', async (request, reply) => {
        try {
            const user = request.user!

            const cacheKey = `stats:career:${user.id}`
            try {
                const cached = await fastify.redis.get(cacheKey)
                if (cached) {
                    fastify.log.info({ cacheKey }, 'Cache hit for /career')
                    return JSON.parse(cached)
                }
            } catch (redisErr) {
                fastify.log.warn({ err: redisErr }, 'Redis cache get failed for /career')
            }

            const { data: sessions, error } = await fastify.supabase
                .from('sessions')
                .select('created_at, type, duration_sec, analyses(shot_attempts, shot_made, mental_score, shot_zones)')
                .eq('user_id', user.id)
                .eq('status', 'complete')
                .order('created_at', { ascending: true })

            if (error) throw error
            if (!sessions || sessions.length === 0) {
                return { data: { message: 'No sessions yet', totalSessions: 0 } }
            }

            let totalShots = 0, totalMade = 0, totalDurationSec = 0
            let totalMental = 0, mentalCount = 0
            const zoneStats: Record<string, { attempts: number; made: number }> = {}
            const monthlyData: Record<string, { sessions: number; shots: number; made: number; mental: number }> = {}

            for (const s of sessions) {
                const a = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
                if (!a) continue

                const att = a.shot_attempts || 0
                const made = a.shot_made || 0
                totalShots += att
                totalMade += made
                totalDurationSec += s.duration_sec || 0
                if (a.mental_score) { totalMental += a.mental_score; mentalCount++ }

                // Zone breakdown
                for (const sz of (a.shot_zones || [])) {
                    const z = sz.zone || 'midrange'
                    if (!zoneStats[z]) zoneStats[z] = { attempts: 0, made: 0 }
                    zoneStats[z].attempts++
                    if (sz.outcome === 'made') zoneStats[z].made++
                }

                // Monthly aggregation
                const month = s.created_at.slice(0, 7)
                if (!monthlyData[month]) monthlyData[month] = { sessions: 0, shots: 0, made: 0, mental: 0 }
                monthlyData[month].sessions++
                monthlyData[month].shots += att
                monthlyData[month].made += made
                if (a.mental_score) monthlyData[month].mental += a.mental_score
            }

            const overallFG = totalShots > 0 ? (totalMade / totalShots) * 100 : 0
            const avgMental = mentalCount > 0 ? totalMental / mentalCount : 0

            // Zone efficiency
            const zones = Object.entries(zoneStats).map(([zone, { attempts, made }]) => ({
                zone,
                attempts,
                made,
                pct: attempts > 0 ? Math.round((made / attempts) * 1000) / 10 : 0,
                isHot: attempts >= 10 && (made / attempts) > 0.5,
                isCold: attempts >= 10 && (made / attempts) < 0.3,
            })).sort((a, b) => b.pct - a.pct)

            // Monthly trend
            const monthlyTrend = Object.entries(monthlyData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, d]) => ({
                    month,
                    sessions: d.sessions,
                    fgPct: d.shots > 0 ? Math.round((d.made / d.shots) * 1000) / 10 : 0,
                    avgMental: d.sessions > 0 ? Math.round((d.mental / d.sessions) * 10) / 10 : 0,
                }))

            const responseData = {
                data: {
                    totalSessions: sessions.length,
                    totalShots,
                    totalMade,
                    overallFGPct: Math.round(overallFG * 10) / 10,
                    avgMentalScore: Math.round(avgMental * 10) / 10,
                    totalHoursPlayed: Math.round(totalDurationSec / 3600 * 10) / 10,
                    zones,
                    monthlyTrend,
                    bestMonth: monthlyTrend.length > 0
                        ? monthlyTrend.reduce((best, m) => m.fgPct > best.fgPct ? m : best)
                        : null,
                    hotZones: zones.filter(z => z.isHot).map(z => z.zone),
                    coldZones: zones.filter(z => z.isCold).map(z => z.zone),
                }
            }

            try {
                // Cache for 1 hour
                await fastify.redis.setex(cacheKey, 3600, JSON.stringify(responseData))
            } catch (redisErr) {
                fastify.log.warn({ err: redisErr }, 'Redis cache set failed for /career')
            }

            return responseData
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /hot-cold-zones — Hot/Cold zone map
    // ==========================================
    fastify.get('/hot-cold-zones', async (request, reply) => {
        try {
            const user = request.user!
            const { sessions } = hotColdQuerySchema.parse(request.query)

            const { data, error } = await fastify.supabase
                .from('sessions')
                .select('analyses(shot_zones)')
                .eq('user_id', user.id)
                .eq('status', 'complete')
                .order('created_at', { ascending: false })
                .limit(sessions)

            if (error) throw error

            const zoneStats: Record<string, { attempts: number; made: number }> = {}

            for (const s of (data || [])) {
                const a = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
                for (const sz of (a?.shot_zones || [])) {
                    const z = sz.zone || 'midrange'
                    if (!zoneStats[z]) zoneStats[z] = { attempts: 0, made: 0 }
                    zoneStats[z].attempts++
                    if (sz.outcome === 'made') zoneStats[z].made++
                }
            }

            // NBA averages for comparison
            const nbaAvg: Record<string, number> = {
                restricted: 65, paint: 42, midrange: 41.5,
                corner3: 38.5, wing3: 36, top3: 37,
            }

            const zones = Object.entries(zoneStats).map(([zone, { attempts, made }]) => {
                const pct = attempts > 0 ? (made / attempts) * 100 : 0
                const nba = nbaAvg[zone] || 40
                const vsNBA = pct - nba

                return {
                    zone,
                    attempts,
                    made,
                    pct: Math.round(pct * 10) / 10,
                    nbaAvg: nba,
                    vsNBA: Math.round(vsNBA * 10) / 10,
                    heat: pct >= nba + 10 ? 'blazing' :
                        pct >= nba ? 'hot' :
                            pct >= nba - 10 ? 'warm' :
                                pct >= nba - 20 ? 'cold' : 'frozen',
                }
            })

            return {
                data: {
                    zones,
                    sessionsAnalyzed: sessions,
                    totalShots: Object.values(zoneStats).reduce((s, v) => s + v.attempts, 0),
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /clutch — Statistiques clutch
    // ==========================================
    fastify.get('/clutch', async (request, reply) => {
        try {
            const user = request.user!

            const { data } = await fastify.supabase
                .from('advanced_analytics')
                .select('analytics_data, computed_at')
                .eq('user_id', user.id)
                .order('computed_at', { ascending: false })
                .limit(10)

            if (!data || data.length === 0) {
                return { data: { message: 'No advanced analytics yet. Complete and analyze a session.' } }
            }

            const clutchRatings = data.map((d: any) => d.analytics_data?.clutchRating).filter(Boolean)
            const avgClutch = clutchRatings.length > 0
                ? clutchRatings.reduce((s: number, v: number) => s + v, 0) / clutchRatings.length : 0

            const allClutchShots = data.flatMap((d: any) => d.analytics_data?.clutchShots || [])
            const clutchMade = allClutchShots.filter((s: any) => s.outcome === 'made').length
            const clutchFG = allClutchShots.length > 0
                ? (clutchMade / allClutchShots.length) * 100 : 0

            return {
                data: {
                    avgClutchRating: Math.round(avgClutch * 10) / 10,
                    clutchFGPct: Math.round(clutchFG * 10) / 10,
                    totalClutchShots: allClutchShots.length,
                    clutchMade,
                    clutchGrade: avgClutch >= 80 ? 'A+' : avgClutch >= 70 ? 'A' :
                        avgClutch >= 60 ? 'B+' : avgClutch >= 50 ? 'B' : 'C',
                    sessionsAnalyzed: data.length,
                    archetype: avgClutch >= 75 ? 'Closer' :
                        avgClutch >= 55 ? 'Reliable' :
                            avgClutch >= 35 ? 'Inconsistent' : 'Needs Work',
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /efficiency — Efficiency breakdown
    // ==========================================
    fastify.get('/efficiency', async (request, reply) => {
        try {
            const user = request.user!

            const { data } = await fastify.supabase
                .from('advanced_analytics')
                .select('analytics_data, session_id, computed_at')
                .eq('user_id', user.id)
                .order('computed_at', { ascending: false })
                .limit(20)

            if (!data || data.length === 0) {
                return { data: { message: 'No efficiency data yet' } }
            }

            const metrics = data.map((d: any) => d.analytics_data).filter(Boolean)
            const avg = (key: string) => {
                const vals = metrics.map((m: any) => m[key]).filter((v: any) => v != null)
                return vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0
            }

            return {
                data: {
                    avgTrueShooting: Math.round(avg('trueShooting') * 10) / 10,
                    avgEffectiveFG: Math.round(avg('effectiveFG') * 10) / 10,
                    avgShotQuality: Math.round(avg('shotQualityAvg') * 10) / 10,
                    avgOffensiveRating: Math.round(avg('offensiveRating') * 10) / 10,
                    avgCourtBalance: Math.round(avg('courtBalanceIndex') * 10) / 10,
                    avgClutchRating: Math.round(avg('clutchRating') * 10) / 10,
                    overallGrade: avg('offensiveRating') >= 80 ? 'A+' :
                        avg('offensiveRating') >= 70 ? 'A' :
                            avg('offensiveRating') >= 60 ? 'B+' :
                                avg('offensiveRating') >= 50 ? 'B' : 'C',
                    sessionsAnalyzed: data.length,
                    history: data.map((d: any) => ({
                        sessionId: d.session_id,
                        date: d.computed_at,
                        trueShooting: d.analytics_data?.trueShooting,
                        offensiveRating: d.analytics_data?.offensiveRating,
                        grade: d.analytics_data?.overallGrade,
                    })),
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /trends — Tendances sur 30 jours
    // ==========================================
    fastify.get('/trends', async (request, reply) => {
        try {
            const user = request.user!

            const cacheKey = `stats:trends:${user.id}`
            try {
                const cached = await fastify.redis.get(cacheKey)
                if (cached) {
                    fastify.log.info({ cacheKey }, 'Cache hit for /trends')
                    return JSON.parse(cached)
                }
            } catch (redisErr) {
                fastify.log.warn({ err: redisErr }, 'Redis cache get failed for /trends')
            }

            const since = new Date()
            since.setDate(since.getDate() - 30)

            const { data, error } = await fastify.supabase
                .from('sessions')
                .select('created_at, analyses(shot_attempts, shot_made, mental_score)')
                .eq('user_id', user.id)
                .eq('status', 'complete')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: true })

            if (error) throw error
            if (!data || data.length < 3) {
                return { data: { message: 'Need at least 3 sessions in the last 30 days for trends' } }
            }

            const points = data.map((s: any) => {
                const a = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
                const att = a?.shot_attempts ?? 0
                const made = a?.shot_made ?? 0
                return {
                    date: s.created_at.slice(0, 10),
                    fgPct: att > 0 ? Math.round((made / att) * 100) : 0,
                    mentalScore: a?.mental_score ?? 0,
                    volume: att,
                }
            })

            const half = Math.floor(points.length / 2)
            const first = points.slice(0, half)
            const second = points.slice(half)

            const avgFn = (arr: any[], key: string) =>
                arr.reduce((s: number, p: any) => s + p[key], 0) / arr.length

            const shootingTrend = avgFn(second, 'fgPct') - avgFn(first, 'fgPct')
            const mentalTrend = avgFn(second, 'mentalScore') - avgFn(first, 'mentalScore')
            const volumeTrend = avgFn(second, 'volume') - avgFn(first, 'volume')

            const responseData = {
                data: {
                    points,
                    trends: {
                        shooting: { delta: Math.round(shootingTrend * 10) / 10, direction: shootingTrend > 2 ? 'up' : shootingTrend < -2 ? 'down' : 'stable' },
                        mental: { delta: Math.round(mentalTrend * 10) / 10, direction: mentalTrend > 2 ? 'up' : mentalTrend < -2 ? 'down' : 'stable' },
                        volume: { delta: Math.round(volumeTrend), direction: volumeTrend > 5 ? 'up' : volumeTrend < -5 ? 'down' : 'stable' },
                    },
                    period: '30 days',
                    totalSessions: data.length,
                }
            }

            try {
                // Cache for 1 hour
                await fastify.redis.setex(cacheKey, 3600, JSON.stringify(responseData))
            } catch (redisErr) {
                fastify.log.warn({ err: redisErr }, 'Redis cache set failed for /trends')
            }

            return responseData
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /game-score — Game Score (Hollinger-inspired)
    // ==========================================
    fastify.get('/game-score/:sessionId', async (request, reply) => {
        try {
            const user = request.user!
            const { sessionId } = sessionIdParamsSchema2.parse(request.params)

            const { data: analysis } = await fastify.supabase
                .from('analyses')
                .select('*')
                .eq('session_id', sessionId)
                .single()

            if (!analysis) {
                return reply.code(404).send({ error: 'Analysis not found' })
            }

            const att = analysis.shot_attempts || 0
            const made = analysis.shot_made || 0
            const fgPct = att > 0 ? (made / att) * 100 : 0
            const mentalScore = analysis.mental_score || 50

            // Simplified Game Score formula adapted for CourtVision
            // Inspired by Hollinger's PER but adapted for individual sessions
            const shootingComponent = fgPct * 0.4
            const volumeComponent = Math.min(att / 50, 1) * 20
            const mentalComponent = mentalScore * 0.2
            const efficiencyBonus = fgPct >= 50 ? 10 : fgPct >= 40 ? 5 : 0

            const gameScore = Math.round(
                shootingComponent + volumeComponent + mentalComponent + efficiencyBonus
            )

            const normalizedScore = Math.max(0, Math.min(100, gameScore))

            return {
                data: {
                    gameScore: normalizedScore,
                    grade: normalizedScore >= 85 ? 'A+' : normalizedScore >= 75 ? 'A' :
                        normalizedScore >= 65 ? 'B+' : normalizedScore >= 55 ? 'B' :
                            normalizedScore >= 45 ? 'C+' : normalizedScore >= 35 ? 'C' : 'D',
                    breakdown: {
                        shooting: Math.round(shootingComponent),
                        volume: Math.round(volumeComponent),
                        mental: Math.round(mentalComponent),
                        efficiency: efficiencyBonus,
                    },
                    comparison: normalizedScore >= 80 ? 'MVP Performance' :
                        normalizedScore >= 65 ? 'All-Star Level' :
                            normalizedScore >= 50 ? 'Solid Starter' :
                                normalizedScore >= 35 ? 'Role Player' : 'Off Night',
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}
