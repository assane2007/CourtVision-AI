import fp from 'fastify-plugin'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

declare module 'fastify' {
    interface FastifyInstance {
        supabase: SupabaseClient
    }
}

export const supabasePlugin = fp(async (fastify, opts) => {
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
        fastify.log.warn('Supabase URL or Key not explicitly provided. Database might not work.')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    fastify.decorate('supabase', supabase)
})
