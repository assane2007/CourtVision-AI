import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

const playerSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2),
    position: z.string().optional(),
    number: z.number().int().optional(),
    team_id: z.string().uuid().optional()
})

const getParamsSchema = z.object({
    id: z.string().uuid()
})

const playersRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook('preValidation', app.authenticate)

    app.post('/', {
        schema: {
            body: playerSchema
        }
    }, async (request, reply) => {
        const body = request.body as z.infer<typeof playerSchema>
        const user = request.user!

        const { data, error } = await app.supabase.from('players').insert({
            ...body,
            user_id: user.id
        }).select().single()

        if (error) throw error
        return { success: true, data }
    })

    app.get('/', async (request, reply) => {
        const user = request.user!

        const { data, error } = await app.supabase
            .from('players')
            .select('*')
            .eq('user_id', user.id)

        if (error) throw error
        return { data }
    })

    app.get('/:id', {
        schema: {
            params: getParamsSchema
        }
    }, async (request, reply) => {
        const params = request.params as z.infer<typeof getParamsSchema>
        const user = request.user!

        const { data, error } = await app.supabase
            .from('players')
            .select('*')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single()

        if (error || !data) return reply.code(404).send({ error: 'Player not found' })
        return { data }
    })

    app.put('/:id', {
        schema: {
            params: getParamsSchema,
            body: playerSchema.partial()
        }
    }, async (request, reply) => {
        const params = request.params as z.infer<typeof getParamsSchema>
        const body = request.body as any
        const user = request.user!

        const { data, error } = await app.supabase
            .from('players')
            .update(body)
            .eq('id', params.id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    })

    app.delete('/:id', {
        schema: {
            params: getParamsSchema
        }
    }, async (request, reply) => {
        const params = request.params as z.infer<typeof getParamsSchema>
        const user = request.user!

        const { error } = await app.supabase
            .from('players')
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id)

        if (error) throw error
        return { success: true }
    })
}

export default playersRoutes
