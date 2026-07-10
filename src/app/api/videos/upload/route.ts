import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { storage, ALLOWED_VIDEO_TYPES } from '@/lib/storage'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500 MB

/**
 * POST /api/videos/upload
 *
 * Upload a video file to Supabase Storage (or configured backend).
 * Returns the storage path and a public/signed URL.
 */
export const POST = withAuth(async (request, session) => {
  try {
    const rl = rateLimit(`video-upload:${session.user.id}`, 5, 60 * 1000) // 5 per min
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const thumbnail = formData.get('thumbnail') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Fichier vidéo requis' }, { status: 400 })
    }

    // Validate video type
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Type non autorisé: ${file.type}. Utilisez MP4, WebM, MOV ou AVI.` },
        { status: 400 },
      )
    }

    // Validate size
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(0)} Mo, max 500 Mo)` },
        { status: 400 },
      )
    }

    // Generate unique path for video
    const ext = file.name.split('.').pop() || 'mp4'
    const timestamp = Date.now()
    const videoPath = `videos/${session.user.id}/${timestamp}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    // Upload video
    const videoBuffer = Buffer.from(await file.arrayBuffer())
    await storage.upload(videoPath, videoBuffer, {
      contentType: file.type,
      public: false,
    })

    // Generate video URL
    let videoUrl: string
    if ('getPublicUrl' in storage) {
      videoUrl = (storage as unknown as { getPublicUrl: (p: string) => string }).getPublicUrl(videoPath)
    } else {
      videoUrl = await storage.getSignedUrl(videoPath, 86400 * 365)
    }

    // Upload thumbnail if provided
    let thumbnailUrl: string | null = null
    if (thumbnail) {
      const thumbExt = thumbnail.name.split('.').pop() || 'jpg'
      const thumbPath = `thumbnails/${session.user.id}/${timestamp}-thumb.${thumbExt}`
      const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer())
      await storage.upload(thumbPath, thumbBuffer, {
        contentType: thumbnail.type,
        public: false,
      })
      thumbnailUrl = await storage.getSignedUrl(thumbPath, 86400 * 365)
    }

    return NextResponse.json({
      url: videoUrl,
      path: videoPath,
      thumbnailUrl,
      size: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error('[Video Upload] Error:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload de la vidéo" },
      { status: 500 },
    )
  }
})