import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

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

const appleLoginSchema = z.object({
    id_token: z.string().min(1, 'Apple ID token is required'),
    nonce: z.string().optional(),
    full_name: z.string().optional(),
})

const googleLoginSchema = z.object({
    id_token: z.string().min(1, 'Google ID token is required'),
    full_name: z.string().optional(),
})

const authRoutes: FastifyPluginAsyncZod = async (app) => {
    // Dedicated auth client: avoids mutating the shared service-role DB client session.
    const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    app.post('/signup', {
        schema: {
            body: signupSchema
        }
    }, async (request, reply) => {
        const body = request.body as z.infer<typeof signupSchema>

        const { data, error } = await authClient.auth.signUp({
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
        const { data, error } = await authClient.auth.signInWithPassword({
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

    app.post('/apple', {
        schema: { body: appleLoginSchema }
    }, async (request, reply) => {
        const { id_token, nonce, full_name } = request.body as z.infer<typeof appleLoginSchema>

        // Use Supabase's built-in Apple OAuth token verification
        const { data, error } = await authClient.auth.signInWithIdToken({
            provider: 'apple',
            token: id_token,
            nonce,
        })

        if (error) {
            app.log.error(error, 'Apple Sign-In failed')
            return reply.code(401).send({
                success: false,
                error: 'Apple authentication failed',
                details: error.message
            })
        }

        // Create or update user profile
        if (data.user) {
            const { error: profileError } = await app.supabase
                .from('users')
                .upsert({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: full_name || data.user.user_metadata?.full_name,
                    auth_provider: 'apple',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })

            if (profileError) {
                app.log.error(profileError, 'Apple profile upsert error')
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

    app.post('/google', {
        schema: { body: googleLoginSchema }
    }, async (request, reply) => {
        const { id_token, full_name } = request.body as z.infer<typeof googleLoginSchema>

        // Use Supabase's built-in Google OAuth token verification
        const { data, error } = await authClient.auth.signInWithIdToken({
            provider: 'google',
            token: id_token,
        })

        if (error) {
            app.log.error(error, 'Google Sign-In failed')
            return reply.code(401).send({
                success: false,
                error: 'Google authentication failed',
                details: error.message
            })
        }

        // Create or update user profile
        if (data.user) {
            const { error: profileError } = await app.supabase
                .from('users')
                .upsert({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: full_name || data.user.user_metadata?.full_name,
                    username: data.user.user_metadata?.name?.replace(/\s+/g, '_').toLowerCase(),
                    auth_provider: 'google',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })

            if (profileError) {
                app.log.error(profileError, 'Google profile upsert error')
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
        const { data, error } = await authClient.auth.refreshSession({ refresh_token: body.refresh_token })
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
