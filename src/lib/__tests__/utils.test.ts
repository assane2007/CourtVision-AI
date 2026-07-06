import { describe, it, expect } from 'vitest'
import { cn, formatDuration } from '@/lib/utils'

// ─── cn ───────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('text-sm', 'font-bold')
    expect(result).toBe('text-sm font-bold')
  })

  it('handles conditional classes (falsy values)', () => {
    const isActive = false
    const result = cn('base', isActive && 'active-class')
    expect(result).toBe('base')
  })

  it('handles conditional classes (truthy values)', () => {
    const isActive = true
    const result = cn('base', isActive && 'active-class')
    expect(result).toBe('base active-class')
  })

  it('deduplicates tailwind classes', () => {
    const result = cn('text-sm', 'text-lg')
    // tailwind-merge should resolve conflict — last one wins
    expect(result).toBe('text-lg')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('handles arrays of classes', () => {
    const result = cn(['text-sm', 'p-4'])
    expect(result).toBe('text-sm p-4')
  })

  it('handles mixed inputs', () => {
    const result = cn('flex', ['items-center'], false && 'hidden', 'gap-2')
    expect(result).toBe('flex items-center gap-2')
  })

  it('deduplicates conflicting margin/padding', () => {
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })
})

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('0 → "—"', () => {
    expect(formatDuration(0)).toBe('—')
  })

  it('5000 → "5s"', () => {
    expect(formatDuration(5000)).toBe('5s')
  })

  it('65000 → "1min 05s"', () => {
    expect(formatDuration(65000)).toBe('1min 05s')
  })

  it('3665000 → "1h 1min 05s"', () => {
    expect(formatDuration(3665000)).toBe('1h 1min 05s')
  })

  it('3600000 → "1h 0min"', () => {
    expect(formatDuration(3600000)).toBe('1h 0min')
  })

  it('falsy value → "—"', () => {
    expect(formatDuration(undefined as unknown as number)).toBe('—')
  })
})