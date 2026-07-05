import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/drills — List all drills (seed + user's own custom)
// Query params: ?category=shooting&difficulty=beginner&search=dribble&favoritesOnly=true
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')?.trim()
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true'
    const customOnly = searchParams.get('customOnly') === 'true'

    // Base filter: seed drills (no owner) + user's custom drills
    const baseWhere: Record<string, unknown> = {
      AND: [
        { isActive: true },
        {
          OR: [
            { playerId: null },      // seed drills
            { playerId: session.user.id }, // user's custom drills
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

    const drills = await db.drill.findMany({
      where: baseWhere as any,
      orderBy: [{ isCustom: 'asc' }, { category: 'asc' }, { difficulty: 'asc' }],
    })

    // Fetch user's favorites in one query
    const favorites = favoritesOnly
      ? await db.drillFavorite.findMany({
          where: { playerId: session.user.id, drillId: { in: drills.map(d => d.id) } },
          select: { drillId: true },
        })
      : await db.drillFavorite.findMany({
          where: { playerId: session.user.id },
          select: { drillId: true },
        })

    const favoriteIds = new Set(favorites.map(f => f.drillId))

    // If favoritesOnly, filter drills server-side
    const filteredDrills = favoritesOnly
      ? drills.filter(d => favoriteIds.has(d.id))
      : drills

    return NextResponse.json({
      drills: filteredDrills,
      favoriteIds: [...favoriteIds],
      total: filteredDrills.length,
    })
  } catch (error) {
    console.error('[GET /api/drills]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}