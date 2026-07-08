import { describe, it, expect } from "vitest";
import {
  calculateDrillXP,
  calculateWorkoutBonus,
  calculateStreakBonus,
  calculateLevel,
} from "@/lib/xp";

describe("calculateDrillXP", () => {
  it("sums floor(score/10) for each drill", () => {
    // scores [80, 70, 90] → floor(8) + floor(7) + floor(9) = 24
    const result = calculateDrillXP([
      { score: 80 },
      { score: 70 },
      { score: 90 },
    ]);
    expect(result).toBe(24);
  });

  it("floors each score properly", () => {
    // scores [85, 74, 99] → 8 + 7 + 9 = 24
    const result = calculateDrillXP([
      { score: 85 },
      { score: 74 },
      { score: 99 },
    ]);
    expect(result).toBe(24);
  });

  it("returns 0 for empty array", () => {
    expect(calculateDrillXP([])).toBe(0);
  });

  it("returns 0 for low scores", () => {
    expect(calculateDrillXP([{ score: 5 }, { score: 9 }])).toBe(0);
  });
});

describe("calculateWorkoutBonus", () => {
  it("returns 0 for fewer than 3 drills", () => {
    expect(calculateWorkoutBonus(0)).toBe(0);
    expect(calculateWorkoutBonus(1)).toBe(0);
    expect(calculateWorkoutBonus(2)).toBe(0);
  });

  it("returns 15 for 3 or more drills", () => {
    expect(calculateWorkoutBonus(3)).toBe(15);
    expect(calculateWorkoutBonus(5)).toBe(15);
    expect(calculateWorkoutBonus(10)).toBe(15);
  });
});

describe("calculateStreakBonus", () => {
  it("returns 0 for streak 0", () => {
    expect(calculateStreakBonus(0)).toBe(0);
  });

  it("streak 5 → 25", () => {
    expect(calculateStreakBonus(5)).toBe(25);
  });

  it("streak 10 → 35 (capped)", () => {
    expect(calculateStreakBonus(10)).toBe(35);
  });

  it("streak 8 → 35 (capped at 35)", () => {
    expect(calculateStreakBonus(8)).toBe(35);
  });

  it("streak 1 → 5", () => {
    expect(calculateStreakBonus(1)).toBe(5);
  });
});

describe("calculateLevel", () => {
  it("0 XP → level 1, current 0, next 100", () => {
    const result = calculateLevel(0);
    expect(result).toEqual({ level: 1, currentLevelXP: 0, nextLevelXP: 100 });
  });

  it("99 XP → level 1, current 99, next 100", () => {
    const result = calculateLevel(99);
    expect(result).toEqual({ level: 1, currentLevelXP: 99, nextLevelXP: 100 });
  });

  it("100 XP → level 2, current 0, next 200", () => {
    const result = calculateLevel(100);
    expect(result).toEqual({ level: 2, currentLevelXP: 0, nextLevelXP: 200 });
  });

  it("350 XP → level 4, current 50, next 400", () => {
    // Level 4: need 3*100=300 to enter, next is 4*100=400
    // currentLevelXP = 350 - 300 = 50
    const result = calculateLevel(350);
    expect(result).toEqual({ level: 4, currentLevelXP: 50, nextLevelXP: 400 });
  });

  it("150 XP → level 2, current 50, next 200", () => {
    const result = calculateLevel(150);
    expect(result).toEqual({ level: 2, currentLevelXP: 50, nextLevelXP: 200 });
  });

  it("300 XP → level 4, current 0, next 400", () => {
    const result = calculateLevel(300);
    expect(result).toEqual({ level: 4, currentLevelXP: 0, nextLevelXP: 400 });
  });
});