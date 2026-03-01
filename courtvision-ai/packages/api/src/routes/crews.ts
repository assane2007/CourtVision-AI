import { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Crews Routes — Système d'Équipes Sociales
 *
 * Les joueurs forment des crews (équipes) de 2-10 personnes pour
 * s'entraîner ensemble, relever des défis en équipe, et comparer
 * leurs progressions.
 *
 * HomeCourt = feature sociale quasi-inexistante
 * CourtVision = Crews avec leaderboard, défis d'équipe, chat, ranking
 *
 * Inspiré par :
 * - Strava Clubs
 * - Apple Fitness Competition
 * - NBA 2K Pro-Am
 * - Peloton Teams
 *
 * Endpoints :
 * - GET  /                    → Mes crews
 * - POST /create              → Créer un crew
 * - GET  /:id                 → Détails d'un crew
 * - POST /:id/join            → Rejoindre un crew
 * - POST /:id/leave           → Quitter un crew
 * - GET  /:id/leaderboard     → Leaderboard interne du crew
 * - GET  /:id/feed            → Feed d'activité du crew
 * - POST /:id/challenge       → Lancer un défi d'équipe
 * - GET  /search              → Chercher un crew
 * - GET  /rankings            → Rankings des crews
 * - POST /:id/invite          → Inviter un joueur
 */

const createSchema = z.object({
    name: z.string().min(2).max(30),
    description: z.string().max(200).optional(),
    isPublic: z.boolean().default(true),
    maxMembers: z.number().min(2).max(10).default(5),
    crewType: z.enum(['casual', 'competitive', 'training']).default('casual'),
})

const challengeSchema = z.object({
    title: z.string().min(3).max(100),
    metric: z.string(),
    target: z.number().min(1),
    durationDays: z.number().min(1).max(30).default(7),
    description: z.string().max(300).optional(),
})

const inviteSchema = z.object({
    userId: z.string().uuid(),
})

// Param/query schemas for safe parsing
const crewIdParamsSchema = z.object({ id: z.string().uuid() })
const leaderboardQuerySchema = z.object({ metric: z.enum(['xp', 'shooting', 'mental', 'sessions']).default('xp') })
const feedQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) })
const searchQuerySchema = z.object({ q: z.string().default(''), type: z.string().optional() })
const rankingsQuerySchema = z.object({ metric: z.enum(['xp', 'members']).default('xp'), limit: z.coerce.number().int().min(1).max(50).default(20) })

export default async function crewRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // GET / — Mes crews
    // ==========================================
    fastify.get('/', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('crew_members')
                .select(`
                    role, joined_at,
                    crews!inner ( id, name, description, is_public, crew_type, total_xp, member_count, created_at, owner_id )
                `)
                .eq('user_id', user.id)

            if (error) throw error

            return {
                data: (data || []).map((m: any) => ({
                    ...m.crews,
                    myRole: m.role,
                    joinedAt: m.joined_at,
                }))
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /create — Créer un crew
    // ==========================================
    fastify.post('/create', async (request, reply) => {
        try {
            const user = request.user!
            const body = createSchema.parse(request.body)

            // Vérifier le nombre de crews max (3)
            const { data: existing } = await fastify.supabase
                .from('crew_members')
                .select('id')
                .eq('user_id', user.id)

            if ((existing || []).length >= 3) {
                return reply.code(400).send({ error: 'Maximum 3 crews per player' })
            }

            const { data: crew, error } = await fastify.supabase
                .from('crews')
                .insert({
                    name: body.name,
                    description: body.description,
                    is_public: body.isPublic,
                    max_members: body.maxMembers,
                    crew_type: body.crewType,
                    owner_id: user.id,
                    total_xp: 0,
                    member_count: 1,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (error) throw error

            // Ajouter le créateur comme captain
            await fastify.supabase.from('crew_members').insert({
                crew_id: crew.id,
                user_id: user.id,
                role: 'captain',
                joined_at: new Date().toISOString(),
            })

            // Award XP
            await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 20 })

            return {
                data: crew,
                message: `Crew "${body.name}" created! +20 XP 🏀`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id — Détails d'un crew
    // ==========================================
    fastify.get('/:id', async (request, reply) => {
        try {
            const { id } = crewIdParamsSchema.parse(request.params)
            const user = request.user

            const { data: crew, error } = await fastify.supabase
                .from('crews')
                .select('*')
                .eq('id', id)
                .single()

            if (error || !crew) {
                return reply.code(404).send({ error: 'Crew not found' })
            }

            // Private crew: only members can view details
            if (!crew.is_public && user?.id) {
                const { data: membership } = await fastify.supabase
                    .from('crew_members')
                    .select('role')
                    .eq('crew_id', id)
                    .eq('user_id', user.id)
                    .single()
                if (!membership) {
                    return reply.code(403).send({ error: 'This crew is private' })
                }
            } else if (!crew.is_public) {
                return reply.code(403).send({ error: 'This crew is private' })
            }

            // Membres
            const { data: members } = await fastify.supabase
                .from('crew_members')
                .select(`
                    role, joined_at,
                    users!inner ( id, username, full_name, avatar_url, position )
                `)
                .eq('crew_id', id)

            // Stats du crew
            const { data: memberProfiles } = await fastify.supabase
                .from('crew_members')
                .select('user_id')
                .eq('crew_id', id)

            const memberIds = (memberProfiles || []).map((m: any) => m.user_id)

            const { data: publicProfiles } = await fastify.supabase
                .from('public_profiles')
                .select('xp, avg_shooting_pct, avg_mental_score, total_sessions')
                .in('user_id', memberIds)

            const avgShootingPct = publicProfiles && publicProfiles.length > 0
                ? publicProfiles.reduce((s: number, p: any) => s + (p.avg_shooting_pct || 0), 0) / publicProfiles.length : 0
            const totalSessions = publicProfiles
                ? publicProfiles.reduce((s: number, p: any) => s + (p.total_sessions || 0), 0) : 0

            return {
                data: {
                    ...crew,
                    members: (members || []).map((m: any) => ({
                        ...m.users,
                        role: m.role,
                        joinedAt: m.joined_at,
                    })),
                    stats: {
                        avgShootingPct: Math.round(avgShootingPct * 10) / 10,
                        totalSessions,
                        totalXP: crew.total_xp,
                    },
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/join — Rejoindre un crew
    // ==========================================
    fastify.post('/:id/join', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = crewIdParamsSchema.parse(request.params)

            const { data: crew } = await fastify.supabase
                .from('crews')
                .select('id, is_public, max_members, member_count, name')
                .eq('id', id)
                .single()

            if (!crew) return reply.code(404).send({ error: 'Crew not found' })
            if (!crew.is_public) return reply.code(403).send({ error: 'Crew is private — need invitation' })
            if (crew.member_count >= crew.max_members) return reply.code(400).send({ error: 'Crew is full' })

            // Vérifier pas déjà membre
            const { data: existing } = await fastify.supabase
                .from('crew_members')
                .select('id')
                .eq('crew_id', id)
                .eq('user_id', user.id)
                .single()

            if (existing) return reply.code(400).send({ error: 'Already a member' })

            await fastify.supabase.from('crew_members').insert({
                crew_id: id,
                user_id: user.id,
                role: 'member',
                joined_at: new Date().toISOString(),
            })

            // Update member count
            await fastify.supabase.from('crews').update({
                member_count: crew.member_count + 1,
            }).eq('id', id)

            // XP
            await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 10 })

            return {
                data: { crewId: id, crewName: crew.name },
                message: `Joined ${crew.name}! +10 XP 🤝`
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/leave — Quitter un crew
    // ==========================================
    fastify.post('/:id/leave', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = crewIdParamsSchema.parse(request.params)

            // Vérifier que le joueur n'est pas le captain (owner)
            const { data: crew } = await fastify.supabase
                .from('crews')
                .select('owner_id, member_count')
                .eq('id', id)
                .single()

            if (!crew) return reply.code(404).send({ error: 'Crew not found' })
            if (crew.owner_id === user.id) {
                return reply.code(400).send({ error: 'Captain cannot leave. Transfer ownership or delete the crew.' })
            }

            await fastify.supabase.from('crew_members')
                .delete()
                .eq('crew_id', id)
                .eq('user_id', user.id)

            await fastify.supabase.from('crews').update({
                member_count: Math.max(0, crew.member_count - 1),
            }).eq('id', id)

            return { success: true, message: 'Left the crew' }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/leaderboard — Leaderboard interne
    // ==========================================
    fastify.get('/:id/leaderboard', async (request, reply) => {
        try {
            const { id } = crewIdParamsSchema.parse(request.params)
            const user = request.user!
            const { metric } = leaderboardQuerySchema.parse(request.query)

            // Check crew visibility
            const { data: crew } = await fastify.supabase.from('crews').select('is_public').eq('id', id).single()
            if (!crew) return reply.code(404).send({ error: 'Crew not found' })
            if (!crew.is_public) {
                const { data: membership } = await fastify.supabase
                    .from('crew_members').select('role').eq('crew_id', id).eq('user_id', user.id).single()
                if (!membership) return reply.code(403).send({ error: 'This crew is private' })
            }

            const { data: members } = await fastify.supabase
                .from('crew_members')
                .select('user_id')
                .eq('crew_id', id)

            const memberIds = (members || []).map((m: any) => m.user_id)
            if (memberIds.length === 0) return { data: [] }

            const col = metric === 'shooting' ? 'avg_shooting_pct' :
                metric === 'mental' ? 'avg_mental_score' :
                    metric === 'sessions' ? 'total_sessions' : 'xp'

            const { data, error } = await fastify.supabase
                .from('public_profiles')
                .select(`
                    user_id, xp, total_sessions, avg_shooting_pct, avg_mental_score,
                    users!inner ( username, full_name, avatar_url )
                `)
                .in('user_id', memberIds)
                .order(col, { ascending: false })

            if (error) throw error

            return {
                data: (data || []).map((row: any, i: number) => ({
                    rank: i + 1,
                    userId: row.user_id,
                    username: row.users?.username,
                    fullName: row.users?.full_name,
                    avatarUrl: row.users?.avatar_url,
                    xp: row.xp,
                    totalSessions: row.total_sessions,
                    avgShootingPct: Math.round((row.avg_shooting_pct || 0) * 10) / 10,
                    avgMentalScore: Math.round((row.avg_mental_score || 0) * 10) / 10,
                })),
                metric,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /:id/feed — Feed d'activité
    // ==========================================
    fastify.get('/:id/feed', async (request, reply) => {
        try {
            const { id } = crewIdParamsSchema.parse(request.params)
            const user = request.user!
            const { limit } = feedQuerySchema.parse(request.query)

            // Check crew visibility
            const { data: crew } = await fastify.supabase.from('crews').select('is_public').eq('id', id).single()
            if (!crew) return reply.code(404).send({ error: 'Crew not found' })
            if (!crew.is_public) {
                const { data: membership } = await fastify.supabase
                    .from('crew_members').select('role').eq('crew_id', id).eq('user_id', user.id).single()
                if (!membership) return reply.code(403).send({ error: 'This crew is private' })
            }

            const { data: members } = await fastify.supabase
                .from('crew_members')
                .select('user_id')
                .eq('crew_id', id)

            const memberIds = (members || []).map((m: any) => m.user_id)
            if (memberIds.length === 0) return { data: [] }

            // Get recent sessions from crew members
            const { data, error } = await fastify.supabase
                .from('sessions')
                .select(`
                    id, type, status, created_at, duration_sec, user_id,
                    users!inner ( username, full_name, avatar_url ),
                    analyses ( shot_attempts, shot_made, mental_score )
                `)
                .in('user_id', memberIds)
                .eq('status', 'complete')
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            const feed = (data || []).map((s: any) => {
                const a = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
                const att = a?.shot_attempts || 0
                const made = a?.shot_made || 0
                const fgPct = att > 0 ? Math.round((made / att) * 100) : 0

                return {
                    type: 'session_complete',
                    userId: s.user_id,
                    username: s.users?.username,
                    fullName: s.users?.full_name,
                    avatarUrl: s.users?.avatar_url,
                    sessionType: s.type,
                    fgPct,
                    mentalScore: a?.mental_score,
                    shotsAttempted: att,
                    createdAt: s.created_at,
                    durationMin: s.duration_sec ? Math.round(s.duration_sec / 60) : null,
                }
            })

            return { data: feed }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/challenge — Lancer un défi d'équipe
    // ==========================================
    fastify.post('/:id/challenge', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = crewIdParamsSchema.parse(request.params)
            const body = challengeSchema.parse(request.body)

            // Vérifier que le joueur est membre du crew
            const { data: membership } = await fastify.supabase
                .from('crew_members')
                .select('role')
                .eq('crew_id', id)
                .eq('user_id', user.id)
                .single()

            if (!membership) {
                return reply.code(403).send({ error: 'Not a member of this crew' })
            }

            const endsAt = new Date()
            endsAt.setDate(endsAt.getDate() + body.durationDays)

            const { data: challenge, error } = await fastify.supabase
                .from('crew_challenges')
                .insert({
                    crew_id: id,
                    created_by: user.id,
                    title: body.title,
                    description: body.description,
                    metric: body.metric,
                    target: body.target,
                    starts_at: new Date().toISOString(),
                    ends_at: endsAt.toISOString(),
                    status: 'active',
                })
                .select()
                .single()

            if (error) throw error

            return {
                data: challenge,
                message: `Crew challenge created: ${body.title} 🏀`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /search — Chercher un crew
    // ==========================================
    fastify.get('/search', async (request, reply) => {
        try {
            const { q, type: crewType } = searchQuerySchema.parse(request.query)

            let queryBuilder = fastify.supabase
                .from('crews')
                .select('*')
                .eq('is_public', true)

            if (q) {
                // Sanitize LIKE special characters to prevent pattern injection
                const sanitized = q.replace(/[%_\\]/g, '\\$&')
                queryBuilder = queryBuilder.ilike('name', `%${sanitized}%`)
            }
            if (crewType) {
                queryBuilder = queryBuilder.eq('crew_type', crewType)
            }

            const { data, error } = await queryBuilder
                .order('total_xp', { ascending: false })
                .limit(20)

            if (error) throw error

            return { data: data || [] }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /rankings — Rankings des crews
    // ==========================================
    fastify.get('/rankings', async (request, reply) => {
        try {
            const { metric, limit } = rankingsQuerySchema.parse(request.query)

            const col = metric === 'members' ? 'member_count' : 'total_xp'

            const { data, error } = await fastify.supabase
                .from('crews')
                .select('*')
                .eq('is_public', true)
                .order(col, { ascending: false })
                .limit(limit)

            if (error) throw error

            return {
                data: (data || []).map((c: any, i: number) => ({
                    rank: i + 1,
                    ...c,
                }))
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /:id/invite — Inviter un joueur
    // ==========================================
    fastify.post('/:id/invite', async (request, reply) => {
        try {
            const user = request.user!
            const { id } = crewIdParamsSchema.parse(request.params)
            const body = inviteSchema.parse(request.body)

            // Vérifier que l'inviteur est membre
            const { data: membership } = await fastify.supabase
                .from('crew_members')
                .select('role')
                .eq('crew_id', id)
                .eq('user_id', user.id)
                .single()

            if (!membership) {
                return reply.code(403).send({ error: 'Not a member of this crew' })
            }

            // Créer l'invitation
            const { data, error } = await fastify.supabase
                .from('crew_invites')
                .insert({
                    crew_id: id,
                    invited_by: user.id,
                    invited_user_id: body.userId,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (error) throw error

            return {
                data,
                message: 'Invitation sent! 📨'
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })
}
