import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// DELETE /api/videos/[id]/annotations/[annotationId]
export const DELETE = withAuth<{ id: string; annotationId: string }>(async (_request: Request, session, { params }) => {
  try {

    const { id: videoId, annotationId } = await params

    // Verify annotation exists, belongs to this video, and user owns it
    const annotation = await db.videoAnnotation.findFirst({
      where: {
        id: annotationId,
        videoId,
        playerId: session.user.id,
      },
    })

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation introuvable' }, { status: 404 })
    }

    await db.videoAnnotation.delete({
      where: { id: annotationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('[DELETE /api/videos/[id]/annotations/[annotationId]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
