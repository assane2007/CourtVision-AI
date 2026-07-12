import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';
import { withAuth } from '@/lib/with-auth';

// GET /api/videos/compare — Get two videos for side-by-side comparison
// Query params: videoA, videoB (video IDs)
export const GET = withAuth(async (req: NextRequest, session) => {
  try {

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
    trackError('[GET /api/videos/compare]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
