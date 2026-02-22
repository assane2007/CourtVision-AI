import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const getParamsSchema = z.object({
    sessionId: z.string().uuid()
})

export default async function analysisRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.get('/:sessionId', async (request, reply) => {
        try {
            const params = getParamsSchema.parse(request.params)
            const user = (request as any).user
            const { data, error } = await fastify.supabase.from('analyses')
                .select('*, sessions!inner(*)')
                .eq('session_id', params.sessionId)
                .eq('sessions.user_id', user.id)
                .single()

            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/:sessionId/heatmap', async (request, reply) => {
        try {
            const params = getParamsSchema.parse(request.params)
            const user = (request as any).user
            const { data, error } = await fastify.supabase.from('analyses')
                .select('heatmap_data, sessions!inner(*)')
                .eq('session_id', params.sessionId)
                .eq('sessions.user_id', user.id)
                .single()

            if (error) throw error
            return { data: data.heatmap_data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/:sessionId/report', async (request, reply) => {
        try {
            const params = getParamsSchema.parse(request.params)
            const user = (request as any).user
            const { data, error } = await fastify.supabase.from('analyses')
                .select('ai_report, sessions!inner(*)')
                .eq('session_id', params.sessionId)
                .eq('sessions.user_id', user.id)
                .single()

            if (error) throw error
            return { data: data.ai_report }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/:sessionId/highlights', async (request, reply) => {
        try {
            const params = getParamsSchema.parse(request.params)
            const user = (request as any).user
            const { data, error } = await fastify.supabase.from('analyses')
                .select('highlights, sessions!inner(*)')
                .eq('session_id', params.sessionId)
                .eq('sessions.user_id', user.id)
                .single()

            if (error) throw error
            return { data: data.highlights }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}
