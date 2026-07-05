import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const drills = await db.drill.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    })

    const favorites = await db.drillFavorite.findMany({
      where: { playerId: session.user.id },
      select: { drillId: true },
    })

    const favoriteIds = new Set(favorites.map(f => f.drillId))

    return NextResponse.json({
      drills,
      favoriteIds: [...favoriteIds],
    })
  } catch (error) {
    console.error('Drills fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}