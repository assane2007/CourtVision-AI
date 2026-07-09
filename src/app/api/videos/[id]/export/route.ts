import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

const VALID_EXPORT_TYPES = ['gif', 'mp4', 'webm']
const VALID_QUALITIES = ['low', 'medium', 'high']

// GET /api/videos/[id]/export — List exports for a video
export const GET = withAuth(async (request, session, { params }) => {
  try {

    const { id: videoId } = await params

    const exports_ = await db.videoExport.findMany({
      where: {
        videoId,
        playerId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ exports: exports_ })
  } catch (error) {
    trackError('[GET /api/videos/[id]/export]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// POST /api/videos/[id]/export — Start a new export job
export const POST = withAuth(async (request, session, { params }) => {
  try {

    const { id: videoId } = await params
    const body = await request.json()

    const { type, format, startMs, endMs, quality } = body

    const exportType = type || format || 'gif'
    if (!VALID_EXPORT_TYPES.includes(exportType)) {
      return NextResponse.json(
        { error: `Type invalide. Types acceptés : ${VALID_EXPORT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (quality && !VALID_QUALITIES.includes(quality)) {
      return NextResponse.json(
        { error: `Qualité invalide. Qualités acceptées : ${VALID_QUALITIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (typeof startMs !== 'number' || startMs < 0) {
      return NextResponse.json({ error: 'Temps de début invalide' }, { status: 400 })
    }

    if (typeof endMs !== 'number' || endMs <= startMs) {
      return NextResponse.json({ error: 'Temps de fin invalide' }, { status: 400 })
    }

    // Verify video ownership
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { playerId: true, durationSec: true },
    })

    if (!video || video.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    const videoExport = await db.videoExport.create({
      data: {
        videoId,
        playerId: session.user.id,
        type: exportType,
        format: exportType,
        status: 'pending',
      },
    })

    // Process export asynchronously (non-blocking)
    processExport(videoExport.id, videoId, session.user.id, {
      exportType,
      startMs,
      endMs,
      quality: quality || 'medium',
    }).catch((err) => {
      trackError(`[Export ${videoExport.id}] Failed`, err)
      db.videoExport.update({
        where: { id: videoExport.id },
        data: { status: 'failed' },
      }).catch(() => {})
    })

    return NextResponse.json({ export: videoExport }, { status: 201 })
  } catch (error) {
    trackError('[POST /api/videos/[id]/export]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// Async export processing (simulated — in production this would use ffmpeg)
async function processExport(
  exportId: string,
  videoId: string,
  playerId: string,
  options: {
    exportType: string
    startMs: number
    endMs: number
    quality: string
  }
) {
  // Mark as processing
  await db.videoExport.update({
    where: { id: exportId },
    data: { status: 'processing' },
  })

  // Simulate export processing time based on duration and quality
  const durationSec = (options.endMs - options.startMs) / 1000
  const qualityMultiplier = options.quality === 'high' ? 3 : options.quality === 'low' ? 0.5 : 1
  const processingTimeMs = Math.min(30000, Math.max(2000, durationSec * 500 * qualityMultiplier))

  await new Promise((resolve) => setTimeout(resolve, processingTimeMs))

  // For the demo, we create a placeholder URL
  // In production, this would use ffmpeg to actually create the GIF/clip
  const filename = `export_${exportId}.${options.exportType}`

  // Mark as completed
  await db.videoExport.update({
    where: { id: exportId },
    data: {
      status: 'completed',
      url: `/uploads/exports/${filename}`,
      fileSize: Math.round(durationSec * 500 * qualityMultiplier), // estimated size
      completedAt: new Date(),
    },
  })
}
