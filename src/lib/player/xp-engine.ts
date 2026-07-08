import { SkillKey, ACHIEVEMENTS, levelFromXP, PlanType } from "./iq-engine";
import type { Player } from "@prisma/client";

/**
 * Calculate workout XP (mirrors store.ts logWorkout logic).
 * baseXP comes from the active plan's xpReward, defaults to 50.
 */
export function calcWorkoutXP(
  baseXP: number,
  intensity: 1 | 2 | 3,
  drillCompletions: { completed: boolean }[]
) {
  const intensityMultiplier = intensity === 3 ? 1.5 : intensity === 1 ? 0.8 : 1;
  const completionRate =
    drillCompletions.filter((d) => d.completed).length /
    Math.max(1, drillCompletions.length);
  return Math.round(baseXP * intensityMultiplier * completionRate);
}

/**
 * Calculate skill gains for a workout (mirrors store.ts logWorkout).
 */
export function calcWorkoutSkillGains(
  planType: PlanType,
  intensity: 1 | 2 | 3,
  drillCompletions: { completed: boolean }[]
): Partial<Record<SkillKey, number>> {
  const intensityMultiplier = intensity === 3 ? 1.5 : intensity === 1 ? 0.8 : 1;
  const completionRate =
    drillCompletions.filter((d) => d.completed).length /
    Math.max(1, drillCompletions.length);
  const skillGainPoints = Math.round(1 + intensityMultiplier * completionRate * 2);

  const planTypeToSkill: Record<PlanType, SkillKey[]> = {
    shooting: ["shooting"],
    handling: ["handling"],
    finishing: ["finishing"],
    footwork: ["iq"],
    defense: ["defense"],
    conditioning: ["iq"],
    pocketBall: ["handling"],
    shifty: ["handling"],
    speedChange: ["finishing"],
  };

  const skillGains: Partial<Record<SkillKey, number>> = {};
  for (const sk of planTypeToSkill[planType]) {
    skillGains[sk] = skillGainPoints;
  }
  return skillGains;
}

/**
 * Calculate match XP (mirrors store.ts logMatch).
 */
export function calcMatchXP(matchData: {
  result: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
}) {
  const perfScore =
    matchData.points +
    matchData.rebounds * 1.5 +
    matchData.assists * 2 +
    matchData.steals * 3 +
    matchData.blocks * 3 -
    matchData.turnovers * 2;
  const winBonus = matchData.result === "W" ? 50 : 20;
  return Math.max(40, Math.round(50 + perfScore * 2 + winBonus));
}

/**
 * Calculate match skill gains (mirrors store.ts logMatch).
 */
export function calcMatchSkillGains(matchData: {
  fgAttempts: number;
  fgMade: number;
  assists: number;
  points: number;
  steals: number;
  blocks: number;
  turnovers: number;
}): Partial<Record<SkillKey, number>> {
  const skillGains: Partial<Record<SkillKey, number>> = {};
  if (matchData.fgAttempts > 0 && matchData.fgMade / matchData.fgAttempts > 0.5)
    skillGains.shooting = 2;
  if (matchData.assists >= 5) skillGains.handling = 1;
  if (matchData.points >= 15) skillGains.finishing = 1;
  if (matchData.steals + matchData.blocks >= 3) skillGains.defense = 2;
  if (matchData.turnovers <= 2 && matchData.assists >= 3) skillGains.iq = 1;
  return skillGains;
}

/**
 * Calculate new streak value.
 */
export function calcNewStreak(lastActivityDate: string | null, currentStreak: number): {
  streak: number;
  todayStr: string;
} {
  const today = new Date().toDateString();
  if (lastActivityDate === today) {
    return { streak: currentStreak, todayStr: today };
  }
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastActivityDate === yesterday) {
    return { streak: currentStreak + 1, todayStr: today };
  }
  return { streak: 1, todayStr: today };
}

/**
 * Apply skill gains to player DNA fields, capped at 99.
 */
export function applySkillGains(
  player: Player,
  skillGains: Partial<Record<SkillKey, number>>
): Record<SkillKey, number> {
  const currentDNA: Record<SkillKey, number> = {
    shooting: player.shooting,
    handling: player.handling,
    finishing: player.finishing,
    defense: player.defense,
    iq: player.iq,
  };
  for (const [sk, gain] of Object.entries(skillGains)) {
    currentDNA[sk as SkillKey] = Math.min(99, currentDNA[sk as SkillKey] + (gain ?? 0));
  }
  return currentDNA;
}

/**
 * Check for newly unlocked achievements.
 * Returns array of achievement IDs that should be unlocked.
 */
export function checkNewAchievements(
  workoutsCount: number,
  matchesCount: number,
  currentStreak: number,
  totalXP: number,
  alreadyUnlocked: string[]
): string[] {
  const level = levelFromXP(totalXP).level;
  const state = { workoutsCount, matchesCount, currentStreak, totalXP, level };
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(a.id)) continue;
    if (a.condition(state)) unlocked.push(a.id);
  }
  return unlocked;
}

/**
 * Calculate total XP from workouts, matches, and achievements.
 */
export function calcTotalXP(
  workoutsXP: number,
  matchesXP: number,
  achievementsCount: number
) {
  return workoutsXP + matchesXP + achievementsCount * 100;
}