import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { levelFromXp, xpForAction, addXpAndActivity } from '../utils/gamification'

// ==========================================
// Schemas de validation
// ==========================================

const submitSchema = z.object({
    value: z.number(),
    metric: z.string()
})

const profileUpdateSchema = z.object({
    bio: z.string().max(200).optional(),
    location: z.string().max(100).optional(),
    team: z.string().max(100).optional(),
    is_public: z.boolean().optional()
})

const searchSchema = z.object({
    q: z.string().min(1).max(100)
})

// Param/query schemas
const idParamsSchema = z.object({ id: z.string().uuid() })
const userIdParamsSchema = z.object({ userId: z.string().uuid() })
const leaderboardQuerySchema = z.object({
    metric: z.enum(['overall', 'shooting', 'mental', 'xp']).default('overall'),
    scope: z.enum(['global', 'friends']).default('global'),
    limit: z.coerce.number().int().min(1).max(100).default(50),
})
const feedQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
    cursor: z.string().optional(),
})
const notificationsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
})

// Helpers moved to utils/gamification.ts

// ==========================================
// Routes
// ==========================================

export default async function communityRoutes(fastify: FastifyInstance) {

    // ──────────────────────────────────
    // GET /api/community/leaderboard
    // ──────────────────────────────────
    fastify.get('/leaderboard', async (request, reply) => {
        try {
            const { metric, scope, limit } = leaderboardQuerySchema.parse(request.query)
            const userId = request.user?.id

            const sortColumn: Record<string, string> = {
                overall: 'xp',
                shooting: 'avg_shooting_pct',
                mental: 'avg_mental_score',
                xp: 'xp',
                sessions: 'total_sessions',
            }
            const col = sortColumn[metric] || 'xp'

            let queryBuilder = fastify.supabase
                .from('public_profiles')
                .select(`
                    user_id, xp, level, total_sessions, total_shots,
                    avg_shooting_pct, avg_mental_score, best_mental_score,
                    best_shooting_pct, followers_count, following_count, challenges_won,
                    users!inner ( id, username, full_name, avatar_url, position )
                `)
                .eq('is_public', true)
                .order(col, { ascending: false })
                .limit(limit)

            if (scope === 'friends' && userId) {
                const { data: follows } = await fastify.supabase
                    .from('user_follows')
                    .select('following_id')
                    .eq('follower_id', userId)

                const friendIds = follows?.map((f: any) => f.following_id) || []
                friendIds.push(userId)
                queryBuilder = queryBuilder.in('user_id', friendIds)
            }

            const { data, error } = await queryBuilder
            if (error) throw error

            const entries = (data || []).map((row: any, index: number) => {
                const user = row.users
                const scoreMap: Record<string, number> = {
                    overall: row.xp,
                    shooting: Math.round(row.avg_shooting_pct * 10) / 10,
                    mental: Math.round(row.avg_mental_score * 10) / 10,
                    xp: row.xp,
                    sessions: row.total_sessions,
                }
                return {
                    rank: index + 1,
                    user_id: row.user_id,
                    username: user?.username || 'Unknown',
                    full_name: user?.full_name,
                    avatar_url: user?.avatar_url,
                    position: user?.position,
                    score: scoreMap[metric] ?? row.xp,
                    trend: 'stable' as const,
                    level: row.level || levelFromXp(row.xp),
                    is_me: row.user_id === userId,
                }
            })

            const myRank = entries.findIndex((e: any) => e.is_me) + 1

            return {
                entries,
                metric,
                scope,
                myRank: myRank > 0 ? myRank : undefined,
                totalPlayers: entries.length,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/challenges
    // ──────────────────────────────────
    fastify.get('/challenges', async (request, reply) => {
        try {
            const userId = request.user?.id

            const { data: challenges, error } = await fastify.supabase
                .from('community_challenges')
                .select('*')
                .gte('end_at', new Date().toISOString())
                .order('end_at', { ascending: true })

            if (error) throw error

            const enriched = await Promise.all((challenges || []).map(async (c: any) => {
                const { data: subs } = await fastify.supabase
                    .from('challenge_submissions')
                    .select(`value, user_id, users!inner ( username )`)
                    .eq('challenge_id', c.id)
                    .order('value', { ascending: false })

                const submissions = subs || []
                const leader = submissions[0]
                const mySubmission = userId ? submissions.find((s: any) => s.user_id === userId) : null
                const myRankIdx = userId ? submissions.findIndex((s: any) => s.user_id === userId) : -1

                return {
                    ...c,
                    participants_count: submissions.length,
                    my_rank: myRankIdx >= 0 ? myRankIdx + 1 : undefined,
                    my_value: mySubmission?.value,
                    leader_name: leader ? ((leader as any).users?.username ?? (leader as any).users?.[0]?.username ?? null) : null,
                    leader_value: leader?.value || null,
                }
            }))

            return { data: enriched }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // POST /api/community/challenges/:id/submit
    // ──────────────────────────────────
    fastify.post('/challenges/:id/submit', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { id } = idParamsSchema.parse(request.params)
            const body = submitSchema.parse(request.body)

            const { data: challenge, error: challengeError } = await fastify.supabase
                .from('community_challenges')
                .select('*')
                .eq('id', id)
                .gte('end_at', new Date().toISOString())
                .single()

            if (challengeError || !challenge) {
                return reply.code(404).send({ error: 'Challenge not found or expired' })
            }

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

            await addXpAndActivity(fastify, user.id, 'challenge_joined', `A rejoint le défi "${challenge.title}"`, { challenge_id: id })
            await checkBadges(fastify, user.id)

            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/feed — H-1: requires auth (feed is personalized)
    // ──────────────────────────────────
    fastify.get('/feed', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const { limit, cursor } = feedQuerySchema.parse(request.query)
            const userId = request.user!.id

            let feedQuery = fastify.supabase
                .from('activity_feed')
                .select(`
                    id, user_id, type, title, description, metadata, created_at,
                    users!inner ( username, avatar_url )
                `)
                .order('created_at', { ascending: false })
                .limit(limit + 1)

            if (cursor) {
                feedQuery = feedQuery.lt('created_at', cursor)
            }

            // Feed shows own + followed users' activity
            const { data: follows } = await fastify.supabase
                .from('user_follows')
                .select('following_id')
                .eq('follower_id', userId)

            const ids = (follows?.map((f: any) => f.following_id) || [])
            ids.push(userId)
            feedQuery = feedQuery.in('user_id', ids)

            const { data, error } = await feedQuery
            if (error) throw error

            const items = (data || []).slice(0, limit).map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                username: row.users?.username || 'Unknown',
                avatar_url: row.users?.avatar_url,
                type: row.type,
                title: row.title,
                description: row.description,
                metadata: row.metadata || {},
                created_at: row.created_at,
            }))

            const hasMore = (data || []).length > limit

            return {
                items,
                hasMore,
                nextCursor: hasMore ? items[items.length - 1]?.created_at : undefined,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/profile/:userId
    // ──────────────────────────────────
    fastify.get('/profile/:userId', async (request, reply) => {
        try {
            const { userId } = userIdParamsSchema.parse(request.params)
            const currentUserId = request.user?.id

            const { data: profile, error } = await fastify.supabase
                .from('public_profiles')
                .select(`*, users!inner ( id, username, full_name, avatar_url, position )`)
                .eq('user_id', userId)
                .single()

            if (error || !profile) {
                return reply.code(404).send({ error: 'Profile not found' })
            }

            if (!profile.is_public && userId !== currentUserId) {
                return reply.code(403).send({ error: 'Profile is private' })
            }

            const { data: userBadges } = await fastify.supabase
                .from('user_badges')
                .select(`earned_at, badges!inner ( id, slug, name, description, emoji, category, rarity, xp_reward )`)
                .eq('user_id', userId)
                .order('earned_at', { ascending: false })

            let isFollowing = false
            if (currentUserId && currentUserId !== userId) {
                const { data: follow } = await fastify.supabase
                    .from('user_follows')
                    .select('id')
                    .eq('follower_id', currentUserId)
                    .eq('following_id', userId)
                    .maybeSingle()
                isFollowing = !!follow
            }

            const badges = (userBadges || []).map((ub: any) => ({ ...ub.badges, earned_at: ub.earned_at }))
            const user = profile.users

            return {
                user_id: profile.user_id,
                username: user?.username,
                full_name: user?.full_name,
                avatar_url: user?.avatar_url,
                position: user?.position,
                bio: profile.bio,
                location: profile.location,
                team: profile.team,
                xp: profile.xp,
                level: profile.level || levelFromXp(profile.xp),
                total_sessions: profile.total_sessions,
                total_shots: profile.total_shots,
                avg_shooting_pct: profile.avg_shooting_pct,
                avg_mental_score: profile.avg_mental_score,
                best_mental_score: profile.best_mental_score,
                best_shooting_pct: profile.best_shooting_pct,
                win_streak: profile.win_streak,
                challenges_won: profile.challenges_won,
                followers_count: profile.followers_count,
                following_count: profile.following_count,
                is_public: profile.is_public,
                badges,
                is_following: isFollowing,
                updated_at: profile.updated_at,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // PUT /api/community/profile
    // ──────────────────────────────────
    fastify.put('/profile', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const body = profileUpdateSchema.parse(request.body)

            const { data, error } = await fastify.supabase
                .from('public_profiles')
                .upsert({
                    user_id: user.id,
                    ...body,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
                .select()
                .single()

            if (error) throw error
            return { data }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // POST /api/community/follow/:userId
    // ──────────────────────────────────
    fastify.post('/follow/:userId', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { userId } = userIdParamsSchema.parse(request.params)

            if (user.id === userId) {
                return reply.code(400).send({ error: 'Cannot follow yourself' })
            }

            const { error } = await fastify.supabase
                .from('user_follows')
                .insert({ follower_id: user.id, following_id: userId })

            if (error) {
                if (error.code === '23505') return { message: 'Already following' }
                throw error
            }

            // Update counts
            await Promise.all([
                fastify.supabase.from('public_profiles').upsert({ user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
                fastify.supabase.from('public_profiles').upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
            ])

            // Recount followers/following
            const [{ count: followingCount }, { count: followersCount }] = await Promise.all([
                fastify.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
                fastify.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
            ])

            await Promise.all([
                fastify.supabase.from('public_profiles').update({ following_count: followingCount || 0 }).eq('user_id', user.id),
                fastify.supabase.from('public_profiles').update({ followers_count: followersCount || 0 }).eq('user_id', userId),
            ])

            const { data: targetUser } = await fastify.supabase.from('users').select('username').eq('id', userId).single()

            await addXpAndActivity(fastify, user.id, 'follow', `A commencé à suivre ${targetUser?.username || 'un joueur'}`, { following_id: userId })

            await fastify.supabase.from('notifications').insert({
                user_id: userId,
                type: 'follow',
                title: 'Nouveau follower !',
                body: `Un joueur te suit maintenant`,
                metadata: { follower_id: user.id }
            })

            await checkBadges(fastify, user.id)

            return { message: 'Followed successfully' }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // DELETE /api/community/follow/:userId
    // ──────────────────────────────────
    fastify.delete('/follow/:userId', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { userId } = userIdParamsSchema.parse(request.params)

            const { error } = await fastify.supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', userId)

            if (error) throw error

            // Recount
            const [{ count: followingCount }, { count: followersCount }] = await Promise.all([
                fastify.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
                fastify.supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
            ])

            await Promise.all([
                fastify.supabase.from('public_profiles').update({ following_count: followingCount || 0 }).eq('user_id', user.id),
                fastify.supabase.from('public_profiles').update({ followers_count: followersCount || 0 }).eq('user_id', userId),
            ])

            return { message: 'Unfollowed successfully' }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/friends
    // ──────────────────────────────────
    fastify.get('/friends', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('user_follows')
                .select(`following:following_id ( id, username, full_name, avatar_url, position )`)
                .eq('follower_id', user.id)
                .limit(100)

            if (error) throw error

            const friendIds = (data || []).map((f: any) => f.following?.id).filter(Boolean)
            let profiles: any[] = []
            if (friendIds.length > 0) {
                const { data: profileData } = await fastify.supabase
                    .from('public_profiles')
                    .select('user_id, xp, level, avg_shooting_pct, avg_mental_score, total_sessions')
                    .in('user_id', friendIds)
                profiles = profileData || []
            }

            const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]))

            const friends = (data || []).map((f: any) => {
                const u = f.following
                const p = profileMap.get(u?.id) || {} as any
                return {
                    user_id: u?.id,
                    username: u?.username,
                    full_name: u?.full_name,
                    avatar_url: u?.avatar_url,
                    position: u?.position,
                    level: p.level || 1,
                    xp: p.xp || 0,
                    avg_shooting_pct: p.avg_shooting_pct || 0,
                    avg_mental_score: p.avg_mental_score || 0,
                    total_sessions: p.total_sessions || 0,
                    is_following: true,
                }
            })

            return { data: friends }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/search?q=...
    // ──────────────────────────────────
    fastify.get('/search', async (request, reply) => {
        try {
            const { q } = searchSchema.parse(request.query)
            const currentUserId = request.user?.id

            // Sanitize search input: escape special Postgres LIKE/ILIKE characters
            const sanitized = q.replace(/[%_\\]/g, '\\$&')

            const { data, error } = await fastify.supabase
                .from('users')
                .select('id, username, full_name, avatar_url, position')
                .or(`username.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%`)
                .limit(20)

            if (error) throw error

            let followingSet = new Set<string>()
            if (currentUserId) {
                const { data: follows } = await fastify.supabase
                    .from('user_follows')
                    .select('following_id')
                    .eq('follower_id', currentUserId)
                followingSet = new Set((follows || []).map((f: any) => f.following_id))
            }

            const userIds = (data || []).map((u: any) => u.id)
            let profiles: any[] = []
            if (userIds.length > 0) {
                const { data: profileData } = await fastify.supabase
                    .from('public_profiles')
                    .select('user_id, xp, level')
                    .in('user_id', userIds)
                profiles = profileData || []
            }
            const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]))

            const results = (data || []).map((u: any) => {
                const p = profileMap.get(u.id) || {} as any
                return {
                    user_id: u.id,
                    username: u.username,
                    full_name: u.full_name,
                    avatar_url: u.avatar_url,
                    position: u.position,
                    level: p.level || 1,
                    xp: p.xp || 0,
                    is_following: followingSet.has(u.id),
                }
            })

            return { data: results }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/badges
    // ──────────────────────────────────
    fastify.get('/badges', async (_request, reply) => {
        try {
            const { data, error } = await fastify.supabase
                .from('badges')
                .select('*')
                .order('category', { ascending: true })

            if (error) throw error
            return { data }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/badges/me
    // ──────────────────────────────────
    fastify.get('/badges/me', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('user_badges')
                .select(`earned_at, badges!inner ( id, slug, name, description, emoji, category, rarity, xp_reward )`)
                .eq('user_id', user.id)
                .order('earned_at', { ascending: false })

            if (error) throw error

            const badges = (data || []).map((ub: any) => ({ ...ub.badges, earned_at: ub.earned_at }))
            return { data: badges }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // GET /api/community/notifications
    // ──────────────────────────────────
    fastify.get('/notifications', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const { limit } = notificationsQuerySchema.parse(request.query)

            const { data, error } = await fastify.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            const unreadCount = (data || []).filter((n: any) => !n.read).length

            return { data, unreadCount }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // POST /api/community/notifications/read
    // ──────────────────────────────────
    fastify.post('/notifications/read', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!
            const body = request.body as any
            const ids = body.ids as string[] | undefined

            let updateQuery = fastify.supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)

            if (ids && ids.length > 0) {
                updateQuery = updateQuery.in('id', ids)
            }

            const { error } = await updateQuery
            if (error) throw error
            return { success: true }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ──────────────────────────────────
    // POST /api/community/refresh-stats
    // ──────────────────────────────────
    fastify.post('/refresh-stats', {
        preValidation: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const user = request.user!

            const { data: sessions } = await fastify.supabase
                .from('sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'complete')

            const sessionIds = (sessions || []).map((s: any) => s.id)
            let totalShots = 0, totalMade = 0, totalMental = 0, mentalCount = 0, bestShooting = 0, bestMental = 0

            if (sessionIds.length > 0) {
                const { data: analyses } = await fastify.supabase
                    .from('analyses')
                    .select('shot_attempts, shot_made, mental_score')
                    .in('session_id', sessionIds)

                for (const a of (analyses || [])) {
                    totalShots += a.shot_attempts || 0
                    totalMade += a.shot_made || 0
                    if (a.mental_score != null) {
                        totalMental += a.mental_score
                        mentalCount++
                        if (a.mental_score > bestMental) bestMental = a.mental_score
                    }
                    const pct = a.shot_attempts > 0 ? (a.shot_made / a.shot_attempts) * 100 : 0
                    if (pct > bestShooting) bestShooting = pct
                }
            }

            const avgShootingPct = totalShots > 0 ? (totalMade / totalShots) * 100 : 0
            const avgMentalScore = mentalCount > 0 ? totalMental / mentalCount : 0

            const { data, error } = await fastify.supabase
                .from('public_profiles')
                .upsert({
                    user_id: user.id,
                    total_sessions: sessionIds.length,
                    total_shots: totalShots,
                    avg_shooting_pct: Math.round(avgShootingPct * 10) / 10,
                    avg_mental_score: Math.round(avgMentalScore * 10) / 10,
                    best_shooting_pct: Math.round(bestShooting * 10) / 10,
                    best_mental_score: Math.round(bestMental * 10) / 10,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })
                .select()
                .single()

            if (error) throw error

            await checkBadges(fastify, user.id)

            return { data, message: 'Stats refreshed' }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}

// Shared in utils/gamification.ts

// ==========================================
// Helper: Check & award badges
// ==========================================
async function checkBadges(fastify: FastifyInstance, userId: string) {
    try {
        const { data: profile } = await fastify.supabase
            .from('public_profiles').select('*').eq('user_id', userId).single()

        if (!profile) return

        const { data: allBadges } = await fastify.supabase.from('badges').select('*')

        const { data: earnedBadges } = await fastify.supabase
            .from('user_badges').select('badge_id').eq('user_id', userId)

        const earnedSet = new Set((earnedBadges || []).map((b: any) => b.badge_id))

        const conditionValues: Record<string, number> = {
            sessions_count: profile.total_sessions || 0,
            shooting_pct: profile.best_shooting_pct || 0,
            mental_score: profile.best_mental_score || 0,
            following_count: profile.following_count || 0,
            followers_count: profile.followers_count || 0,
            challenges_won: profile.challenges_won || 0,
            level: profile.level || 1,
            total_shots: profile.total_shots || 0,
        }

        for (const badge of (allBadges || [])) {
            if (earnedSet.has(badge.id)) continue
            const userValue = conditionValues[badge.condition_type]
            if (userValue === undefined) continue

            if (userValue >= badge.condition_value) {
                await fastify.supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id })

                if (badge.xp_reward > 0) {
                    const currentXp = (profile.xp || 0) + badge.xp_reward
                    await fastify.supabase.from('public_profiles')
                        .update({ xp: currentXp, level: levelFromXp(currentXp), updated_at: new Date().toISOString() })
                        .eq('user_id', userId)
                }

                await fastify.supabase.from('activity_feed').insert({
                    user_id: userId, type: 'badge_earned',
                    title: `A débloqué le badge "${badge.name}" ${badge.emoji}`,
                    metadata: { badge_id: badge.id, badge_slug: badge.slug },
                })

                await fastify.supabase.from('notifications').insert({
                    user_id: userId, type: 'badge',
                    title: `Nouveau badge : ${badge.name} ${badge.emoji}`,
                    body: badge.description,
                    metadata: { badge_id: badge.id },
                })
            }
        }
    } catch (e) {
        // Badge check errors are non-critical, swallow silently
        // In production, use structured logging: fastify.log.error({ err: e }, 'Badge check failed')
    }
}
