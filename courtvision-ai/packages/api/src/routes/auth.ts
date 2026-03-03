import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    username: z.string().min(3),
    full_name: z.string().optional()
})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required').max(200)
})

const refreshSchema = z.object({
    refresh_token: z.string()
})

const authRoutes: FastifyPluginAsyncZod = async (app) => {
    app.post('/signup', {
        schema: {
            body: signupSchema
        }
    }, async (request, reply) => {
        const body = request.body as z.infer<typeof signupSchema>

        const { data, error } = await app.supabase.auth.signUp({
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

        if (data.user) {
            const { error: profileError } = await app.supabase.from('users').insert({
                id: data.user.id,
                email: body.email,
                username: body.username,
                full_name: body.full_name
            })
            if (profileError) {
                app.log.error(profileError, 'Erreur creation profil');
            }
        }

        return {
            success: true,
            user: { ...data.user, role: 'player' },
            tokens: data.session ? {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresIn: data.session.expires_in
            } : null
        }
    })

    app.post('/login', {
        schema: {
            body: loginSchema
        }
    }, async (request, reply) => {
        const body = request.body as z.infer<typeof loginSchema>
        const { data, error } = await app.supabase.auth.signInWithPassword({
            email: body.email,
            password: body.password
        })
        if (error) throw error
        return {
            success: true,
            user: { ...data.user, role: 'player' },
            tokens: {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                expiresIn: data.session.expires_in
            }
        }
    })

    app.post('/apple', async (request, reply) => {
        const body = request.body as any
        // Demo/Simulated implementation for OAuth login on backend mapping via token
        const dummyToken = `dummy_apple_access_${Date.now()}`
        return {
            success: true,
            user: { id: `apple-${Date.now()}`, email: 'apple@example.com', role: 'player' },
            tokens: { accessToken: dummyToken, refreshToken: 'dummy_refresh', expiresIn: 3600 }
        }
    })

    app.post('/google', async (request, reply) => {
        const body = request.body as any
        const dummyToken = `dummy_google_access_${Date.now()}`
        return {
            success: true,
            user: { id: `google-${Date.now()}`, email: 'google@example.com', role: 'player' },
            tokens: { accessToken: dummyToken, refreshToken: 'dummy_refresh', expiresIn: 3600 }
        }
    })

    app.delete('/logout', { preValidation: [app.authenticate] }, async (request, reply) => {
        const authHeader = request.headers.authorization!
        const token = authHeader.replace('Bearer ', '')
        const { error } = await app.supabase.auth.admin.signOut(token)
        if (error) throw error
        return { success: true }
    })

    app.post('/refresh', {
        schema: {
            body: refreshSchema
        }
    }, async (request, reply) => {
        const body = request.body as z.infer<typeof refreshSchema>
        const { data, error } = await app.supabase.auth.refreshSession({ refresh_token: body.refresh_token })
        if (error) throw error
        return { success: true, data }
    });

    app.get('/me', { preValidation: [app.authenticate] }, async (request, reply) => {
        const user = request.user!
        const { data, error } = await app.supabase.from('users').select('*').eq('id', user.id).single()
        if (error) throw error
        return { success: true, data }
    })
}

export default authRoutes
