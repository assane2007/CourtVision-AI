import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { withCache } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'

// GET /api/drills — List drills with cursor-based pagination (seed + user's own custom)
// Query params: ?cursor=xxx&limit=20&category=shooting&difficulty=beginner&search=dribble&favoritesOnly=true
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const playerId = session?.user?.id ?? null

    // IP-based rate limit (optional auth)
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rl = rateLimit(`drills:${ip}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
    const limit = Math.min(Math.max(rawLimit, 1), 100)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')?.trim()
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true'
    const customOnly = searchParams.get('customOnly') === 'true'

    // Build a cache key from query params + playerId
    const cacheKey = `drills:${playerId || 'anon'}:${cursor || ''}:${limit}:${category || 'all'}:${difficulty || 'all'}:${search || ''}:${favoritesOnly}:${customOnly}`

    const result = await withCache(cacheKey, 5 * 60 * 1000, async () => {
      // Base filter: seed drills (no owner) + user's custom drills
      const baseWhere: Record<string, unknown> = {
        AND: [
          { isActive: true },
          {
            OR: [
              { playerId: null },      // seed drills
              ...(playerId ? [{ playerId }] : []),
            ],
          },
        ],
      }

      if (category && category !== 'all') {
        ;(baseWhere.AND as unknown[]).push({ category })
      }
      if (difficulty) {
        ;(baseWhere.AND as unknown[]).push({ difficulty })
      }
      if (search) {
        ;(baseWhere.AND as unknown[]).push({
          OR: [
            { nameFr: { contains: search } },
            { name: { contains: search } },
            { descriptionFr: { contains: search } },
          ],
        })
      }
      if (customOnly) {
        ;(baseWhere.AND as unknown[]).push({ isCustom: true })
      }

      const orderBy = [{ isCustom: 'asc' as const }, { category: 'asc' as const }, { difficulty: 'asc' as const }]

      // Cursor: use id-based cursor (lexicographic for SQLite)
      const cursorWhere = cursor
        ? { ...baseWhere, AND: [...(baseWhere.AND as unknown[]), { id: { gt: cursor } }] }
        : baseWhere

      // Fetch one extra to know if there's a next page
      const drills = await db.drill.findMany({
        where: cursorWhere as any,
        orderBy,
        take: limit + 1,
      })

      const hasMore = drills.length > limit
      const pageDrills = hasMore ? drills.slice(0, limit) : drills
      const nextCursor = hasMore ? pageDrills[pageDrills.length - 1].id : null

      // Total count (only on first page to avoid redundant queries on subsequent pages)
      let total: number | undefined
      if (!cursor) {
        total = await db.drill.count({ where: baseWhere as any })
      }

      // Fetch user's favorites in one query
      const favorites = playerId
        ? favoritesOnly
          ? await db.drillFavorite.findMany({
              where: { playerId, drillId: { in: pageDrills.map(d => d.id) } },
              select: { drillId: true },
            })
          : await db.drillFavorite.findMany({
              where: { playerId },
              select: { drillId: true },
            })
        : []

      const favoriteIds = new Set(favorites.map(f => f.drillId))

      // If favoritesOnly, filter drills server-side
      const filteredDrills = favoritesOnly
        ? pageDrills.filter(d => favoriteIds.has(d.id))
        : pageDrills

      return {
        drills: filteredDrills,
        favoriteIds: [...favoriteIds],
        nextCursor,
        total,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    trackError('GET /api/drills', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}