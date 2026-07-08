import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'

// POST /api/ai/pose/save — Save pose landmark data from MediaPipe
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`ai-pose-save:${playerId}`, 100, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await req.json()

    const { landmarks, sessionId, drillId, frameTimestamp, confidence } = body

    if (!landmarks || typeof landmarks !== 'object') {
      return NextResponse.json({ error: 'Landmarks requis (objet JSON)' }, { status: 400 })
    }

    // Validate landmarks structure
    const landmarksStr = JSON.stringify(landmarks)
    if (landmarksStr.length > 50000) {
      return NextResponse.json({ error: 'Données de landmarks trop volumineuses' }, { status: 400 })
    }

    const ts = typeof frameTimestamp === 'number'
      ? Math.max(0, Math.min(3600000, Math.round(frameTimestamp)))
      : 0
    const conf = typeof confidence === 'number'
      ? Math.max(0, Math.min(1, confidence))
      : 0

    const poseData = await db.poseData.create({
      data: {
        playerId,
        sessionId: sessionId || null,
        drillId: drillId || null,
        landmarks: landmarksStr,
        frameTimestamp: ts,
        confidence: conf,
      },
    })

    return NextResponse.json({ id: poseData.id, frameTimestamp: ts, confidence: conf }, { status: 201 })
  } catch (error) {
    trackError('POST /api/ai/pose/save', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}