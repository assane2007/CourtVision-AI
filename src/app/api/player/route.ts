import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const player = await db.player.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        position: true,
        level: true,
        goals: true,
        onboarding: true,
        avatar: true,
        createdAt: true,
      }
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })
    }

    return NextResponse.json(player)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { name, position, level, goals, avatar, onboarding } = body

    const player = await db.player.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(position !== undefined && { position }),
        ...(level !== undefined && { level }),
        ...(goals !== undefined && { goals }),
        ...(avatar !== undefined && { avatar }),
        ...(onboarding !== undefined && { onboarding }),
      },
      select: {
        id: true, email: true, name: true, position: true,
        level: true, goals: true, onboarding: true, avatar: true,
      }
    })

    return NextResponse.json(player)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}