import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const player = await db.player.findUnique({
      where: { id: session.user.id },
      select: { position: true, level: true, goals: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })
    }

    // Get all drills
    const allDrills = await db.drill.findMany({
      where: { isActive: true },
    })

    // Get player's past session drills
    const pastDrills = await db.workoutSessionDrill.findMany({
      where: { session: { playerId: session.user.id } },
      include: { drill: true },
    })

    // Calculate category performance
    const catScores: Record<string, number[]> = {}
    for (const pd of pastDrills) {
      const cat = pd.drill.category
      if (!catScores[cat]) catScores[cat] = []
      catScores[cat].push(pd.score)
    }

    // Find weak categories (low average score or few attempts)
    const weakCategories = Object.entries(catScores)
      .filter(([, scores]) => scores.length > 0 && scores.reduce((a, b) => a + b, 0) / scores.length < 70)
      .map(([cat]) => cat)

    const attemptedCats = new Set(Object.keys(catScores))
    const unattemptedCats = [...new Set(allDrills.map(d => d.category))].filter(c => !attemptedCats.has(c))

    // Generate recommendations
    const recommendations: { drillId: string; reason: string; reasonFr: string; priority: number }[] = []

    for (const drill of allDrills) {
      let priority = 0
      let reason = ''
      let reasonFr = ''

      // Priority based on goals match
      if (drill.category === player.goals) {
        priority += 3
        reason = 'Matches your training goals'
        reasonFr = 'Correspond à vos objectifs d\'entraînement'
      }

      // Priority based on weak categories
      if (weakCategories.includes(drill.category)) {
        priority += 2
        reason = reason || 'Improve your weak areas'
        reasonFr = reasonFr || 'Améliorez vos points faibles'
      }

      // Priority based on unattempted categories
      if (unattemptedCats.includes(drill.category)) {
        priority += 2
        reason = reason || 'Try a new category'
        reasonFr = reasonFr || 'Essayez une nouvelle catégorie'
      }

      // Priority based on level match
      const levelOrder = ['beginner', 'intermediate', 'advanced']
      const playerLevelIdx = levelOrder.indexOf(player.level)
      const drillLevelIdx = levelOrder.indexOf(drill.difficulty)
      if (drillLevelIdx === playerLevelIdx) {
        priority += 1
      } else if (drillLevelIdx === playerLevelIdx + 1) {
        priority += 0.5 // Slightly harder is good
      }

      // Reduce priority for drills already done well
      const drillPastScores = pastDrills.filter(pd => pd.drillId === drill.id).map(pd => pd.score)
      if (drillPastScores.length > 0) {
        const avg = drillPastScores.reduce((a, b) => a + b, 0) / drillPastScores.length
        if (avg >= 85) {
          priority -= 2 // Already mastered
        }
      }

      if (priority > 0) {
        recommendations.push({
          drillId: drill.id,
          reason: reason || 'Recommended for you',
          reasonFr: reasonFr || 'Recommandé pour vous',
          priority,
        })
      }
    }

    // Sort by priority and return top 8
    recommendations.sort((a, b) => b.priority - a.priority)

    const topRecs = recommendations.slice(0, 8)
    const recommendedDrills = topRecs.map(rec => {
      const drill = allDrills.find(d => d.id === rec.drillId)!
      return { ...drill, reason: rec.reason, reasonFr: rec.reasonFr }
    })

    return NextResponse.json(recommendedDrills)
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}