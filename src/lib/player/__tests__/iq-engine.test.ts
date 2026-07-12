import { describe, it, expect } from 'vitest';
import {
  SKILL_KEYS,
  SKILL_META,
  ARCHETYPES,
  PLAN_TYPES,
  classifyArchetype,
  detectWeaknesses,
  nbaAverageDNA,
  skillOverall,
  levelFromXP,
  projectFutureSelf,
  type SkillDNA,
} from '@/lib/player/iq-engine';

// ─── Constants ─────────────────────────────────────────────────────────────────

describe('SKILL_KEYS', () => {
  it('contains exactly the 5 expected skills', () => {
    expect(SKILL_KEYS).toEqual(['shooting', 'handling', 'finishing', 'defense', 'iq'])
  })

  it('has no duplicates', () => {
    expect(new Set(SKILL_KEYS).size).toBe(SKILL_KEYS.length)
  })
})

describe('SKILL_META', () => {
  it('has metadata for every skill key', () => {
    for (const key of SKILL_KEYS) {
      expect(SKILL_META[key]).toBeDefined()
      expect(SKILL_META[key].label).toHaveProperty('fr')
      expect(SKILL_META[key].label).toHaveProperty('en')
      expect(typeof SKILL_META[key].color).toBe('string')
      expect(typeof SKILL_META[key].icon).toBe('string')
    }
  })
})

describe('ARCHETYPES', () => {
  it('contains 12 archetypes', () => {
    expect(ARCHETYPES).toHaveLength(12)
  })

  it('each archetype has required fields', () => {
    for (const arch of ARCHETYPES) {
      expect(arch.id).toBeTruthy()
      expect(arch.name).toHaveProperty('fr')
      expect(arch.name).toHaveProperty('en')
      expect(arch.emoji).toBeTruthy()
      expect(arch.description).toHaveProperty('fr')
      expect(arch.description).toHaveProperty('en')
      expect(Array.isArray(arch.strengths)).toBe(true)
      expect(Array.isArray(arch.weaknesses)).toBe(true)
      expect(arch.nbaComparison).toHaveProperty('playerId')
      expect(arch.nbaComparison.reason).toHaveProperty('fr')
      expect(arch.nbaComparison.reason).toHaveProperty('en')
    }
  })

  it('has unique IDs', () => {
    const ids = ARCHETYPES.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('PLAN_TYPES', () => {
  it('has at least 9 plan types', () => {
    expect(PLAN_TYPES.length).toBeGreaterThanOrEqual(9)
  })

  it('each plan type has the required shape', () => {
    for (const plan of PLAN_TYPES) {
      expect(plan.id).toBeTruthy()
      expect(plan.label).toHaveProperty('fr')
      expect(plan.label).toHaveProperty('en')
      expect(typeof plan.skill).toBe('string')
      expect(typeof plan.color).toBe('string')
      expect(SKILL_KEYS).toContain(plan.skill)
    }
  })
})

// ─── classifyArchetype ─────────────────────────────────────────────────────────

describe('classifyArchetype', () => {
  it('classifies a sharpshooter (high shooting)', () => {
    const dna: SkillDNA = { shooting: 95, handling: 40, finishing: 50, defense: 30, iq: 60 }
    const result = classifyArchetype(dna)
    expect(result.id).toBe('sharpshooter')
  })

  it('classifies a rim runner (high finishing + defense)', () => {
    const dna: SkillDNA = { shooting: 30, handling: 35, finishing: 90, defense: 85, iq: 40 }
    const result = classifyArchetype(dna)
    expect(result.id).toBe('rimrunner')
  })

  it('classifies a lockdown defender (high defense + iq)', () => {
    const dna: SkillDNA = { shooting: 25, handling: 30, finishing: 40, defense: 95, iq: 90 }
    const result = classifyArchetype(dna)
    expect(result.id).toBe('lockdown')
  })

  it('classifies a do-it-all player (balanced, all high)', () => {
    const dna: SkillDNA = { shooting: 85, handling: 85, finishing: 85, defense: 85, iq: 85 }
    const result = classifyArchetype(dna)
    expect(result.id).toBe('doitall')
  })

  it('returns one of the 12 known archetypes', () => {
    const dna: SkillDNA = { shooting: 50, handling: 50, finishing: 50, defense: 50, iq: 50 }
    const result = classifyArchetype(dna)
    const ids = ARCHETYPES.map(a => a.id)
    expect(ids).toContain(result.id)
  })

  it('handles all zeros', () => {
    const dna: SkillDNA = { shooting: 0, handling: 0, finishing: 0, defense: 0, iq: 0 }
    const result = classifyArchetype(dna)
    expect(result).toBeDefined()
    expect(result.id).toBeTruthy()
  })

  it('handles all max values', () => {
    const dna: SkillDNA = { shooting: 100, handling: 100, finishing: 100, defense: 100, iq: 100 }
    const result = classifyArchetype(dna)
    expect(result).toBeDefined()
  })
})

// ─── detectWeaknesses ─────────────────────────────────────────────────────────

describe('detectWeaknesses', () => {
  it('returns no weaknesses when all skills >= 65', () => {
    const dna: SkillDNA = { shooting: 70, handling: 80, finishing: 65, defense: 90, iq: 75 }
    const weaknesses = detectWeaknesses(dna)
    expect(weaknesses).toEqual([])
  })

  it('detects critical weakness (< 35)', () => {
    const dna: SkillDNA = { shooting: 20, handling: 70, finishing: 70, defense: 70, iq: 70 }
    const weaknesses = detectWeaknesses(dna)
    const shooting = weaknesses.find(w => w.skill === 'shooting')
    expect(shooting).toBeDefined()
    expect(shooting!.severity).toBe('critical')
  })

  it('detects moderate weakness (35-49)', () => {
    const dna: SkillDNA = { shooting: 45, handling: 70, finishing: 70, defense: 70, iq: 70 }
    const weaknesses = detectWeaknesses(dna)
    const shooting = weaknesses.find(w => w.skill === 'shooting')
    expect(shooting!.severity).toBe('moderate')
  })

  it('detects minor weakness (50-64)', () => {
    const dna: SkillDNA = { shooting: 60, handling: 70, finishing: 70, defense: 70, iq: 70 }
    const weaknesses = detectWeaknesses(dna)
    const shooting = weaknesses.find(w => w.skill === 'shooting')
    expect(shooting!.severity).toBe('minor')
  })

  it('sorts critical weaknesses first', () => {
    const dna: SkillDNA = { shooting: 60, handling: 20, finishing: 40, defense: 70, iq: 70 }
    const weaknesses = detectWeaknesses(dna)
    expect(weaknesses[0].skill).toBe('handling')
    expect(weaknesses[0].severity).toBe('critical')
  })

  it('returns plan type matching the weak skill', () => {
    const dna: SkillDNA = { shooting: 20, handling: 70, finishing: 70, defense: 70, iq: 70 }
    const weaknesses = detectWeaknesses(dna)
    const shooting = weaknesses.find(w => w.skill === 'shooting')
    expect(shooting!.planType).toBe('shooting')
  })

  it('maps iq weakness to footwork plan', () => {
    const dna: SkillDNA = { shooting: 70, handling: 70, finishing: 70, defense: 70, iq: 30 }
    const weaknesses = detectWeaknesses(dna)
    const iqW = weaknesses.find(w => w.skill === 'iq')
    expect(iqW!.planType).toBe('footwork')
  })

  it('includes recommendation in both languages', () => {
    const dna: SkillDNA = { shooting: 20, handling: 70, finishing: 70, defense: 70, iq: 70 }
    const weaknesses = detectWeaknesses(dna)
    const shooting = weaknesses.find(w => w.skill === 'shooting')
    expect(shooting!.recommendation).toHaveProperty('fr')
    expect(shooting!.recommendation).toHaveProperty('en')
    expect(shooting!.recommendation.fr).toContain('20/100')
  })

  it('detects multiple weaknesses', () => {
    const dna: SkillDNA = { shooting: 20, handling: 30, finishing: 70, defense: 25, iq: 70 }
    const weaknesses = detectWeaknesses(dna)
    expect(weaknesses.length).toBeGreaterThanOrEqual(3)
  })
})

// ─── nbaAverageDNA ────────────────────────────────────────────────────────────

describe('nbaAverageDNA', () => {
  it('returns DNA with all 5 skills', () => {
    const dna = nbaAverageDNA()
    for (const key of SKILL_KEYS) {
      expect(dna[key]).toBeDefined()
      expect(dna[key]).toBeGreaterThan(0)
    }
  })

  it('all values are in a reasonable NBA range (50-80)', () => {
    const dna = nbaAverageDNA()
    for (const key of SKILL_KEYS) {
      expect(dna[key]).toBeGreaterThanOrEqual(50)
      expect(dna[key]).toBeLessThanOrEqual(80)
    }
  })
})

// ─── skillOverall ─────────────────────────────────────────────────────────────

describe('skillOverall', () => {
  it('returns the average of all skills', () => {
    const dna: SkillDNA = { shooting: 80, handling: 60, finishing: 70, defense: 50, iq: 90 }
    // (80+60+70+50+90)/5 = 350/5 = 70
    expect(skillOverall(dna)).toBe(70)
  })

  it('rounds to nearest integer', () => {
    const dna: SkillDNA = { shooting: 81, handling: 81, finishing: 81, defense: 81, iq: 76 }
    // (81*4+76)/5 = 400/5 = 80
    expect(skillOverall(dna)).toBe(80)
  })

  it('returns 0 for all zeros', () => {
    const dna: SkillDNA = { shooting: 0, handling: 0, finishing: 0, defense: 0, iq: 0 }
    expect(skillOverall(dna)).toBe(0)
  })
})

// ─── levelFromXP ──────────────────────────────────────────────────────────────

describe('levelFromXP', () => {
  it('returns level 1 with 0 XP', () => {
    const info = levelFromXP(0)
    expect(info.level).toBe(1)
    expect(info.title.en).toBe('Rookie')
  })

  it('returns level 2 after gaining enough XP', () => {
    // Level 1 needs 100 XP to advance (100 * 1 * 1.4^0 = 100)
    const info = levelFromXP(100)
    expect(info.level).toBe(2)
    expect(info.title.en).toBe('Prospect')
  })

  it('progress is 0 when at the start of a new level', () => {
    const info = levelFromXP(100)
    expect(info.xp).toBe(0)
    expect(info.progress).toBe(0)
  })

  it('progress increases with partial XP', () => {
    // Level 2 needs 140 XP to advance (100 * 2 * 1.4^1 = 280, capped at 2000)
    const info50 = levelFromXP(170) // 170 total: level 2 with 70 remaining
    expect(info50.level).toBe(2)
    expect(info50.progress).toBeGreaterThan(0)
    expect(info50.progress).toBeLessThan(100)
  })

  it('xpToNext is always positive', () => {
    const info = levelFromXP(0)
    expect(info.xpToNext).toBeGreaterThan(0)
  })

  it('capped title at Hall of Famer for very high levels', () => {
    // Use a very large XP number
    const info = levelFromXP(100_000)
    expect(info.level).toBeGreaterThan(10)
    // Title should be the last one in the array
    expect(info.title.en).toBe('Hall of Famer')
  })

  it('title progression follows expected sequence', () => {
    const titles = [
      levelFromXP(0).title.en,          // Rookie
      levelFromXP(100).title.en,        // Prospect
      levelFromXP(340).title.en,        // Starter (approx)
    ]
    expect(titles[0]).toBe('Rookie')
    expect(titles[1]).toBe('Prospect')
  })

  it('has both fr and en title', () => {
    const info = levelFromXP(0)
    expect(info.title).toHaveProperty('fr')
    expect(info.title).toHaveProperty('en')
  })
})

// ─── projectFutureSelf ────────────────────────────────────────────────────────

describe('projectFutureSelf', () => {
  it('returns higher values for positive weeks and adherence', () => {
    const dna: SkillDNA = { shooting: 50, handling: 50, finishing: 50, defense: 50, iq: 50 }
    const projected = projectFutureSelf(dna, 4, 1.0)
    for (const key of SKILL_KEYS) {
      expect(projected[key]).toBeGreaterThanOrEqual(dna[key])
    }
  })

  it('returns same DNA when weeksAhead is 0', () => {
    const dna: SkillDNA = { shooting: 50, handling: 50, finishing: 50, defense: 50, iq: 50 }
    const projected = projectFutureSelf(dna, 0, 1.0)
    for (const key of SKILL_KEYS) {
      expect(projected[key]).toBe(dna[key])
    }
  })

  it('returns same DNA when adherence is 0', () => {
    const dna: SkillDNA = { shooting: 50, handling: 50, finishing: 50, defense: 50, iq: 50 }
    const projected = projectFutureSelf(dna, 10, 0)
    for (const key of SKILL_KEYS) {
      expect(projected[key]).toBe(dna[key])
    }
  })

  it('caps all values at 99', () => {
    const dna: SkillDNA = { shooting: 99, handling: 99, finishing: 99, defense: 99, iq: 99 }
    const projected = projectFutureSelf(dna, 52, 1.0)
    for (const key of SKILL_KEYS) {
      expect(projected[key]).toBeLessThanOrEqual(99)
    }
  })

  it('shows diminishing returns for already high skills', () => {
    const low: SkillDNA = { shooting: 30, handling: 30, finishing: 30, defense: 30, iq: 30 }
    const high: SkillDNA = { shooting: 90, handling: 90, finishing: 90, defense: 90, iq: 90 }

    const projectedLow = projectFutureSelf(low, 10, 1.0)
    const projectedHigh = projectFutureSelf(high, 10, 1.0)

    // Low skills should gain more than high skills
    const lowGain = projectedLow.shooting - low.shooting
    const highGain = projectedHigh.shooting - high.shooting
    expect(lowGain).toBeGreaterThan(highGain)
  })
})

// ─── ACHIEVEMENTS ──────────────────────────────────────────────────────────────

describe('ACHIEVEMENTS (via iq-engine re-export)', () => {
  it('achievement conditions work correctly', async () => {
    // Import ACHIEVEMENTS through the module
    const { ACHIEVEMENTS } = await import('@/lib/player/iq-engine')
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0)

    // first_workout condition
    const firstWorkout = ACHIEVEMENTS.find(a => a.id === 'first_workout')
    expect(firstWorkout!.condition({ workoutsCount: 1, matchesCount: 0, currentStreak: 0, totalXP: 0, level: 1 })).toBe(true)
    expect(firstWorkout!.condition({ workoutsCount: 0, matchesCount: 0, currentStreak: 0, totalXP: 0, level: 1 })).toBe(false)
  })
})