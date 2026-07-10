import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { withCache } from '@/lib/cache'
import { trackError } from '@/lib/monitoring'
import { Prisma } from '@prisma/client'

// GET /api/drills — List drills with cursor-based pagination (seed + user's own custom)
// Query params: ?cursor=xxx&limit=20&category=shooting&difficulty=beginner&search=dribble&favoritesOnly=true
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser()
    const playerId = user?.id ?? null

    // IP-based rate limit (optional auth)
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rl = rateLimit(`drills:get:${ip}`, 60, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
    const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')?.trim()
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true'
    const customOnly = searchParams.get('customOnly') === 'true'

    // Build a cache key from query params + playerId
    const cacheKey = `drills:${playerId || 'anon'}:${cursor || ''}:${limit}:${category || 'all'}:${difficulty || 'all'}:${search || ''}:${favoritesOnly}:${customOnly}`

    const orderBy = [{ isCustom: 'asc' as const }, { category: 'asc' as const }, { difficulty: 'asc' as const }]

    const result = await withCache(cacheKey, 5 * 60 * 1000, async () => {
      // Build typed Prisma filter using proper types
      const andFilters: Prisma.DrillWhereInput[] = [
        { isActive: true },
        {
          OR: [
            { playerId: null },
            ...(playerId ? [{ playerId }] : []),
          ],
        },
      ]

      if (category && category !== 'all') {
        andFilters.push({ category })
      }
      if (difficulty) {
        andFilters.push({ difficulty })
      }
      if (search) {
        andFilters.push({
          OR: [
            { nameFr: { contains: search } },
            { name: { contains: search } },
            { descriptionFr: { contains: search } },
          ],
        })
      }
      if (customOnly) {
        andFilters.push({ isCustom: true })
      }

      const baseWhere: Prisma.DrillWhereInput = { AND: andFilters }

      // Cursor: use id-based cursor (lexicographic for SQLite)
      const cursorWhere: Prisma.DrillWhereInput = cursor
        ? { AND: [...andFilters, { id: { gt: cursor } }] }
        : baseWhere

      // Fetch one extra to know if there's a next page
      const drills = await db.drill.findMany({
        where: cursorWhere,
        orderBy,
        take: limit + 1,
      })

      const hasMore = drills.length > limit
      const pageDrills = hasMore ? drills.slice(0, limit) : drills
      const nextCursor = hasMore ? pageDrills[pageDrills.length - 1].id : null

      // Total count (only on first page to avoid redundant queries on subsequent pages)
      let total: number | undefined
      if (!cursor) {
        total = await db.drill.count({ where: baseWhere })
      }

      // Fetch user's favorites in one query
      const favorites = playerId
        ? favoritesOnly
          ? await db.drillFavorite.findMany({
              where: { playerId, drillId: { in: pageDrills.map(d => d.id) } },
              select: { drillId: true },
            })
          : await db.drillFavorite.findMany({
              where: { playerId, drillId: { in: pageDrills.map(d => d.id) } },
              select: { drillId: true },
            })
        : []

      const favoriteIds = new Set(favorites.map(f => f.drillId))

      return {
        drills: pageDrills.map(d => ({
          id: d.id,
          name: d.nameFr || d.name,
          nameEn: d.name,
          category: d.category,
          difficulty: d.difficulty,
          description: d.descriptionFr || d.description,
          descriptionEn: d.description,
          instructions: d.instructionsFr || d.instructions,
          instructionsEn: d.instructions,
          durationSec: d.durationSec,
          targetReps: d.targetReps,
          icon: d.icon,
          isCustom: d.isCustom,
          isFavorite: favoriteIds.has(d.id),
        })),
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