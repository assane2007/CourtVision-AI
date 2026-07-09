import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// GET /api/ai/pose/[id] — Get pose data by ID or list session poses
export const GET = withAuth(async (request, session, { params }) => {
  let poseId: string | undefined
  try {

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
})

// DELETE /api/ai/pose/[id] — Delete pose data
export const DELETE = withAuth(async (request, session, { params }) => {
  let poseId: string | undefined
  try {

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
})
