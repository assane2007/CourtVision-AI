import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { db } from '@/lib/db'

/**
 * POST /api/auth/supabase/sync
 *
 * Ensures a Player record exists for the authenticated Supabase user.
 * Called automatically by the SupabaseAuthProvider on auth state change.
 * The player ID in the Player table matches the Supabase user's `sub` (UUID).
 */
export const POST = withAuth(async (_req, session) => {
  const playerId = session.user.id

  // Check if Player already exists
  const existing = await db.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  })

  if (existing) {
    // Already synced — return existing player
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { id: true, email: true, name: true, onboarding: true },
    })
    return NextResponse.json({ player, synced: false })
  }

  // Create new Player record
  const playerName = session.user.name || session.user.email.split('@')[0] || 'Joueur'

  const player = await db.$transaction(async (tx) => {
    const newPlayer = await tx.player.create({
      data: {
        id: playerId,
        email: session.user.email,
        password: '__supabase_managed__', // Password is managed by Supabase
        name: playerName,
      },
    })

    // Auto-grant first_login achievement
    await tx.achievement.create({
      data: {
        playerId: newPlayer.id,
        type: 'first_login',
        title: 'Premier Pas',
        description: 'Vous avez créé votre compte',
        icon: '🏀',
      },
    })

    return newPlayer
  })

  return NextResponse.json({ player, synced: true }, { status: 201 })
})