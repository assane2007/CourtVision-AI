import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { trackError } from '@/lib/monitoring';
import { withAuth } from '@/lib/with-auth';

// POST /api/ai/shots/detect — Save a detected shot
export const POST = withAuth(async (req: NextRequest, session) => {
  try {

    const playerId = session.user.id

    const rl = rateLimit(`ai-shots-detect:${playerId}`, 50, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await req.json()
    const { type, x, y, confidence, timestampMs, sessionId, videoId, formScore } = body

    const validTypes = ['made', 'missed', 'airball', 'bank']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Type invalide. Choisissez: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const cx = typeof x === 'number' ? Math.max(0, Math.min(1, x)) : 0.5
    const cy = typeof y === 'number' ? Math.max(0, Math.min(1, y)) : 0.5
    const conf = typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0.5
    const ts = typeof timestampMs === 'number' ? Math.max(0, Math.round(timestampMs)) : 0

    const shot = await db.shotDetection.create({
      data: {
        playerId,
        sessionId: sessionId || null,
        videoId: videoId || null,
        type,
        x: cx,
        y: cy,
        confidence: conf,
        timestampMs: ts,
        formScore: typeof formScore === 'number' ? Math.max(0, Math.min(100, formScore)) : null,
      },
    })

    return NextResponse.json({ id: shot.id, type, x: cx, y: cy }, { status: 201 })
  } catch (error) {
    trackError('POST /api/ai/shots/detect', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
