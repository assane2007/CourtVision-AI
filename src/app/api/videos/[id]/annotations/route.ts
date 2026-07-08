import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const VALID_ANNOTATION_TYPES = ['drawing', 'text', 'arrow', 'circle', 'line']

// GET /api/videos/[id]/annotations — List annotations for a video
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: videoId } = await params

    // Verify video exists and is accessible
    const video = await db.video.findFirst({
      where: {
        id: videoId,
        OR: [
          { playerId: session.user.id },
          { isPublic: true },
        ],
      },
      select: { id: true },
    })

    if (!video) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    const annotations = await db.videoAnnotation.findMany({
      where: { videoId },
      orderBy: { timestampMs: 'asc' },
    })

    return NextResponse.json({ annotations })
  } catch (error) {
    console.error('[GET /api/videos/[id]/annotations]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/videos/[id]/annotations — Create an annotation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: videoId } = await params
    const body = await req.json()

    const { type, data, timestampMs, durationMs } = body

    if (!type || !VALID_ANNOTATION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Type invalide. Types acceptés : ${VALID_ANNOTATION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (data === undefined || data === null) {
      return NextResponse.json({ error: 'Données de l\'annotation requises' }, { status: 400 })
    }

    if (typeof timestampMs !== 'number' || timestampMs < 0) {
      return NextResponse.json({ error: 'Timestamp invalide' }, { status: 400 })
    }

    // Verify video exists and user owns it
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { playerId: true },
    })

    if (!video) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    if (video.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé à annoter cette vidéo' }, { status: 403 })
    }

    const annotation = await db.videoAnnotation.create({
      data: {
        videoId,
        playerId: session.user.id,
        type,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        timestampMs: Math.max(0, Math.round(timestampMs)),
        durationMs: typeof durationMs === 'number' ? Math.max(0, Math.round(durationMs)) : 0,
      },
    })

    return NextResponse.json({ annotation }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/videos/[id]/annotations]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}