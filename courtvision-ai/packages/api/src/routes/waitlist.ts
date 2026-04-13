import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const waitlistBodySchema = z.object({
    email: z.string().email(),
    source: z.string().optional(),
})

const waitlistResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
})

const waitlistRoutes: FastifyPluginAsync = async (app) => {
    const isValidEmail = (value: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    }

    /**
     * POST /api/waitlist
     * Inscription à la waitlist (public, pas d'auth requise)
     */
    app.post('/waitlist', {
        schema: {
            body: waitlistBodySchema,
            response: {
                200: waitlistResponseSchema,
                400: waitlistResponseSchema,
                500: waitlistResponseSchema,
            },
        },
    }, async (request, reply) => {
        const { email, source } = request.body as z.infer<typeof waitlistBodySchema>
        const normalizedEmail = String(email || '').trim().toLowerCase()

        if (!isValidEmail(normalizedEmail)) {
            return reply.status(400).send({
                success: false,
                message: 'Adresse email invalide.',
            })
        }

        try {
            const { error } = await app.supabase
                .from('waitlist')
                .insert({
                    email: normalizedEmail,
                    source: source || 'landing',
                })

            if (error) {
                // Duplicate email (unique constraint)
                if (error.code === '23505') {
                    return reply.status(200).send({
                        success: true,
                        message: 'Tu es déjà inscrit(e) ! On te contacte bientôt. 🏀',
                    })
                }
                throw error
            }

            return reply.status(200).send({
                success: true,
                message: 'Bienvenue dans la beta ! On te contacte très vite. 🔥',
            })
        } catch (err: any) {
            app.log.error(err)
            return reply.status(500).send({
                success: false,
                message: 'Une erreur est survenue. Réessaie dans quelques instants.',
            })
        }
    })

    /**
     * GET /api/waitlist/count
     * Nombre d'inscrits (public, pour affichage sur la landing)
     */
    app.get('/waitlist/count', async (_request, reply) => {
        try {
            const { count, error } = await app.supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true })

            if (error) throw error

            return reply.send({ count: count || 0 })
        } catch (err: any) {
            app.log.error(err)
            return reply.status(500).send({ count: 0 })
        }
    })
}

export default waitlistRoutes
