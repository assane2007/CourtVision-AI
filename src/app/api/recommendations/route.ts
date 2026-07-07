import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { withCache } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'

// GET /api/recommendations — Smart drill recommendations based on player profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`recommendations:get:${playerId}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const result = await withCache(`recommendations:${playerId}`, 3 * 60 * 1000, async () => {
      const [player, allDrills, pastDrills] = await Promise.all([
        db.player.findUnique({
          where: { id: playerId },
          select: { position: true, level: true, goals: true },
        }),
        db.drill.findMany({
          where: {
            isActive: true,
            OR: [
              { playerId: null },
              { playerId },
            ],
          },
        }),
        db.workoutSessionDrill.findMany({
          where: { session: { playerId } },
          include: { drill: { select: { id: true, category: true, difficulty: true } } },
        }),
      ])

      if (!player) {
        throw new Error('Joueur non trouvé')
      }

      // Calculate category performance
      const catScores: Record<string, number[]> = {}
      const drillScores: Record<string, number[]> = {} // drillId -> scores
      for (const pd of pastDrills) {
        const cat = pd.drill.category
        if (!catScores[cat]) catScores[cat] = []
        catScores[cat].push(pd.score)

        if (!drillScores[pd.drillId]) drillScores[pd.drillId] = []
        drillScores[pd.drillId].push(pd.score)
      }

      // Find weak & unattempted categories
      const weakCategories = Object.entries(catScores)
        .filter(([, scores]) => scores.length > 0 && scores.reduce((a, b) => a + b, 0) / scores.length < 70)
        .map(([cat]) => cat)

      const attemptedCats = new Set(Object.keys(catScores))
      const unattemptedCats = [...new Set(allDrills.map(d => d.category))].filter(c => !attemptedCats.has(c))

      // Score and rank each drill
      const recommendations: { drillId: string; reasonFr: string; priority: number }[] = []
      const levelOrder = ['beginner', 'intermediate', 'advanced']
      const playerLevelIdx = levelOrder.indexOf(player.level)

      for (const drill of allDrills) {
        let priority = 0
        let reasonFr = ''

        // Match training goals
        if (drill.category === player.goals) {
          priority += 3
          reasonFr = 'Correspond à vos objectifs d\'entraînement'
        }

        // Weak category bonus
        if (weakCategories.includes(drill.category)) {
          priority += 2
          reasonFr = reasonFr || 'Améliorez vos points faibles'
        }

        // New category bonus
        if (unattemptedCats.includes(drill.category)) {
          priority += 2
          reasonFr = reasonFr || 'Essayez une nouvelle catégorie'
        }

        // Level match
        const drillLevelIdx = levelOrder.indexOf(drill.difficulty)
        if (drillLevelIdx === playerLevelIdx) {
          priority += 1
        } else if (drillLevelIdx === playerLevelIdx + 1) {
          priority += 0.5
        }

        // Reduce priority for already-mastered drills
        const scores = drillScores[drill.id]
        if (scores && scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length
          if (avg >= 85) priority -= 2
          else if (avg >= 70) priority -= 1
        }

        if (priority > 0) {
          recommendations.push({
            drillId: drill.id,
            reasonFr: reasonFr || 'Recommandé pour vous',
            priority,
          })
        }
      }

      recommendations.sort((a, b) => b.priority - a.priority)

      const topRecs = recommendations.slice(0, 8)
      return topRecs.map(rec => {
        const drill = allDrills.find(d => d.id === rec.drillId)!
        return { ...drill, reasonFr: rec.reasonFr }
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    trackError('GET /api/recommendations', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}