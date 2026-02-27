import { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Quests & Gamification Routes — Système de Quêtes Révolutionnaire
 *
 * Transforme la progression en basketball en RPG avec des quêtes,
 * des badges, des XP, des niveaux, des seasons et des récompenses.
 *
 * HomeCourt a un système basique de streaks.
 * CourtVision = MMO-style quest system + seasonal content + battle pass.
 *
 * Inspiré par :
 * - Apple Fitness rings (daily goals)
 * - Duolingo (streaks, XP, leagues)
 * - NBA 2K MyCareer (quests progression)
 * - Strava challenges
 *
 * Endpoints :
 * - GET  /active              → Quêtes actives du joueur
 * - GET  /available           → Quêtes disponibles
 * - POST /accept              → Accepter une quête
 * - POST /progress            → Mettre à jour la progression
 * - GET  /completed           → Quêtes terminées
 * - GET  /badges              → Badges du joueur
 * - GET  /badges/available    → Tous les badges possibles
 * - GET  /daily-rings         → Objectifs quotidiens (Apple Fitness style)
 * - POST /daily-rings/log     → Logger la progression quotidienne
 * - GET  /season              → Saison actuelle et battle pass
 * - GET  /xp                  → XP et niveau du joueur
 * - GET  /streak              → Streak actuel
 */

const acceptSchema = z.object({
    questId: z.string().uuid(),
})

const progressSchema = z.object({
    questId: z.string().uuid(),
    metric: z.string(),
    value: z.number(),
})

const dailyLogSchema = z.object({
    shotsAttempted: z.number().min(0).optional(),
    minutesTrained: z.number().min(0).optional(),
    recoveryLogged: z.boolean().optional(),
    sessionCompleted: z.boolean().optional(),
})

export default async function questRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // GET /active — Quêtes actives du joueur
    // ==========================================
    fastify.get('/active', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('user_quests')
                .select(`
                    id, progress, started_at, status,
                    quests!inner ( id, title, description, emoji, type, target, metric, xp_reward, badge_slug, difficulty, category, expires_at )
                `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('started_at', { ascending: false })

            if (error) throw error

            const quests = (data || []).map((uq: any) => ({
                userQuestId: uq.id,
                ...uq.quests,
                progress: uq.progress,
                progressPct: Math.min(100, Math.round((uq.progress / uq.quests.target) * 100)),
                startedAt: uq.started_at,
                remaining: Math.max(0, uq.quests.target - uq.progress),
                isExpired: uq.quests.expires_at ? new Date(uq.quests.expires_at) < new Date() : false,
            }))

            return { data: quests }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /available — Quêtes disponibles
    // ==========================================
    fastify.get('/available', async (request, reply) => {
        try {
            const user = request.user!

            // Récupérer les quêtes déjà acceptées/terminées
            const { data: userQuests } = await fastify.supabase
                .from('user_quests')
                .select('quest_id')
                .eq('user_id', user.id)

            const acceptedIds = (userQuests || []).map((uq: any) => uq.quest_id)

            // Récupérer toutes les quêtes actives
            const { data: allQuests, error } = await fastify.supabase
                .from('quests')
                .select('*')
                .eq('is_active', true)
                .order('difficulty', { ascending: true })

            if (error) throw error

            const available = (allQuests || [])
                .filter((q: any) => !acceptedIds.includes(q.id))
                .filter((q: any) => !q.expires_at || new Date(q.expires_at) > new Date())

            return { data: available }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /accept — Accepter une quête
    // ==========================================
    fastify.post('/accept', async (request, reply) => {
        try {
            const user = request.user!
            const body = acceptSchema.parse(request.body)

            // Vérifier que la quête existe
            const { data: quest } = await fastify.supabase
                .from('quests')
                .select('*')
                .eq('id', body.questId)
                .eq('is_active', true)
                .single()

            if (!quest) {
                return reply.code(404).send({ error: 'Quest not found or inactive' })
            }

            // Vérifier qu'elle n'est pas déjà acceptée
            const { data: existing } = await fastify.supabase
                .from('user_quests')
                .select('id')
                .eq('user_id', user.id)
                .eq('quest_id', body.questId)
                .single()

            if (existing) {
                return reply.code(400).send({ error: 'Quest already accepted' })
            }

            const { data, error } = await fastify.supabase
                .from('user_quests')
                .insert({
                    user_id: user.id,
                    quest_id: body.questId,
                    progress: 0,
                    status: 'active',
                    started_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (error) throw error

            return {
                data: { ...data, quest },
                message: `Quest accepted: ${quest.title} ${quest.emoji}`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /progress — Mettre à jour la progression
    // ==========================================
    fastify.post('/progress', async (request, reply) => {
        try {
            const user = request.user!
            const body = progressSchema.parse(request.body)

            // Récupérer la quête et sa progression
            const { data: uq, error } = await fastify.supabase
                .from('user_quests')
                .select(`
                    id, progress, status,
                    quests!inner ( id, title, target, metric, xp_reward, badge_slug, emoji )
                `)
                .eq('user_id', user.id)
                .eq('quest_id', body.questId)
                .eq('status', 'active')
                .single()

            if (error || !uq) {
                return reply.code(404).send({ error: 'Active quest not found' })
            }

            const quest = uq.quests as any
            const newProgress = Math.min(uq.progress + body.value, quest.target)
            const completed = newProgress >= quest.target

            // Update progress
            await fastify.supabase.from('user_quests').update({
                progress: newProgress,
                status: completed ? 'completed' : 'active',
                completed_at: completed ? new Date().toISOString() : null,
            }).eq('id', uq.id)

            let rewards: any = null
            if (completed) {
                // Award XP
                await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: quest.xp_reward })

                // Award badge if applicable
                if (quest.badge_slug) {
                    await fastify.supabase.from('user_badges').upsert({
                        user_id: user.id,
                        badge_slug: quest.badge_slug,
                        earned_at: new Date().toISOString(),
                    }, { onConflict: 'user_id,badge_slug' })
                }

                rewards = {
                    xpEarned: quest.xp_reward,
                    badgeEarned: quest.badge_slug || null,
                }
            }

            return {
                data: {
                    questId: body.questId,
                    progress: newProgress,
                    target: quest.target,
                    progressPct: Math.round((newProgress / quest.target) * 100),
                    completed,
                    rewards,
                },
                message: completed
                    ? `Quest completed: ${quest.title}! +${quest.xp_reward} XP ${quest.emoji}`
                    : `Progress: ${newProgress}/${quest.target}`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /completed — Quêtes terminées
    // ==========================================
    fastify.get('/completed', async (request, reply) => {
        try {
            const user = request.user!

            const { data, error } = await fastify.supabase
                .from('user_quests')
                .select(`
                    id, progress, completed_at,
                    quests!inner ( title, description, emoji, xp_reward, difficulty, category )
                `)
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(50)

            if (error) throw error

            return {
                data: (data || []).map((uq: any) => ({
                    ...uq.quests,
                    completedAt: uq.completed_at,
                })),
                total: (data || []).length,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /badges — Badges du joueur
    // ==========================================
    fastify.get('/badges', async (request, reply) => {
        try {
            const user = request.user!

            const { data: earned, error } = await fastify.supabase
                .from('user_badges')
                .select('badge_slug, earned_at')
                .eq('user_id', user.id)
                .order('earned_at', { ascending: false })

            if (error) throw error

            const allBadges = getBadgeDefinitions()
            const earnedSlugs = (earned || []).map((b: any) => b.badge_slug)

            const badges = allBadges.map(b => ({
                ...b,
                earned: earnedSlugs.includes(b.slug),
                earnedAt: earned?.find((e: any) => e.badge_slug === b.slug)?.earned_at || null,
            }))

            return {
                data: badges,
                earned: badges.filter(b => b.earned).length,
                total: badges.length,
                progressPct: Math.round((badges.filter(b => b.earned).length / badges.length) * 100),
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /daily-rings — Objectifs quotidiens
    // ==========================================
    fastify.get('/daily-rings', async (request, reply) => {
        try {
            const user = request.user!

            const today = new Date().toISOString().slice(0, 10)

            const { data: log } = await fastify.supabase
                .from('daily_rings')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single()

            const rings = {
                shoot: { current: log?.shots_attempted || 0, target: 100, emoji: '🎯', label: 'Shoot', color: '#FF375F' },
                train: { current: log?.minutes_trained || 0, target: 30, emoji: '💪', label: 'Train', color: '#30D158' },
                recover: { current: log?.recovery_logged ? 1 : 0, target: 1, emoji: '🧘', label: 'Recover', color: '#64D2FF' },
            }

            const allComplete = Object.values(rings).every(r => r.current >= r.target)

            return {
                data: {
                    date: today,
                    rings,
                    allComplete,
                    streakDays: await getDailyStreak(fastify, user.id),
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /daily-rings/log — Logger progression quotidienne
    // ==========================================
    fastify.post('/daily-rings/log', async (request, reply) => {
        try {
            const user = request.user!
            const body = dailyLogSchema.parse(request.body)

            const today = new Date().toISOString().slice(0, 10)

            // Upsert daily rings
            const { data: existing } = await fastify.supabase
                .from('daily_rings')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single()

            const current = existing || { shots_attempted: 0, minutes_trained: 0, recovery_logged: false, session_completed: false }

            const updated = {
                user_id: user.id,
                date: today,
                shots_attempted: (current.shots_attempted || 0) + (body.shotsAttempted || 0),
                minutes_trained: (current.minutes_trained || 0) + (body.minutesTrained || 0),
                recovery_logged: current.recovery_logged || body.recoveryLogged || false,
                session_completed: current.session_completed || body.sessionCompleted || false,
            }

            await fastify.supabase.from('daily_rings').upsert(updated, { onConflict: 'user_id,date' })

            // Check if all rings are complete
            const shootComplete = updated.shots_attempted >= 100
            const trainComplete = updated.minutes_trained >= 30
            const recoverComplete = updated.recovery_logged

            if (shootComplete && trainComplete && recoverComplete) {
                // Award bonus XP for closing all rings
                await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 25 })
            }

            return {
                data: {
                    ...updated,
                    allComplete: shootComplete && trainComplete && recoverComplete,
                    xpBonus: (shootComplete && trainComplete && recoverComplete) ? 25 : 0,
                }
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /xp — XP et niveau du joueur
    // ==========================================
    fastify.get('/xp', async (request, reply) => {
        try {
            const user = request.user!

            const { data } = await fastify.supabase
                .from('public_profiles')
                .select('xp, level')
                .eq('user_id', user.id)
                .single()

            const xp = data?.xp || 0
            const level = data?.level || Math.floor(xp / 100) + 1
            const xpInLevel = xp % 100
            const xpToNext = 100 - xpInLevel

            const title = getLevelTitle(level)

            return {
                data: {
                    xp,
                    level,
                    title,
                    xpInLevel,
                    xpToNext,
                    progressPct: xpInLevel,
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /streak — Streak actuel
    // ==========================================
    fastify.get('/streak', async (request, reply) => {
        try {
            const user = request.user!
            const streak = await getDailyStreak(fastify, user.id)

            return {
                data: {
                    ...streak,
                    motivationalMessage: streak.currentStreak >= 30
                        ? 'Legendary dedication! 🏆'
                        : streak.currentStreak >= 14
                            ? 'Two weeks strong — unstoppable! 🔥'
                            : streak.currentStreak >= 7
                                ? 'One week streak — keep building! 💪'
                                : streak.currentStreak >= 3
                                    ? 'Building momentum! ⚡'
                                    : 'Start your streak today! 🎯',
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}

// ==========================================
// Helpers
// ==========================================

async function getDailyStreak(fastify: FastifyInstance, userId: string) {
    const { data } = await fastify.supabase
        .from('daily_rings')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(60)

    if (!data || data.length === 0) return { currentStreak: 0, longestStreak: 0 }

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < data.length; i++) {
        const expected = new Date(today)
        expected.setDate(expected.getDate() - i)
        const expectedStr = expected.toISOString().slice(0, 10)

        if (data[i].date === expectedStr || (i === 0 && data[i].date === new Date(today.getTime() - 86400000).toISOString().slice(0, 10))) {
            streak++
        } else {
            break
        }
    }

    return { currentStreak: streak, longestStreak: Math.max(streak, data.length) }
}

function getLevelTitle(level: number): string {
    if (level >= 50) return 'Legend'
    if (level >= 40) return 'Hall of Famer'
    if (level >= 30) return 'All-Star'
    if (level >= 25) return 'Star Player'
    if (level >= 20) return 'Starter'
    if (level >= 15) return '6th Man'
    if (level >= 10) return 'Rotation Player'
    if (level >= 7) return 'Role Player'
    if (level >= 5) return 'Bench Player'
    if (level >= 3) return 'Rookie'
    return 'Prospect'
}

function getBadgeDefinitions() {
    return [
        // Shooting
        { slug: 'sniper', name: 'Sniper', emoji: '🎯', description: 'Hit 50%+ from 3 in 5 sessions', category: 'shooting', rarity: 'rare' },
        { slug: 'automatic', name: 'Automatic', emoji: '🤖', description: 'Hit 10 consecutive free throws', category: 'shooting', rarity: 'common' },
        { slug: 'deep_range', name: 'Deep Range', emoji: '🏹', description: 'Hit a 3-pointer from the logo area', category: 'shooting', rarity: 'legendary' },
        { slug: 'perfect_release', name: 'Perfect Release', emoji: '✨', description: 'Shot quality A+ on 5 shots in a session', category: 'shooting', rarity: 'epic' },
        { slug: 'zone_master', name: 'Zone Master', emoji: '🗺️', description: 'Score from all 6 zones in one session', category: 'shooting', rarity: 'rare' },
        { slug: 'century', name: 'Century Club', emoji: '💯', description: 'Attempt 100 shots in a single session', category: 'shooting', rarity: 'common' },

        // Mental
        { slug: 'ice_cold', name: 'Ice Cold', emoji: '🧊', description: 'Mental score 90+ in a clutch moment', category: 'mental', rarity: 'epic' },
        { slug: 'comeback_kid', name: 'Comeback Kid', emoji: '🔄', description: 'Recover from 3+ missed shots to hit 3 in a row', category: 'mental', rarity: 'rare' },
        { slug: 'zen_master', name: 'Zen Master', emoji: '🧘', description: 'Mental score 85+ for 5 consecutive sessions', category: 'mental', rarity: 'legendary' },

        // Consistency
        { slug: 'iron_man', name: 'Iron Man', emoji: '🦾', description: 'Train 7 days in a row', category: 'consistency', rarity: 'rare' },
        { slug: 'marathoner', name: 'Marathoner', emoji: '🏃', description: '30-day training streak', category: 'consistency', rarity: 'legendary' },
        { slug: 'early_bird', name: 'Early Bird', emoji: '🌅', description: 'Complete a session before 7am', category: 'consistency', rarity: 'common' },
        { slug: 'night_owl', name: 'Night Owl', emoji: '🦉', description: 'Complete a session after 10pm', category: 'consistency', rarity: 'common' },
        { slug: 'ring_closer', name: 'Ring Closer', emoji: '⭕', description: 'Close all 3 daily rings', category: 'consistency', rarity: 'common' },
        { slug: 'triple_crown', name: 'Triple Crown', emoji: '👑', description: 'Close all rings for 7 days straight', category: 'consistency', rarity: 'epic' },

        // Progress
        { slug: 'first_twin', name: 'Digital Twin Created', emoji: '🧬', description: 'Create your first Digital Twin', category: 'progress', rarity: 'common' },
        { slug: 'level_10', name: 'Double Digits', emoji: '🔟', description: 'Reach level 10', category: 'progress', rarity: 'common' },
        { slug: 'level_25', name: 'Quarter Century', emoji: '🏅', description: 'Reach level 25', category: 'progress', rarity: 'rare' },
        { slug: 'nba_ready', name: 'NBA Ready', emoji: '🏆', description: 'Overall rating 90+', category: 'progress', rarity: 'legendary' },
        { slug: 'pure_form', name: 'Pure Form', emoji: '💎', description: 'Shot DNA purity score 90+', category: 'progress', rarity: 'epic' },

        // Social
        { slug: 'team_player', name: 'Team Player', emoji: '🤝', description: 'Join a crew', category: 'social', rarity: 'common' },
        { slug: 'viral', name: 'Going Viral', emoji: '📱', description: 'Share a highlight that gets 100+ views', category: 'social', rarity: 'rare' },
        { slug: 'mentor', name: 'Mentor', emoji: '🎓', description: 'Have 10+ followers', category: 'social', rarity: 'rare' },
        { slug: 'champion', name: 'Champion', emoji: '🏆', description: 'Win a community challenge', category: 'social', rarity: 'epic' },
    ]
}
