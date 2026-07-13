import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackError } from '@/lib/monitoring';

// GET /api/sync/pull
// Pull latest data from server for offline caching
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient(); const { data: { user }, error: _error } = await supabase.auth.getUser()
    if (_error || !user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = user.id
    const url = new URL(request.url)
    const sinceParam = url.searchParams.get('since')
    const since = sinceParam ? new Date(sinceParam) : new Date(0)

    // Fetch player profile
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        level: true,
        goals: true,
        xp: true,
        xpLevel: true,
        avatar: true,
        emailVerified: true,
        twoFactorEnabled: true,
        profilePublic: true,
        showOnLeaderboard: true,
        showActivity: true,
        language: true,
        soundEnabled: true,
        hapticsEnabled: true,
        weeklyGoalSessions: true,
        weeklyGoalReps: true,
        preferredRestSec: true,
        notifStreak: true,
        notifChallenge: true,
        notifAchievement: true,
        notifSocial: true,
        notifMessage: true,
        updatedAt: true,
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 })
    }

    // Fetch all independent data in parallel
    const [sessions, achievements, favorites, pendingActions] = await Promise.all([
      // Recent sessions (since the given date)
      db.workoutSession.findMany({
        where: {
          playerId,
          updatedAt: { gt: since },
        },
        include: {
          drills: {
            include: {
              drill: {
                select: { id: true, name: true, nameFr: true, category: true, icon: true },
              },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 50,
      }),

      // Recent achievements
      db.achievement.findMany({
        where: {
          playerId,
          unlockedAt: { gt: since },
        },
        orderBy: { unlockedAt: 'desc' },
      }),

      // Favorite drills
      db.drillFavorite.findMany({
        where: { playerId },
        select: { drillId: true, createdAt: true },
      }),

      // Pending offline actions
      db.offlineAction.count({
        where: { playerId, status: 'pending' },
      }),
    ])

    return NextResponse.json({
      player,
      sessions,
      achievements,
      favorites: favorites.map((f) => f.drillId),
      pendingActions,
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    trackError('GET /api/sync/pull', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}