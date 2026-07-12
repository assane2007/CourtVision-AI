import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { withAuth } from '@/lib/with-auth';

// GET /api/ai/form/history — Form analysis history with trends
export const GET = withAuth(async (req: NextRequest, session) => {
  try {

    const playerId = session.user.id
    const url = new URL(req.url)
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

    const analyses = await db.formAnalysis.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const items = analyses.map(a => {
      let categories: Record<string, number> = {}
      let feedback: { good: string[]; issues: string[]; tips: string[] } = { good: [], issues: [], tips: [] }
      try { categories = JSON.parse(a.categories) } catch { /* ignore */ }
      try { feedback = JSON.parse(a.feedback) } catch { /* ignore */ }

      return {
        id: a.id,
        overallScore: a.overallScore,
        categories,
        feedback,
        sessionId: a.sessionId,
        drillId: a.drillId,
        createdAt: a.createdAt,
      }
    })

    // Calculate category trends
    const categoryTrends: Record<string, { scores: number[]; trend: number | null }> = {}
    const catKeys = ['stance', 'release', 'follow_through', 'balance', 'timing']

    for (const key of catKeys) {
      const scores = items
        .map(i => i.categories[key])
        .filter((s): s is number => typeof s === 'number' && !isNaN(s))
        .reverse() // chronological order

      if (scores.length >= 2) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
        const secondHalf = scores.slice(Math.floor(scores.length / 2))
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        categoryTrends[key] = {
          scores,
          trend: Math.round((avgSecond - avgFirst) * 10) / 10,
        }
      } else if (scores.length === 1) {
        categoryTrends[key] = { scores, trend: null }
      }
    }

    // Session comparison (last 2 sessions with form data)
    const sessionIds = [...new Set(items.map(i => i.sessionId).filter(Boolean) as string[])].slice(0, 2)
    const sessionComparison = sessionIds.length >= 2
      ? sessionIds.map(sid => {
          const sessItems = items.filter(i => i.sessionId === sid)
          const avg = sessItems.length > 0 ? Math.round(sessItems.reduce((a, i) => a + i.overallScore, 0) / sessItems.length) : 0
          return { sessionId: sid, avgScore: avg, analysisCount: sessItems.length }
        })
      : null

    return NextResponse.json({
      items,
      categoryTrends,
      sessionComparison,
      totalAnalyses: await db.formAnalysis.count({ where: { playerId } }),
    })
  } catch (error) {
    trackError('GET /api/ai/form/history', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
