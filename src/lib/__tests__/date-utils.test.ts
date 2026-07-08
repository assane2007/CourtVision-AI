import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDate,
  formatRelativeTime,
  formatShortDate,
  formatTime,
  formatDurationSec,
} from '@/lib/date-utils'

// ── Pin system time for relative time tests ───────────────────────────────────

describe('formatDate', () => {
  it('formats a Date object in French by default', () => {
    const date = new Date(2025, 0, 15) // Jan 15, 2025
    const result = formatDate(date, 'fr', { day: '2-digit', month: '2-digit', year: 'numeric' })
    expect(result).toContain('2025')
  })

  it('formats a date string in English', () => {
    const result = formatDate('2025-06-10', 'en', { month: 'long', day: 'numeric' })
    // English locale should produce English month name
    expect(result).toMatch(/June/i)
  })

  it('formats a date string in French', () => {
    const result = formatDate('2025-06-10', 'fr', { month: 'long', day: 'numeric' })
    // French locale should produce French month name
    expect(result).toMatch(/juin/i)
  })

  it('defaults to French when no language specified', () => {
    const date = new Date(2025, 5, 10)
    const result = formatDate(date, undefined, { month: 'long' })
    expect(result).toMatch(/juin/i)
  })
})

describe('formatShortDate', () => {
  it('returns DD/MM/YYYY format for French', () => {
    const date = new Date(2025, 2, 5) // March 5, 2025
    const result = formatShortDate(date, 'fr')
    // French: DD/MM/YYYY
    expect(result).toMatch(/05.*03.*2025/)
  })

  it('returns MM/DD/YYYY format for English', () => {
    const date = new Date(2025, 2, 5) // March 5, 2025
    const result = formatShortDate(date, 'en')
    // English: MM/DD/YYYY
    expect(result).toMatch(/03.*05.*2025/)
  })
})

describe('formatTime', () => {
  it('formats time as HH:mm in French', () => {
    const date = new Date(2025, 0, 1, 14, 30)
    const result = formatTime(date, 'fr')
    expect(result).toContain('14')
    expect(result).toContain('30')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)) // June 15, 2025 noon
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "à l\'instant" for < 60s ago (French)', () => {
    const date = new Date(2025, 5, 15, 11, 59, 30) // 30s ago
    expect(formatRelativeTime(date, 'fr')).toBe("à l'instant")
  })

  it('returns "just now" for < 60s ago (English)', () => {
    const date = new Date(2025, 5, 15, 11, 59, 30)
    expect(formatRelativeTime(date, 'en')).toBe('just now')
  })

  it('returns "il y a Xmin" for minutes (French)', () => {
    const date = new Date(2025, 5, 15, 11, 55, 0) // 5 min ago
    expect(formatRelativeTime(date, 'fr')).toBe('il y a 5min')
  })

  it('returns "Xm ago" for minutes (English)', () => {
    const date = new Date(2025, 5, 15, 11, 55, 0)
    expect(formatRelativeTime(date, 'en')).toBe('5m ago')
  })

  it('returns "il y a Xh" for hours (French)', () => {
    const date = new Date(2025, 5, 15, 10, 0, 0) // 2h ago
    expect(formatRelativeTime(date, 'fr')).toBe('il y a 2h')
  })

  it('returns "Xh ago" for hours (English)', () => {
    const date = new Date(2025, 5, 15, 10, 0, 0)
    expect(formatRelativeTime(date, 'en')).toBe('2h ago')
  })

  it('returns "il y a Xj" for days (French)', () => {
    const date = new Date(2025, 5, 13, 12, 0, 0) // 2 days ago
    expect(formatRelativeTime(date, 'fr')).toBe('il y a 2j')
  })

  it('returns "Xd ago" for days (English)', () => {
    const date = new Date(2025, 5, 13, 12, 0, 0)
    expect(formatRelativeTime(date, 'en')).toBe('2d ago')
  })

  it('falls back to short date for > 7 days', () => {
    const date = new Date(2025, 5, 1, 12, 0, 0) // 14 days ago
    const result = formatRelativeTime(date, 'fr')
    // Should be a date string with day and month
    expect(result).toMatch(/\d{2}\/\d{2}/)
  })

  it('works with ISO date strings', () => {
    const date = new Date(2025, 5, 15, 11, 55, 0)
    expect(formatRelativeTime(date.toISOString(), 'fr')).toBe('il y a 5min')
  })
})

describe('formatDurationSec', () => {
  it('0 seconds → "0s"', () => {
    expect(formatDurationSec(0, 'fr')).toBe('0s')
  })

  it('45 seconds → "45s"', () => {
    expect(formatDurationSec(45, 'fr')).toBe('45s')
  })

  it('90 seconds → "1min 30s"', () => {
    expect(formatDurationSec(90, 'fr')).toBe('1min 30s')
  })

  it('300 seconds → "5min"', () => {
    expect(formatDurationSec(300, 'fr')).toBe('5min')
  })

  it('works identically for English (same format)', () => {
    expect(formatDurationSec(90, 'en')).toBe('1min 30s')
  })
})