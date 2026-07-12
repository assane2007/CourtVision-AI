/**
 * GET  /api/admin/users?search=...&limit=...&cursor=...
 * PATCH /api/admin/users  { action, playerId, ... }
 *
 * Admin-only user management endpoints.
 */

import { NextResponse } from 'next/server'
import { withAdminGuard } from '@/lib/guards/admin.guard'
import { db } from '@/lib/db'

// ── GET: Search / list users ────────────────────────────────────────────────────

export const GET = withAdminGuard(async (req) => {
  try {
    const { searchParams } = req.nextUrl
    const search = searchParams.get('search') || ''
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 50)
    const cursor = searchParams.get('cursor') || undefined

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const players = await db.player.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        lastActivityDate: true,
        xp: true,
        xpLevel: true,
        videosCount: true,
        sessions: { select: { id: true }, take: 1 },
      },
    })

    const hasMore = players.length > limit
    const data = hasMore ? players.slice(0, limit) : players
    const nextCursor = hasMore ? data[data.length - 1].id : null

    // Enrich with session count
    const enriched = data.map((p) => ({
      ...p,
      workoutCount: p.sessions.length,
      sessions: undefined,
    }))

    return NextResponse.json({
      data: enriched,
      pagination: { nextCursor, hasMore, limit },
    })
  } catch (error) {
    console.error('[admin/users] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// ── PATCH: Admin actions on users ───────────────────────────────────────────────

export const PATCH = withAdminGuard(async (req) => {
  try {
    const body = await req.json()
    const { action, playerId } = body

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    switch (action) {
      case 'toggle_subscription': {
        const player = await db.player.findUnique({
          where: { id: playerId },
          select: { subscriptionStatus: true },
        })
        if (!player) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 })
        }
        const newStatus = player.subscriptionStatus === 'free' ? 'pro' : 'free'
        const updated = await db.player.update({
          where: { id: playerId },
          data: {
            subscriptionStatus: newStatus,
            ...(newStatus === 'pro'
              ? { subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
              : { subscriptionExpiresAt: null, subscriptionId: null }),
          },
          select: { id: true, email: true, subscriptionStatus: true, subscriptionExpiresAt: true },
        })
        return NextResponse.json(updated)
      }

      case 'toggle_role': {
        const player = await db.player.findUnique({
          where: { id: playerId },
          select: { role: true },
        })
        if (!player) {
          return NextResponse.json({ error: 'Player not found' }, { status: 404 })
        }
        const newRole = player.role === 'admin' ? 'user' : 'admin'
        const updated = await db.player.update({
          where: { id: playerId },
          data: { role: newRole },
          select: { id: true, email: true, role: true },
        })
        return NextResponse.json(updated)
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('[admin/users] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})