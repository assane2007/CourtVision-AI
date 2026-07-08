import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'

// GET /api/videos/[id] — Get single video with annotations & highlights
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const video = await db.video.findFirst({
      where: {
        id,
        OR: [
          { playerId: session.user.id },
          { isPublic: true },
        ],
      },
      include: {
        player: {
          select: { id: true, name: true, avatar: true },
        },
        annotations: {
          orderBy: { timestampMs: 'asc' },
        },
        highlights: {
          orderBy: { startMs: 'asc' },
        },
        exports: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!video) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    // Increment view count (best-effort, non-blocking)
    if (video.playerId !== session.user.id) {
      db.video.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {})
    }

    return NextResponse.json({ video })
  } catch (error) {
    console.error('[GET /api/videos/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/videos/[id] — Update video metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Verify ownership
    const existing = await db.video.findUnique({
      where: { id },
      select: { playerId: true },
    })

    if (!existing || existing.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length < 1) {
        return NextResponse.json({ error: 'Titre invalide' }, { status: 400 })
      }
      updates.title = body.title.trim().slice(0, 200)
    }

    if (body.description !== undefined) {
      updates.description = String(body.description).trim().slice(0, 2000)
    }

    if (body.thumbnailUrl !== undefined) {
      updates.thumbnailUrl = body.thumbnailUrl || null
    }

    if (body.durationSec !== undefined) {
      updates.durationSec = Math.max(0, parseInt(body.durationSec, 10) || 0)
    }

    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : String(body.tags)
    }

    if (body.isPublic !== undefined) {
      updates.isPublic = Boolean(body.isPublic)
    }

    const video = await db.video.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ video })
  } catch (error) {
    console.error('[PATCH /api/videos/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/videos/[id] — Delete video and file
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const video = await db.video.findUnique({
      where: { id },
      select: { playerId: true, url: true, thumbnailUrl: true },
    })

    if (!video || video.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    // Delete file from filesystem (best-effort)
    try {
      const publicDir = join(process.cwd(), 'public')
      if (video.url) {
        const filePath = join(publicDir, video.url)
        await unlink(filePath).catch(() => {})
      }
      if (video.thumbnailUrl) {
        const thumbPath = join(publicDir, video.thumbnailUrl)
        await unlink(thumbPath).catch(() => {})
      }
    } catch {
      // File deletion is best-effort
    }

    // Delete from DB (cascade handles annotations, highlights, exports)
    await db.video.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/videos/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}