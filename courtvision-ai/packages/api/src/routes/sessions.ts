import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { addToQueue } from '../queue/videoProcessor'

const uploadSchema = z.object({
    type: z.enum(['match', 'training', 'shootaround']),
    video_url: z.string().url()
})

const getSessionParamsSchema = z.object({
    id: z.string().uuid()
})

const sessionRoutes: FastifyPluginAsyncZod = async (app) => {
    app.addHook('preValidation', app.authenticate)

    app.post('/upload', {
        schema: {
            body: uploadSchema
        }
    }, async (request, reply) => {
        const user = request.user!
        const body = request.body as z.infer<typeof uploadSchema>

        const { data, error } = await app.supabase.from('sessions').insert({
            user_id: user.id,
            type: body.type,
            video_url: body.video_url,
            status: 'processing'
        }).select().single()

        if (error) throw error

        await addToQueue('process-video', {
            sessionId: data.id,
            videoUrl: data.video_url,
            userId: user.id
        })

        return { success: true, data }
    })

    app.get('/', async (request, reply) => {
        const user = request.user!
        const { data, error } = await app.supabase
            .from('sessions')
            .select(`
                id,
                user_id,
                type,
                video_url,
                duration_sec,
                status,
                created_at,
                analyses(shot_attempts, shot_made, mental_score, highlights)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        const sessions = (data ?? []).map((s: any) => {
            const analysis = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
            const attempts = analysis?.shot_attempts ?? 0
            const made = analysis?.shot_made ?? 0
            const shootingFgPct = attempts > 0 ? (made / attempts) * 100 : 0
            const highlights = analysis?.highlights
            const highlightCount = Array.isArray(highlights?.clips)
                ? highlights.clips.length
                : 0

            return {
                id: s.id,
                created_at: s.created_at,
                type: s.type,
                status: s.status,
                video_url: s.video_url,
                duration_minutes: s.duration_sec ? Math.round(s.duration_sec / 60) : null,
                shooting_fg_pct: shootingFgPct,
                mental_score: analysis?.mental_score ?? null,
                shots_attempted: attempts,
                shots_made: made,
                highlight_count: highlightCount,
            }
        })

        return sessions
    })

    app.get('/:id', {
        schema: {
            params: getSessionParamsSchema
        }
    }, async (request, reply) => {
        const params = request.params as z.infer<typeof getSessionParamsSchema>
        const user = request.user!

        const { data, error } = await app.supabase
            .from('sessions')
            .select(`
                *,
                analyses (*)
            `)
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single()

        if (error) throw error
        return { data }
    })

    app.delete('/:id', {
        schema: {
            params: getSessionParamsSchema
        }
    }, async (request, reply) => {
        const params = request.params as z.infer<typeof getSessionParamsSchema>
        const user = request.user!

        const { error } = await app.supabase.from('sessions')
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id)

        if (error) throw error
        return { success: true }
    })

    app.get('/weekly', async (request, reply) => {
        const user = request.user!
        const since = new Date()
        since.setDate(since.getDate() - 6)

        const { data, error } = await app.supabase
            .from('sessions')
            .select('created_at, analyses(shot_attempts, shot_made, mental_score)')
            .eq('user_id', user.id)
            .eq('status', 'complete')
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: true })

        if (error) throw error

        const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
        const result = days.map((day, i) => {
            const d = new Date(since)
            d.setDate(d.getDate() + i)
            const dateStr = d.toISOString().slice(0, 10)
            const sessions = (data ?? []).filter((s: any) =>
                s.created_at.slice(0, 10) === dateStr
            )
            if (sessions.length === 0) return { day, mental: 0, shooting: 0, hasSession: false }
            const latest = sessions[sessions.length - 1] as any
            const analysis = Array.isArray(latest.analyses) ? latest.analyses[0] : latest.analyses
            const attempts = analysis?.shot_attempts ?? 0
            const made = analysis?.shot_made ?? 0
            const pct = attempts > 0 ? (made / attempts) * 100 : 0
            return {
                day,
                mental: analysis?.mental_score ?? 0,
                shooting: Math.round(pct),
                hasSession: true,
            }
        })

        return result
    })

    app.get('/highlights/recent', async (request, reply) => {
        const user = request.user!
        const { data, error } = await app.supabase
            .from('sessions')
            .select('id, created_at, analyses(highlights)')
            .eq('user_id', user.id)
            .eq('status', 'complete')
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) throw error

        const now = Date.now()
        const clips = (data ?? []).flatMap((session: any) => {
            const analysis = Array.isArray(session.analyses) ? session.analyses[0] : null
            const highlights: any[] = analysis?.highlights ?? []
            return highlights.slice(0, 1).map((h: any) => ({
                id: h.id ?? session.id,
                label: h.label ?? `Match ${new Date(session.created_at).toLocaleDateString('fr')}`,
                pts: h.pts ?? `${h.points ?? '--'} Pts`,
                daysAgo: Math.round((now - new Date(session.created_at).getTime()) / 86_400_000),
                thumbnail_url: h.thumbnail_url ?? null,
            }))
        }).slice(0, 6)

        return clips
    })

    app.get('/:id/status', {
        schema: {
            params: getSessionParamsSchema
        }
    }, async (request, reply) => {
        const params = request.params as z.infer<typeof getSessionParamsSchema>
        const user = request.user!

        const { data: session, error: sessionError } = await app.supabase
            .from('sessions')
            .select('id')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .single()

        if (sessionError || !session) {
            return reply.code(404).send({ success: false, error: 'Session not found' })
        }

        reply.raw.setHeader('Content-Type', 'text/event-stream')
        reply.raw.setHeader('Cache-Control', 'no-cache')
        reply.raw.setHeader('Connection', 'keep-alive')

        const interval = setInterval(async () => {
            try {
                const { data } = await app.supabase.from('sessions').select('status').eq('id', params.id).single()
                if (data) {
                    reply.raw.write(`data: ${JSON.stringify({ status: data.status })}\n\n`)
                    if (data.status === 'complete' || data.status === 'failed') {
                        clearInterval(interval)
                        reply.raw.end()
                    }
                }
            } catch {
                clearInterval(interval)
                reply.raw.end()
            }
        }, 2000)

        // Clean up on client disconnect — scoped to THIS request, not a global hook
        request.raw.on('close', () => clearInterval(interval))
    })
}

export default sessionRoutes


