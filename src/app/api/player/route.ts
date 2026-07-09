import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updateProfileSchema, getZodErrorMessage } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { trackError } from '@/lib/monitoring'
import { withAuth } from '@/lib/with-auth'

// GET /api/player — Get current user's profile, or another player's public profile via ?id=xxx
export const GET = withAuth(async (request, session) => {
  try {

    const { searchParams } = new URL(request.url)
    const targetId = searchParams.get('id')

    // If an ID is provided, fetch that player's public profile
    if (targetId) {
      const rl = rateLimit(`player:get:${session.user.id}`, 30, 15 * 60 * 1000)
      if (!rl.success) {
        return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 })
      }

      const player = await db.player.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          name: true,
          bio: true,
          position: true,
          level: true,
          avatar: true,
          coverPhoto: true,
          xp: true,
          xpLevel: true,
          city: true,
          country: true,
          createdAt: true,
          profilePublic: true,
          showActivity: true,
          sessions: {
            select: { id: true, totalScore: true, totalReps: true, totalDrills: true, startedAt: true },
            take: 20,
            orderBy: { startedAt: 'desc' },
          },
        },
      })

      if (!player) {
        return NextResponse.json({ error: 'Joueur non trouvé' }, { status: 404 })
      }

      // Privacy: remove sessions if profile is not public
      if (!player.profilePublic) {
        const { sessions: _sessions, ...publicPlayer } = player
        return NextResponse.json(publicPlayer)
      }
      // Privacy: remove sessions if user hides activity
      if (!player.showActivity && player.sessions) {
        const { sessions: _sessions, ...publicPlayer } = player
        return NextResponse.json(publicPlayer)
      }

      return NextResponse.json(player)
    }

    // Default: fetch current user's profile
    const rl = rateLimit(`player:get:${session.user.id}`, 30, 15 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
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
        xp: true,
        xpLevel: true,
        subscriptionStatus: true,
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
    trackError('GET /api/player', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// PATCH /api/player — Update profile
export const PATCH = withAuth(async (req: NextRequest, session) => {
  try {

    const rateResult = rateLimit(`player:patch:${session.user.email}`, 20, 15 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
        { status: 429 }
      )
    }

    // Check content-length before parsing body
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 1_000_000) {
      return NextResponse.json({ error: 'Requête trop volumineuse' }, { status: 413 })
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
    trackError('PATCH /api/player', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})

// DELETE /api/player — Delete account and all associated data (requires confirmation)
export const DELETE = withAuth(async (req: NextRequest, session) => {
  try {

    // Strict rate limit: 5 attempts per hour for account deletion
    const rateResult = rateLimit(`player:delete:${session.user.email}`, 5, 60 * 60 * 1000)
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de tentatives de suppression. Réessayez plus tard.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    if (body.confirmDelete !== true) {
      return NextResponse.json(
        { error: 'Confirmation requise. Envoyez { confirmDelete: true } pour supprimer votre compte.' },
        { status: 400 }
      )
    }

    // Cascade will handle sessions, favorites, achievements, custom drills, training plans
    await db.player.delete({ where: { id: session.user.id } })

    return NextResponse.json({ success: true, message: 'Compte supprimé' })
  } catch (error) {
    trackError('DELETE /api/player', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
