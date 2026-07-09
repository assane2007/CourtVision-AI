import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { unlink } from 'fs/promises'
import path from 'path'
import { withAuth } from '@/lib/with-auth'

// GET /api/videos/[id] — Get single video with annotations & highlights
export const GET = withAuth(async (request, session, { params }) => {
  try {

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
    trackError('[GET /api/videos/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// PATCH /api/videos/[id] — Update video metadata
export const PATCH = withAuth(async (request, session, { params }) => {
  try {

    const { id } = await params
    const body = await request.json()

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
    trackError('[PATCH /api/videos/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// DELETE /api/videos/[id] — Delete video and file
export const DELETE = withAuth(async (request, session, { params }) => {
  try {

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
      const publicDir = path.resolve(process.cwd(), 'public')
      if (video.url) {
        const filePath = path.resolve(publicDir, video.url)
        if (!filePath.startsWith(path.resolve(publicDir))) {
          return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
        }
        await unlink(filePath).catch(() => {})
      }
      if (video.thumbnailUrl) {
        const thumbPath = path.resolve(publicDir, video.thumbnailUrl)
        if (!thumbPath.startsWith(path.resolve(publicDir))) {
          return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
        }
        await unlink(thumbPath).catch(() => {})
      }
    } catch {
      // File deletion is best-effort
    }

    // Delete from DB (cascade handles annotations, highlights, exports)
    await db.video.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    trackError('[DELETE /api/videos/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
