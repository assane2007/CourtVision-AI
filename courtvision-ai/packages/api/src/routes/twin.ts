import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
    TwinBuilder,
    TwinSimulator,
    generateTwinInsights,
    generateTwinDrillRecommendations,
    type TwinProfile,
    type SessionAnalysisData,
} from '@courtvision/ai'

const simulateSchema = z.object({
    opponent: z.enum(['nba', 'user']).default('nba'),
    opponentName: z.string().optional(),
    opponentId: z.string().uuid().optional(),
    intensity: z.number().min(0).max(100).optional(),
})

const compareSchema = z.object({
    userId: z.string().uuid()
})

const drillRecommendationQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(10).default(5),
})

/**
 * Digital Twin Routes — Avatar IA évolutif du joueur.
 *
 * Le Twin est construit à partir de toutes les analyses passées du joueur.
 * Il est recalculé automatiquement après chaque nouvelle session analysée
 * et peut être consulté, comparé, et utilisé pour des simulations.
 *
 * Endpoints :
 * - GET  /me         → Profil Twin complet
 * - POST /rebuild    → Reconstruire le Twin à partir des données
 * - POST /simulate   → Simuler un match-up
 * - GET  /compare/:userId → Comparer avec un autre joueur
 * - GET  /evolution   → Historique d'évolution
 * - GET  /insights    → Insights IA personnalisés
 * - GET  /drills      → Recommandations de drills dynamiques
 */
export default async function twinRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // GET /me — Récupérer le profil Twin complet
    // ==========================================
    fastify.get('/me', async (request, reply) => {
        try {
            const user = request.user!
            const { data: twin, error } = await fastify.supabase
                .from('digital_twins')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error || !twin) {
                // Pas de twin → le construire
                const profile = await buildTwinForUser(fastify, user.id)
                return { data: profile }
            }

            return {
                data: {
                    twin,
                    profile: twin.twin_profile ?? null,
                    insights: twin.ai_insights ?? null,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /rebuild — Reconstruire le Twin
    // ==========================================
    fastify.post('/rebuild', async (request, reply) => {
        try {
            const user = request.user!
            const result = await buildTwinForUser(fastify, user.id)
            return { data: result, message: 'Digital Twin reconstruit avec succès ✅' }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /simulate — Simuler un match-up
    // ==========================================
    fastify.post('/simulate', async (request, reply) => {
        try {
            const body = simulateSchema.parse(request.body)
            const user = request.user!

            // Récupérer le Twin du joueur
            const { data: twin, error } = await fastify.supabase
                .from('digital_twins')
                .select('twin_profile')
                .eq('user_id', user.id)
                .single()

            if (error || !twin?.twin_profile) {
                return reply.code(404).send({
                    error: 'Digital Twin non trouvé',
                    message: 'Analyse au moins une session vidéo pour créer ton Twin'
                })
            }

            const playerProfile = twin.twin_profile as TwinProfile

            let simulation

            if (body.opponent === 'nba' && body.opponentName) {
                // Simulation vs joueur NBA
                simulation = TwinSimulator.simulateVsNBA(playerProfile, body.opponentName)
            } else if (body.opponent === 'user' && body.opponentId) {
                // Simulation vs autre joueur
                const { data: oppTwin } = await fastify.supabase
                    .from('digital_twins')
                    .select('twin_profile')
                    .eq('user_id', body.opponentId)
                    .single()

                const oppProfile = oppTwin?.twin_profile as TwinProfile | null
                simulation = TwinSimulator.simulate(playerProfile, oppProfile, 'Adversaire')
            } else {
                return reply.code(400).send({
                    error: 'Spécifie opponentName (NBA) ou opponentId (utilisateur)'
                })
            }

            return { data: simulation }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /compare/:userId — Comparer deux Twins
    // ==========================================
    fastify.get('/compare/:userId', async (request, reply) => {
        try {
            const params = compareSchema.parse(request.params)
            const user = request.user!

            const { data: myTwin, error: myError } = await fastify.supabase
                .from('digital_twins')
                .select('*')
                .eq('user_id', user.id)
                .single()

            const { data: oppTwin, error: oppError } = await fastify.supabase
                .from('digital_twins')
                .select('*')
                .eq('user_id', params.userId)
                .single()

            if (myError || !myTwin) {
                return reply.code(404).send({ error: 'Ton Digital Twin n\'existe pas encore' })
            }
            if (oppError || !oppTwin) {
                return reply.code(404).send({ error: 'Le Digital Twin de l\'adversaire n\'existe pas' })
            }

            const myProfile = myTwin.twin_profile as TwinProfile | null
            const oppProfile = oppTwin.twin_profile as TwinProfile | null

            // Construire la comparaison catégorie par catégorie
            const categories = ['Tir', 'Mental', 'Physique', 'Tactique'].map(cat => {
                const pScore = myProfile?.attributeCategories?.find((c: any) => c.category === cat)?.overallScore ?? 50
                const oScore = oppProfile?.attributeCategories?.find((c: any) => c.category === cat)?.overallScore ?? 50
                const diff = pScore - oScore
                return {
                    category: cat,
                    playerScore: pScore,
                    opponentScore: oScore,
                    edge: diff > 3 ? 'player' : diff < -3 ? 'opponent' : 'even',
                }
            })

            const playerTotal = categories.reduce((s, c) => s + c.playerScore, 0)
            const oppTotal = categories.reduce((s, c) => s + c.opponentScore, 0)

            return {
                data: {
                    myTwin,
                    opponentTwin: oppTwin,
                    comparison: {
                        categories,
                        advantage: playerTotal > oppTotal + 10 ? 'player' : oppTotal > playerTotal + 10 ? 'opponent' : 'even',
                        summary: playerTotal > oppTotal + 10
                            ? 'Tu as un avantage global sur cet adversaire 💪'
                            : oppTotal > playerTotal + 10
                                ? 'L\'adversaire a un léger avantage — prépare ta stratégie'
                                : 'Match très serré, ça se jouera sur les détails',
                    }
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /evolution — Historique d'évolution
    // ==========================================
    fastify.get('/evolution', async (request, reply) => {
        try {
            const user = request.user!
            const { data: twin, error } = await fastify.supabase
                .from('digital_twins')
                .select('twin_profile, evolution')
                .eq('user_id', user.id)
                .single()

            if (error || !twin) {
                return reply.code(404).send({ error: 'Digital Twin non trouvé' })
            }

            const profile = twin.twin_profile as TwinProfile | null
            return {
                data: {
                    evolution: profile?.evolution ?? twin.evolution ?? [],
                    currentRating: profile?.overallRating ?? 50,
                    sessionCount: profile?.sessionCount ?? 0,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /insights — Insights IA personnalisés
    // ==========================================
    fastify.get('/insights', async (request, reply) => {
        try {
            const user = request.user!
            const { data: twin, error } = await fastify.supabase
                .from('digital_twins')
                .select('twin_profile, ai_insights')
                .eq('user_id', user.id)
                .single()

            if (error || !twin?.twin_profile) {
                return reply.code(404).send({ error: 'Digital Twin non trouvé' })
            }

            // Si insights déjà générés, les renvoyer
            if (twin.ai_insights) {
                return { data: { insights: twin.ai_insights, cached: true } }
            }

            // Sinon, générer via LLM
            const profile = twin.twin_profile as TwinProfile
            const insights = await generateTwinInsights(profile)

            // Sauvegarder
            await fastify.supabase
                .from('digital_twins')
                .update({ ai_insights: insights })
                .eq('user_id', user.id)

            return { data: { insights, cached: false } }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /drills — Recommandations dynamiques
    // ==========================================
    fastify.get('/drills', async (request, reply) => {
        try {
            const user = request.user!
            const { limit } = drillRecommendationQuerySchema.parse(request.query)

            const { data: twin, error } = await fastify.supabase
                .from('digital_twins')
                .select('model_version, twin_profile, updated_at')
                .eq('user_id', user.id)
                .single()

            let profile = twin?.twin_profile as TwinProfile | null
            let source: 'stored' | 'rebuilt' = 'stored'

            // Si aucun twin persistant, on le reconstruit pour générer une reco exploitable.
            if (error || !profile) {
                const rebuilt = await buildTwinForUser(fastify, user.id, { skipInsightsGeneration: true })
                profile = rebuilt.profile
                source = 'rebuilt'
            }

            if (!profile) {
                return reply.code(404).send({ error: 'Digital Twin non trouvé' })
            }

            const recommendations = generateTwinDrillRecommendations(profile, { limit })

            return {
                data: {
                    recommendations,
                    source,
                    generatedAt: new Date().toISOString(),
                    profileVersion: profile.modelVersion ?? twin?.model_version ?? null,
                    profileUpdatedAt: profile.updatedAt ?? twin?.updated_at ?? null,
                    sessionCount: profile.sessionCount,
                    overallRating: profile.overallRating,
                    playStyle: profile.playStyle.primary,
                }
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })
}

// ==========================================
// Helper — Construire le Twin pour un utilisateur
// ==========================================

async function buildTwinForUser(
    fastify: FastifyInstance,
    userId: string,
    options: { skipInsightsGeneration?: boolean } = {}
): Promise<{ twin: any; profile: TwinProfile; insights: string }> {
    // 1. Récupérer toutes les sessions analysées
    const { data: sessions } = await fastify.supabase
        .from('sessions')
        .select('id, type, created_at, status')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(30)

    // 2. Récupérer les analyses correspondantes
    const sessionIds = (sessions ?? []).map((s: any) => s.id)

    const { data: analyses } = await fastify.supabase
        .from('analyses')
        .select('*')
        .in('session_id', sessionIds.length > 0 ? sessionIds : ['none'])

    // 3. Construire les données de session
    const sessionData: SessionAnalysisData[] = (analyses ?? []).map((a: any) => {
        const session = sessions?.find((s: any) => s.id === a.session_id)
        return {
            sessionId: a.session_id,
            date: session?.created_at ?? a.created_at,
            type: session?.type ?? 'match',
            shots: a.shot_zones ?? [],
            mental: {
                mentalFragilityScore: a.mental_score ?? 50,
                fatigueIndex: a.body_language?.fatigueIndex ?? 30,
                bodyLanguageScore: a.body_language?.bodyLanguageScore ?? 50,
                detectedPatterns: a.body_language?.patterns ?? [],
                timeline: a.body_language?.timeline ?? [],
                confidenceLevel: 'medium' as const,
                insights: a.body_language?.insights ?? [],
                quarterComparison: a.body_language?.quarterComparison ?? { q1: 50, q2: 50, q3: 50, q4: 50 },
            },
            reconstruction: {
                heatmapData: a.heatmap_data?.points ?? [],
                aerialViewPositions: [],
                playerDistances: [],
                zoneOccupancy: a.heatmap_data?.zoneOccupancy ?? {},
                averagePositions: {},
                totalDistanceCovered: a.heatmap_data?.totalDistanceCovered ?? {},
                maxSpeed: {},
            },
        }
    })

    // 4. Charger le profil existant si disponible
    const { data: existingTwin } = await fastify.supabase
        .from('digital_twins')
        .select('twin_profile, ai_insights')
        .eq('user_id', userId)
        .single()

    // 5. Construire le Twin
    const builder = new TwinBuilder()
    if (existingTwin?.twin_profile) {
        builder.loadExistingProfile(existingTwin.twin_profile as TwinProfile)
    }
    builder.addSessions(sessionData)
    const profile = builder.buildProfile()

    // 6. Générer les insights IA
    let insights = ''
    if (options.skipInsightsGeneration) {
        insights = typeof existingTwin?.ai_insights === 'string' && existingTwin.ai_insights.length > 0
            ? existingTwin.ai_insights
            : `Note globale : ${profile.overallRating}/100 — Style : ${profile.playStyle.primary}. Continue à jouer pour enrichir ton profil.`
    } else {
        try {
            insights = await generateTwinInsights(profile)
        } catch {
            insights = `Note globale : ${profile.overallRating}/100 — Style : ${profile.playStyle.primary}. Continue à jouer pour enrichir ton profil.`
        }
    }

    if (!insights) {
        insights = `Note globale : ${profile.overallRating}/100 — Style : ${profile.playStyle.primary}. Continue à jouer pour enrichir ton profil.`
    }

    // 7. Sauvegarder dans la DB (upsert)
    const twinData = {
        user_id: userId,
        model_version: profile.modelVersion,
        overall_rating: profile.overallRating,
        play_style: profile.playStyle,
        attribute_categories: profile.attributeCategories,
        strengths: profile.strengths.map((s: any) => s.label),
        weaknesses: profile.weaknesses.map((w: any) => w.label),
        nba_comparisons: profile.nbaComparisons,
        comfort_zones: profile.comfortZones,
        evolution: profile.evolution,
        mental_profile: profile.mentalProfile,
        pose_signature: profile.poseSignature,
        pose_data: profile.poseSignature,
        twin_profile: profile,
        ai_insights: insights,
        session_count: profile.sessionCount,
        updated_at: new Date().toISOString(),
    }

    await fastify.supabase
        .from('digital_twins')
        .upsert({ ...twinData }, { onConflict: 'user_id' })

    return { twin: twinData, profile, insights }
}
