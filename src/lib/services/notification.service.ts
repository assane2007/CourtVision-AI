/**
 * Notification service — in-app notifications and push notifications.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '@/lib/db'
import { AppError, ErrorCode } from '@/lib/middleware/error-handler'
import { logger } from '@/lib/logger'

// ── Notification Types ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'achievement'
  | 'streak'
  | 'friend_request'
  | 'friend_accept'
  | 'team_invite'
  | 'level_up'
  | 'session_reminder'
  | 'weekly_report'
  | 'system'

export interface NotificationPayload {
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
}

// ── In-App Notifications ────────────────────────────────────────────────────────

/**
 * Create an in-app notification for a player.
 */
export async function createNotification(
  playerId: string,
  payload: NotificationPayload,
): Promise<any> {
  const notification = await db.notification.create({
    data: {
      playerId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ? JSON.stringify(payload.data) : null,
    },
  })

  logger.debug('In-app notification created', 'notification.service', {
    playerId,
    type: payload.type,
  })

  return notification
}

/**
 * Get paginated notifications for a player.
 */
export async function getPlayerNotifications(
  playerId: string,
  params?: { cursor?: string; limit?: number; unreadOnly?: boolean },
) {
  const { cursor, limit = 20, unreadOnly } = params ?? {}

  const where: any = { playerId }
  if (unreadOnly) {
    where.read = false
  }

  const cursorWhere = cursor
    ? { AND: [where, { id: { gt: cursor } }] }
    : where

  const notifications = await db.notification.findMany({
    where: cursorWhere,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  })

  const hasMore = notifications.length > limit
  const pageNotifs = hasMore ? notifications.slice(0, limit) : notifications
  const nextCursor = hasMore ? pageNotifs[pageNotifs.length - 1].id : null

  // Get unread count
  const unreadCount = await db.notification.count({
    where: { playerId, read: false },
  })

  return {
    notifications: pageNotifs,
    nextCursor,
    hasMore,
    count: pageNotifs.length,
    unreadCount,
  }
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(
  notificationId: string,
  playerId: string,
): Promise<void> {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    select: { playerId: true },
  })

  if (!notification) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Notification introuvable')
  }

  if (notification.playerId !== playerId) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Accès non autorisé')
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })
}

/**
 * Mark all notifications as read for a player.
 */
export async function markAllAsRead(playerId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { playerId, read: false },
    data: { read: true },
  })

  return result.count
}

/**
 * Delete a notification.
 */
export async function deleteNotification(
  notificationId: string,
  playerId: string,
): Promise<void> {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    select: { playerId: true },
  })

  if (!notification || notification.playerId !== playerId) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Notification introuvable')
  }

  await db.notification.delete({ where: { id: notificationId } })
}

// ── Push Notifications ──────────────────────────────────────────────────────────

/**
 * Register a push notification device.
 */
export async function registerPushDevice(
  playerId: string,
  data: {
    pushToken: string
    deviceName?: string
    deviceType?: 'mobile' | 'tablet' | 'desktop' | 'web'
    os?: string
    appVersion?: string
  },
): Promise<any> {
  // Check if device already registered
  const existing = await db.pushDevice.findUnique({
    where: { pushToken: data.pushToken },
  })

  if (existing) {
    // Update existing
    return db.pushDevice.update({
      where: { pushToken: data.pushToken },
      data: {
        playerId,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        os: data.os,
        appVersion: data.appVersion,
        lastActiveAt: new Date(),
      },
    })
  }

  return db.pushDevice.create({
    data: {
      playerId,
      pushToken: data.pushToken,
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      os: data.os,
      appVersion: data.appVersion,
    },
  })
}

/**
 * Unregister a push device.
 */
export async function unregisterPushDevice(
  pushToken: string,
  playerId: string,
): Promise<void> {
  const device = await db.pushDevice.findUnique({
    where: { pushToken },
    select: { playerId: true },
  })

  if (!device || device.playerId !== playerId) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Appareil introuvable')
  }

  await db.pushDevice.delete({ where: { pushToken } })
}

/**
 * Send a push notification (would integrate with FCM/APNs in production).
 * Currently just creates an in-app notification.
 */
export async function sendPushNotification(
  playerId: string,
  payload: NotificationPayload,
): Promise<void> {
  // Create in-app notification regardless
  await createNotification(playerId, payload)

  // In production, also send via push service
  const devices = await db.pushDevice.findMany({
    where: { playerId },
    select: { pushToken: true, deviceType: true },
  })

  if (devices.length > 0) {
    logger.info('Push notification queued', 'notification.service', {
      playerId,
      deviceCount: devices.length,
      type: payload.type,
    })
    // FCM/APNs integration would go here
  }
}

// ── Convenience Helpers ─────────────────────────────────────────────────────────

/**
 * Notify a player about an achievement unlock.
 */
export async function notifyAchievement(
  playerId: string,
  achievementTitle: string,
) {
  return createNotification(playerId, {
    type: 'achievement',
    title: '🏆 Nouveau trophée !',
    body: `Vous avez débloqué : ${achievementTitle}`,
    data: { achievementTitle },
  })
}

/**
 * Notify a player about a streak milestone.
 */
export async function notifyStreak(playerId: string, streakDays: number) {
  return createNotification(playerId, {
    type: 'streak',
    title: `🔥 ${streakDays} jours !`,
    body: `Série de ${streakDays} jours d'affilée. Continuez !`,
    data: { streakDays },
  })
}

/**
 * Notify a player about a friend request.
 */
export async function notifyFriendRequest(
  recipientId: string,
  requesterName: string,
) {
  return createNotification(recipientId, {
    type: 'friend_request',
    title: 'Nouvelle demande d\'ami',
    body: `${requesterName} veut être votre ami`,
    data: { type: 'friend_request' },
  })
}

/**
 * Notify a player about leveling up.
 */
export async function notifyLevelUp(
  playerId: string,
  newLevel: number,
) {
  return createNotification(playerId, {
    type: 'level_up',
    title: '⬆️ Niveau supérieur !',
    body: `Vous êtes maintenant niveau ${newLevel} !`,
    data: { newLevel },
  })
}