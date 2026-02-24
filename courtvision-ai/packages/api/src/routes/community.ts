import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const submitSchema = z.object({
    value: z.number(),
    metric: z.string()
})

export default async function communityRoutes(fastify: FastifyInstance) {

    // GET /api/community/leaderboard?metric=mental_score&scope=global
    fastify.get('/leaderboard', async (request, reply) => {
        try {
            const query = (request.query as any)
            const metric = query.metric || 'mental_score'
            const scope = query.scope || 'global'

            // Aggregate from analyses joined with users
            // For now, return top users ordered by chosen metric from the analyses table
            const { data, error } = await fastify.supabase
                .from('analyses')
                .select(`
                    mental_score,
                    shot_attempts,
                    shot_made,
                    created_at,
                    sessions!inner (
                        user_id,
                        users!inner (
                            id,
                            username,
                            full_name,
                            avatar_url,
                            position
                        )
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            return { data, metric, scope }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // GET /api/community/challenges — liste des défis actifs cette semaine
    fastify.get('/challenges', async (request, reply) => {
        try {
            const { data, error } = await fastify.supabase
                .from('community_challenges')
                .select('*')
                .gte('end_at', new Date().toISOString())
                .order('created_at', { ascending: false })

            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // POST /api/community/challenges/:id/submit — soumettre une perf pour un défi
    fastify.post('/challenges/:id/submit', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { id } = request.params as { id: string }
            const body = submitSchema.parse(request.body)

            // Vérifier que le défi est actif
            const { data: challenge, error: challengeError } = await fastify.supabase
                .from('community_challenges')
                .select('*')
                .eq('id', id)
                .gte('end_at', new Date().toISOString())
                .single()

            if (challengeError || !challenge) {
                return reply.code(404).send({ error: 'Challenge not found or expired' })
            }

            // Upsert la participation
            const { data, error } = await fastify.supabase
                .from('challenge_submissions')
                .upsert({
                    challenge_id: id,
                    user_id: user.id,
                    value: body.value,
                    metric: body.metric,
                    submitted_at: new Date().toISOString()
                }, { onConflict: 'challenge_id,user_id' })
                .select()
                .single()

            if (error) throw error
            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // GET /api/community/friends — stats des amis (utilise la table user_follows)
    fastify.get('/friends', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('user_follows')
                .select(`
                    following:following_id (
                        id,
                        username,
                        full_name,
                        avatar_url,
                        position,
                        analyses:sessions (
                            analyses (
                                mental_score,
                                shot_made,
                                shot_attempts,
                                created_at
                            )
                        )
                    )
                `)
                .eq('follower_id', user.id)
                .limit(30)

            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}
