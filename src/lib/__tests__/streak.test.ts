import { describe, it, expect } from 'vitest';
import { calculateStreak } from '@/lib/streak';
 describe('calculateStreak', () => {
  it('returns 0 for empty input', () => {
    const result = calculateStreak([])
    expect(result.current).toBe(0)
    expect(result.best).toBe(0)
  })

  it('counts a single training day', () => {
    const today = new Date()
    const result = calculateStreak([today])
    expect(result.current).toBe(1)
    expect(result.best).toBe(1)
  })

  it('counts consecutive days including today', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dayBefore = new Date(today)
    dayBefore.setDate(dayBefore.getDate() - 2)

    const result = calculateStreak([today, yesterday, dayBefore])
    expect(result.current).toBe(3)
    expect(result.best).toBe(3)
  })

  it('counts consecutive days ending at yesterday', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dayBefore = new Date(today)
    dayBefore.setDate(dayBefore.getDate() - 2)

    const result = calculateStreak([yesterday, dayBefore])
    expect(result.current).toBe(2)
    expect(result.best).toBe(2)
  })

  it('breaks streak on gap', () => {
    const today = new Date()
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const result = calculateStreak([today, twoDaysAgo])
    expect(result.current).toBe(1) // today only, yesterday is missing
    expect(result.best).toBe(1)
  })

  it('handles duplicates', () => {
    const today = new Date()
    const result = calculateStreak([today, today, today])
    expect(result.current).toBe(1)
  })

  it('finds best streak across non-consecutive days', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const fiveDaysAgo = new Date(today)
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const sixDaysAgo = new Date(today)
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const result = calculateStreak([today, yesterday, twoDaysAgo, fiveDaysAgo, sixDaysAgo, sevenDaysAgo])
    expect(result.current).toBe(3) // today, yesterday, two days ago
    expect(result.best).toBe(3) // same
  })

  it('calculates best streak correctly', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const fiveDaysAgo = new Date(today)
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const sixDaysAgo = new Date(today)
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const eightDaysAgo = new Date(today)
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)

    // Best streak is 4 (8,7,6,5 days ago), current is 2 (today, yesterday)
    const result = calculateStreak([today, yesterday, fiveDaysAgo, sixDaysAgo, sevenDaysAgo, eightDaysAgo])
    expect(result.current).toBe(2)
    expect(result.best).toBe(4)
  })

  it('handles timezone consistency (local dates)', () => {
    // Create dates that would differ between UTC and local time
    // 11 PM local time = next day in UTC
    const lateEvening = new Date()
    lateEvening.setHours(23, 0, 0, 0)

    const result = calculateStreak([lateEvening])
    expect(result.current).toBe(1)
  })
})