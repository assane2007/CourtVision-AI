import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const liveSessionSchema = z.object({
    sessionId: z.string().uuid()
})

/**
 * Coach Live Routes — Mode analyse en temps réel pendant le match
 * L'app mobile stream des frames à intervalles réguliers (ex: toutes les 5s via SSE/WebSocket)
 * Le backend analyse les frames partielles et renvoie des alertes instantanées
 */
export default async function liveRoutes(fastify: FastifyInstance) {

    // POST /api/sessions/:id/live — Démarrer le mode Coach Live
    fastify.post('/:id/live', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = (request as any).user
            const { id } = request.params as { id: string }

            // Vérifier que la session existe et appartient à l'utilisateur
            const { data: session, error } = await fastify.supabase
                .from('sessions')
                .select('id, type, status')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (error || !session) {
                return reply.code(404).send({ error: 'Session not found' })
            }

            // Marquer la session en mode live
            await fastify.supabase
                .from('sessions')
                .update({ status: 'live' })
                .eq('id', id)

            return {
                liveSessionId: id,
                status: 'live',
                message: 'Coach Live mode activated. Stream frames to /api/sessions/:id/live/frame'
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // POST /api/sessions/:id/live/frame — Recevoir une frame et retourner une alerte
    fastify.post('/:id/live/frame', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = (request as any).user
            const { id } = request.params as { id: string }
            const body = request.body as { frameBase64?: string; timestamp: number; quarter?: number }

            // Analyse légère de la frame (en production: appel vers le pipeline IA partiel)
            // Pour l'instant, on simule une analyse mentale simple basée sur les données historiques
            const { data: recentAnalyses } = await fastify.supabase
                .from('analyses')
                .select('mental_score, shot_made, shot_attempts')
                .eq('session_id', id)
                .order('created_at', { ascending: false })
                .limit(1)

            // Génération d'alertes contextuelles simulées (en production: ML model)
            const alerts: string[] = []
            const mentalScore = recentAnalyses?.[0]?.mental_score ?? 70
            const shootingPct = recentAnalyses?.[0]
                ? (recentAnalyses[0].shot_made / Math.max(recentAnalyses[0].shot_attempts, 1)) * 100
                : 50

            if (mentalScore < 50) {
                alerts.push('Mental Score bas : joue simple, cherche le layup')
            }
            if (shootingPct < 30) {
                alerts.push('Shooting en difficulté ce quart — passe plus, crée pour les autres')
            }

            return {
                sessionId: id,
                timestamp: body.timestamp,
                quarter: body.quarter,
                mentalScore,
                shootingPct: Math.round(shootingPct),
                alerts,
                vibrate: alerts.length > 0
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}
