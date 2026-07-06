import { db } from '@/lib/db'

// In-memory notification queue for scheduled reminders
// In production, this would use a proper job queue (BullMQ, etc.)
const notificationQueue: Array<{
  playerId: string
  type: 'streak' | 'achievement' | 'challenge'
  title: string
  body: string
  tag: string
  scheduledAt: Date
}> = []

/**
 * Schedule a streak reminder notification for the next day.
 * Stores the intent in the in-memory queue for later dispatch.
 */
export function scheduleStreakReminder(playerId: string, streakCount: number): void {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0) // 9:00 AM

  notificationQueue.push({
    playerId,
    type: 'streak',
    title: 'CourtVision AI',
    body: `Ta série est à ${streakCount} jour(s) ! Ne la perd pas — entraîne-toi aujourd'hui.`,
    tag: `streak-reminder-${playerId}`,
    scheduledAt: tomorrow,
  })

  console.log(
    `[notify] Streak reminder scheduled for player ${playerId} — ${streakCount} day streak, fires at ${tomorrow.toISOString()}`
  )
}

/**
 * Trigger an achievement notification immediately.
 * In production, this would send via web-push.
 */
export function notifyAchievement(playerId: string, title: string): void {
  notificationQueue.push({
    playerId,
    type: 'achievement',
    title: '🏆 Succès débloqué !',
    body: title,
    tag: `achievement-${playerId}-${Date.now()}`,
    scheduledAt: new Date(), // immediate
  })

  console.log(`[notify] Achievement notification queued for player ${playerId}: ${title}`)
}

/**
 * Trigger a challenge update notification immediately.
 * In production, this would send via web-push.
 */
export function notifyChallenge(playerId: string, description: string): void {
  notificationQueue.push({
    playerId,
    type: 'challenge',
    title: 'CourtVision AI — Défi',
    body: description,
    tag: `challenge-${playerId}-${Date.now()}`,
    scheduledAt: new Date(), // immediate
  })

  console.log(`[notify] Challenge notification queued for player ${playerId}: ${description}`)
}

/**
 * Get the notification queue (for debugging / future processing).
 */
export function getNotificationQueue() {
  return notificationQueue
}

/**
 * Process due notifications.
 * Checks player preferences before sending.
 * In production, this would be called by a cron job or worker.
 */
export async function processDueNotifications(): Promise<void> {
  const now = new Date()

  for (let i = notificationQueue.length - 1; i >= 0; i--) {
    const notif = notificationQueue[i]

    if (notif.scheduledAt <= now) {
      // Check player preferences
      try {
        const player = await db.player.findUnique({
          where: { id: notif.playerId },
          select: {
            notifStreak: true,
            notifChallenge: true,
            notifAchievement: true,
          },
        })

        if (!player) {
          notificationQueue.splice(i, 1)
          continue
        }

        const prefKey = {
          streak: player.notifStreak,
          achievement: player.notifAchievement,
          challenge: player.notifChallenge,
        }[notif.type]

        if (prefKey) {
          // In production: send via web-push API
          console.log(
            `[notify] Would send notification to player ${notif.playerId}: [${notif.title}] ${notif.body}`
          )
        }

        // Remove from queue (processed)
        notificationQueue.splice(i, 1)
      } catch (error) {
        console.error(`[notify] Error processing notification for player ${notif.playerId}:`, error)
      }
    }
  }
}