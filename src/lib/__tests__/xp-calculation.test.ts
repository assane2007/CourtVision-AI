import { describe, it, expect } from "vitest";
import {
  calculateWorkoutXp,
  calculateStreakXp,
  getLevelInfo,
  getLevelFromXp,
  getAchievementXp,
  getChallengeXp,
  getTotalXp,
  getLevelColor,
  getLevelBgColor,
} from "@/lib/xp";

// ── calculateWorkoutXp ──────────────────────────────────────────────────

describe("calculateWorkoutXp", () => {
  it("returns at least one workout reward for a valid score", () => {
    const rewards = calculateWorkoutXp(80, 10, 60, false);
    const workoutReward = rewards.find((r) => r.source === "workout");
    expect(workoutReward).toBeDefined();
    expect(workoutReward!.amount).toBeGreaterThan(0);
  });

  it("includes rep XP for reps > 0", () => {
    const rewards = calculateWorkoutXp(50, 10, 60, false);
    const repReward = rewards.find((r) => r.source === "rep");
    expect(repReward).toBeDefined();
    expect(repReward!.amount).toBe(10);
  });

  it("returns no rep reward for 0 reps", () => {
    const rewards = calculateWorkoutXp(50, 0, 60, false);
    const repReward = rewards.find((r) => r.source === "rep");
    expect(repReward).toBeUndefined();
  });

  it("caps rep XP at 30 even with more reps", () => {
    const rewards = calculateWorkoutXp(50, 100, 60, false);
    const repReward = rewards.find((r) => r.source === "rep");
    expect(repReward).toBeDefined();
    expect(repReward!.amount).toBe(30);
  });

  it("adds personal best bonus when isPersonalBest is true", () => {
    const rewards = calculateWorkoutXp(50, 0, 30, true);
    const bonusReward = rewards.find((r) => r.source === "bonus" && r.amount === 30);
    expect(bonusReward).toBeDefined();
  });

  it("does not add personal best bonus when false", () => {
    const rewards = calculateWorkoutXp(50, 0, 30, false);
    const pbBonus = rewards.find((r) => r.source === "bonus" && r.amount === 30);
    expect(pbBonus).toBeUndefined();
  });

  it("adds endurance bonus for duration > 30s", () => {
    const rewards = calculateWorkoutXp(50, 0, 60, false);
    const enduranceBonus = rewards.find((r) => r.source === "bonus");
    // No PB, so the only bonus would be from endurance
    expect(enduranceBonus).toBeDefined();
    expect(enduranceBonus!.amount).toBeGreaterThan(0);
  });

  it("no endurance bonus for duration ≤ 30s", () => {
    const rewards = calculateWorkoutXp(50, 0, 30, false);
    // No PB and duration exactly 30 → no bonus
    const bonuses = rewards.filter((r) => r.source === "bonus");
    expect(bonuses).toHaveLength(0);
  });

  it("score XP scales linearly from 10 (score=0) to 50 (score=100)", () => {
    const low = calculateWorkoutXp(0, 0, 0, false).find((r) => r.source === "workout")!;
    const high = calculateWorkoutXp(100, 0, 0, false).find((r) => r.source === "workout")!;
    expect(low.amount).toBe(10);
    expect(high.amount).toBe(50);
  });
});

// ── calculateStreakXp ───────────────────────────────────────────────────

describe("calculateStreakXp", () => {
  it("returns streak XP for streak 0", () => {
    const reward = calculateStreakXp(0);
    expect(reward.amount).toBe(20);
    expect(reward.source).toBe("streak");
  });

  it("streak 1 → 25", () => {
    const reward = calculateStreakXp(1);
    expect(reward.amount).toBe(25);
  });

  it("streak 5 → 45", () => {
    const reward = calculateStreakXp(5);
    expect(reward.amount).toBe(45);
  });

  it("streak 7 → 55 (capped at multiplier 7)", () => {
    const reward = calculateStreakXp(7);
    expect(reward.amount).toBe(55);
  });

  it("streak 10 → 55 (capped at 7)", () => {
    const reward = calculateStreakXp(10);
    expect(reward.amount).toBe(55);
  });

  it("streak 100 → 55 (still capped at 7)", () => {
    const reward = calculateStreakXp(100);
    expect(reward.amount).toBe(55);
  });
});

// ── getLevelInfo ────────────────────────────────────────────────────────

describe("getLevelInfo", () => {
  it("0 XP → level 1", () => {
    const info = getLevelInfo(0);
    expect(info.currentLevel).toBe(1);
    expect(info.xpInCurrentLevel).toBe(0);
    expect(info.isMaxLevel).toBe(false);
  });

  it("50 XP → level 2", () => {
    const info = getLevelInfo(50);
    expect(info.currentLevel).toBe(2);
    expect(info.xpInCurrentLevel).toBe(0);
  });

  it("100 XP → level 2 (50 XP into level 2)", () => {
    const info = getLevelInfo(100);
    expect(info.currentLevel).toBe(2);
    expect(info.xpInCurrentLevel).toBe(50);
  });

  it("300 XP → level 4", () => {
    const info = getLevelInfo(300);
    expect(info.currentLevel).toBe(4);
    expect(info.xpInCurrentLevel).toBe(0);
  });

  it("progress is between 0 and 1", () => {
    const info = getLevelInfo(75);
    expect(info.progress).toBeGreaterThanOrEqual(0);
    expect(info.progress).toBeLessThanOrEqual(1);
  });

  it("returns correct level titles", () => {
    expect(getLevelInfo(0).levelTitle).toBe("Débutant");
    expect(getLevelInfo(0).levelTitleEn).toBe("Rookie");
    expect(getLevelInfo(300).levelTitle).toBe("Joueur de rue");
    expect(getLevelInfo(300).levelTitleEn).toBe("Street Player");
  });

  it("max level (20) has isMaxLevel true and progress 1", () => {
    const info = getLevelInfo(99999);
    expect(info.currentLevel).toBe(20);
    expect(info.isMaxLevel).toBe(true);
    expect(info.progress).toBe(1);
    expect(info.xpForNextLevel).toBeNull();
  });

  it("xpNeededForNextLevel is null at max level", () => {
    const info = getLevelInfo(99999);
    expect(info.xpNeededForNextLevel).toBeNull();
  });
});

// ── getLevelFromXp ──────────────────────────────────────────────────────

describe("getLevelFromXp", () => {
  it("returns 1 for 0 XP", () => {
    expect(getLevelFromXp(0)).toBe(1);
  });

  it("returns 2 for 50 XP", () => {
    expect(getLevelFromXp(50)).toBe(2);
  });

  it("returns 3 for 150 XP", () => {
    expect(getLevelFromXp(150)).toBe(3);
  });

  it("returns 20 for max XP", () => {
    expect(getLevelFromXp(99999)).toBe(20);
  });

  it("returns 1 for 49 XP (just under level 2)", () => {
    expect(getLevelFromXp(49)).toBe(1);
  });
});

// ── getAchievementXp ────────────────────────────────────────────────────

describe("getAchievementXp", () => {
  it("returns 50 XP achievement reward", () => {
    const reward = getAchievementXp();
    expect(reward.amount).toBe(50);
    expect(reward.source).toBe("achievement");
  });
});

// ── getChallengeXp ──────────────────────────────────────────────────────

describe("getChallengeXp", () => {
  it("returns 100 XP challenge reward", () => {
    const reward = getChallengeXp();
    expect(reward.amount).toBe(100);
    expect(reward.source).toBe("challenge");
  });
});

// ── getTotalXp ──────────────────────────────────────────────────────────

describe("getTotalXp", () => {
  it("sums all reward amounts", () => {
    const rewards = [
      { amount: 10, source: "workout" as const, description: "test" },
      { amount: 20, source: "streak" as const, description: "test" },
      { amount: 5, source: "rep" as const, description: "test" },
    ];
    expect(getTotalXp(rewards)).toBe(35);
  });

  it("returns 0 for empty array", () => {
    expect(getTotalXp([])).toBe(0);
  });
});

// ── getLevelColor ───────────────────────────────────────────────────────

describe("getLevelColor", () => {
  it("returns gray for low levels", () => {
    expect(getLevelColor(1)).toBe("text-gray-400");
    expect(getLevelColor(2)).toBe("text-gray-400");
  });

  it("returns blue for levels 3-5", () => {
    expect(getLevelColor(3)).toBe("text-blue-400");
    expect(getLevelColor(5)).toBe("text-blue-400");
  });

  it("returns sky for levels 6-8", () => {
    expect(getLevelColor(6)).toBe("text-sky-400");
    expect(getLevelColor(8)).toBe("text-sky-400");
  });

  it("returns emerald for levels 9-11", () => {
    expect(getLevelColor(9)).toBe("text-emerald-400");
  });

  it("returns orange for levels 12-14", () => {
    expect(getLevelColor(12)).toBe("text-orange-400");
  });

  it("returns purple for levels 15-17", () => {
    expect(getLevelColor(15)).toBe("text-purple-400");
  });

  it("returns amber for levels 18+", () => {
    expect(getLevelColor(18)).toBe("text-amber-400");
    expect(getLevelColor(20)).toBe("text-amber-400");
  });
});

// ── getLevelBgColor ─────────────────────────────────────────────────────

describe("getLevelBgColor", () => {
  it("returns gray bg for low levels", () => {
    expect(getLevelBgColor(1)).toContain("bg-gray-500/20");
  });

  it("returns blue bg for levels 3-5", () => {
    expect(getLevelBgColor(3)).toContain("bg-blue-500/20");
  });

  it("returns sky bg for levels 6-8", () => {
    expect(getLevelBgColor(6)).toContain("bg-sky-500/20");
  });

  it("returns emerald bg for levels 9-11", () => {
    expect(getLevelBgColor(9)).toContain("bg-emerald-500/20");
  });

  it("returns orange bg for levels 12-14", () => {
    expect(getLevelBgColor(12)).toContain("bg-orange-500/20");
  });

  it("returns purple bg for levels 15-17", () => {
    expect(getLevelBgColor(15)).toContain("bg-purple-500/20");
  });

  it("returns amber bg for levels 18+", () => {
    expect(getLevelBgColor(18)).toContain("bg-amber-500/20");
  });
});