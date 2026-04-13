import fp from 'fastify-plugin'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
    interface FastifyRequest {
        user?: {
            id: string
            email?: string
            [key: string]: any
        }
    }
}

export const authPlugin = fp(async (fastify, opts) => {
    // Dedicated client for token verification only.
    // Keeps the shared service-role DB client untouched by auth session state.
    const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    const getBearerToken = (request: FastifyRequest): string | null => {
        const authHeader = request.headers.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7)
        }

        const wsProtocolsHeader = request.headers['sec-websocket-protocol']
        if (typeof wsProtocolsHeader === 'string' && wsProtocolsHeader.length > 0) {
            const protocols = wsProtocolsHeader
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)

            // Browser websockets cannot set custom Authorization headers.
            // We support a token handshake via protocols: ['bearer', '<jwt>'].
            if (protocols[0]?.toLowerCase() === 'bearer' && protocols[1]) {
                return protocols[1]
            }

            const bearerProtocol = protocols.find((value) => value.toLowerCase().startsWith('bearer.'))
            if (bearerProtocol) {
                return bearerProtocol.slice('bearer.'.length)
            }
        }

        return null
    }

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const token = getBearerToken(request)
            if (!token) {
                return reply.code(401).send({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Missing authentication token'
                })
            }

            if (!token || token.length < 10) {
                return reply.code(401).send({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Invalid token format'
                })
            }

            const { data, error } = await authClient.auth.getUser(token)

            if (error || !data.user) {
                request.log.warn({ error: error?.message }, 'Auth token validation failed')
                return reply.code(401).send({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Invalid or expired token'
                })
            }

            // Inject user on request to use it in routes
            request.user = {
                id: data.user.id,
                email: data.user.email ?? undefined,
            }
        } catch (err: any) {
            request.log.error({ err }, 'Authentication error')
            return reply.code(401).send({
                success: false,
                error: 'Unauthorized',
                message: 'Authentication failed'
            })
        }
    })
})
