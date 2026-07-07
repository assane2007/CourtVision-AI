import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { settingsPatchSchema, getZodErrorMessage } from '@/lib/validations'
import { trackError } from '@/lib/monitoring'

// GET /api/settings — Get user preferences
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const player = await db.player.findUnique({
      where: { id: session.user.id },
      select: {
        weeklyGoalSessions: true,
        weeklyGoalReps: true,
        preferredRestSec: true,
        soundEnabled: true,
        hapticsEnabled: true,
        language: true,
        notifStreak: true,
        notifChallenge: true,
        notifAchievement: true,
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    return NextResponse.json({ settings: player })
  } catch (error) {
    trackError('GET /api/settings', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/settings — Update user preferences
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Prevent oversized request bodies
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10_000) {
    return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 })
  }

  const rateResult = rateLimit(`settings:patch:${session.user.email}`, 10, 15 * 60 * 1000)
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans 15 minutes.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = settingsPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { ...parsed.data }

    const player = await db.player.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        weeklyGoalSessions: true,
        weeklyGoalReps: true,
        preferredRestSec: true,
        soundEnabled: true,
        hapticsEnabled: true,
        language: true,
        notifStreak: true,
        notifChallenge: true,
        notifAchievement: true,
      },
    })

    return NextResponse.json({ settings: player })
  } catch (error) {
    trackError('PATCH /api/settings', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}