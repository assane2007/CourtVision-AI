import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// DELETE /api/videos/[id]/annotations/[annotationId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

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
}