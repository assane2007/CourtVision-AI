/**
 * Format a Date as a YYYY-MM-DD string in local timezone.
 */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function canUseStreakFreeze(freezesAvailable: number): boolean {
  return freezesAvailable > 0
}

export function useStreakFreeze(): string {
  // Returns the streak freeze date that should be used
  return new Date().toISOString().split('T')[0]
}

/**
 * Calculate current and best training streaks from a set of session dates.
 *
 * @param sessionDates - Array of Date objects (e.g. session.startedAt).
 *   Does NOT need to be sorted; duplicates are handled via Set.
 * @param streakFreezes - Number of available streak freezes (default 0).
 *   If a gap of exactly 1 day is found, a freeze is automatically consumed
 *   to bridge it instead of breaking the streak.
 * @returns {{ current: number; best: number; freezesUsed: number }}
 */
export function calculateStreak(
  sessionDates: Date[],
  streakFreezes: number = 0,
): { current: number; best: number; freezesUsed: number } {
  // Unique training day strings (YYYY-MM-DD) — local time
  const trainingDays = new Set(
    sessionDates.map((d) => toLocalDateString(new Date(d))),
  )

  // ── Current streak: consecutive days ending at today or yesterday ──
  let currentStreak = 0
  let freezesUsed = 0
  const checkDate = new Date()

  for (let i = 0; i < 365; i++) {
    const dayStr = toLocalDateString(checkDate)
    if (trainingDays.has(dayStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (i === 0) {
      // Today might not have a session yet — start checking from yesterday
      checkDate.setDate(checkDate.getDate() - 1)
      continue
    } else if (streakFreezes - freezesUsed > 0) {
      // Gap of 1 day — use a streak freeze to bridge it
      freezesUsed++
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // ── Best streak: longest consecutive run across all training days ──
  const sortedDays = Array.from(trainingDays).sort() // oldest → newest
  let bestStreak = 0
  let tempStreak = 0

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
      )
      if (diffDays === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak)
  }

  return { current: currentStreak, best: bestStreak, freezesUsed }
}