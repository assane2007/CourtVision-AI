/**
 * XP & Leveling System for CourtVision AI
 *
 * XP Sources:
 * - Workout completion: 10-50 XP based on score
 * - Rep completion: 1-3 XP per rep
 * - Streak bonuses: +25 XP per day (max 7-day bonus)
 * - Achievement unlock: +50 XP
 * - Weekly challenge completion: +100 XP
 * - Personal best: +30 XP
 */

// Level thresholds (cumulative XP needed for each level)
const LEVEL_THRESHOLDS = [
  0,     // Level 1: 0 XP
  50,    // Level 2: 50 XP
  150,   // Level 3: 150 XP
  300,   // Level 4: 300 XP
  500,   // Level 5: 500 XP
  800,   // Level 6: 800 XP
  1200,  // Level 7: 1200 XP
  1700,  // Level 8: 1700 XP
  2400,  // Level 9: 2400 XP
  3200,  // Level 10: 3200 XP
  4200,  // Level 11
  5500,  // Level 12
  7000,  // Level 13
  9000,  // Level 14
  11500, // Level 15
  14500, // Level 16
  18000, // Level 17
  22000, // Level 18
  27000, // Level 19
  33000, // Level 20
]

const MAX_LEVEL = LEVEL_THRESHOLDS.length

export interface XpReward {
  amount: number
  source: 'workout' | 'streak' | 'achievement' | 'challenge' | 'bonus' | 'rep'
  description: string
}

export interface LevelInfo {
  currentLevel: number
  currentXp: number
  xpForCurrentLevel: number
  xpForNextLevel: number | null
  xpInCurrentLevel: number
  xpNeededForNextLevel: number | null
  progress: number // 0-1
  isMaxLevel: boolean
  levelTitle: string
  levelTitleEn: string
}

const LEVEL_TITLES: Record<number, { fr: string; en: string }> = {
  1:  { fr: 'Débutant', en: 'Rookie' },
  2:  { fr: 'Novice', en: 'Novice' },
  3:  { fr: 'Apprenti', en: 'Apprentice' },
  4:  { fr: 'Joueur de rue', en: 'Street Player' },
  5:  { fr: 'Régulier', en: 'Regular' },
  6:  { fr: 'Compétiteur', en: 'Competitor' },
  7:  { fr: 'Athlète', en: 'Athlete' },
  8:  { fr: 'Spécialiste', en: 'Specialist' },
  9:  { fr: 'Expert', en: 'Expert' },
  10: { fr: 'Élite', en: 'Elite' },
  11: { fr: 'Vétéran', en: 'Veteran' },
  12: { fr: 'Champion régional', en: 'Regional Champion' },
  13: { fr: 'Champion national', en: 'National Champion' },
  14: { fr: 'All-Star', en: 'All-Star' },
  15: { fr: 'MVP', en: 'MVP' },
  16: { fr: 'Légende', en: 'Legend' },
  17: { fr: 'Hall of Famer', en: 'Hall of Famer' },
  18: { fr: 'G.O.A.T.', en: 'G.O.A.T.' },
  19: { fr: 'Immortel', en: 'Immortal' },
  20: { fr: 'CourtVision Master', en: 'CourtVision Master' },
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXp(totalXp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) return i + 1
  }
  return 1
}

/**
 * Get detailed level info for a given XP total
 */
export function getLevelInfo(totalXp: number): LevelInfo {
  const currentLevel = getLevelFromXp(totalXp)
  const isMaxLevel = currentLevel >= MAX_LEVEL
  const xpForCurrentLevel = LEVEL_THRESHOLDS[currentLevel - 1] ?? 0
  const xpForNextLevel = isMaxLevel ? null : (LEVEL_THRESHOLDS[currentLevel] ?? null)
  const xpInCurrentLevel = totalXp - xpForCurrentLevel
  const xpNeededForNextLevel = xpForNextLevel !== null ? xpForNextLevel - xpForCurrentLevel : null
  const progress = isMaxLevel ? 1 : (xpInCurrentLevel / (xpNeededForNextLevel ?? 1))
  const titles = LEVEL_TITLES[currentLevel] ?? LEVEL_TITLES[MAX_LEVEL]!

  return {
    currentLevel,
    currentXp: totalXp,
    xpForCurrentLevel,
    xpForNextLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progress: Math.min(1, Math.max(0, progress)),
    isMaxLevel,
    levelTitle: titles.fr,
    levelTitleEn: titles.en,
  }
}

/**
 * Calculate XP reward for completing a workout
 */
export function calculateWorkoutXp(
  score: number,
  reps: number,
  durationSec: number,
  isPersonalBest: boolean,
): XpReward[] {
  const rewards: XpReward[] = []

  // Base XP from score (10-50)
  const scoreXp = Math.round(10 + (score / 100) * 40)
  rewards.push({
    amount: scoreXp,
    source: 'workout',
    description: `Exercice terminé — Score: ${score}/100`,
  })

  // XP from reps (1 per rep, max 30)
  const repXp = Math.min(30, reps)
  if (repXp > 0) {
    rewards.push({
      amount: repXp,
      source: 'rep',
      description: `${reps} répétitions`,
    })
  }

  // Duration bonus (0-10 XP for workouts > 30s)
  if (durationSec > 30) {
    const durationBonus = Math.min(10, Math.round((durationSec - 30) / 30))
    if (durationBonus > 0) {
      rewards.push({
        amount: durationBonus,
        source: 'bonus',
        description: `Bonus endurance (+${durationSec}s)`,
      })
    }
  }

  // Personal best bonus
  if (isPersonalBest) {
    rewards.push({
      amount: 30,
      source: 'bonus',
      description: 'Record personnel battu! 🏆',
    })
  }

  return rewards
}

/**
 * Calculate streak bonus XP
 */
export function calculateStreakXp(streakDays: number): XpReward {
  // Bonus increases with streak: 25, 30, 35, 40, 45, 50, 50+ (capped at 7)
  const multiplier = Math.min(streakDays, 7)
  const amount = 20 + multiplier * 5
  return {
    amount,
    source: 'streak',
    description: `Bonus série: ${streakDays} jour${streakDays > 1 ? 's' : ''} consécutif${streakDays > 1 ? 's' : ''}! 🔥`,
  }
}

/**
 * Calculate achievement unlock XP
 */
export function getAchievementXp(): XpReward {
  return {
    amount: 50,
    source: 'achievement',
    description: 'Succès débloqué! 🏅',
  }
}

/**
 * Calculate weekly challenge completion XP
 */
export function getChallengeXp(): XpReward {
  return {
    amount: 100,
    source: 'challenge',
    description: 'Défi hebdomadaire complété! 🎯',
  }
}

/**
 * Get total XP from an array of rewards
 */
export function getTotalXp(rewards: XpReward[]): number {
  return rewards.reduce((sum, r) => sum + r.amount, 0)
}

/**
 * Get level badge color based on level
 */
export function getLevelColor(level: number): string {
  if (level >= 18) return 'text-amber-400'
  if (level >= 15) return 'text-purple-400'
  if (level >= 12) return 'text-orange-400'
  if (level >= 9) return 'text-emerald-400'
  if (level >= 6) return 'text-sky-400'
  if (level >= 3) return 'text-blue-400'
  return 'text-gray-400'
}

/**
 * Get level badge background color
 */
export function getLevelBgColor(level: number): string {
  if (level >= 18) return 'bg-amber-500/20 border-amber-500/30'
  if (level >= 15) return 'bg-purple-500/20 border-purple-500/30'
  if (level >= 12) return 'bg-orange-500/20 border-orange-500/30'
  if (level >= 9) return 'bg-emerald-500/20 border-emerald-500/30'
  if (level >= 6) return 'bg-sky-500/20 border-sky-500/30'
  if (level >= 3) return 'bg-blue-500/20 border-blue-500/30'
  return 'bg-gray-500/20 border-gray-500/30'
}