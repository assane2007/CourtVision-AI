import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    username: z.string().min(3),
    full_name: z.string().optional()
})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
})

const refreshSchema = z.object({
    refresh_token: z.string()
})

export default async function authRoutes(fastify: FastifyInstance) {
    fastify.post('/signup', async (request, reply) => {
        try {
            const body = signupSchema.parse(request.body)

            const { data, error } = await fastify.supabase.auth.signUp({
                email: body.email,
                password: body.password,
                options: {
                    data: {
                        username: body.username,
                        full_name: body.full_name
                    }
                }
            })

            if (error) throw error

            // La table users (profil) est typiquement remplie par un trigger DB sur auth.users.
            // Ou on peut la créer ici en tant que fallback.
            if (data.user) {
                const { error: profileError } = await fastify.supabase.from('users').insert({
                    id: data.user.id,
                    email: body.email,
                    username: body.username,
                    full_name: body.full_name
                })
                if (profileError) {
                    fastify.log.error(profileError, 'Erreur creation profil');
                }
            }

            return { data: { user: data.user, session: data.session } }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.post('/login', async (request, reply) => {
        try {
            const body = loginSchema.parse(request.body)
            const { data, error } = await fastify.supabase.auth.signInWithPassword({
                email: body.email,
                password: body.password
            })
            if (error) throw error
            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(401).send({ error: error.message })
        }
    })

    fastify.post('/logout', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const authHeader = request.headers.authorization!
            const token = authHeader.replace('Bearer ', '')
            const { error } = await fastify.supabase.auth.admin.signOut(token)
            if (error) throw error
            return { success: true }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.post('/refresh', async (request, reply) => {
        try {
            const body = refreshSchema.parse(request.body)
            const { data, error } = await fastify.supabase.auth.refreshSession({ refresh_token: body.refresh_token })
            if (error) throw error
            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(401).send({ error: error.message })
        }
    });

    fastify.get('/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const user = request.user!
        const { data, error } = await fastify.supabase.from('users').select('*').eq('id', user.id).single()
        if (error) return reply.code(400).send({ error: error.message })
        return { data }
    })
}
