/**
 * Push notification service — real Web Push via web-push library.
 *
 * Server-only module. When VAPID keys are not configured the
 * function degrades gracefully (logs a warning, returns failure).
 */

import webpush from 'web-push'

// ── VAPID configuration ───────────────────────────────────────────────────────

let vapidConfigured = false

function ensureVapid(): boolean {
  if (vapidConfigured) return true

  const privateKey = process.env.VAPID_PRIVATE_KEY
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  if (!privateKey || !publicKey) {
    console.warn('[Push] VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured')
    return false
  }

  webpush.setVapidDetails(
    'mailto:noreply@courtvision.ai',
    publicKey,
    privateKey,
  )

  vapidConfigured = true
  return true
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

// ── Core send ─────────────────────────────────────────────────────────────────

export async function sendPushNotification(options: {
  subscription: PushSubscription
  title: string
  body: string
  url?: string
  icon?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!ensureVapid()) {
    return { success: false, error: 'Push service not configured (missing VAPID keys)' }
  }

  const { subscription, title, body, url, icon } = options

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body,
        url: url || process.env.NEXT_PUBLIC_APP_URL || '/',
        icon: icon || '/icons/icon-192x192.png',
      }),
    )
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    // web-push throws with statusCode 410/404 when subscription is expired/invalid
    if (message.includes('410') || message.includes('404') || message.includes('subscription')) {
      console.warn(`[Push] Subscription expired or invalid: ${message}`)
      return { success: false, error: 'Subscription expired' }
    }

    console.error(`[Push] Send failed: ${message}`)
    return { success: false, error: message }
  }
}

/**
 * Send a push notification to all active subscriptions for a player.
 * Looks up subscriptions from the database and sends to each.
 * Returns count of successful sends and failures.
 */
export async function sendPushToPlayer(options: {
  subscriptions: PushSubscription[]
  title: string
  body: string
  url?: string
  icon?: string
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(
    options.subscriptions.map((sub) =>
      sendPushNotification({
        subscription: sub,
        title: options.title,
        body: options.body,
        url: options.url,
        icon: options.icon,
      }),
    ),
  )

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.success) {
      sent++
    } else {
      failed++
      const errMsg =
        r.status === 'fulfilled'
          ? r.value.error ?? 'Unknown'
          : r.reason?.message ?? 'Unknown'
      errors.push(errMsg)
    }
  }

  return { sent, failed, errors }
}