import fp from 'fastify-plugin'
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

declare module 'fastify' {
    interface FastifyInstance {
        supabase: SupabaseClient
    }
}

export const supabasePlugin = fp(async (fastify, opts) => {
    const supabaseUrl = env.SUPABASE_URL
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
    let keyRoleHint = 'unknown'

    // Guard against misconfigured JWT keys where anon is accidentally provided.
    if (supabaseKey.split('.').length >= 2) {
        try {
            const payload = JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64url').toString('utf8'))
            keyRoleHint = String(payload.role || 'unknown')
            if (payload.role && payload.role !== 'service_role') {
                throw new Error(`SUPABASE_SERVICE_ROLE_KEY must have role=service_role, got role=${payload.role}`)
            }
        } catch (error: any) {
            if (String(error?.message || '').includes('role=')) {
                throw error
            }
            // Non-JSON or non-JWT keys (e.g. secret keys) are still valid.
            keyRoleHint = 'non-jwt-key'
        }
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    fastify.decorate('supabase', supabase)

    fastify.log.info({ keyRoleHint }, 'Supabase client initialized successfully')
})
