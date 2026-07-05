import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateProfileSchema, getZodErrorMessage } from '@/lib/validations'

// GET /api/player — Get current user's profile
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
        _count: {
          select: {
            sessions: true,
            favorites: true,
            customDrills: true,
            trainingPlans: true,
          },
        },
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })
    }

    return NextResponse.json(player)
  } catch (error) {
    console.error('[GET /api/player]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/player — Update profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updateData[key] = value
    }

    const player = await db.player.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true, email: true, name: true, position: true,
        level: true, goals: true, onboarding: true, avatar: true,
      },
    })

    return NextResponse.json(player)
  } catch (error) {
    console.error('[PATCH /api/player]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/player — Delete account and all associated data
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Cascade will handle sessions, favorites, achievements, custom drills, training plans
    await db.player.delete({ where: { id: session.user.id } })

    return NextResponse.json({ success: true, message: 'Compte supprimé' })
  } catch (error) {
    console.error('[DELETE /api/player]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}