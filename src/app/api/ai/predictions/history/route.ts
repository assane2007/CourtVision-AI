import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { withAuth } from '@/lib/with-auth';

// GET /api/ai/predictions/history — Prediction history
export const GET = withAuth(async (req: NextRequest, session) => {
  try {

    const playerId = session.user.id
    const url = new URL(req.url)
    const type = url.searchParams.get('type') // filter by type
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))

    const where: Record<string, unknown> = { playerId }
    if (type) where.type = type

    const predictions = await db.prediction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Group by type for chart data
    const byType: Record<string, typeof predictions> = {}
    for (const p of predictions) {
      if (!byType[p.type]) byType[p.type] = []
      byType[p.type].push(p)
    }

    return NextResponse.json({
      predictions: predictions.map(p => {
        let factors: string[] = []
        try { factors = JSON.parse(p.factors) } catch { /* ignore */ }
        return {
          id: p.id,
          type: p.type,
          predictedAt: p.predictedAt,
          predictedValue: p.predictedValue,
          confidence: p.confidence,
          factors,
          recommendation: p.recommendation,
          createdAt: p.createdAt,
        }
      }),
      byType: Object.fromEntries(
        Object.entries(byType).map(([type, preds]) => [
          type,
          preds.map(p => ({
            id: p.id,
            predictedAt: p.predictedAt,
            predictedValue: p.predictedValue,
            confidence: p.confidence,
            createdAt: p.createdAt,
          })),
        ]),
      ),
      total: await db.prediction.count({ where: { playerId } }),
    })
  } catch (error) {
    trackError('GET /api/ai/predictions/history', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
