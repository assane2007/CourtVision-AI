import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { addToQueue } from '../queue/videoProcessor'

const uploadSchema = z.object({
    type: z.enum(['match', 'training', 'shootaround']),
    video_url: z.string().url()
})

const getSessionParamsSchema = z.object({
    id: z.string().uuid()
})

export default async function sessionRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.post('/upload', async (request, reply) => {
        try {
            const user = request.user!
            const body = uploadSchema.parse(request.body)

            const { data, error } = await fastify.supabase.from('sessions').insert({
                user_id: user.id,
                type: body.type,
                video_url: body.video_url,
                status: 'processing'
            }).select().single()

            if (error) throw error

            // Envoyer vers la queue (BullMQ) pour lancer l'async IA
            await addToQueue('process-video', {
                sessionId: data.id,
                videoUrl: data.video_url,
                userId: user.id
            })

            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/', async (request, reply) => {
        try {
            const user = request.user!
            const { data, error } = await fastify.supabase.from('sessions').select('*').eq('user_id', user.id)
            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.get('/:id', async (request, reply) => {
        try {
            const params = getSessionParamsSchema.parse(request.params)
            const user = request.user!

            // select *, et lier avec analyses
            const { data, error } = await fastify.supabase
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
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    fastify.delete('/:id', async (request, reply) => {
        try {
            const params = getSessionParamsSchema.parse(request.params)
            const user = request.user!

            const { error } = await fastify.supabase.from('sessions')
                .delete()
                .eq('id', params.id)
                .eq('user_id', user.id)

            if (error) throw error
            return { success: true }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // GET /weekly — Progression des 7 derniers jours pour le dashboard
    fastify.get('/weekly', async (request, reply) => {
        try {
            const user = request.user!
            const since = new Date()
            since.setDate(since.getDate() - 6)

            const { data, error } = await fastify.supabase
                .from('sessions')
                .select('created_at, analyses(mental_score, shooting_fg_pct)')
                .eq('user_id', user.id)
                .eq('status', 'complete')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: true })

            if (error) throw error

            // Build a 7-slot array (Mon … Sun relative to today)
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
                const analysis = Array.isArray(latest.analyses) ? latest.analyses[0] : null
                return {
                    day,
                    mental:     analysis?.mental_score    ?? 0,
                    shooting:   Math.round((analysis?.shooting_fg_pct ?? 0) * 100),
                    hasSession: true,
                }
            })

            return result
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // GET /highlights/recent — Derniers highlights pour le carousel dashboard
    fastify.get('/highlights/recent', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
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
                    id:       h.id ?? session.id,
                    label:    h.label ?? `Match ${new Date(session.created_at).toLocaleDateString('fr')}`,
                    pts:      h.pts   ?? `${h.points ?? '--'} Pts`,
                    daysAgo:  Math.round((now - new Date(session.created_at).getTime()) / 86_400_000),
                    thumbnail_url: h.thumbnail_url ?? null,
                }))
            }).slice(0, 6)

            return clips
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // GET /:id/status (SSE) — Suivi en temps réel du statut d'analyse
    fastify.get('/:id/status', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const params = getSessionParamsSchema.parse(request.params)
            const user = request.user!

            // Vérifier que la session appartient à l'utilisateur
            const { data: session, error: sessionError } = await fastify.supabase
                .from('sessions')
                .select('id')
                .eq('id', params.id)
                .eq('user_id', user.id)
                .single()

            if (sessionError || !session) {
                return reply.code(404).send({ error: 'Session not found' })
            }

            reply.raw.setHeader('Content-Type', 'text/event-stream')
            reply.raw.setHeader('Cache-Control', 'no-cache')
            reply.raw.setHeader('Connection', 'keep-alive')

            const interval = setInterval(async () => {
                try {
                    const { data } = await fastify.supabase.from('sessions').select('status').eq('id', params.id).single()
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

            request.raw.on('close', () => clearInterval(interval))
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })
}
