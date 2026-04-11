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

const onboardingProfileSchema = z.object({
    position: z.enum(['PG', 'SG', 'SF', 'PF', 'C']),
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'elite']),
})

const ONBOARDING_POSITIONS = [
    { id: 'PG', label: 'Point Guard', summary: 'Playmaker and tempo controller' },
    { id: 'SG', label: 'Shooting Guard', summary: 'Perimeter scorer and spacer' },
    { id: 'SF', label: 'Small Forward', summary: 'Two-way wing and finisher' },
    { id: 'PF', label: 'Power Forward', summary: 'Interior strength and rebounds' },
    { id: 'C', label: 'Center', summary: 'Rim protector and paint anchor' },
] as const

const ONBOARDING_EXPERIENCE = [
    { id: 'beginner', label: 'Beginner', years: '0-1 year', profileLevel: 1 },
    { id: 'intermediate', label: 'Intermediate', years: '1-3 years', profileLevel: 3 },
    { id: 'advanced', label: 'Advanced', years: '3-5 years', profileLevel: 6 },
    { id: 'elite', label: 'Elite', years: '5+ years', profileLevel: 9 },
] as const

const onboardingLevelMap: Record<z.infer<typeof onboardingProfileSchema>['experienceLevel'], number> = {
    beginner: 1,
    intermediate: 3,
    advanced: 6,
    elite: 9,
}

const authRateLimit = {
    signup: { max: 5, timeWindow: '1 minute' },
    login: { max: 10, timeWindow: '1 minute' },
    socialLogin: { max: 10, timeWindow: '1 minute' },
    refresh: { max: 30, timeWindow: '1 minute' },
} as const

const authRoutes: FastifyPluginAsyncZod = async (app) => {
    // Dedicated auth client: avoids mutating the shared service-role DB client session.
    const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    app.post('/signup', {
        config: {
            rateLimit: authRateLimit.signup,
        },
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
        config: {
            rateLimit: authRateLimit.login,
        },
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
        config: {
            rateLimit: authRateLimit.socialLogin,
        },
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
                error: 'Apple authentication failed'
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
        config: {
            rateLimit: authRateLimit.socialLogin,
        },
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
                error: 'Google authentication failed'
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

    app.get('/onboarding/options', async () => {
        return {
            success: true,
            data: {
                positions: ONBOARDING_POSITIONS,
                experienceLevels: ONBOARDING_EXPERIENCE,
            }
        }
    })

    app.put('/onboarding/profile', {
        preValidation: [app.authenticate],
        schema: {
            body: onboardingProfileSchema,
        },
    }, async (request, reply) => {
        const user = request.user!
        const body = request.body as z.infer<typeof onboardingProfileSchema>

        const { error: userError } = await app.supabase
            .from('users')
            .update({
                position: body.position,
            })
            .eq('id', user.id)

        if (userError) throw userError

        const { error: profileError } = await app.supabase
            .from('public_profiles')
            .upsert({
                user_id: user.id,
                level: onboardingLevelMap[body.experienceLevel],
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

        if (profileError) throw profileError

        return {
            success: true,
            data: {
                position: body.position,
                experienceLevel: body.experienceLevel,
                level: onboardingLevelMap[body.experienceLevel],
            }
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
        config: {
            rateLimit: authRateLimit.refresh,
        },
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
