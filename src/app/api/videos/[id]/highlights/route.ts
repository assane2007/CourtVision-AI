import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'

// GET /api/videos/[id]/highlights — List highlights for a video
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

    const highlights = await db.videoHighlight.findMany({
      where: { videoId },
      orderBy: { startMs: 'asc' },
    })

    return NextResponse.json({ highlights })
  } catch (error) {
    trackError('[GET /api/videos/[id]/highlights]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/videos/[id]/highlights — Create a manual highlight
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

    const { title, startMs, endMs, type, score } = body

    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
    }

    if (typeof startMs !== 'number' || startMs < 0) {
      return NextResponse.json({ error: 'Temps de début invalide' }, { status: 400 })
    }

    if (typeof endMs !== 'number' || endMs <= startMs) {
      return NextResponse.json({ error: 'Temps de fin doit être supérieur au début' }, { status: 400 })
    }

    // Verify video ownership
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { playerId: true },
    })

    if (!video || video.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    const highlight = await db.videoHighlight.create({
      data: {
        videoId,
        title: title.trim().slice(0, 200),
        startMs: Math.round(startMs),
        endMs: Math.round(endMs),
        type: type === 'auto' ? 'auto' : 'manual',
        score: typeof score === 'number' ? Math.max(0, Math.min(1, score)) : null,
      },
    })

    return NextResponse.json({ highlight }, { status: 201 })
  } catch (error) {
    trackError('[POST /api/videos/[id]/highlights]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}