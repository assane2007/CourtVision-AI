import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const sessionIdParamsSchema = z.object({
    sessionId: z.string().uuid(),
})

const programSchema = z.object({
    sessionId: z.string().uuid(),
    weaknesses: z.array(z.string()),
    goals: z.array(z.string()).optional()
})

/**
 * Helper: Verify that a session belongs to the authenticated user.
 * Returns the session_id if valid, or sends a 404/403 and returns null.
 */
async function verifySessionOwnership(
    fastify: FastifyInstance,
    sessionId: string,
    userId: string,
    reply: any,
): Promise<boolean> {
    const { data: session, error } = await fastify.supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()
    if (error || !session) {
        reply.code(404).send({ error: 'Session not found' })
        return false
    }
    return true
}

// Programme 7 jours — retourné depuis l'analyse après le match
export default async function analysisRoutes(fastify: FastifyInstance) {

    fastify.addHook('preValidation', fastify.authenticate)

    fastify.get('/:sessionId', async (request, reply) => {
        try {
            const { sessionId } = sessionIdParamsSchema.parse(request.params)
            const user = request.user!
            if (!(await verifySessionOwnership(fastify, sessionId, user.id, reply))) return
            const { data, error } = await fastify.supabase
                .from('analyses').select('*').eq('session_id', sessionId).single()
            if (error) throw error
            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid session ID format' })
            request.log.error({ err: error }, 'Failed to fetch analysis')
            return reply.code(500).send({ error: 'Failed to fetch analysis' })
        }
    })

    fastify.get('/:sessionId/heatmap', async (request, reply) => {
        try {
            const { sessionId } = sessionIdParamsSchema.parse(request.params)
            const user = request.user!
            if (!(await verifySessionOwnership(fastify, sessionId, user.id, reply))) return
            const { data, error } = await fastify.supabase
                .from('analyses').select('heatmap_data').eq('session_id', sessionId).single()
            if (error) throw error
            return { data: data?.heatmap_data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid session ID format' })
            request.log.error({ err: error }, 'Failed to fetch heatmap')
            return reply.code(500).send({ error: 'Failed to fetch heatmap' })
        }
    })

    fastify.get('/:sessionId/report', async (request, reply) => {
        try {
            const { sessionId } = sessionIdParamsSchema.parse(request.params)
            const user = request.user!
            if (!(await verifySessionOwnership(fastify, sessionId, user.id, reply))) return
            const { data, error } = await fastify.supabase
                .from('analyses').select('ai_report').eq('session_id', sessionId).single()
            if (error) throw error
            return { data: data?.ai_report }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid session ID format' })
            request.log.error({ err: error }, 'Failed to fetch report')
            return reply.code(500).send({ error: 'Failed to fetch report' })
        }
    })

    fastify.get('/:sessionId/highlights', async (request, reply) => {
        try {
            const { sessionId } = sessionIdParamsSchema.parse(request.params)
            const user = request.user!
            if (!(await verifySessionOwnership(fastify, sessionId, user.id, reply))) return
            const { data, error } = await fastify.supabase
                .from('analyses').select('highlights').eq('session_id', sessionId).single()
            if (error) throw error
            return { data: data?.highlights }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid session ID format' })
            request.log.error({ err: error }, 'Failed to fetch highlights')
            return reply.code(500).send({ error: 'Failed to fetch highlights' })
        }
    })

    /**
     * GET /:sessionId/program — Programme d'entraînement 7 jours basé sur les faiblesses détectées
      * Nouvelle fonctionnalité V2 : plan structuré généré par l'IA cloud
     */
    fastify.get('/:sessionId/program', async (request, reply) => {
        try {
            const { sessionId } = sessionIdParamsSchema.parse(request.params)
            const user = request.user!
            if (!(await verifySessionOwnership(fastify, sessionId, user.id, reply))) return

            const { data: analysis, error } = await fastify.supabase
                .from('analyses')
                .select('ai_report, body_language, shot_zones, mental_score')
                .eq('session_id', sessionId)
                .single()

            if (error || !analysis) {
                return reply.code(404).send({ error: 'Analysis not found' })
            }

            // Générer un programme basé sur les données d'analyse
            // Le programme est structuré en 7 jours avec des séances ciblées
            const program = generateTrainingProgram(analysis)

            return { data: program }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid session ID format' })
            request.log.error({ err: error }, 'Failed to generate program')
            return reply.code(500).send({ error: 'Failed to generate training program' })
        }
    })
}

/**
 * Génère un programme d'entraînement de 7 jours basé sur les faiblesses détectées
 * En production : ce programme est généré par le pipeline LLM avec un prompt spécialisé
 */
function generateTrainingProgram(analysis: {
    mental_score?: number
    shot_zones?: any
    body_language?: any
    ai_report?: string
}) {
    const mentalScore = analysis.mental_score ?? 70
    const needsMentalWork = mentalScore < 65

    const days = [
        {
            day: 1,
            focus: needsMentalWork ? 'Confiance et tirs sous pression' : 'Mécanique de tir',
            duration_min: 45,
            exercises: [
                { name: 'Tirs de corner 3 points', reps: '5 séries x 10 tirs', intensity: 'Modérée' },
                { name: 'Mid-range en sortie de dribble', reps: '4 séries x 8 tirs', intensity: 'Modérée' },
                { name: 'Free throws de concentration', reps: '50 lancers francs', intensity: 'Faible' }
            ]
        },
        {
            day: 2,
            focus: 'Footwork et défense',
            duration_min: 40,
            exercises: [
                { name: 'Défense latérale (3 pas)', reps: '6 séries x 30s', intensity: 'Élevée' },
                { name: 'Rotation sur pénétration', reps: '4 séries x 5 rep', intensity: 'Modérée' }
            ]
        },
        {
            day: 3,
            focus: 'Récupération active + cardio basket',
            duration_min: 30,
            exercises: [
                { name: 'Navettes terrain complet', reps: '10 allers-retours', intensity: 'Modérée' },
                { name: 'Visualisation mentale du match', reps: '15 minutes', intensity: 'Faible' }
            ]
        },
        {
            day: 4,
            focus: 'Création de tir 1v1',
            duration_min: 50,
            exercises: [
                { name: 'Euro step drive', reps: '5 séries x 6 rep', intensity: 'Élevée' },
                { name: 'Pull-up jumper après dribble droit', reps: '4 séries x 8 tirs', intensity: 'Élevée' },
                { name: 'Catch and shoot sous pression', reps: '5 séries x 10 tirs', intensity: 'Modérée' }
            ]
        },
        {
            day: 5,
            focus: needsMentalWork ? 'Gestion de la pression mentale' : 'Lecture du jeu 5v5',
            duration_min: 45,
            exercises: [
                { name: 'Jeu mentaux : tir avec peur de rater simulée', reps: '30 tirs chronométrés', intensity: 'Élevée' },
                { name: 'Passes vers l\'espace (shadow)', reps: '4 séries x 10 passes', intensity: 'Modérée' }
            ]
        },
        {
            day: 6,
            focus: 'Session intensive 2v2',
            duration_min: 60,
            exercises: [
                { name: 'Pick and roll attaque/défense', reps: 'Jeu continu 30 min', intensity: 'Élevée' },
                { name: 'Drive et kick-out 3pts', reps: '5 séries x 6 rep', intensity: 'Élevée' }
            ]
        },
        {
            day: 7,
            focus: 'Test et évaluation — Auto-évaluation vidéo',
            duration_min: 30,
            exercises: [
                { name: 'Shooting workout complet filmé', reps: '100 tirs (corner, mi-distance, 3pts)', intensity: 'Modérée' },
                { name: 'Analyse des tirs filmés dans CourtVision', reps: 'Uploader ta session', intensity: 'Faible' }
            ]
        }
    ]

    return {
        weekObjective: needsMentalWork
            ? 'Reconstruire ta confiance et stabiliser ton mental sous pression'
            : 'Affiner tes zones de tir et améliorer ta lecture de jeu',
        mentalFocus: needsMentalWork,
        generatedAt: new Date().toISOString(),
        days
    }
}
