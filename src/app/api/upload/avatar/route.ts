import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimit } from '@/lib/rate-limit'
import { storage, ALLOWED_IMAGE_TYPES } from '@/lib/storage'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * POST /api/upload/avatar
 *
 * Upload a user avatar image to Supabase Storage.
 * Updates the player's avatar URL in the database.
 */
export const POST = withAuth(async (request, session) => {
  try {
    const rl = rateLimit(`avatar-upload:${session.user.id}`, 3, 60 * 1000) // 3 per min
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Image requise' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Type non autorisé: ${file.type}. Utilisez JPEG, PNG, GIF ou WebP.` },
        { status: 400 },
      )
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: `Image trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} Mo, max 5 Mo)` },
        { status: 400 },
      )
    }

    // Generate path
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `avatars/${session.user.id}/${Date.now()}.${ext}`

    // Upload
    const buffer = Buffer.from(await file.arrayBuffer())
    await storage.upload(path, buffer, {
      contentType: file.type,
      public: true,
    })

    // Get public URL
    let url: string
    if ('getPublicUrl' in storage) {
      url = (storage as unknown as { getPublicUrl: (p: string) => string }).getPublicUrl(path)
    } else {
      url = await storage.getSignedUrl(path, 86400 * 365)
    }

    // Update player avatar in database
    const { db } = await import('@/lib/db')
    await db.player.update({
      where: { id: session.user.id },
      data: { avatar: url },
    })

    return NextResponse.json({ url, path })
  } catch (error) {
    console.error('[Avatar Upload] Error:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload de l'avatar" },
      { status: 500 },
    )
  }
})