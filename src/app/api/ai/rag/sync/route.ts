import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// POST /api/ai/rag/sync — Sync player session data to PlayerDocument table for RAG context
export const POST = withAuth(async (request, session) => {
  try {

    const playerId = session.user.id

    const rl = rateLimit(`ai-rag-sync:${playerId}`, 5, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    // Fetch recent sessions with drill details
    const recentSessions = await db.workoutSession.findMany({
      where: { playerId },
      include: {
        drills: {
          include: {
            drill: { select: { nameFr: true, category: true, difficulty: true } },
          },
          orderBy: { score: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { name: true, position: true, level: true, goals: true, xpLevel: true, xp: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })
    }

    const documentsToCreate: { type: string; content: string; metadata: Record<string, unknown> }[] = []

    // 1. Session summaries
    for (const sess of recentSessions) {
      const drillSummaries = sess.drills.map(d => {
        const cat = d.drill?.category ?? 'unknown'
        return `${d.drill?.nameFr ?? 'Exercice'} (${cat}): score=${d.score}, reps=${d.reps}`
      }).join('; ')

      const avgScore = sess.drills.length > 0
        ? Math.round(sess.drills.reduce((a, d) => a + d.score, 0) / sess.drills.length)
        : 0

      documentsToCreate.push({
        type: 'session_summary',
        content: `Session du ${sess.createdAt.toISOString().split('T')[0]}: ${sess.drills.length} exercices, score moyen=${avgScore}/100, score total=${sess.totalScore}, répétitions=${sess.totalReps}. Exercices: ${drillSummaries}.`,
        metadata: { sessionId: sess.id, date: sess.createdAt.toISOString(), avgScore },
      })
    }

    // 2. Stats snapshot
    const weakDrills = await db.workoutSessionDrill.groupBy({
      by: ['drillId'],
      where: { session: { playerId } },
      _avg: { score: true },
      _count: { id: true },
      orderBy: { _avg: { score: 'asc' } },
      take: 5,
    })

    const weakAreas = weakDrills
      .filter(s => s._avg.score !== null && s._avg.score < 65)
      .map(s => `Drill ${s.drillId}: moy=${Math.round(s._avg.score ?? 0)}`)
      .join('; ')

    documentsToCreate.push({
      type: 'stats_snapshot',
      content: `Profil: ${player.name}, position=${player.position}, niveau=${player.level}, objectif=${player.goals}, niveau XP=${player.xpLevel}. Points faibles: ${weakAreas || 'aucun détecté'}.`,
      metadata: { level: player.level, position: player.position, goals: player.goals, xpLevel: player.xpLevel },
    })

    // 3. Form reports
    const recentFormAnalyses = await db.formAnalysis.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    for (const fa of recentFormAnalyses) {
      let issues = ''
      try {
        const fb = typeof fa.feedback === 'string' ? JSON.parse(fa.feedback) : fa.feedback
        issues = Array.isArray(fb?.issues) ? fb.issues.join(', ') : ''
      } catch { /* ignore parse error */ }

      documentsToCreate.push({
        type: 'form_report',
        content: `Analyse forme ${fa.createdAt.toISOString().split('T')[0]}: score=${fa.overallScore}/100. Problèmes: ${issues || 'aucun'}. Détails: ${fa.categories}`,
        metadata: { formAnalysisId: fa.id, score: fa.overallScore },
      })
    }

    // Replace old documents
    await db.playerDocument.deleteMany({ where: { playerId } })

    if (documentsToCreate.length > 0) {
      await db.playerDocument.createMany({
        data: documentsToCreate.map(d => ({
          playerId,
          type: d.type,
          content: d.content,
          metadata: JSON.stringify(d.metadata),
        })),
      })
    }

    return NextResponse.json({
      synced: documentsToCreate.length,
      types: documentsToCreate.reduce<Record<string, number>>((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1
        return acc
      }, {}),
    })
  } catch (error) {
    trackError('POST /api/ai/rag/sync', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
