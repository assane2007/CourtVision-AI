import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const simulateSchema = z.object({
    situationId: z.string(),
    intensity: z.number().min(0).max(100).optional()
})

const getCompareSchema = z.object({
    userId: z.string().uuid()
})

export default async function twinRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.get('/me', async (request, reply) => {
        try {
            const user = (request as any).user
            const { data, error } = await fastify.supabase.from('digital_twins')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.post('/simulate', async (request, reply) => {
        try {
            const body = simulateSchema.parse(request.body)
            const user = (request as any).user

            // Ici: appler LLM/IA pour renvoyer une simulation contre son Twin
            const simulationResult = { outcome: 'Simulated outcome based on user twin.' }

            return { data: simulationResult }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/compare/:userId', async (request, reply) => {
        try {
            const params = getCompareSchema.parse(request.params)
            const user = (request as any).user

            // Recuperer notre twin + le twin de target
            const { data: myTwin, error: myError } = await fastify.supabase.from('digital_twins')
                .select('*').eq('user_id', user.id).single()

            const { data: opponentTwin, error: oppError } = await fastify.supabase.from('digital_twins')
                .select('*').eq('user_id', params.userId).single()

            if (myError || oppError) throw new Error('Could not fetch twins')

            // Logique de comparaison
            const comparison = { myTwin, opponentTwin, advantage: 'Tie' }

            return { data: comparison }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}
