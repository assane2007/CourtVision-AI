import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import { rateLimit } from '@/lib/rate-limit'
import { syncPushSchema, getZodErrorMessage } from '@/lib/validations'

// POST /api/sync/push
// Receive offline actions from client, process them (last-write-wins)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const playerId = session.user.id

    const rl = rateLimit(`sync-push:${session.user.id}`, 10, 60 * 1000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = syncPushSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 })
    }

    const { actions, deviceId } = parsed.data

    const results: { id: string; status: 'synced' | 'failed'; error?: string }[] = []

    for (const action of actions) {
      const { id, type, payload, createdAt } = action

      try {
        // Process the action based on type (last-write-wins)
        switch (type) {
          case 'session_save': {
            // Session data is created server-side, just track the sync
            break
          }
          case 'drill_favorite': {
            const p = payload as { drillId?: string; favorited?: boolean } | undefined
            if (p?.drillId && typeof p.favorited === 'boolean') {
              if (p.favorited) {
                await db.drillFavorite.upsert({
                  where: { playerId_drillId: { playerId, drillId: p.drillId } },
                  create: { playerId, drillId: p.drillId },
                  update: {},
                })
              } else {
                await db.drillFavorite.deleteMany({
                  where: { playerId, drillId: p.drillId },
                })
              }
            }
            break
          }
          case 'settings_update': {
            // Merge settings with existing
            if (payload && typeof payload === 'object') {
              const updateData: Record<string, unknown> = {}
              const allowedKeys = [
                'weeklyGoalSessions', 'weeklyGoalReps', 'preferredRestSec',
                'soundEnabled', 'hapticsEnabled', 'language',
                'notifStreak', 'notifChallenge', 'notifAchievement',
                'notifSocial', 'notifMessage',
                'profilePublic', 'showOnLeaderboard', 'showActivity',
              ]
              for (const key of allowedKeys) {
                if (key in payload) {
                  updateData[key] = payload[key]
                }
              }
              if (Object.keys(updateData).length > 0) {
                await db.player.update({
                  where: { id: playerId },
                  data: updateData,
                })
              }
            }
            break
          }
          default:
            // Unknown action type — log and skip
            console.warn(`[SYNC] Unknown action type: ${type}`)
        }

        // Record the offline action in DB
        await db.offlineAction.create({
          data: {
            playerId,
            deviceId,
            type,
            payload: JSON.stringify(payload),
            status: 'synced',
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            syncedAt: new Date(),
          },
        })

        results.push({ id: id || `gen-${Date.now()}`, status: 'synced' })
      } catch (actionError) {
        console.error(`[SYNC] Failed to process action ${type}:`, actionError)

        // Record failed action
        await db.offlineAction.create({
          data: {
            playerId,
            deviceId,
            type,
            payload: JSON.stringify(payload),
            status: 'failed',
            createdAt: createdAt ? new Date(createdAt) : new Date(),
          },
        })

        results.push({
          id: id || `gen-${Date.now()}`,
          status: 'failed',
          error: String(actionError),
        })
      }
    }

    const synced = results.filter((r) => r.status === 'synced').length
    const failed = results.filter((r) => r.status === 'failed').length

    return NextResponse.json({
      message: 'Synchronisation terminée',
      synced,
      failed,
      results,
    })
  } catch (error) {
    trackError('POST /api/sync/push', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}