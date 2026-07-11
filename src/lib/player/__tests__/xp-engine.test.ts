import { describe, it, expect } from 'vitest'
import {
  calcWorkoutXP,
  calcWorkoutSkillGains,
  calcMatchXP,
  calcMatchSkillGains,
  calcNewStreak,
  applySkillGains,
  checkNewAchievements,
  calcTotalXP,
} from '@/lib/player/xp-engine'
import type { Player } from '@prisma/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    authId: 'auth-1',
    email: 'test@test.com',
    name: 'Test',
    xp: 0,
    level: 1,
    streak: 0,
    lastActivityDate: null,
    shooting: 50,
    handling: 50,
    finishing: 50,
    defense: 50,
    iq: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ─── calcWorkoutXP ────────────────────────────────────────────────────────────

describe('calcWorkoutXP', () => {
  it('returns 0 when no drills are completed', () => {
    const result = calcWorkoutXP(100, 2, [{ completed: false }, { completed: false }])
    expect(result).toBe(0)
  })

  it('calculates XP with all drills completed at normal intensity', () => {
    const result = calcWorkoutXP(100, 2, [{ completed: true }, { completed: true }])
    // intensity=2 → multiplier=1, completionRate=1 → 100*1*1=100
    expect(result).toBe(100)
  })

  it('applies high intensity multiplier (1.5x)', () => {
    const result = calcWorkoutXP(100, 3, [{ completed: true }, { completed: true }])
    // intensity=3 → multiplier=1.5, completionRate=1 → 100*1.5*1=150
    expect(result).toBe(150)
  })

  it('applies low intensity multiplier (0.8x)', () => {
    const result = calcWorkoutXP(100, 1, [{ completed: true }, { completed: true }])
    // intensity=1 → multiplier=0.8, completionRate=1 → 100*0.8*1=80
    expect(result).toBe(80)
  })

  it('scales XP with partial completion rate', () => {
    const result = calcWorkoutXP(100, 2, [
      { completed: true },
      { completed: false },
      { completed: true },
      { completed: false },
    ])
    // completionRate = 2/4 = 0.5 → 100*1*0.5=50
    expect(result).toBe(50)
  })

  it('handles single drill completed', () => {
    const result = calcWorkoutXP(50, 2, [{ completed: true }])
    expect(result).toBe(50)
  })

  it('handles empty drills array (completionRate denominator=1)', () => {
    const result = calcWorkoutXP(50, 2, [])
    // completionRate = 0/1 = 0 → 50*1*0=0
    expect(result).toBe(0)
  })
})

// ─── calcWorkoutSkillGains ────────────────────────────────────────────────────

describe('calcWorkoutSkillGains', () => {
  it('returns shooting skill for shooting plan', () => {
    const gains = calcWorkoutSkillGains('shooting', 2, [{ completed: true }])
    expect(gains).toEqual({ shooting: expect.any(Number) })
  })

  it('returns handling skill for handling plan', () => {
    const gains = calcWorkoutSkillGains('handling', 2, [{ completed: true }])
    expect(gains).toEqual({ handling: expect.any(Number) })
  })

  it('returns iq skill for footwork plan', () => {
    const gains = calcWorkoutSkillGains('footwork', 2, [{ completed: true }])
    expect(gains).toEqual({ iq: expect.any(Number) })
  })

  it('returns defense skill for defense plan', () => {
    const gains = calcWorkoutSkillGains('defense', 2, [{ completed: true }])
    expect(gains).toEqual({ defense: expect.any(Number) })
  })

  it('returns finishing skill for finishing plan', () => {
    const gains = calcWorkoutSkillGains('finishing', 2, [{ completed: true }])
    expect(gains).toEqual({ finishing: expect.any(Number) })
  })

  it('returns higher gains for high intensity', () => {
    const low = calcWorkoutSkillGains('shooting', 1, [{ completed: true }])
    const high = calcWorkoutSkillGains('shooting', 3, [{ completed: true }])
    expect(high.shooting!).toBeGreaterThan(low.shooting!)
  })

  it('returns lower gains for partial completion', () => {
    const full = calcWorkoutSkillGains('shooting', 2, [{ completed: true }, { completed: true }])
    const half = calcWorkoutSkillGains('shooting', 2, [{ completed: true }, { completed: false }])
    expect(full.shooting!).toBeGreaterThan(half.shooting!)
  })
})

// ─── calcMatchXP ──────────────────────────────────────────────────────────────

describe('calcMatchXP', () => {
  it('gives win bonus of 50 XP', () => {
    const result = calcMatchXP({
      result: 'W', points: 0, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 0,
    })
    // perfScore=0, winBonus=50 → 50+0+50=100
    expect(result).toBe(100)
  })

  it('gives lower bonus for a loss', () => {
    const win = calcMatchXP({
      result: 'W', points: 0, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 0,
    })
    const loss = calcMatchXP({
      result: 'L', points: 0, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 0,
    })
    expect(win).toBeGreaterThan(loss)
  })

  it('rewards assists (2x), steals (3x), blocks (3x)', () => {
    const base = calcMatchXP({
      result: 'W', points: 0, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 0,
    })
    const withStats = calcMatchXP({
      result: 'W', points: 0, rebounds: 0, assists: 5,
      steals: 2, blocks: 1, turnovers: 0,
    })
    // perfScore = 5*2 + 2*3 + 1*3 = 10+6+3 = 19
    // withStats = 50 + 19*2 + 50 = 138
    // base = 100
    expect(withStats).toBeGreaterThan(base)
  })

  it('penalizes turnovers (-2x)', () => {
    const clean = calcMatchXP({
      result: 'W', points: 10, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 0,
    })
    const sloppy = calcMatchXP({
      result: 'W', points: 10, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 5,
    })
    expect(clean).toBeGreaterThan(sloppy)
  })

  it('enforces minimum XP of 40', () => {
    const result = calcMatchXP({
      result: 'L', points: 0, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 100,
    })
    expect(result).toBeGreaterThanOrEqual(40)
  })

  it('rewards rebounds (1.5x)', () => {
    const withRebounds = calcMatchXP({
      result: 'W', points: 0, rebounds: 10, assists: 0,
      steals: 0, blocks: 0, turnovers: 0,
    })
    const base = calcMatchXP({
      result: 'W', points: 0, rebounds: 0, assists: 0,
      steals: 0, blocks: 0, turnovers: 0,
    })
    expect(withRebounds).toBeGreaterThan(base)
  })
})

// ─── calcMatchSkillGains ──────────────────────────────────────────────────────

describe('calcMatchSkillGains', () => {
  it('grants shooting skill when FG% > 50%', () => {
    const gains = calcMatchSkillGains({
      fgAttempts: 10, fgMade: 6, assists: 0,
      points: 0, steals: 0, blocks: 0, turnovers: 0,
    })
    expect(gains.shooting).toBe(2)
  })

  it('does not grant shooting when FG% <= 50%', () => {
    const gains = calcMatchSkillGains({
      fgAttempts: 10, fgMade: 5, assists: 0,
      points: 0, steals: 0, blocks: 0, turnovers: 0,
    })
    expect(gains.shooting).toBeUndefined()
  })

  it('grants handling when assists >= 5', () => {
    const gains = calcMatchSkillGains({
      fgAttempts: 0, fgMade: 0, assists: 7,
      points: 0, steals: 0, blocks: 0, turnovers: 0,
    })
    expect(gains.handling).toBe(1)
  })

  it('grants finishing when points >= 15', () => {
    const gains = calcMatchSkillGains({
      fgAttempts: 0, fgMade: 0, assists: 0,
      points: 20, steals: 0, blocks: 0, turnovers: 0,
    })
    expect(gains.finishing).toBe(1)
  })

  it('grants defense when steals + blocks >= 3', () => {
    const gains = calcMatchSkillGains({
      fgAttempts: 0, fgMade: 0, assists: 0,
      points: 0, steals: 2, blocks: 1, turnovers: 0,
    })
    expect(gains.defense).toBe(2)
  })

  it('grants IQ when low turnovers + decent assists', () => {
    const gains = calcMatchSkillGains({
      fgAttempts: 0, fgMade: 0, assists: 5,
      points: 0, steals: 0, blocks: 0, turnovers: 1,
    })
    expect(gains.iq).toBe(1)
  })

  it('returns empty object for no qualifying stats', () => {
    const gains = calcMatchSkillGains({
      fgAttempts: 0, fgMade: 0, assists: 2,
      points: 10, steals: 0, blocks: 0, turnovers: 5,
    })
    expect(Object.keys(gains)).toHaveLength(0)
  })
})

// ─── calcNewStreak ────────────────────────────────────────────────────────────

describe('calcNewStreak', () => {
  it('returns existing streak when last activity was today', () => {
    const today = new Date().toDateString()
    const result = calcNewStreak(today, 5)
    expect(result.streak).toBe(5)
    expect(result.todayStr).toBe(today)
  })

  it('increments streak when last activity was yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const result = calcNewStreak(yesterday, 5)
    expect(result.streak).toBe(6)
  })

  it('resets streak to 1 when last activity was before yesterday', () => {
    const old = new Date(Date.now() - 3 * 86400000).toDateString()
    const result = calcNewStreak(old, 10)
    expect(result.streak).toBe(1)
  })

  it('starts streak at 1 when no previous activity', () => {
    const result = calcNewStreak(null, 0)
    expect(result.streak).toBe(1)
  })
})

// ─── applySkillGains ──────────────────────────────────────────────────────────

describe('applySkillGains', () => {
  it('applies skill gains to a player', () => {
    const player = makePlayer({ shooting: 50 })
    const result = applySkillGains(player, { shooting: 5 })
    expect(result.shooting).toBe(55)
  })

  it('caps skill at 99', () => {
    const player = makePlayer({ shooting: 97 })
    const result = applySkillGains(player, { shooting: 5 })
    expect(result.shooting).toBe(99)
  })

  it('does not modify other skills', () => {
    const player = makePlayer({ shooting: 50, handling: 30, iq: 80 })
    const result = applySkillGains(player, { shooting: 10 })
    expect(result.handling).toBe(30)
    expect(result.iq).toBe(80)
  })

  it('handles empty skill gains', () => {
    const player = makePlayer()
    const result = applySkillGains(player, {})
    expect(result.shooting).toBe(50)
    expect(result.handling).toBe(50)
  })

  it('applies multiple skill gains at once', () => {
    const player = makePlayer({ shooting: 40, defense: 60 })
    const result = applySkillGains(player, { shooting: 3, defense: 2, iq: 1 })
    expect(result.shooting).toBe(43)
    expect(result.defense).toBe(62)
    expect(result.iq).toBe(51)
  })
})

// ─── checkNewAchievements ─────────────────────────────────────────────────────

describe('checkNewAchievements', () => {
  it('returns first_workout when workoutsCount >= 1', () => {
    const unlocked = checkNewAchievements(1, 0, 0, 0, [])
    expect(unlocked).toContain('first_workout')
  })

  it('does not re-unlock already unlocked achievements', () => {
    const unlocked = checkNewAchievements(1, 0, 0, 0, ['first_workout'])
    expect(unlocked).not.toContain('first_workout')
  })

  it('returns level_5 when level is >= 5', () => {
    // Level 5 needs some XP — let's compute roughly: level 1 needs 100, level 2 needs 140, etc.
    // Use a high XP value to ensure level >= 5
    const unlocked = checkNewAchievements(0, 0, 0, 2000, [])
    expect(unlocked).toContain('level_5')
  })

  it('returns streak_3 when streak >= 3', () => {
    const unlocked = checkNewAchievements(0, 0, 3, 0, [])
    expect(unlocked).toContain('streak_3')
  })

  it('returns xp_5000 when totalXP >= 5000', () => {
    const unlocked = checkNewAchievements(0, 0, 0, 5000, [])
    expect(unlocked).toContain('xp_5000')
  })

  it('returns multiple new achievements at once', () => {
    const unlocked = checkNewAchievements(10, 1, 7, 5000, [])
    expect(unlocked).toContain('workouts_10')
    expect(unlocked).toContain('first_match')
    expect(unlocked).toContain('streak_7')
    expect(unlocked).toContain('xp_5000')
  })

  it('returns empty array when no new achievements', () => {
    const unlocked = checkNewAchievements(0, 0, 0, 0, [])
    expect(unlocked).toEqual([])
  })
})

// ─── calcTotalXP ──────────────────────────────────────────────────────────────

describe('calcTotalXP', () => {
  it('sums workout XP, match XP, and achievement bonus', () => {
    const result = calcTotalXP(500, 200, 3)
    // 500 + 200 + 3*100 = 1000
    expect(result).toBe(1000)
  })

  it('works with zero values', () => {
    expect(calcTotalXP(0, 0, 0)).toBe(0)
  })

  it('each achievement contributes 100 XP', () => {
    const with1 = calcTotalXP(0, 0, 1)
    const with5 = calcTotalXP(0, 0, 5)
    expect(with5 - with1).toBe(400)
  })
})