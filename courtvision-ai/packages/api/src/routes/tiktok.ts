import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { tiktokService } from '../services/tiktokService'

export default async function tiktokRoutes(app: FastifyInstance) {
    /**
     * Link TikTok Account (OAuth Callback simulate)
     */
    app.post('/link', {
        schema: {
            body: z.object({
                code: z.string(),
                state: z.string().optional()
            })
        }
    }, async (request, reply) => {
        const { id: userId } = request.user as { id: string }

        // Simulating OAuth logic
        await app.supabase.from('user_integrations').upsert({
            user_id: userId,
            provider: 'tiktok',
            access_token: 'fake_tt_token',
            open_id: 'fake_tt_user',
            updated_at: new Date().toISOString()
        })

        return { success: true, message: 'TikTok account linked successfully' }
    })

    /**
     * Manually share a session highlight
     */
    app.post('/share', {
        schema: {
            body: z.object({
                sessionId: z.string(),
                caption: z.string()
            })
        }
    }, async (request, reply) => {
        const { id: userId } = request.user as { id: string }
        const { sessionId, caption } = request.body as any

        // 1. Get session info
        const { data: analysis, error } = await app.supabase
            .from('analyses')
            .select('highlights')
            .eq('session_id', sessionId)
            .single()

        if (error || !analysis?.highlights?.url) {
            return reply.status(404).send({ error: 'Highlight not found' })
        }

        const result = await tiktokService.publishHighlight(userId, analysis.highlights.url, caption)
        return result
    })
}
