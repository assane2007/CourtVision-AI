import { Prisma } from '@prisma/client'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const attempts = new Map<string, RateLimitEntry>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 10
const MAX_ENTRIES = 10000

// Periodic cleanup: remove expired entries every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) {
      attempts.delete(key)
    }
  }
}, 5 * 60 * 1000)
// Allow the process to exit even if the timer is active
cleanupTimer.unref()

export function rateLimit(identifier: string, maxAttempts = MAX_ATTEMPTS, windowMs = WINDOW_MS): { success: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = attempts.get(identifier)

  if (!entry || now > entry.resetAt) {
    // Safety valve: if too many entries, evict expired ones first
    if (attempts.size >= MAX_ENTRIES) {
      for (const [key, existingEntry] of attempts) {
        if (existingEntry.resetAt < now) {
          attempts.delete(key)
        }
      }
      // If still at capacity, evict oldest entries (first inserted in Map)
      if (attempts.size >= MAX_ENTRIES) {
        let evicted = 0
        for (const key of attempts.keys()) {
          if (evicted >= MAX_ENTRIES * 0.2) break // evict 20%
          attempts.delete(key)
          evicted++
        }
      }
    }

    attempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, retryAfterMs: 0 }
  }

  if (entry.count >= maxAttempts) {
    return { success: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { success: true, retryAfterMs: 0 }
}

// Re-export Prisma for use in route types if needed
export { Prisma }