import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { cacheInvalidate } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'
import ZAI from 'z-ai-web-dev-sdk'

function sanitize(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 500)
}

// GET /api/recommendations — Smart drill recommendations (rule-based)
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

    const [player, allDrills, pastDrills] = await Promise.all([
      db.player.findUnique({
        where: { id: playerId },
        select: { position: true, level: true, goals: true },
      }),
      db.drill.findMany({
        where: {
          isActive: true,
          OR: [{ playerId: null }, { playerId }],
        },
      }),
      db.workoutSessionDrill.findMany({
        where: { session: { playerId } },
        include: { drill: { select: { id: true, category: true, difficulty: true } } },
      }),
    ])

    if (!player) {
      return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })
    }

    const catScores: Record<string, number[]> = {}
    const drillScores: Record<string, number[]> = {}
    for (const pd of pastDrills) {
      const cat = pd.drill.category
      if (!catScores[cat]) catScores[cat] = []
      catScores[cat].push(pd.score)
      if (!drillScores[pd.drillId]) drillScores[pd.drillId] = []
      drillScores[pd.drillId].push(pd.score)
    }

    const weakCategories = Object.entries(catScores)
      .filter(([, scores]) => scores.length > 0 && scores.reduce((a, b) => a + b, 0) / scores.length < 70)
      .map(([cat]) => cat)

    const attemptedCats = new Set(Object.keys(catScores))
    const unattemptedCats = [...new Set(allDrills.map(d => d.category))].filter(c => !attemptedCats.has(c))

    const recommendations: { drillId: string; reasonFr: string; priority: number; factors: string[] }[] = []
    const levelOrder = ['beginner', 'intermediate', 'advanced']
    const playerLevelIdx = levelOrder.indexOf(player.level)

    for (const drill of allDrills) {
      let priority = 0
      const factors: string[] = []

      if (drill.category === player.goals) {
        priority += 3
        factors.push('goal_match')
      }

      if (weakCategories.includes(drill.category)) {
        priority += 2
        factors.push('weakness_target')
      }

      if (unattemptedCats.includes(drill.category)) {
        priority += 2
        factors.push('new_category')
      }

      const drillLevelIdx = levelOrder.indexOf(drill.difficulty)
      if (drillLevelIdx === playerLevelIdx) {
        priority += 1
        factors.push('level_match')
      } else if (drillLevelIdx === playerLevelIdx + 1) {
        priority += 0.5
        factors.push('progressive')
      }

      const scores = drillScores[drill.id]
      if (scores && scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (avg >= 85) priority -= 2
        else if (avg >= 70) priority -= 1
      }

      if (priority > 0) {
        let reasonFr = ''
        if (factors.includes('goal_match')) reasonFr = 'Correspond à vos objectifs d\'entraînement'
        else if (factors.includes('weakness_target')) reasonFr = 'Améliorez vos points faibles'
        else if (factors.includes('new_category')) reasonFr = 'Essayez une nouvelle catégorie'
        else reasonFr = 'Recommandé pour vous'

        recommendations.push({ drillId: drill.id, reasonFr, priority, factors })
      }
    }

    recommendations.sort((a, b) => b.priority - a.priority)
    const topRecs = recommendations.slice(0, 8)
    return topRecs.map(rec => {
      const drill = allDrills.find(d => d.id === rec.drillId)!
      return { ...drill, reasonFr: rec.reasonFr, factors: rec.factors }
    })
  } catch (error) {
    trackError('GET /api/recommendations', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/recommendations — AI-powered personalized recommendations
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`recommendations:ai:${playerId}`, 5, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    // Invalidate cached GET results
    cacheInvalidate(`recommendations:${playerId}`)

    const [player, recentSessions, formAnalyses, recentShots] = await Promise.all([
      db.player.findUnique({
        where: { id: playerId },
        select: { name: true, position: true, level: true, goals: true, xpLevel: true, weeklyGoalSessions: true, weeklyGoalReps: true },
      }),
      db.workoutSession.findMany({
        where: { playerId },
        include: {
          drills: { include: { drill: { select: { nameFr: true, category: true, difficulty: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.formAnalysis.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.shotDetection.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    if (!player) {
      return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })
    }

    // Build data summary for LLM
    const sessionSummary = recentSessions.map(s => {
      const avg = s.drills.length > 0 ? Math.round(s.drills.reduce((a, d) => a + d.score, 0) / s.drills.length) : 0
      const cats = s.drills.map(d => d.drill.category)
      return `Session ${s.createdAt.toISOString().split('T')[0]}: ${s.drills.length} exercices, moy=${avg}, cats=[${cats.join(',')}]`
    }).join('\n')

    const formSummary = formAnalyses.map(f => {
      let cats = ''
      try { cats = f.categories } catch { /* ignore */ }
      return `Score=${f.overallScore}, détails=${cats}`
    }).join('\n')

    const shotMade = recentShots.filter(s => s.type === 'made' || s.type === 'bank').length
    const shotTotal = recentShots.length
    const shotRate = shotTotal > 0 ? Math.round((shotMade / shotTotal) * 100) : null

    const zai = await ZAI.create()

    const prompt = `Tu es un coach de basketball IA expert. Recommande des exercices personnalisés.

PROFIL: ${player.name}, ${player.position}, niveau ${player.level}, objectif: ${player.goals}, niveau XP ${player.xpLevel}
Objectifs hebdomadaires: ${player.weeklyGoalSessions} sessions, ${player.weeklyGoalReps} reps

SESSIONS RÉCENTES:
${sessionSummary || 'Aucune session'}

ANALYSES DE FORME:
${formSummary || 'Aucune analyse'}

TIR: ${shotRate !== null ? `${shotMade}/${shotTotal} réussis (${shotRate}%)` : 'Aucune donnée'}

Réponds UNIQUEMENT en JSON:
{"recommendations": [{"drillName": "nom en français", "category": "catégorie", "difficulty": "beginner/intermediate/advanced", "reason": "explication détaillée en français (2-3 phrases)", "priority": 1-10, "expectedImpact": "impact attendu en français"}], "summary": "résumé global des recommandations en français (2-3 phrases)", "keyFocus": "domaine principal à travailler"}`

    const response = await zai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: sanitize(prompt) }],
      thinking: { type: 'disabled' },
    })

    const content = response.choices?.[0]?.message?.content ?? ''

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

      if (parsed?.recommendations) {
        parsed.recommendations = Array.isArray(parsed.recommendations)
          ? parsed.recommendations.slice(0, 8).map((r: Record<string, unknown>) => ({
              drillName: String(r.drillName || '').slice(0, 100),
              category: String(r.category || '').slice(0, 50),
              difficulty: ['beginner', 'intermediate', 'advanced'].includes(String(r.difficulty)) ? String(r.difficulty) : 'intermediate',
              reason: String(r.reason || '').slice(0, 500),
              priority: Math.max(1, Math.min(10, Math.round(Number(r.priority) || 5))),
              expectedImpact: String(r.expectedImpact || '').slice(0, 300),
            }))
          : []

        parsed.summary = String(parsed.summary || '').slice(0, 500)
        parsed.keyFocus = String(parsed.keyFocus || '').slice(0, 100)

        return NextResponse.json(parsed)
      }
    } catch { /* parse error */ }

    return NextResponse.json({ error: 'Erreur d\'analyse IA' }, { status: 500 })
  } catch (error) {
    trackError('POST /api/recommendations', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}