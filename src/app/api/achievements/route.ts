import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const ACHIEVEMENTS = [
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
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    // Gather player stats
    const totalSessions = await db.workoutSession.count({ where: { playerId } })

    const totalRepsResult = await db.workoutSession.aggregate({
      where: { playerId },
      _sum: { totalReps: true },
    })
    const totalReps = totalRepsResult._sum.totalReps || 0

    const avgScoreResult = await db.workoutSession.aggregate({
      where: { playerId },
      _avg: { totalScore: true },
    })
    const avgScore = avgScoreResult._avg.totalScore || 0

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const weekSessions = await db.workoutSession.count({
      where: { playerId, startedAt: { gte: oneWeekAgo } },
    })

    // Categories tried
    const sessionDrills = await db.workoutSessionDrill.findMany({
      where: { session: { playerId } },
      include: { drill: true },
    })
    const categoriesTried = new Set(sessionDrills.map(sd => sd.drill.category))

    // Favorites count
    const favoriteCount = await db.drillFavorite.count({ where: { playerId } })

    // Check time-based achievements
    const sessions = await db.workoutSession.findMany({
      where: { playerId },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
    })
    const hasNightSession = sessions.some(s => {
      const h = new Date(s.startedAt).getHours()
      return h >= 22 || h < 5
    })
    const hasEarlySession = sessions.some(s => {
      const h = new Date(s.startedAt).getHours()
      return h >= 5 && h < 8
    })

    // Determine which achievements are unlocked
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
    }

    // Get already unlocked achievements
    const unlocked = await db.achievement.findMany({
      where: { playerId },
      select: { type: true, unlockedAt: true },
    })
    const unlockedMap = new Map(unlocked.map(u => [u.type, u.unlockedAt]))

    // Check for new unlocks
    const newUnlocks: { type: string; title: string; description: string; icon: string; unlockedAt: Date }[] = []

    for (const achievement of ACHIEVEMENTS) {
      if (!unlockedMap.has(achievement.type) && conditions[achievement.type]) {
        newUnlocks.push({ ...achievement, unlockedAt: new Date() })
      }
    }

    // Save new unlocks
    if (newUnlocks.length > 0) {
      await db.achievement.createMany({
        data: newUnlocks.map(n => ({
          playerId,
          type: n.type,
          title: n.title,
          description: n.description,
          icon: n.icon,
          unlockedAt: n.unlockedAt,
        })),
      })
    }

    // Build response
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
    })
  } catch (error) {
    console.error('Achievements error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}