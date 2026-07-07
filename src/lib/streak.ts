/**
 * Calculate current and best training streaks from a set of session dates.
 *
 * @param sessionDates - Array of Date objects (e.g. session.startedAt).
 *   Does NOT need to be sorted; duplicates are handled via Set.
 * @returns {{ current: number; best: number }}
 */
export function calculateStreak(sessionDates: Date[]): { current: number; best: number } {
  // Unique training day strings (YYYY-MM-DD)
  const trainingDays = new Set(
    sessionDates.map((d) => new Date(d).toISOString().split('T')[0]),
  )

  // ── Current streak: consecutive days ending at today or yesterday ──
  let currentStreak = 0
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const checkDate = new Date(today)

  for (let i = 0; i < 365; i++) {
    const dayStr = checkDate.toISOString().split('T')[0]
    if (trainingDays.has(dayStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (i === 0) {
      // Today might not have a session yet — start checking from yesterday
      checkDate.setDate(checkDate.getDate() - 1)
      continue
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

  return { current: currentStreak, best: bestStreak }
}