import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Déclaration de module pour étendre les types Fastify globaux.
 * Permet d'accéder à `request.user` de manière type-safe dans toutes les routes.
 */
declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: string
            email?: string
            [key: string]: any
        }
    }
}
