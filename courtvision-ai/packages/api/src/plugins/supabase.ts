import fp from 'fastify-plugin'
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js'

declare module 'fastify' {
    interface FastifyInstance {
        supabase: SupabaseClient
    }
}

export const supabasePlugin = fp(async (fastify, opts) => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl) {
        throw new Error(
            'SUPABASE_URL environment variable is required. ' +
            'Set it to your Supabase project URL (e.g. https://xxx.supabase.co)'
        )
    }

    if (!supabaseKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required. ' +
            'Set at least one Supabase key for authentication.'
        )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    fastify.decorate('supabase', supabase)

    fastify.log.info('Supabase client initialized successfully')
})
