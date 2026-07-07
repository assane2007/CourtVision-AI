const attempts = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 10

// Periodic cleanup: remove expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) {
      attempts.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function rateLimit(identifier: string, maxAttempts = MAX_ATTEMPTS, windowMs = WINDOW_MS): { success: boolean; retryAfterMs: number } {
  // Safety valve: if too many entries, reset
  if (attempts.size > 10000) {
    attempts.clear()
  }

  const now = Date.now()
  const entry = attempts.get(identifier)

  if (!entry || now > entry.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, retryAfterMs: 0 }
  }

  if (entry.count >= maxAttempts) {
    return { success: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { success: true, retryAfterMs: 0 }
}