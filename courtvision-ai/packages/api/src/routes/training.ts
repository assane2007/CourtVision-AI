import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
    SmartTrainingEngine,
    type SmartTrainingPlan,
    type TrainingPlanRequest,
} from '@courtvision/ai'

/**
 * Smart Training Routes — Plans d'Entraînement Adaptatifs IA
 *
 * Génère des plans d'entraînement personnalisés qui s'adaptent en temps réel
 * au niveau, à la récupération et aux objectifs du joueur.
 *
 * HomeCourt = 0 training plan
 * CourtVision = IA + periodization + recovery-aware + drill library
 *
 * Inspiré par :
 * - Apple Fitness+ (adaptive workouts)
 * - Whoop Strain Coach
 * - NBA team periodization
 * - Nike Training Club (drill library)
 *
 * Endpoints :
 * - GET  /current              → Plan actif du joueur
 * - POST /generate             → Générer un nouveau plan
 * - PUT  /adapt                → Adapter le plan (post-recovery, post-session)
 * - POST /complete-day         → Marquer un jour comme terminé
 * - GET  /history              → Historique des plans
 * - GET  /drills               → Bibliothèque de drills
 * - GET  /drills/:category     → Drills par catégorie
 * - POST /deload               → Générer une semaine de décharge
 * - GET  /streak               → Streak d'entraînement
 */

const generateSchema = z.object({
    goals: z.array(z.string()).min(1).max(5),
    availableDays: z.number().min(2).max(7).default(5),
    sessionDurationMin: z.number().min(15).max(120).default(45),
    hasGym: z.boolean().default(false),
    hasCourt: z.boolean().default(true),
    planType: z.enum(['weekly', 'micro_cycle', 'deload', 'peaking']).default('weekly'),
    focusAreas: z.array(z.string()).optional(),
})

const completeDaySchema = z.object({
    planId: z.string().uuid(),
    dayNumber: z.number().min(1).max(7),
    difficulty: z.number().min(1).max(5).optional(),
    notes: z.string().max(500).optional(),
    completedDrills: z.array(z.string()).optional(),
    energyPost: z.number().min(1).max(10).optional(),
})

const adaptSchema = z.object({
    planId: z.string().uuid(),
    reason: z.enum(['recovery_low', 'injury', 'schedule_change', 'feeling_great', 'fatigue']),
    recoveryScore: z.number().min(0).max(100).optional(),
    availableDays: z.number().min(1).max(7).optional(),
})

export default async function trainingRoutes(fastify: FastifyInstance) {
    fastify.addHook('preValidation', fastify.authenticate)

    // ==========================================
    // GET /current — Plan actif
    // ==========================================
    fastify.get('/current', async (request, reply) => {
        try {
            const user = request.user!

            const { data: plan, error } = await fastify.supabase
                .from('training_plans')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (error || !plan) {
                return { data: null, message: 'No active training plan. Generate one!' }
            }

            // Enrichir avec l'état de complétion des jours
            const { data: completions } = await fastify.supabase
                .from('training_day_completions')
                .select('day_number, completed_at, difficulty, notes')
                .eq('plan_id', plan.id)

            const completedDays = (completions || []).map((c: any) => c.day_number)
            const totalDays = plan.plan_data?.days?.length || 7
            const progress = completedDays.length / totalDays

            return {
                data: {
                    ...plan.plan_data,
                    planId: plan.id,
                    isActive: plan.is_active,
                    createdAt: plan.created_at,
                    completedDays,
                    progress: Math.round(progress * 100),
                    nextDay: plan.plan_data?.days?.find((d: any) => !completedDays.includes(d.dayNumber)) || null,
                    streak: await getTrainingStreak(fastify, user.id),
                }
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /generate — Générer un plan
    // ==========================================
    fastify.post('/generate', async (request, reply) => {
        try {
            const user = request.user!
            const body = generateSchema.parse(request.body)

            // Récupérer les données du joueur pour personnaliser le plan
            const [profileRes, dnaRes, sessionsRes, recoveryRes] = await Promise.all([
                fastify.supabase.from('digital_twins').select('twin_profile').eq('user_id', user.id).single(),
                fastify.supabase.from('shot_dna_profiles').select('profile').eq('user_id', user.id).single(),
                fastify.supabase.from('sessions')
                    .select('analyses(shot_attempts, shot_made, mental_score, shot_zones)')
                    .eq('user_id', user.id).eq('status', 'complete')
                    .order('created_at', { ascending: false }).limit(5),
                fastify.supabase.from('recovery_logs')
                    .select('overall_score, energy_level')
                    .eq('user_id', user.id)
                    .order('logged_at', { ascending: false }).limit(1).single(),
            ])

            const twin = profileRes.data?.twin_profile
            const dna = dnaRes.data?.profile
            const recovery = recoveryRes.data

            // Calculer les zones faibles/fortes
            const allShots = (sessionsRes.data || []).flatMap((s: any) => {
                const a = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
                return a?.shot_zones || []
            })

            const zonePcts: Record<string, { made: number; total: number }> = {}
            for (const shot of allShots) {
                const z = shot.zone || 'midrange'
                if (!zonePcts[z]) zonePcts[z] = { made: 0, total: 0 }
                zonePcts[z].total++
                if (shot.outcome === 'made') zonePcts[z].made++
            }

            const zoneEntries = Object.entries(zonePcts)
                .map(([zone, { made, total }]) => ({ zone, pct: total > 0 ? (made / total) * 100 : 0 }))
                .sort((a, b) => a.pct - b.pct)

            const worstZones = zoneEntries.slice(0, 2).map(z => z.zone) as any[]
            const bestZones = zoneEntries.slice(-2).map(z => z.zone) as any[]

            // Moyennes récentes
            const recentAnalyses = (sessionsRes.data || []).map((s: any) => {
                const a = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses
                return a
            }).filter(Boolean)

            const avgFG = recentAnalyses.length > 0
                ? recentAnalyses.reduce((s: number, a: any) => {
                    const att = a.shot_attempts || 0
                    const made = a.shot_made || 0
                    return s + (att > 0 ? (made / att) * 100 : 0)
                }, 0) / recentAnalyses.length : 40

            const avgMental = recentAnalyses.length > 0
                ? recentAnalyses.reduce((s: number, a: any) => s + (a.mental_score || 50), 0) / recentAnalyses.length : 50

            // Générer le plan via l'engine AI
            const plan = SmartTrainingEngine.generatePlan({
                userId: user.id,
                position: twin?.position ?? undefined,
                overallRating: twin?.overallRating ?? undefined,
                weaknesses: twin?.weaknesses?.map((w: any) => w.label) ?? body.focusAreas ?? [],
                goals: body.goals,
                recoveryScore: recovery?.overall_score ?? undefined,
                fatigueLevel: recovery?.energy_level ? 10 - recovery.energy_level : undefined,
                worstZones,
                bestZones,
                avgShootingPct: avgFG,
                avgMentalScore: avgMental,
                availableDays: body.availableDays,
                sessionDurationMin: body.sessionDurationMin,
                hasGym: body.hasGym,
                hasCourt: body.hasCourt,
                planType: body.planType,
            })

            // Désactiver l'ancien plan
            await fastify.supabase
                .from('training_plans')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('is_active', true)

            // Sauvegarder le nouveau plan
            const { data: saved, error: saveError } = await fastify.supabase
                .from('training_plans')
                .insert({
                    user_id: user.id,
                    plan_data: plan,
                    plan_type: body.planType,
                    goals: body.goals,
                    is_active: true,
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single()

            if (saveError) throw saveError

            return {
                data: { ...plan, planId: saved?.id },
                message: `Training plan "${plan.name}" generated! 🏋️`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // PUT /adapt — Adapter le plan en cours
    // ==========================================
    fastify.put('/adapt', async (request, reply) => {
        try {
            const user = request.user!
            const body = adaptSchema.parse(request.body)

            const { data: plan, error } = await fastify.supabase
                .from('training_plans')
                .select('*')
                .eq('id', body.planId)
                .eq('user_id', user.id)
                .single()

            if (error || !plan) {
                return reply.code(404).send({ error: 'Plan not found' })
            }

            const adaptedPlan = SmartTrainingEngine.adaptPlan(
                plan.plan_data,
                body.recoveryScore ?? 60,
                { fgPct: 40, mentalScore: 60 },
            )

            // Update le plan
            await fastify.supabase.from('training_plans').update({
                plan_data: adaptedPlan,
                adapted_at: new Date().toISOString(),
                adaptation_reason: body.reason,
            }).eq('id', body.planId)

            return {
                data: adaptedPlan,
                message: `Plan adapted for: ${body.reason.replace(/_/g, ' ')} 🔄`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /complete-day — Compléter un jour
    // ==========================================
    fastify.post('/complete-day', async (request, reply) => {
        try {
            const user = request.user!
            const body = completeDaySchema.parse(request.body)

            // Vérifier que le plan appartient au joueur
            const { data: plan } = await fastify.supabase
                .from('training_plans')
                .select('id, user_id')
                .eq('id', body.planId)
                .eq('user_id', user.id)
                .single()

            if (!plan) {
                return reply.code(404).send({ error: 'Plan not found' })
            }

            // Marquer le jour comme terminé
            const { error } = await fastify.supabase.from('training_day_completions').insert({
                plan_id: body.planId,
                user_id: user.id,
                day_number: body.dayNumber,
                difficulty: body.difficulty,
                notes: body.notes,
                completed_drills: body.completedDrills,
                energy_post: body.energyPost,
                completed_at: new Date().toISOString(),
            })

            if (error) throw error

            // Award XP
            const xpEarned = 20 + (body.difficulty ?? 3) * 5
            await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: xpEarned })

            // Check si le plan est terminé
            const { data: completions } = await fastify.supabase
                .from('training_day_completions')
                .select('day_number')
                .eq('plan_id', body.planId)

            const totalCompleted = (completions || []).length
            const planFinished = totalCompleted >= 7 // Assume 7-day plan

            if (planFinished) {
                // Bonus XP pour plan complet
                await fastify.supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 100 })
            }

            return {
                data: {
                    dayCompleted: body.dayNumber,
                    xpEarned,
                    planFinished,
                    bonusXP: planFinished ? 100 : 0,
                    totalCompleted,
                    streak: await getTrainingStreak(fastify, user.id),
                },
                message: planFinished
                    ? 'Plan completed! +100 bonus XP 🎉'
                    : `Day ${body.dayNumber} done! +${xpEarned} XP 💪`
            }
        } catch (error: any) {
            if (error instanceof z.ZodError) return reply.code(400).send({ error: error.errors })
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /history — Historique des plans
    // ==========================================
    fastify.get('/history', async (request, reply) => {
        try {
            const user = request.user!
            const query = request.query as any
            const limit = Math.min(parseInt(query.limit) || 10, 30)

            const { data, error } = await fastify.supabase
                .from('training_plans')
                .select('id, plan_type, goals, is_active, created_at, adapted_at, plan_data')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            return {
                data: (data || []).map((p: any) => ({
                    id: p.id,
                    name: p.plan_data?.name || 'Training Plan',
                    planType: p.plan_type,
                    goals: p.goals,
                    isActive: p.is_active,
                    createdAt: p.created_at,
                    wasAdapted: !!p.adapted_at,
                    totalDays: p.plan_data?.days?.length || 0,
                    difficulty: p.plan_data?.difficultyLevel || 5,
                }))
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /drills — Bibliothèque de drills
    // ==========================================
    fastify.get('/drills', async (request, reply) => {
        try {
            const query = request.query as any
            const category = query.category || 'all'
            const difficulty = query.difficulty // 'beginner' | 'intermediate' | 'advanced'

            const drills = getDrillLibrary()
            let filtered = drills

            if (category !== 'all') {
                filtered = filtered.filter(d => d.category === category)
            }
            if (difficulty) {
                filtered = filtered.filter(d => d.difficulty === difficulty)
            }

            return {
                data: filtered,
                categories: [...new Set(drills.map(d => d.category))],
                total: filtered.length,
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // POST /deload — Semaine de décharge
    // ==========================================
    fastify.post('/deload', async (request, reply) => {
        try {
            const user = request.user!

            const deloadPlan = SmartTrainingEngine.generatePlan({
                userId: user.id,
                weaknesses: [],
                goals: ['recovery', 'maintenance'],
                worstZones: [],
                bestZones: [],
                avgShootingPct: 50,
                avgMentalScore: 50,
                availableDays: 4,
                sessionDurationMin: 25,
                hasGym: false,
                hasCourt: true,
                planType: 'deload',
            })

            // Désactiver et sauvegarder
            await fastify.supabase.from('training_plans')
                .update({ is_active: false })
                .eq('user_id', user.id).eq('is_active', true)

            const { data: saved } = await fastify.supabase.from('training_plans').insert({
                user_id: user.id,
                plan_data: deloadPlan,
                plan_type: 'deload',
                goals: ['recovery'],
                is_active: true,
                created_at: new Date().toISOString(),
            }).select('id').single()

            return {
                data: { ...deloadPlan, planId: saved?.id },
                message: 'Deload week activated — focus on recovery 🧘'
            }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })

    // ==========================================
    // GET /streak — Training streak
    // ==========================================
    fastify.get('/streak', async (request, reply) => {
        try {
            const user = request.user!
            const streak = await getTrainingStreak(fastify, user.id)
            return { data: streak }
        } catch (error: any) {
            return reply.code(400).send({ error: error.message })
        }
    })
}

// ==========================================
// Helpers
// ==========================================

async function getTrainingStreak(fastify: FastifyInstance, userId: string) {
    const { data } = await fastify.supabase
        .from('training_day_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(30)

    if (!data || data.length === 0) return { currentStreak: 0, longestStreak: 0, totalDays: 0 }

    // Calculate streak
    let streak = 0
    let today = new Date()
    today.setHours(0, 0, 0, 0)

    const dates = [...new Set(data.map((d: any) => new Date(d.completed_at).toISOString().slice(0, 10)))]
        .sort()
        .reverse()

    for (let i = 0; i < dates.length; i++) {
        const date = new Date(dates[i])
        date.setHours(0, 0, 0, 0)
        const expectedDate = new Date(today)
        expectedDate.setDate(expectedDate.getDate() - i)

        if (date.getTime() === expectedDate.getTime()) {
            streak++
        } else if (i === 0 && (today.getTime() - date.getTime()) <= 86400000) {
            // Allow yesterday
            streak++
        } else {
            break
        }
    }

    return {
        currentStreak: streak,
        longestStreak: Math.max(streak, dates.length), // Simplified
        totalDays: dates.length,
        lastTrainedAt: data[0]?.completed_at,
    }
}

function getDrillLibrary() {
    return [
        // Shooting
        { id: 'mikan', name: 'Mikan Drill', category: 'shooting', difficulty: 'beginner', duration: '5 min', description: 'Alternating layups close to basket for touch and finishing', equipment: ['ball', 'basket'], targetZone: 'restricted' },
        { id: 'form-shooting', name: 'Form Shooting', category: 'shooting', difficulty: 'beginner', duration: '8 min', description: 'One-hand shooting from 5 feet, focus on perfect form', equipment: ['ball', 'basket'], targetZone: 'paint' },
        { id: 'corner-3s', name: 'Corner 3s Rapid Fire', category: 'shooting', difficulty: 'intermediate', duration: '10 min', description: '3-point shots from both corners, 5 sets of 10', equipment: ['ball', 'basket'], targetZone: 'corner3' },
        { id: 'pull-up-mid', name: 'Pull-Up Mid-Range', category: 'shooting', difficulty: 'advanced', duration: '12 min', description: 'Off-the-dribble mid-range jumpers from various angles', equipment: ['ball', 'basket'], targetZone: 'midrange' },
        { id: 'catch-shoot', name: 'Catch & Shoot', category: 'shooting', difficulty: 'intermediate', duration: '10 min', description: 'Simulate catch-and-shoot situations around the arc', equipment: ['ball', 'basket', 'partner'], targetZone: 'wing3' },
        { id: 'free-throw-pressure', name: 'Pressure Free Throws', category: 'shooting', difficulty: 'intermediate', duration: '8 min', description: '50 free throws with consequences for misses', equipment: ['ball', 'basket'], targetZone: 'paint' },
        { id: 'step-back-3', name: 'Step-Back 3s', category: 'shooting', difficulty: 'advanced', duration: '12 min', description: 'Harden-style step-back threes from various spots', equipment: ['ball', 'basket'], targetZone: 'top3' },

        // Ball Handling
        { id: 'stationary-handles', name: 'Stationary Handles', category: 'ball_handling', difficulty: 'beginner', duration: '6 min', description: 'Crossovers, between legs, behind back while stationary', equipment: ['ball'] },
        { id: 'full-court-handles', name: 'Full Court Handles', category: 'ball_handling', difficulty: 'intermediate', duration: '8 min', description: 'Dribble moves full court: cross, hesitation, spin', equipment: ['ball', 'court'] },
        { id: 'two-ball-dribble', name: 'Two-Ball Dribbling', category: 'ball_handling', difficulty: 'advanced', duration: '10 min', description: 'Simultaneous two-ball dribbling drills', equipment: ['2 balls'] },

        // Footwork
        { id: 'jab-step', name: 'Jab Step Series', category: 'footwork', difficulty: 'beginner', duration: '6 min', description: 'Triple threat: jab, shot, jab drive, jab pass', equipment: ['ball'] },
        { id: 'euro-step', name: 'Euro Step Drill', category: 'footwork', difficulty: 'intermediate', duration: '8 min', description: 'Euro step finishes from both sides', equipment: ['ball', 'basket'] },
        { id: 'drop-step', name: 'Post Drop Step', category: 'footwork', difficulty: 'intermediate', duration: '8 min', description: 'Post moves: drop step, spin, up-and-under', equipment: ['ball', 'basket'] },

        // Defense
        { id: 'closeout', name: 'Closeout Drill', category: 'defense', difficulty: 'beginner', duration: '6 min', description: 'Sprint closeout → defensive slide', equipment: ['cones'] },
        { id: 'shell-defense', name: 'Shell Defense', category: 'defense', difficulty: 'intermediate', duration: '12 min', description: 'Help defense rotations and recovery', equipment: ['4 players', 'court'] },
        { id: 'chase-drill', name: 'Screen Chase Drill', category: 'defense', difficulty: 'advanced', duration: '8 min', description: 'Fighting through screens at game speed', equipment: ['2 players', 'court'] },

        // Mental
        { id: 'visualization', name: 'Mental Visualization', category: 'mental', difficulty: 'beginner', duration: '10 min', description: 'Visualize perfect shots and game scenarios', equipment: [] },
        { id: 'clutch-simulation', name: 'Clutch Simulation', category: 'mental', difficulty: 'advanced', duration: '12 min', description: 'Shoot with manufactured pressure: countdown, consequences', equipment: ['ball', 'basket', 'timer'] },
        { id: 'breathing', name: 'Box Breathing', category: 'mental', difficulty: 'beginner', duration: '5 min', description: '4-4-4-4 breathing to calm nerves pre-game', equipment: [] },

        // Conditioning
        { id: '17s', name: '17s (Conditioning)', category: 'conditioning', difficulty: 'advanced', duration: '10 min', description: 'Sprint sideline to sideline 17 times in 60 seconds', equipment: ['court'] },
        { id: 'lane-agility', name: 'Lane Agility', category: 'conditioning', difficulty: 'intermediate', duration: '6 min', description: 'NBA combine lane agility test', equipment: ['court', 'cones'] },
        { id: 'suicides', name: 'Suicide Sprints', category: 'conditioning', difficulty: 'advanced', duration: '8 min', description: 'Full court suicide sprints for endurance', equipment: ['court'] },
    ]
}
