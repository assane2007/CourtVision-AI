// ── CourtVision AI — Notification Helper ────────────────────────────────────
// Mock push notification system. Logs to console. Replace with real provider
// (e.g. web-push, Firebase FCM) in production.

import { db } from './db'

export type NotificationType =
  | 'streak_reminder'
  | 'challenge_invite'
  | 'friend_request'
  | 'achievement'
  | 'live_start'
  | 'comment'
  | 'like'

interface SendNotificationParams {
  playerId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Send a push notification to a player's registered devices.
 * In production, this would use web-push or FCM. For now, logs to console.
 */
export async function sendPushNotification({
  playerId,
  type,
  title,
  body,
  data = {},
}: SendNotificationParams): Promise<{ sent: number; skipped: number }> {
  try {
    // Check player notification preferences
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: {
        notifStreak: true,
        notifChallenge: true,
        notifAchievement: true,
        notifSocial: true,
        notifMessage: true,
      },
    })

    if (!player) return { sent: 0, skipped: 0 }

    // Check if this notification type is enabled
    const typeEnabled = isNotificationEnabled(player, type)
    if (!typeEnabled) {
      return { sent: 0, skipped: 0 }
    }

    // Find devices with push tokens
    const devices = await db.device.findMany({
      where: {
        playerId,
        pushToken: { not: null },
      },
      select: { id: true, pushToken: true, name: true },
    })

    let sent = 0
    let skipped = 0

    for (const device of devices) {
      if (!device.pushToken) {
        skipped++
        continue
      }

      // Mock: log the notification
      console.warn('[PUSH MOCK]', { device: device.name, playerId, type, title, body, data })
      sent++
    }

    return { sent, skipped }
  } catch (error) {
    console.error('[sendPushNotification] Error:', error)
    return { sent: 0, skipped: 0 }
  }
}

function isNotificationEnabled(
  player: {
    notifStreak: boolean
    notifChallenge: boolean
    notifAchievement: boolean
    notifSocial: boolean
    notifMessage: boolean
  },
  type: NotificationType,
): boolean {
  switch (type) {
    case 'streak_reminder':
      return player.notifStreak
    case 'challenge_invite':
      return player.notifChallenge
    case 'achievement':
      return player.notifAchievement
    case 'friend_request':
    case 'comment':
    case 'like':
      return player.notifSocial
    case 'live_start':
      return player.notifMessage
    default:
      return true
  }
}