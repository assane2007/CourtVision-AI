import { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

/**
 * Standardized error response handler.
 * 
 * - ZodError → 400 with validation details
 * - Known operational errors → generic message (no internals leaked)
 * - Never exposes error.message, stack traces, or DB details to the client
 */
export function handleRouteError(
    request: FastifyRequest,
    reply: FastifyReply,
    error: unknown,
    context: string = 'Request failed',
): void {
    if (error instanceof ZodError) {
        reply.code(400).send({
            error: 'Validation failed',
            details: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        })
        return
    }

    const err = error as Error
    request.log.error({ err, context }, context)

    // Do not leak internal error details
    reply.code(500).send({ error: context })
}
