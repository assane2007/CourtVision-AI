import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// GET /api/ai/pose/[id] — Get pose data by ID or list session poses
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let poseId: string | undefined
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = await params
    poseId = resolvedParams.id
    const playerId = session.user.id

    const poseData = await db.poseData.findFirst({
      where: { id: poseId, playerId },
    })

    if (!poseData) {
      return NextResponse.json({ error: 'Données de pose non trouvées' }, { status: 404 })
    }

    let landmarks: unknown = {}
    try {
      landmarks = JSON.parse(poseData.landmarks)
    } catch { /* keep empty object */ }

    return NextResponse.json({
      id: poseData.id,
      sessionId: poseData.sessionId,
      drillId: poseData.drillId,
      landmarks,
      frameTimestamp: poseData.frameTimestamp,
      confidence: poseData.confidence,
      createdAt: poseData.createdAt,
    })
  } catch (error) {
    trackError(`GET /api/ai/pose/${poseId ?? 'unknown'}`, error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/ai/pose/[id] — Delete pose data
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let poseId: string | undefined
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = await params
    poseId = resolvedParams.id
    const playerId = session.user.id

    const poseData = await db.poseData.findFirst({ where: { id: poseId, playerId } })
    if (!poseData) {
      return NextResponse.json({ error: 'Données non trouvées' }, { status: 404 })
    }

    await db.poseData.delete({ where: { id: poseId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError(`DELETE /api/ai/pose/${poseId ?? 'unknown'}`, error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}