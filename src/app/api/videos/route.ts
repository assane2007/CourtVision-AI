import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// GET /api/videos — List user's videos with filters
export const GET = withAuth(async (req: NextRequest, session) => {
  try {

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const tag = searchParams.get('tag') || ''
    const privacy = searchParams.get('privacy') || '' // 'public' | 'private'
    const sortBy = searchParams.get('sortBy') || 'createdAt' // createdAt | title | durationSec | viewCount
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const cursor = searchParams.get('cursor') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    const where: Record<string, unknown> = { playerId: session.user.id }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (tag) {
      where.tags = { contains: tag }
    }

    if (privacy === 'public') where.isPublic = true
    else if (privacy === 'private') where.isPublic = false

    const orderBy: Record<string, string> = {}
    orderBy[sortBy] = sortOrder

    const videos = await db.video.findMany({
      where: {
        ...where,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy,
      take: limit + 1,
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        thumbnailUrl: true,
        durationSec: true,
        fileSize: true,
        mimeType: true,
        width: true,
        height: true,
        isPublic: true,
        viewCount: true,
        tags: true,
        createdAt: true,
        _count: {
          select: { annotations: true, highlights: true, exports: true },
        },
      },
    })

    const hasMore = videos.length > limit
    const items = hasMore ? videos.slice(0, -1) : videos

    return NextResponse.json({
      videos: items,
      nextCursor: hasMore ? items[items.length - 1]?.createdAt.toISOString() : null,
      total: await db.video.count({ where }),
    })
  } catch (error) {
    trackError('[GET /api/videos]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// POST /api/videos — Create video metadata (after file is uploaded via /upload)
export const POST = withAuth(async (req: NextRequest, session) => {
  try {

    const body = await req.json()
    const { title, description, url, thumbnailUrl, durationSec, fileSize, mimeType, width, height, tags, isPublic } = body

    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
    }
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL de la vidéo requise' }, { status: 400 })
    }
    // Accept local, Supabase, or any valid HTTP(S) URL
    const isValidUrl = url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')
    if (!isValidUrl) {
      return NextResponse.json({ error: 'URL de vidéo invalide' }, { status: 400 })
    }

    const parsedTags = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? tags : '[]')

    const video = await db.video.create({
      data: {
        playerId: session.user.id,
        title: title.trim().slice(0, 200),
        description: (description || '').trim().slice(0, 2000),
        url,
        thumbnailUrl: thumbnailUrl || null,
        durationSec: Math.max(0, parseInt(durationSec, 10) || 0),
        fileSize: Math.max(0, parseInt(fileSize, 10) || 0),
        mimeType: mimeType || 'video/mp4',
        width: Math.max(0, parseInt(width, 10) || 0),
        height: Math.max(0, parseInt(height, 10) || 0),
        tags: parsedTags,
        isPublic: typeof isPublic === 'boolean' ? isPublic : false,
      },
    })

    return NextResponse.json({ video }, { status: 201 })
  } catch (error) {
    trackError('[POST /api/videos]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
