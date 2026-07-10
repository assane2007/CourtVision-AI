import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { storage, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/storage'

/**
 * POST /api/upload
 *
 * Upload a file to Supabase Storage (or configured backend).
 * Returns a public URL or signed URL for the uploaded file.
 */
export const POST = withAuth(async (request, session) => {
  try {
    const rl = rateLimit(`upload:${session.user.id}`, 10, 60 * 1000) // 10 per min
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'
    const publicAccess = formData.get('public') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    // Validate file type
    const allAllowed = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES])
    if (!allAllowed.has(file.type)) {
      return NextResponse.json(
        { error: `Type non autorisé: ${file.type}` },
        { status: 400 },
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} Mo)` },
        { status: 400 },
      )
    }

    // Generate unique path
    const ext = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const path = `${folder}/${session.user.id}/${timestamp}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload
    await storage.upload(path, buffer, {
      contentType: file.type,
      public: publicAccess,
    })

    // Generate URL
    let url: string
    if (publicAccess && 'getPublicUrl' in storage) {
      url = (storage as unknown as { getPublicUrl: (p: string) => string }).getPublicUrl(path)
    } else {
      url = await storage.getSignedUrl(path, 86400 * 365) // 1 year
    }

    return NextResponse.json({
      url,
      path,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 })
  }
})