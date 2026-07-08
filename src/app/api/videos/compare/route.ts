import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/videos/compare — Get two videos for side-by-side comparison
// Query params: videoA, videoB (video IDs)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const videoAId = searchParams.get('videoA')
    const videoBId = searchParams.get('videoB')

    if (!videoAId || !videoBId) {
      return NextResponse.json({ error: 'Deux vidéos requises (videoA, videoB)' }, { status: 400 })
    }

    if (videoAId === videoBId) {
      return NextResponse.json({ error: 'Les deux vidéos doivent être différentes' }, { status: 400 })
    }

    const accessibleWhere = {
      OR: [
        { playerId: session.user.id },
        { isPublic: true },
      ],
    }

    const [videoA, videoB] = await Promise.all([
      db.video.findFirst({
        where: { id: videoAId, ...accessibleWhere },
        include: {
          player: { select: { id: true, name: true, avatar: true } },
          annotations: { orderBy: { timestampMs: 'asc' } },
          highlights: { orderBy: { startMs: 'asc' } },
        },
      }),
      db.video.findFirst({
        where: { id: videoBId, ...accessibleWhere },
        include: {
          player: { select: { id: true, name: true, avatar: true } },
          annotations: { orderBy: { timestampMs: 'asc' } },
          highlights: { orderBy: { startMs: 'asc' } },
        },
      }),
    ])

    if (!videoA) {
      return NextResponse.json({ error: 'Vidéo A introuvable' }, { status: 404 })
    }
    if (!videoB) {
      return NextResponse.json({ error: 'Vidéo B introuvable' }, { status: 404 })
    }

    return NextResponse.json({ videoA, videoB })
  } catch (error) {
    console.error('[GET /api/videos/compare]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}