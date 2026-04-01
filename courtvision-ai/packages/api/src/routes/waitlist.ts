import type { FastifyPluginAsync } from 'fastify'

const waitlistRoutes: FastifyPluginAsync = async (app) => {
    /**
     * POST /api/waitlist
     * Inscription à la waitlist (public, pas d'auth requise)
     */
    app.post<{
        Body: { email: string; source?: string }
    }>('/waitlist', {
        schema: {
            body: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    source: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { email, source } = request.body

        try {
            const { error } = await app.supabase
                .from('waitlist')
                .insert({
                    email: email.toLowerCase().trim(),
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
