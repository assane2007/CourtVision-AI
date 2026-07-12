import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { withAuth } from '@/lib/with-auth';

// GET /api/ai/shots/history — Shot detection history with analytics
export const GET = withAuth(async (req: NextRequest, session) => {
  try {

    const playerId = session.user.id
    const url = new URL(req.url)
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)))
    const sessionFilter = url.searchParams.get('sessionId')

    const where: Record<string, unknown> = { playerId }
    if (sessionFilter) where.sessionId = sessionFilter

    const [shots, total] = await Promise.all([
      db.shotDetection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      db.shotDetection.count({ where }),
    ])

    // Analytics
    const allShots = await db.shotDetection.findMany({
      where: { playerId },
    })

    const byType: Record<string, number> = {}
    let madeCount = 0
    let totalConfidence = 0

    for (const s of allShots) {
      byType[s.type] = (byType[s.type] || 0) + 1
      if (s.type === 'made' || s.type === 'bank') madeCount++
      totalConfidence += s.confidence
    }

    const successRate = allShots.length > 0 ? Math.round((madeCount / allShots.length) * 100) : 0
    const avgConfidence = allShots.length > 0 ? Math.round((totalConfidence / allShots.length) * 100) : 0

    // Zone analysis (divide court into 5 zones)
    const zones = [
      { name: 'Peinture', minX: 0.35, maxX: 0.65, minY: 0.65, maxY: 1.0 },
      { name: 'Clé gauche', minX: 0.1, maxX: 0.35, minY: 0.5, maxY: 0.85 },
      { name: 'Clé droit', minX: 0.65, maxX: 0.9, minY: 0.5, maxY: 0.85 },
      { name: 'Mi-distance', minX: 0.1, maxX: 0.9, minY: 0.25, maxY: 0.5 },
      { name: '3 points', minX: 0, maxX: 1, minY: 0, maxY: 0.25 },
    ]

    const zoneStats = zones.map(zone => {
      const zoneShots = allShots.filter(s =>
        s.x >= zone.minX && s.x <= zone.maxX &&
        s.y >= zone.minY && s.y <= zone.maxY
      )
      const zoneMade = zoneShots.filter(s => s.type === 'made' || s.type === 'bank').length
      return {
        name: zone.name,
        total: zoneShots.length,
        made: zoneMade,
        successRate: zoneShots.length > 0 ? Math.round((zoneMade / zoneShots.length) * 100) : 0,
      }
    })

    // Recent trend (last 20 shots)
    const recentShots = allShots.slice(-20)
    const recentMade = recentShots.filter(s => s.type === 'made' || s.type === 'bank').length
    const recentRate = recentShots.length > 0 ? Math.round((recentMade / recentShots.length) * 100) : 0

    return NextResponse.json({
      shots: shots.map(s => ({
        id: s.id,
        type: s.type,
        x: s.x,
        y: s.y,
        confidence: s.confidence,
        timestampMs: s.timestampMs,
        formScore: s.formScore,
        createdAt: s.createdAt,
      })),
      analytics: {
        total,
        byType,
        successRate,
        avgConfidence,
        recentRate,
        zones: zoneStats,
      },
    })
  } catch (error) {
    trackError('GET /api/ai/shots/history', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
