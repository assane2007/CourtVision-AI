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

const profileUpdateSchema = z.object({
    full_name: z.string().min(1).max(80).optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
    position: z.enum(['PG', 'SG', 'SF', 'PF', 'C']).optional(),
    level: z.string().min(1).max(40).optional(),
    bio: z.string().max(200).optional(),
    location: z.string().max(100).optional(),
    team: z.string().max(100).optional(),
    is_public: z.boolean().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field is required',
})

const pushTokenSchema = z.object({
    token: z.string().min(10).max(512),
    platform: z.enum(['ios', 'android', 'web']),
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

const onboardingCalibrationShotSchema = z.object({
    elbowAngle: z.number().finite(),
    kneeAngle: z.number().finite(),
    postureScore: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
})

const onboardingCalibrationSchema = z.object({
    shots: z.array(onboardingCalibrationShotSchema).min(1).max(10),
    averageElbowAngle: z.number().finite(),
    averageKneeAngle: z.number().finite(),
    averagePostureScore: z.number().min(0).max(100),
    averageConfidence: z.number().min(0).max(1),
    capturedAt: z.string().min(10),
    source: z.string().min(3),
})

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined, relationName: string): boolean {
    if (!error) return false
    if (error.code === '42P01') return true

    const message = (error.message ?? '').toLowerCase()
    return message.includes(relationName.toLowerCase()) && message.includes('does not exist')
}

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
    signup: { max: 10, timeWindow: '1 minute' },
    login: { max: 10, timeWindow: '1 minute' },
    socialLogin: { max: 10, timeWindow: '1 minute' },
    refresh: { max: 10, timeWindow: '1 minute' },
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

    app.put('/onboarding/calibration', {
        preValidation: [app.authenticate],
        schema: {
            body: onboardingCalibrationSchema,
        },
    }, async (request, reply) => {
        const user = request.user!
        const body = request.body as z.infer<typeof onboardingCalibrationSchema>

        const calibration = {
            source: body.source,
            capturedAt: body.capturedAt,
            shotCount: body.shots.length,
            averages: {
                elbowAngle: body.averageElbowAngle,
                kneeAngle: body.averageKneeAngle,
                postureScore: body.averagePostureScore,
                confidence: body.averageConfidence,
            },
            shots: body.shots,
        }

        const { data: existingTwin, error: existingTwinError } = await app.supabase
            .from('digital_twins')
            .select('mental_profile, pose_signature, twin_profile')
            .eq('user_id', user.id)
            .maybeSingle()

        if (existingTwinError && !isMissingRelationError(existingTwinError, 'digital_twins')) {
            throw existingTwinError
        }

        if (isMissingRelationError(existingTwinError, 'digital_twins')) {
            app.log.warn(existingTwinError, 'digital_twins table unavailable, skipping onboarding calibration persistence')
            return {
                success: true,
                data: {
                    stored: false,
                    reason: 'digital_twins_unavailable',
                },
            }
        }

        const existingMentalProfile = isPlainObject(existingTwin?.mental_profile)
            ? existingTwin.mental_profile
            : {}
        const existingPoseSignature = isPlainObject(existingTwin?.pose_signature)
            ? existingTwin.pose_signature
            : {}
        const existingTwinProfile = isPlainObject(existingTwin?.twin_profile)
            ? existingTwin.twin_profile
            : {}

        const nextMentalProfile = {
            ...existingMentalProfile,
            onboardingCalibration: {
                postureScore: body.averagePostureScore,
                confidence: body.averageConfidence,
                capturedAt: body.capturedAt,
                source: body.source,
            },
        }

        const nextPoseSignature = {
            ...existingPoseSignature,
            onboardingCalibration: calibration,
        }

        const nextTwinProfile = {
            ...existingTwinProfile,
            onboarding: {
                ...(isPlainObject(existingTwinProfile.onboarding) ? existingTwinProfile.onboarding : {}),
                calibration,
            },
        }

        const { error: upsertError } = await app.supabase
            .from('digital_twins')
            .upsert({
                user_id: user.id,
                mental_profile: nextMentalProfile,
                pose_signature: nextPoseSignature,
                twin_profile: nextTwinProfile,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

        if (upsertError) {
            if (isMissingRelationError(upsertError, 'digital_twins')) {
                app.log.warn(upsertError, 'digital_twins table unavailable during upsert, skipping onboarding calibration persistence')
                return {
                    success: true,
                    data: {
                        stored: false,
                        reason: 'digital_twins_unavailable',
                    },
                }
            }

            throw upsertError
        }

        return {
            success: true,
            data: {
                stored: true,
                shotCount: body.shots.length,
                capturedAt: body.capturedAt,
            },
        }
    })

    app.patch('/profile', {
        preValidation: [app.authenticate],
        schema: {
            body: profileUpdateSchema,
        },
    }, async (request, reply) => {
        const user = request.user!
        const body = request.body as z.infer<typeof profileUpdateSchema>

        const userPatch: Record<string, unknown> = {}
        if (body.full_name !== undefined) userPatch.full_name = body.full_name
        if (body.username !== undefined) userPatch.username = body.username
        if (body.position !== undefined) userPatch.position = body.position
        if (body.level !== undefined) userPatch.level = body.level

        if (Object.keys(userPatch).length > 0) {
            const { error: userError } = await app.supabase
                .from('users')
                .update(userPatch)
                .eq('id', user.id)

            if (userError) {
                if (userError.code === '23505') {
                    return reply.code(409).send({
                        success: false,
                        error: 'Username already taken',
                    })
                }
                throw userError
            }
        }

        const publicProfilePatch: Record<string, unknown> = {}
        if (body.bio !== undefined) publicProfilePatch.bio = body.bio
        if (body.location !== undefined) publicProfilePatch.location = body.location
        if (body.team !== undefined) publicProfilePatch.team = body.team
        if (body.is_public !== undefined) publicProfilePatch.is_public = body.is_public

        if (Object.keys(publicProfilePatch).length > 0) {
            const { error: profileError } = await app.supabase
                .from('public_profiles')
                .upsert({
                    user_id: user.id,
                    ...publicProfilePatch,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })

            if (profileError && !isMissingRelationError(profileError, 'public_profiles')) {
                throw profileError
            }
        }

        const { data: updatedUser, error: updatedUserError } = await app.supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

        if (updatedUserError) throw updatedUserError

        let updatedPublicProfile: Record<string, unknown> | null = null
        const { data: profileData, error: profileReadError } = await app.supabase
            .from('public_profiles')
            .select('bio, location, team, is_public')
            .eq('user_id', user.id)
            .maybeSingle()

        if (profileReadError && !isMissingRelationError(profileReadError, 'public_profiles')) {
            throw profileReadError
        }

        if (!profileReadError) {
            updatedPublicProfile = profileData as Record<string, unknown> | null
        }

        return {
            success: true,
            data: {
                ...updatedUser,
                ...(updatedPublicProfile || {}),
            },
        }
    })

    app.post('/push-token', {
        preValidation: [app.authenticate],
        schema: {
            body: pushTokenSchema,
        },
    }, async (request) => {
        const user = request.user!
        const { token, platform } = request.body as z.infer<typeof pushTokenSchema>
        const now = new Date().toISOString()

        const candidates = [
            { table: 'user_push_tokens', row: { user_id: user.id, token, platform, updated_at: now } },
            { table: 'push_tokens', row: { user_id: user.id, token, platform, updated_at: now } },
            { table: 'expo_push_tokens', row: { user_id: user.id, token, platform, updated_at: now } },
        ] as const

        let stored = false
        let tableUsed: string | null = null

        for (const candidate of candidates) {
            const { error } = await app.supabase
                .from(candidate.table)
                .upsert(candidate.row as Record<string, unknown>, { onConflict: 'user_id,token' })

            if (!error) {
                stored = true
                tableUsed = candidate.table
                break
            }

            if (!isMissingRelationError(error, candidate.table)) {
                app.log.warn({ err: error, table: candidate.table }, '[Auth] push token storage failed')
            }
        }

        return {
            success: true,
            stored,
            table: tableUsed,
        }
    })

    app.post('/delete-account', { preValidation: [app.authenticate] }, async (request) => {
        const user = request.user!

        const cleanupTargets = [
            { table: 'user_push_tokens', column: 'user_id' },
            { table: 'push_tokens', column: 'user_id' },
            { table: 'expo_push_tokens', column: 'user_id' },
            { table: 'public_profiles', column: 'user_id' },
            { table: 'users', column: 'id' },
        ] as const

        for (const target of cleanupTargets) {
            const { error } = await app.supabase
                .from(target.table)
                .delete()
                .eq(target.column, user.id)

            if (error && !isMissingRelationError(error, target.table)) {
                app.log.warn({ err: error, table: target.table }, '[Auth] account cleanup step failed')
            }
        }

        const { error: deleteAuthError } = await app.supabase.auth.admin.deleteUser(user.id)
        if (deleteAuthError) throw deleteAuthError

        return {
            success: true,
            message: 'Account deleted',
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
