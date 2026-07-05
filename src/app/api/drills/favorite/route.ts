import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { drillId } = await req.json()
    if (!drillId) {
      return NextResponse.json({ error: 'Drill ID requis' }, { status: 400 })
    }

    const existing = await db.drillFavorite.findUnique({
      where: { playerId_drillId: { playerId: session.user.id, drillId } }
    })

    if (existing) {
      await db.drillFavorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ favorited: false })
    } else {
      await db.drillFavorite.create({
        data: { playerId: session.user.id, drillId }
      })
      return NextResponse.json({ favorited: true })
    }
  } catch (error) {
    console.error('Favorite toggle error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}