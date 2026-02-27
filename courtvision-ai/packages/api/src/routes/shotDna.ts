import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
    ShotDNAEngine,
    type ShotDNAProfile,
    type ShotQualityResult,
} from '@courtvision/ai'

/**
 * Shot DNA™ Routes — Empreinte de tir biométrique unique
 *
 * L'équivalent d'un ADN pour le tir du joueur. HomeCourt ne fait que
 * compter les paniers — ici on analyse la biomécanique de chaque tir,
 * on compare avec les joueurs NBA, on détecte les dérives mécaniques.
 *
 * Inspiré par :
 * - Apple Health trends (drift detection)
 * - NBA Second Spectrum (shot quality)
 * - 23andMe (unique biometric profiling)
 *
 * Endpoints :
 * - GET  /profile           → Profil Shot DNA complet
 * - POST /analyze           → Analyser les tirs d'une session pour enrichir le DNA
 * - GET  /zones             → Efficacité par zone (hot/cold map)
 * - GET  /drift             → Détection de dérives mécaniques
 * - GET  /nba-compare       → Comparaison NBA détaillée
 * - POST /shot-quality      → Score de qualité pour un tir individuel
 * - GET  /evolution         → Évolution du Shot DNA dans le temps
 * - GET  /leaderboard       → Top Shot DNA de la communauté
 */

const sessionIdSchema = z.object({
    sessionId: z.string().uuid(),
})

const shotQualitySchema = z.object({
    elbowAngle: z.number().min(0).max(180),
    releaseHeight: z.number().min(1).max(3),
    releaseTime: z.number().min(0.1).max(2),
    zone: z.enum(['restricted', 'paint', 'midrange', 'corner3', 'wing3', 'top3']),
    fatiguePct: z.number().min(0).max(100).default(0),
    mentalScore: z.number().min(0).max(100).default(70),
    isClutch: z.boolean().default(false),
    isContested: z.boolean().default(false),
})

export default async function shotDnaRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // GET /profile — Profil Shot DNA complet
    // ==========================================
    fastify.get('/profile', async (request, reply) => {
        try {
            const user = request.user!

            // Récupérer le profil Shot DNA existant
            const { data: dna, error } = await fastify.supabase
                .from('shot_dna_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error || !dna) {
                // Auto-build si aucun profil n'existe
                const profile = await buildShotDNA(fastify, user.id)
                return { data: profile, isNew: true }
            }

            return {
                data: {
                    ...dna.profile,
                    lastUpdated: dna.updated_at,
                    sessionsAnalyzed: dna.sessions_analyzed,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /analyze — Analyser les tirs pour enrichir le DNA
    // ==========================================
    fastify.post('/analyze', async (request, reply) => {
        try {
            const user = request.user!
            const body = sessionIdSchema.parse(request.body)

            // Récupérer les données de tirs de la session
            const { data: analysis, error } = await fastify.supabase
                .from('analyses')
                .select('shot_zones, shot_attempts, shot_made, mental_score')
                .eq('session_id', body.sessionId)
                .single()

            if (error || !analysis) {
                return reply.code(404).send({ error: 'Session analysis not found' })
            }

            // Vérifier que la session appartient au joueur
            const { data: session } = await fastify.supabase
                .from('sessions')
                .select('user_id')
                .eq('id', body.sessionId)
                .single()

            if (!session || session.user_id !== user.id) {
                return reply.code(403).send({ error: 'Unauthorized' })
            }

            // Construire les ShotResult à partir des données
            const shots = (analysis.shot_zones || []).map((sz: any, i: number) => ({
                timestamp: `00:${String(i).padStart(2, '0')}`,
                zone: sz.zone || 'midrange',
                outcome: sz.outcome || 'missed',
                posture: sz.posture || {},
                elbowAngle: sz.posture?.elbowAngle ?? 95 + Math.random() * 20,
                releaseHeight: sz.posture?.releaseHeight ?? 2.1 + Math.random() * 0.3,
                releaseTime: sz.posture?.releaseTime ?? 0.4 + Math.random() * 0.2,
                followThrough: sz.posture?.followThrough ?? Math.random() > 0.3,
            }))

            // Compute Shot DNA
            const engine = new ShotDNAEngine()
            const profile = engine.buildProfile(shots)
            const driftResults = engine.detectDrift(shots)

            // Upsert le profil
            const { error: upsertError } = await fastify.supabase
                .from('shot_dna_profiles')
                .upsert({
                    user_id: user.id,
                    profile,
                    drift_alerts: driftResults,
                    sessions_analyzed: (analysis.shot_attempts || 0),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })

            if (upsertError) throw upsertError

            // Sauvegarder l'historique pour l'évolution
            await fastify.supabase.from('shot_dna_history').insert({
                user_id: user.id,
                session_id: body.sessionId,
                snapshot: {
                    purityScore: profile.purityScore,
                    avgShotQuality: profile.avgShotQuality,
                    nbaSimilarity: profile.nbaSimilarity,
                    closestNBA: profile.closestNBAPlayer,
                    signature: profile.signature,
                },
                recorded_at: new Date().toISOString(),
            })

            return {
                data: profile,
                drift: driftResults,
                message: 'Shot DNA updated successfully 🧬'
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /zones — Efficacité par zone (hot/cold map)
    // ==========================================
    fastify.get('/zones', async (request, reply) => {
        try {
            const user = request.user!

            const { data: dna } = await fastify.supabase
                .from('shot_dna_profiles')
                .select('profile')
                .eq('user_id', user.id)
                .single()

            if (!dna?.profile?.zoneEfficiency) {
                return reply.code(404).send({ error: 'No Shot DNA profile yet. Analyze a session first.' })
            }

            const zones = dna.profile.zoneEfficiency
            const hotZones = Object.entries(zones)
                .filter(([_, v]: any) => v.isOptimal)
                .map(([zone]) => zone)
            const coldZones = Object.entries(zones)
                .filter(([_, v]: any) => v.isUnderperforming)
                .map(([zone]) => zone)

            return {
                data: {
                    zones,
                    hotZones,
                    coldZones,
                    bestZone: hotZones[0] || null,
                    worstZone: coldZones[0] || null,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /drift — Détection de dérives mécaniques
    // ==========================================
    fastify.get('/drift', async (request, reply) => {
        try {
            const user = request.user!

            const { data: dna } = await fastify.supabase
                .from('shot_dna_profiles')
                .select('drift_alerts, profile, updated_at')
                .eq('user_id', user.id)
                .single()

            if (!dna) {
                return reply.code(404).send({ error: 'No Shot DNA profile yet.' })
            }

            const drifts = dna.drift_alerts || []
            const criticalDrifts = drifts.filter((d: any) => d.severity === 'critical')
            const hasCriticalAlert = criticalDrifts.length > 0

            return {
                data: {
                    drifts,
                    criticalCount: criticalDrifts.length,
                    hasCriticalAlert,
                    lastAnalyzed: dna.updated_at,
                    mechanicHealth: hasCriticalAlert ? 'warning' : drifts.length > 0 ? 'attention' : 'healthy',
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /nba-compare — Comparaison NBA détaillée
    // ==========================================
    fastify.get('/nba-compare', async (request, reply) => {
        try {
            const user = request.user!

            const { data: dna } = await fastify.supabase
                .from('shot_dna_profiles')
                .select('profile')
                .eq('user_id', user.id)
                .single()

            if (!dna?.profile) {
                return reply.code(404).send({ error: 'No Shot DNA profile yet.' })
            }

            const engine = new ShotDNAEngine()
            const allComparisons = engine.compareWithAllNBA(dna.profile.signature)

            return {
                data: {
                    closestMatch: allComparisons[0],
                    top5: allComparisons.slice(0, 5),
                    signature: dna.profile.signature,
                    purityScore: dna.profile.purityScore,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /shot-quality — Score de qualité pour un tir individuel
    // ==========================================
    fastify.post('/shot-quality', async (request, reply) => {
        try {
            const body = shotQualitySchema.parse(request.body)

            const engine = new ShotDNAEngine()
            const quality = engine.computeShotQuality({
                elbowAngle: body.elbowAngle,
                releaseHeight: body.releaseHeight,
                releaseTime: body.releaseTime,
                zone: body.zone as any,
                fatiguePct: body.fatiguePct,
                mentalScore: body.mentalScore,
                isClutch: body.isClutch,
                isContested: body.isContested,
            })

            return { data: quality }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /evolution — Évolution du Shot DNA dans le temps
    // ==========================================
    fastify.get('/evolution', async (request, reply) => {
        try {
            const user = request.user!
            const query = request.query as any
            const limit = Math.min(parseInt(query.limit) || 30, 100)

            const { data, error } = await fastify.supabase
                .from('shot_dna_history')
                .select('snapshot, session_id, recorded_at')
                .eq('user_id', user.id)
                .order('recorded_at', { ascending: true })
                .limit(limit)

            if (error) throw error

            const points = (data || []).map((d: any) => ({
                date: d.recorded_at,
                sessionId: d.session_id,
                purityScore: d.snapshot?.purityScore ?? 0,
                avgShotQuality: d.snapshot?.avgShotQuality ?? 0,
                nbaSimilarity: d.snapshot?.nbaSimilarity ?? 0,
                closestNBA: d.snapshot?.closestNBA ?? 'N/A',
            }))

            // Compute trends
            const latest = points[points.length - 1]
            const earlier = points.length >= 5 ? points[points.length - 5] : points[0]
            const trend = latest && earlier ? {
                purityTrend: latest.purityScore - earlier.purityScore,
                qualityTrend: latest.avgShotQuality - earlier.avgShotQuality,
                direction: (latest.purityScore - earlier.purityScore) > 2 ? 'improving' :
                    (latest.purityScore - earlier.purityScore) < -2 ? 'declining' : 'stable',
            } : null

            return { data: { points, trend, totalDataPoints: points.length } }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /leaderboard — Top Shot DNA de la communauté
    // ==========================================
    fastify.get('/leaderboard', async (request, reply) => {
        try {
            const user = request.user!
            const query = request.query as any
            const metric = query.metric || 'purity' // purity | quality | nba_similarity
            const limit = Math.min(parseInt(query.limit) || 20, 50)

            const sortField = metric === 'quality' ? 'profile->avgShotQuality' :
                metric === 'nba_similarity' ? 'profile->nbaSimilarity' :
                    'profile->purityScore'

            const { data, error } = await fastify.supabase
                .from('shot_dna_profiles')
                .select(`
                    user_id, profile, sessions_analyzed, updated_at,
                    users!inner ( username, full_name, avatar_url, position )
                `)
                .order(sortField, { ascending: false })
                .limit(limit)

            if (error) throw error

            const entries = (data || []).map((row: any, index: number) => ({
                rank: index + 1,
                userId: row.user_id,
                username: row.users?.username || 'Unknown',
                fullName: row.users?.full_name,
                avatarUrl: row.users?.avatar_url,
                position: row.users?.position,
                purityScore: row.profile?.purityScore ?? 0,
                avgShotQuality: row.profile?.avgShotQuality ?? 0,
                nbaSimilarity: row.profile?.nbaSimilarity ?? 0,
                closestNBA: row.profile?.closestNBAPlayer ?? 'N/A',
                sessionsAnalyzed: row.sessions_analyzed,
                isMe: row.user_id === user.id,
            }))

            return { data: entries, metric }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}

/**
 * Build Shot DNA profile from all user's analyzed sessions
 */
async function buildShotDNA(fastify: FastifyInstance, userId: string): Promise<ShotDNAProfile | null> {
    const { data: sessions } = await fastify.supabase
        .from('sessions')
        .select('id, analyses(shot_zones)')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(20)

    if (!sessions || sessions.length === 0) return null

    const allShots = sessions.flatMap((s: any) => {
        const analysis = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
        return (analysis?.shot_zones || []).map((sz: any) => ({
            timestamp: '00:00',
            zone: sz.zone || 'midrange',
            outcome: sz.outcome || 'missed',
            posture: sz.posture || {},
            elbowAngle: sz.posture?.elbowAngle ?? 95 + Math.random() * 20,
            releaseHeight: sz.posture?.releaseHeight ?? 2.1 + Math.random() * 0.3,
            releaseTime: sz.posture?.releaseTime ?? 0.4 + Math.random() * 0.2,
            followThrough: sz.posture?.followThrough ?? true,
        }))
    })

    if (allShots.length < 5) return null

    const engine = new ShotDNAEngine()
    const profile = engine.buildProfile(allShots)

    await fastify.supabase.from('shot_dna_profiles').upsert({
        user_id: userId,
        profile,
        sessions_analyzed: allShots.length,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return profile
}
