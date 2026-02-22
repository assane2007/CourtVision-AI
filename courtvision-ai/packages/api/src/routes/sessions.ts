import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const uploadSchema = z.object({
    type: z.enum(['match', 'training', 'shootaround']),
    video_url: z.string().url()
})

const getSessionParamsSchema = z.object({
    id: z.string().uuid()
})

export default async function sessionRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.post('/upload', async (request, reply) => {
        try {
            const user = (request as any).user
            const body = uploadSchema.parse(request.body)

            const { data, error } = await fastify.supabase.from('sessions').insert({
                user_id: user.id,
                type: body.type,
                video_url: body.video_url,
                status: 'processing'
            }).select().single()

            if (error) throw error

            // Envoyer vers la queue (BullMQ) pour lancer l'async IA
            const { videoQueue } = require('../queue/videoProcessor')
            await videoQueue.add('process-video', {
                sessionId: data.id,
                videoUrl: data.video_url,
                userId: user.id
            })

            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/', async (request, reply) => {
        try {
            const user = (request as any).user
            const { data, error } = await fastify.supabase.from('sessions').select('*').eq('user_id', user.id)
            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/:id', async (request, reply) => {
        try {
            const params = getSessionParamsSchema.parse(request.params)
            const user = (request as any).user

            // select *, et lier avec analyses
            const { data, error } = await fastify.supabase
                .from('sessions')
                .select(`
          *,
          analyses (*)
        `)
                .eq('id', params.id)
                .eq('user_id', user.id)
                .single()

            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.delete('/:id', async (request, reply) => {
        try {
            const params = getSessionParamsSchema.parse(request.params)
            const user = (request as any).user

            const { error } = await fastify.supabase.from('sessions')
                .delete()
                .eq('id', params.id)
                .eq('user_id', user.id)

            if (error) throw error
            return { success: true }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // GET /:id/status (SSE)
    fastify.get('/:id/status', async (request, reply) => {
        const params = getSessionParamsSchema.parse(request.params)

        reply.raw.setHeader('Content-Type', 'text/event-stream')
        reply.raw.setHeader('Cache-Control', 'no-cache')
        reply.raw.setHeader('Connection', 'keep-alive')

        const interval = setInterval(async () => {
            const { data } = await fastify.supabase.from('sessions').select('status').eq('id', params.id).single()
            if (data) {
                reply.raw.write(`data: ${JSON.stringify({ status: data.status })}\n\n`)
                if (data.status === 'complete' || data.status === 'failed') {
                    clearInterval(interval)
                    reply.raw.end()
                }
            }
        }, 2000)

        request.raw.on('close', () => clearInterval(interval))
    })
}
