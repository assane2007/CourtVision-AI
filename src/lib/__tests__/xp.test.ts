import { describe, it, expect } from 'vitest'
import {
  getLevelFromXp,
  getLevelInfo,
  calculateWorkoutXp,
  calculateStreakXp,
  getAchievementXp,
  getChallengeXp,
  getTotalXp,
  getLevelColor,
  getLevelBgColor,
} from '@/lib/xp'

// ─── getLevelFromXp ───────────────────────────────────────────────────────────

describe('getLevelFromXp', () => {
  it('0 XP → Level 1', () => {
    expect(getLevelFromXp(0)).toBe(1)
  })

  it('49 XP → Level 1', () => {
    expect(getLevelFromXp(49)).toBe(1)
  })

  it('50 XP → Level 2', () => {
    expect(getLevelFromXp(50)).toBe(2)
  })

  it('149 XP → Level 2', () => {
    expect(getLevelFromXp(149)).toBe(2)
  })

  it('150 XP → Level 3', () => {
    expect(getLevelFromXp(150)).toBe(3)
  })

  it('max threshold (33000) → Level 20', () => {
    expect(getLevelFromXp(33000)).toBe(20)
  })

  it('XP beyond max threshold still returns Level 20', () => {
    expect(getLevelFromXp(99999)).toBe(20)
  })
})

// ─── getLevelInfo ─────────────────────────────────────────────────────────────

describe('getLevelInfo', () => {
  it('Level 1 at 0 XP: progress 0, not max level', () => {
    const info = getLevelInfo(0)
    expect(info.currentLevel).toBe(1)
    expect(info.progress).toBe(0)
    expect(info.isMaxLevel).toBe(false)
  })

  it('mid-level: progress between 0 and 1', () => {
    // Level 2 starts at 50, Level 3 at 150. 100 XP = 50 into level 2 out of 100 needed
    const info = getLevelInfo(100)
    expect(info.currentLevel).toBe(2)
    expect(info.progress).toBe(0.5)
    expect(info.isMaxLevel).toBe(false)
  })

  it('max level: isMaxLevel true, progress 1', () => {
    const info = getLevelInfo(33000)
    expect(info.currentLevel).toBe(20)
    expect(info.isMaxLevel).toBe(true)
    expect(info.progress).toBe(1)
    expect(info.xpForNextLevel).toBeNull()
    expect(info.xpNeededForNextLevel).toBeNull()
  })

  it('levelTitle returns French string', () => {
    const info = getLevelInfo(0)
    expect(info.levelTitle).toBe('Débutant')
    expect(info.levelTitleEn).toBe('Rookie')
  })

  it('correct title for mid level', () => {
    const info = getLevelInfo(800)
    expect(info.currentLevel).toBe(6)
    expect(info.levelTitle).toBe('Compétiteur')
  })
})

// ─── calculateWorkoutXp ───────────────────────────────────────────────────────

describe('calculateWorkoutXp', () => {
  it('Score 0, 0 reps → base XP (10)', () => {
    const rewards = calculateWorkoutXp(0, 0, 0, false)
    const total = rewards.reduce((s, r) => s + r.amount, 0)
    expect(total).toBe(10)
    expect(rewards).toHaveLength(1)
    expect(rewards[0].source).toBe('workout')
  })

  it('Score 100, 0 reps → base XP (50)', () => {
    const rewards = calculateWorkoutXp(100, 0, 0, false)
    const total = rewards.reduce((s, r) => s + r.amount, 0)
    expect(total).toBe(50)
  })

  it('high reps → capped at 30 rep XP', () => {
    const rewards = calculateWorkoutXp(50, 100, 0, false)
    const repReward = rewards.find(r => r.source === 'rep')
    expect(repReward?.amount).toBe(30)
  })

  it('personal best adds 30 XP', () => {
    const rewards = calculateWorkoutXp(50, 0, 0, true)
    const pbReward = rewards.find(r => r.description.includes('Record personnel'))
    expect(pbReward).toBeDefined()
    expect(pbReward!.amount).toBe(30)
  })

  it('duration bonus for > 30s workouts', () => {
    const rewards = calculateWorkoutXp(50, 0, 60, false)
    const bonusReward = rewards.find(r => r.source === 'bonus' && r.description.includes('endurance'))
    expect(bonusReward).toBeDefined()
    expect(bonusReward!.amount).toBe(1) // (60-30)/30 = 1
  })

  it('no duration bonus for <= 30s workouts', () => {
    const rewards = calculateWorkoutXp(50, 0, 30, false)
    const bonusReward = rewards.find(r => r.source === 'bonus' && r.description.includes('endurance'))
    expect(bonusReward).toBeUndefined()
  })

  it('returns array of XpReward objects', () => {
    const rewards = calculateWorkoutXp(75, 10, 90, true)
    for (const r of rewards) {
      expect(r).toHaveProperty('amount')
      expect(r).toHaveProperty('source')
      expect(r).toHaveProperty('description')
      expect(typeof r.amount).toBe('number')
      expect(typeof r.source).toBe('string')
      expect(typeof r.description).toBe('string')
    }
  })

  it('duration bonus is capped at 10', () => {
    // 600s → (600-30)/30 = 19 → capped at 10
    const rewards = calculateWorkoutXp(50, 0, 600, false)
    const bonusReward = rewards.find(r => r.source === 'bonus' && r.description.includes('endurance'))
    expect(bonusReward!.amount).toBe(10)
  })
})

// ─── calculateStreakXp ────────────────────────────────────────────────────────

describe('calculateStreakXp', () => {
  it('1 day streak → 25 XP', () => {
    const reward = calculateStreakXp(1)
    // multiplier = min(1, 7) = 1, amount = 20 + 1*5 = 25
    expect(reward.amount).toBe(25)
    expect(reward.source).toBe('streak')
  })

  it('7 day streak → 55 XP', () => {
    const reward = calculateStreakXp(7)
    // multiplier = min(7, 7) = 7, amount = 20 + 7*5 = 55
    expect(reward.amount).toBe(55)
  })

  it('30+ day streak → capped at 7 multiplier', () => {
    const reward = calculateStreakXp(30)
    // multiplier = min(30, 7) = 7, amount = 20 + 7*5 = 55
    expect(reward.amount).toBe(55)
  })

  it('description uses singular for 1 day', () => {
    const reward = calculateStreakXp(1)
    expect(reward.description).toContain('1 jour')
    expect(reward.description).not.toContain('jours')
  })

  it('description uses plural for multiple days', () => {
    const reward = calculateStreakXp(5)
    expect(reward.description).toContain('5 jours')
  })
})

// ─── getAchievementXp ─────────────────────────────────────────────────────────

describe('getAchievementXp', () => {
  it('returns 50 XP', () => {
    const reward = getAchievementXp()
    expect(reward.amount).toBe(50)
    expect(reward.source).toBe('achievement')
  })
})

// ─── getChallengeXp ───────────────────────────────────────────────────────────

describe('getChallengeXp', () => {
  it('returns 100 XP', () => {
    const reward = getChallengeXp()
    expect(reward.amount).toBe(100)
    expect(reward.source).toBe('challenge')
  })
})

// ─── getTotalXp ───────────────────────────────────────────────────────────────

describe('getTotalXp', () => {
  it('sums array of rewards correctly', () => {
    const rewards = [
      { amount: 10, source: 'workout' as const, description: 'test' },
      { amount: 25, source: 'streak' as const, description: 'test' },
      { amount: 15, source: 'rep' as const, description: 'test' },
    ]
    expect(getTotalXp(rewards)).toBe(50)
  })

  it('empty array returns 0', () => {
    expect(getTotalXp([])).toBe(0)
  })
})

// ─── getLevelColor ────────────────────────────────────────────────────────────

describe('getLevelColor', () => {
  it('level 1 → gray', () => {
    expect(getLevelColor(1)).toBe('text-gray-400')
  })

  it('level 3 → blue', () => {
    expect(getLevelColor(3)).toBe('text-blue-400')
  })

  it('level 6 → sky', () => {
    expect(getLevelColor(6)).toBe('text-sky-400')
  })

  it('level 9 → emerald', () => {
    expect(getLevelColor(9)).toBe('text-emerald-400')
  })

  it('level 12 → orange', () => {
    expect(getLevelColor(12)).toBe('text-orange-400')
  })

  it('level 15 → purple', () => {
    expect(getLevelColor(15)).toBe('text-purple-400')
  })

  it('level 18 → amber', () => {
    expect(getLevelColor(18)).toBe('text-amber-400')
  })

  it('level 20 → amber', () => {
    expect(getLevelColor(20)).toBe('text-amber-400')
  })
})

// ─── getLevelBgColor ──────────────────────────────────────────────────────────

describe('getLevelBgColor', () => {
  it('level 1 → gray', () => {
    expect(getLevelBgColor(1)).toBe('bg-gray-500/20 border-gray-500/30')
  })

  it('level 3 → blue', () => {
    expect(getLevelBgColor(3)).toBe('bg-blue-500/20 border-blue-500/30')
  })

  it('level 6 → sky', () => {
    expect(getLevelBgColor(6)).toBe('bg-sky-500/20 border-sky-500/30')
  })

  it('level 9 → emerald', () => {
    expect(getLevelBgColor(9)).toBe('bg-emerald-500/20 border-emerald-500/30')
  })

  it('level 12 → orange', () => {
    expect(getLevelBgColor(12)).toBe('bg-orange-500/20 border-orange-500/30')
  })

  it('level 15 → purple', () => {
    expect(getLevelBgColor(15)).toBe('bg-purple-500/20 border-purple-500/30')
  })

  it('level 18 → amber', () => {
    expect(getLevelBgColor(18)).toBe('bg-amber-500/20 border-amber-500/30')
  })

  it('level 20 → amber', () => {
    expect(getLevelBgColor(20)).toBe('bg-amber-500/20 border-amber-500/30')
  })
})