import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { storage, ALLOWED_IMAGE_TYPES } from '@/lib/storage'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB

/**
 * POST /api/upload/feed
 *
 * Upload feed post images to Supabase Storage.
 * Accepts multiple images (up to 4).
 */
export const POST = withAuth(async (request, session) => {
  try {
    const rl = rateLimit(`feed-upload:${session.user.id}`, 5, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const formData = await request.formData()
    const files: File[] = []

    // Collect up to 4 files
    for (let i = 0; i < 4; i++) {
      const file = formData.get(`image${i}`) as File | null
      if (file) files.push(file)
    }

    // Also support single 'images' field
    if (files.length === 0) {
      const single = formData.get('images') as File | null
      if (single) files.push(single)
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'Au moins une image requise' }, { status: 400 })
    }

    if (files.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 images' }, { status: 400 })
    }

    const urls: string[] = []

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Type non autorisé: ${file.type}` },
          { status: 400 },
        )
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Image trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} Mo, max 10 Mo)` },
          { status: 400 },
        )
      }

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `feed/${session.user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

      const buffer = Buffer.from(await file.arrayBuffer())
      await storage.upload(path, buffer, {
        contentType: file.type,
        public: true,
      })

      let url: string
      if ('getPublicUrl' in storage) {
        url = (storage as unknown as { getPublicUrl: (p: string) => string }).getPublicUrl(path)
      } else {
        url = await storage.getSignedUrl(path, 86400 * 365)
      }

      urls.push(url)
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error('[Feed Upload] Error:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 },
    )
  }
})