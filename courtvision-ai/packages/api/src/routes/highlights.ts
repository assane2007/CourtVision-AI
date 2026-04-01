import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { addToQueue } from '../queue/videoProcessor'

// ── Schemas ───────────────────────────────────────────────────

const sessionIdSchema = z.object({
    sessionId: z.string().uuid(),
})

const regenerateSchema = z.object({
    template: z.enum(['cinema', 'espn', 'tiktok']).default('espn'),
    exportProfile: z.enum(['tiktok_9x16', 'instagram_4x5', 'landscape_16x9']).optional(),
    musicTrackId: z.string().optional(),
})

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).default(0),
})

// ── Routes ────────────────────────────────────────────────────

const highlightRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook('preValidation', app.authenticate)

    /**
     * GET /api/highlights
     * List user's highlights across all sessions, newest first.
     */
    app.get('/', {
        schema: { querystring: listQuerySchema },
    }, async (request) => {
        const user = request.user!
        const { limit, offset } = request.query as z.infer<typeof listQuerySchema>

        const { data, error, count } = await app.supabase
            .from('analyses')
            .select('id, session_id, highlights, created_at', { count: 'exact' })
            .eq('session:sessions.user_id', user.id)
            .not('highlights', 'is', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            // Fallback: join through sessions table
            const { data: sessions } = await app.supabase
                .from('sessions')
                .select('id')
                .eq('user_id', user.id)

            if (!sessions || sessions.length === 0) {
                return { highlights: [], total: 0 }
            }

            const sessionIds = sessions.map((s: { id: string }) => s.id)
            const { data: analyses, count: total } = await app.supabase
                .from('analyses')
                .select('id, session_id, highlights, created_at', { count: 'exact' })
                .in('session_id', sessionIds)
                .not('highlights', 'is', null)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1)

            return {
                highlights: (analyses || []).map(formatHighlightResponse),
                total: total || 0,
            }
        }

        return {
            highlights: (data || []).map(formatHighlightResponse),
            total: count || 0,
        }
    })

    /**
     * GET /api/highlights/:sessionId
     * Get highlight data for a specific session.
     */
    app.get('/:sessionId', {
        schema: { params: sessionIdSchema },
    }, async (request, reply) => {
        const user = request.user!
        const { sessionId } = request.params as z.infer<typeof sessionIdSchema>

        // Verify ownership
        const { data: session } = await app.supabase
            .from('sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .single()

        if (!session || session.user_id !== user.id) {
            return reply.status(404).send({ success: false, error: 'Session not found' })
        }

        const { data: analysis, error } = await app.supabase
            .from('analyses')
            .select('id, session_id, highlights, created_at')
            .eq('session_id', sessionId)
            .single()

        if (error || !analysis) {
            return reply.status(404).send({ success: false, error: 'No highlights found for this session' })
        }

        return {
            success: true,
            ...formatHighlightResponse(analysis),
        }
    })

    /**
     * POST /api/highlights/:sessionId/regenerate
     * Re-generate highlight reel with different template, music, or export format.
     * Adds a new job to the queue.
     */
    app.post('/:sessionId/regenerate', {
        schema: {
            params: sessionIdSchema,
            body: regenerateSchema,
        },
    }, async (request, reply) => {
        const user = request.user!
        const { sessionId } = request.params as z.infer<typeof sessionIdSchema>
        const body = request.body as z.infer<typeof regenerateSchema>

        // Verify ownership + get video URL
        const { data: session } = await app.supabase
            .from('sessions')
            .select('id, user_id, video_url, status')
            .eq('id', sessionId)
            .single()

        if (!session || session.user_id !== user.id) {
            return reply.status(404).send({ success: false, error: 'Session not found' })
        }

        if (session.status !== 'complete') {
            return reply.status(409).send({ success: false, error: 'Session must be complete before regenerating highlights' })
        }

        // Queue a highlight-only regeneration job
        await addToQueue('regenerate-highlight', {
            sessionId: session.id,
            videoUrl: session.video_url,
            userId: user.id,
        })

        return {
            success: true,
            message: 'Highlight regeneration queued',
            template: body.template,
            exportProfile: body.exportProfile,
        }
    })

    /**
     * GET /api/highlights/:sessionId/clips
     * Get individual clip metadata for a session's highlights.
     */
    app.get('/:sessionId/clips', {
        schema: { params: sessionIdSchema },
    }, async (request, reply) => {
        const user = request.user!
        const { sessionId } = request.params as z.infer<typeof sessionIdSchema>

        const { data: session } = await app.supabase
            .from('sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .single()

        if (!session || session.user_id !== user.id) {
            return reply.status(404).send({ success: false, error: 'Session not found' })
        }

        const { data: analysis } = await app.supabase
            .from('analyses')
            .select('highlights')
            .eq('session_id', sessionId)
            .single()

        if (!analysis?.highlights) {
            return reply.status(404).send({ success: false, error: 'No highlights found' })
        }

        const highlights = analysis.highlights as Record<string, unknown>
        return {
            success: true,
            clips: (highlights.clips as unknown[]) || [],
            total: ((highlights.clips as unknown[]) || []).length,
            template: highlights.template,
            duration: highlights.duration,
            music: highlights.music,
        }
    })
}

// ── Helpers ───────────────────────────────────────────────────

function formatHighlightResponse(row: {
    id: string
    session_id: string
    highlights: unknown
    created_at: string
}) {
    const h = row.highlights as Record<string, unknown> | null
    return {
        id: row.id,
        sessionId: row.session_id,
        url: h?.url ?? null,
        clipCount: Array.isArray(h?.clips) ? (h.clips as unknown[]).length : 0,
        duration: h?.duration ?? 0,
        template: h?.template ?? 'espn',
        exportProfile: h?.exportProfile ?? 'landscape_16x9',
        fileSizeBytes: h?.fileSizeBytes ?? null,
        music: h?.music ?? null,
        createdAt: row.created_at,
    }
}

export default highlightRoutes
