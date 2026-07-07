import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { getAchievementXp, getLevelFromXp } from '@/lib/xp'
import { calculateStreak } from '@/lib/streak'
import { trackError } from '@/lib/monitoring'
import { withCache } from '@/lib/cache'

const ACHIEVEMENTS = [
  // Existing
  { type: 'first_login', title: 'Premier Pas', description: 'Vous avez créé votre compte', icon: '🏀' },
  { type: 'first_workout', title: 'Première Séance', description: 'Complétez votre premier entraînement', icon: '🔥' },
  { type: 'five_sessions', title: 'Régulier', description: 'Complétez 5 séances', icon: '💪' },
  { type: 'ten_sessions', title: 'Déterminé', description: 'Complétez 10 séances', icon: '🏆' },
  { type: 'fifty_sessions', title: 'Légende', description: 'Complétez 50 séances', icon: '👑' },
  { type: 'hundred_reps', title: 'Centenaire', description: 'Atteignez 100 répétitions', icon: '💯' },
  { type: 'five_hundred_reps', title: 'Endurant', description: 'Atteignez 500 répétitions', icon: '🔄' },
  { type: 'thousand_reps', title: 'Machine à Répétitions', description: 'Atteignez 1000 répétitions', icon: '⚙️' },
  { type: 'high_score', title: 'Excellence', description: 'Score moyen de 80+', icon: '⭐' },
  { type: 'perfect_score', title: 'Perfection', description: 'Score moyen de 95+', icon: '🌟' },
  { type: 'week_streak', title: 'Semaine Intense', description: '3 séances en une semaine', icon: '📅' },
  { type: 'week_warrior', title: 'Guerrier de la Semaine', description: '5 séances en une semaine', icon: '⚔️' },
  { type: 'explorer', title: 'Explorateur', description: 'Essayez 5 catégories différentes', icon: '🧭' },
  { type: 'master', title: 'Maître', description: 'Essayez toutes les catégories', icon: '🎓' },
  { type: 'night_owl', title: 'Oiseau de Nuit', description: 'Entraînez-vous après 22h', icon: '🦉' },
  { type: 'early_bird', title: 'Lève-tôt', description: 'Entraînez-vous avant 8h', icon: '🐦' },
  // New achievements
  { type: 'score_50', title: 'En progression', description: 'Score moyen de 50+', icon: '📊' },
  { type: 'score_70', title: 'En feu', description: 'Score moyen de 70+', icon: '🔥' },
  { type: 'plan_creator', title: 'Planificateur', description: 'Créer un plan d\'entraînement', icon: '📋' },
  { type: 'reaction_fast', title: 'Éclair', description: 'Temps de réaction moyen < 300ms', icon: '⚡' },
  { type: 'coach_user', title: 'Élève du Coach', description: 'Utiliser le coach IA 5 fois', icon: '🤖' },
  { type: 'perfect_drill', title: 'Diamant', description: 'Un exercice avec score 100', icon: '💎' },
  { type: 'weekend_warrior', title: 'Guerrier du Weekend', description: 'S\'entraîner le weekend', icon: '🏋️' },
  { type: 'marathon', title: 'Marathonien', description: '3 séances en un jour', icon: '🏃' },
  { type: 'streak_7', title: 'Série de 7', description: '7 jours consécutifs', icon: '🔥' },
  { type: 'streak_30', title: 'Roi de la Série', description: '30 jours consécutifs', icon: '👑' },
] as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = rateLimit(`achievements:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const playerId = session.user.id

    return withCache(`achievements:${playerId}`, 2 * 60 * 1000, async () => {
      // Gather stats in parallel
      const [
        totalSessions,
        totalRepsResult,
        avgScoreResult,
        weekSessions,
        sessionDrills,
        sessions,
        trainingPlanCount,
        avgReactionResult,
        aiMessageCount,
        perfectDrillCount,
      ] = await Promise.all([
        db.workoutSession.count({ where: { playerId } }),
        db.workoutSession.aggregate({ where: { playerId }, _sum: { totalReps: true } }),
        db.workoutSession.aggregate({ where: { playerId }, _avg: { totalScore: true } }),
        (() => {
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          return db.workoutSession.count({ where: { playerId, startedAt: { gte: oneWeekAgo } } })
        })(),
        db.workoutSessionDrill.findMany({
          where: { session: { playerId } },
          include: { drill: { select: { category: true } } },
        }),
        db.workoutSession.findMany({
          where: { playerId },
          select: { startedAt: true },
          orderBy: { startedAt: 'desc' },
        }),
        db.trainingPlan.count({ where: { playerId } }),
        db.reactionScore.aggregate({
          where: { playerId, correct: true },
          _avg: { reactionMs: true },
        }),
        db.aIChatMessage.count({
          where: { playerId, role: 'user' },
        }),
        db.workoutSessionDrill.count({
          where: { session: { playerId }, score: 100 },
        }),
      ])

      const totalReps = totalRepsResult._sum.totalReps || 0
      const avgScore = avgScoreResult._avg.totalScore || 0
      const categoriesTried = new Set(sessionDrills.map(sd => sd.drill.category))
      const avgReaction = avgReactionResult._avg.reactionMs ?? Infinity

      const hasNightSession = sessions.some(s => {
        const h = new Date(s.startedAt).getHours()
        return h >= 22 || h < 5
      })
      const hasEarlySession = sessions.some(s => {
        const h = new Date(s.startedAt).getHours()
        return h >= 5 && h < 8
      })

      // ── Streak calculation ─────────────────────────────────────────────
      const { current: currentStreak } = calculateStreak(
        sessions.map((s) => s.startedAt),
      )

      // ── Weekend warrior: at least one session on Sat or Sun ────────────
      const hasWeekendSession = sessions.some(s => {
        const day = new Date(s.startedAt).getDay()
        return day === 0 || day === 6
      })

      // ── Marathon: 3 sessions in a single day ───────────────────────────
      const sessionsPerDay = new Map<string, number>()
      for (const s of sessions) {
        const day = new Date(s.startedAt).toISOString().split('T')[0]
        sessionsPerDay.set(day, (sessionsPerDay.get(day) ?? 0) + 1)
      }
      const hasMarathon = Array.from(sessionsPerDay.values()).some(count => count >= 3)

      // Determine conditions
      const conditions: Record<string, boolean> = {
        first_login: true,
        first_workout: totalSessions >= 1,
        five_sessions: totalSessions >= 5,
        ten_sessions: totalSessions >= 10,
        fifty_sessions: totalSessions >= 50,
        hundred_reps: totalReps >= 100,
        five_hundred_reps: totalReps >= 500,
        thousand_reps: totalReps >= 1000,
        high_score: avgScore >= 80,
        perfect_score: avgScore >= 95,
        week_streak: weekSessions >= 3,
        week_warrior: weekSessions >= 5,
        explorer: categoriesTried.size >= 5,
        master: categoriesTried.size >= 9,
        night_owl: hasNightSession,
        early_bird: hasEarlySession,
        // New achievements
        score_50: avgScore >= 50,
        score_70: avgScore >= 70,
        plan_creator: trainingPlanCount >= 1,
        reaction_fast: avgReaction < 300,
        coach_user: aiMessageCount >= 5,
        perfect_drill: perfectDrillCount >= 1,
        weekend_warrior: hasWeekendSession,
        marathon: hasMarathon,
        streak_7: currentStreak >= 7,
        streak_30: currentStreak >= 30,
      }

      // Get already unlocked
      const unlocked = await db.achievement.findMany({
        where: { playerId },
        select: { type: true, unlockedAt: true },
      })
      const unlockedMap = new Map(unlocked.map(u => [u.type, u.unlockedAt]))

      // Find new unlocks
      const newUnlocks: typeof ACHIEVEMENTS[number][] = []
      for (const achievement of ACHIEVEMENTS) {
        if (!unlockedMap.has(achievement.type) && conditions[achievement.type]) {
          newUnlocks.push(achievement)
        }
      }

      // Save new unlocks in batch
      if (newUnlocks.length > 0) {
        await db.achievement.createMany({
          data: newUnlocks.map(n => ({
            playerId,
            type: n.type,
            title: n.title,
            description: n.description,
            icon: n.icon,
          })),
        })

        // Award XP for each new achievement
        const xpReward = getAchievementXp()
        const totalXpToAward = xpReward.amount * newUnlocks.length

        await Promise.all([
          // Create XP log entries for each achievement
          db.xpLog.createMany({
            data: newUnlocks.map(n => ({
              playerId,
              amount: xpReward.amount,
              source: 'achievement',
              description: `Succès débloqué : ${n.title} 🏅`,
            })),
          }),
          // Update player XP
          db.player.update({
            where: { id: playerId },
            data: {
              xp: { increment: totalXpToAward },
            },
          }),
        ])

        // Recalculate level from new total XP
        const updatedPlayer = await db.player.findUnique({
          where: { id: playerId },
          select: { xp: true, xpLevel: true },
        })
        if (updatedPlayer) {
          const newLevel = getLevelFromXp(updatedPlayer.xp)
          if (newLevel !== updatedPlayer.xpLevel) {
            await db.player.update({
              where: { id: playerId },
              data: { xpLevel: newLevel },
            })
          }
        }
      }

      const allAchievements = ACHIEVEMENTS.map(a => ({
        ...a,
        unlocked: unlockedMap.has(a.type) || conditions[a.type],
        unlockedAt: unlockedMap.get(a.type)?.toISOString() || (conditions[a.type] ? new Date().toISOString() : null),
      }))

      return NextResponse.json({
        achievements: allAchievements,
        newUnlocks: newUnlocks.map(n => n.type),
        totalUnlocked: allAchievements.filter(a => a.unlocked).length,
        totalAchievements: allAchievements.length,
        xpAwarded: newUnlocks.length > 0 ? getAchievementXp().amount * newUnlocks.length : 0,
      })
    })
  } catch (error) {
    trackError('GET /api/achievements', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}