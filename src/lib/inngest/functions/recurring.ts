/**
 * Inngest recurring (cron) functions for scheduled background tasks.
 *
 * - `weeklyPlayerReport`: Every Monday at 09:00 UTC — triggers insight
 *   refresh for all players active in the last 7 days.
 *
 * - `staleSessionCleanup`: Daily at 03:00 UTC — marks sessions without
 *   an `endedAt` timestamp that have been idle for 24+ hours as abandoned.
 */

import { inngest } from '@/lib/inngest/client'
import { db } from '@/lib/db'

// ── Weekly Player Report ──────────────────────────────────────────────────────

export const weeklyPlayerReport = inngest.createFunction(
  {
    id: 'weekly-player-report',
    name: 'Weekly Player Report',
    retries: 2,
  },
  { cron: '0 9 * * 1' },
  async ({ step }) => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const activePlayers = await step.run('fetch-active-players', async () => {
      const players = await db.player.findMany({
        where: {
          lastActivityDate: { gte: sevenDaysAgo },
          accountDeleted: false,
        },
        select: { id: true, name: true, email: true },
      })
      return players
    })

    if (activePlayers.length === 0) {
      console.warn('[inngest:cron] No active players found for weekly report')
      return { triggered: 0 }
    }

    await step.run('trigger-insight-refreshes', async () => {
      const promises = activePlayers.map((player) =>
        inngest.send({
          name: 'insight.refresh.requested',
          data: { playerId: player.id, force: true },
        }),
      )
      await Promise.allSettled(promises)
    })

    console.warn(
      `[inngest:cron] Triggered weekly insight refresh for ${activePlayers.length} active players`,
    )

    return { triggered: activePlayers.length }
  },
)

// ── Stale Session Cleanup ─────────────────────────────────────────────────────

export const staleSessionCleanup = inngest.createFunction(
  {
    id: 'stale-session-cleanup',
    name: 'Stale Session Cleanup',
    retries: 2,
  },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const abandonedCount = await step.run('mark-stale-sessions', async () => {
      const result = await db.workoutSession.updateMany({
        where: {
          endedAt: null,
          startedAt: { lte: twentyFourHoursAgo },
        },
        data: {
          endedAt: new Date(),
        },
      })
      return result.count
    })

    console.warn(
      `[inngest:cron] Marked ${abandonedCount} stale session(s) as ended`,
    )

    return { abandonedSessions: abandonedCount }
  },
)