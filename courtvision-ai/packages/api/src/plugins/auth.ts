import fp from 'fastify-plugin'
import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
}

export const authPlugin = fp(async (fastify, opts) => {
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const authHeader = request.headers.authorization
            if (!authHeader) {
                throw new Error('No authorization header')
            }

            const token = authHeader.replace('Bearer ', '')
            const { data, error } = await fastify.supabase.auth.getUser(token)

            if (error || !data.user) {
                throw new Error('Invalid token')
            }

            // Inject user on request to use it in routes
            request.user = data.user
        } catch (err) {
            reply.code(401).send({ error: 'Unauthorized' })
        }
    })
})
