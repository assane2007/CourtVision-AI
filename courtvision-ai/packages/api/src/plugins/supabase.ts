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

    fastify.addHook('onReady', async () => {
        const CHECK_TIMEOUT_MS = 5000

        type BucketCheckResult =
            | { kind: 'ok'; data: { name?: string; public?: boolean } | null }
            | { kind: 'error'; message: string }
            | { kind: 'timeout' }

        try {
            const bucketName = env.SUPABASE_VIDEO_BUCKET

            const result = await Promise.race<BucketCheckResult>([
                supabase.storage
                    .getBucket(bucketName)
                    .then(({ data, error }) => {
                        if (error) {
                            return { kind: 'error', message: error.message } as const
                        }
                        return {
                            kind: 'ok',
                            data: data
                                ? {
                                    name: data.name,
                                    public: data.public,
                                }
                                : null,
                        } as const
                    })
                    .catch((error: any) => ({ kind: 'error', message: String(error?.message || error) } as const)),
                new Promise<BucketCheckResult>((resolve) => {
                    setTimeout(() => resolve({ kind: 'timeout' }), CHECK_TIMEOUT_MS)
                }),
            ])

            if (result.kind === 'timeout') {
                fastify.log.error(
                    { bucket: bucketName, timeoutMs: CHECK_TIMEOUT_MS },
                    'Supabase video bucket check timed out during startup',
                )
                return
            }

            if (result.kind === 'error') {
                fastify.log.error(
                    { bucket: bucketName, error: result.message },
                    'Supabase video bucket check failed: bucket is missing or inaccessible',
                )
                return
            }

            fastify.log.info(
                {
                    bucket: result.data?.name || bucketName,
                    isPublic: result.data?.public ?? false,
                },
                'Supabase video bucket check passed',
            )
        } catch (error) {
            fastify.log.error(
                {
                    bucket: env.SUPABASE_VIDEO_BUCKET,
                    err: error,
                },
                'Supabase video bucket check failed: unable to reach storage API',
            )
        }
    })

    fastify.log.info({ keyRoleHint }, 'Supabase client initialized successfully')
})
