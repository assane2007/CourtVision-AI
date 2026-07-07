import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'

const VALID_LANGUAGES = ['fr', 'en']

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

  const rateResult = rateLimit(`settings:patch:${session.user.email}`, 20, 15 * 60 * 1000)
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans 15 minutes.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const updateData: Record<string, unknown> = {}

    // Validate and collect update fields
    if (body.weeklyGoalSessions !== undefined) {
      const val = Math.round(Number(body.weeklyGoalSessions))
      if (val < 1 || val > 14 || isNaN(val)) {
        return NextResponse.json({ error: 'Objectif hebdomadaire invalide (1-14)' }, { status: 400 })
      }
      updateData.weeklyGoalSessions = val
    }

    if (body.weeklyGoalReps !== undefined) {
      const val = Math.round(Number(body.weeklyGoalReps))
      if (val < 10 || val > 500 || isNaN(val)) {
        return NextResponse.json({ error: 'Objectif de répétitions invalide (10-500)' }, { status: 400 })
      }
      updateData.weeklyGoalReps = val
    }

    if (body.preferredRestSec !== undefined) {
      const val = Math.round(Number(body.preferredRestSec))
      if (![10, 15, 30, 45, 60, 90, 120].includes(val)) {
        return NextResponse.json({ error: 'Durée de repos invalide' }, { status: 400 })
      }
      updateData.preferredRestSec = val
    }

    if (body.soundEnabled !== undefined) {
      updateData.soundEnabled = !!body.soundEnabled
    }

    if (body.hapticsEnabled !== undefined) {
      updateData.hapticsEnabled = !!body.hapticsEnabled
    }

    if (body.language !== undefined) {
      if (!VALID_LANGUAGES.includes(body.language)) {
        return NextResponse.json({ error: 'Langue invalide' }, { status: 400 })
      }
      updateData.language = body.language
    }

    if (body.notifStreak !== undefined) {
      updateData.notifStreak = !!body.notifStreak
    }

    if (body.notifChallenge !== undefined) {
      updateData.notifChallenge = !!body.notifChallenge
    }

    if (body.notifAchievement !== undefined) {
      updateData.notifAchievement = !!body.notifAchievement
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

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