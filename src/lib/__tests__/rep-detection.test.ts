import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectRep, type Landmark, type RepState } from "@/lib/scoring";

/** Create 33 landmarks with sensible defaults. Indices 11-28 have visibility 1. */
function makeLandmarks(overrides?: Partial<Record<number, Partial<Landmark>>>): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, (_, i) => ({
    x: 0.5,
    y: 0.3 + i * 0.01,
    z: 0,
    visibility: i >= 11 && i <= 28 ? 1 : 1,
  }));

  if (overrides) {
    for (const [idx, vals] of Object.entries(overrides)) {
      const i = Number(idx);
      if (lm[i] && vals) {
        Object.assign(lm[i], vals);
      }
    }
  }

  return lm;
}

/** Create a fresh RepState for each test */
function freshState(): RepState {
  return { buffer: [], lastRepTime: 0, threshold: 0.02 };
}

describe("detectRep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Edge cases ───

  it("no previous landmarks → returns no rep and all-zero scores", () => {
    const landmarks = makeLandmarks();
    const result = detectRep(landmarks, null, "ball_handling", freshState());
    expect(result.rep).toBe(false);
    expect(result.score).toEqual({ movement: 0, posture: 0, arms: 0, stance: 0 });
  });

  it("less than 33 landmarks → returns no rep and all-zero scores", () => {
    const short = makeLandmarks().slice(0, 20);
    const prev = makeLandmarks().slice(0, 20);
    const result = detectRep(short, prev, "ball_handling", freshState());
    expect(result.rep).toBe(false);
    expect(result.score).toEqual({ movement: 0, posture: 0, arms: 0, stance: 0 });
  });

  // ─── Static pose ───

  it("static pose (no movement) → movement score near 0, no rep", () => {
    const landmarks = makeLandmarks();
    const prev = makeLandmarks();
    const state = freshState();

    const result = detectRep(landmarks, prev, "defense", state);
    expect(result.rep).toBe(false);
    expect(result.score.movement).toBe(0);
  });

  // ─── pocket_ball ───

  it("pocket_ball: body drop + hand movement triggers rep", () => {
    const prev = makeLandmarks();
    // Nose drops (y increases in screen coords = lower), wrists move
    const landmarks = makeLandmarks({
      [0]: { y: prev[0].y + 0.02 },   // nose drops
      [15]: { y: prev[15].y + 0.02 },  // left wrist moves
      [16]: { y: prev[16].y + 0.02 },  // right wrist moves
    });
    const state = freshState();

    const result = detectRep(landmarks, prev, "pocket_ball", state);
    expect(result.rep).toBe(true);
  });

  // ─── ball_handling ───

  it("ball_handling: hand oscillation triggers rep", () => {
    const prev = makeLandmarks();
    const landmarks = makeLandmarks({
      [15]: { y: prev[15].y + 0.03 },  // left wrist moves down
      [16]: { y: prev[16].y - 0.03 },  // right wrist moves up
    });
    const state = freshState();

    const result = detectRep(landmarks, prev, "ball_handling", state);
    expect(result.rep).toBe(true);
  });

  // ─── defense ───

  it("defense: stance change triggers rep", () => {
    const prev = makeLandmarks({
      [25]: { x: 0.45 },  // left knee
      [26]: { x: 0.55 },  // right knee — wide stance
    });
    const landmarks = makeLandmarks({
      [25]: { x: 0.47 },  // knees closer
      [26]: { x: 0.53 },
    });
    const state = freshState();

    const result = detectRep(landmarks, prev, "defense", state);
    expect(result.rep).toBe(true);
  });

  // ─── shooting ───

  it("shooting: arm raise triggers rep", () => {
    vi.setSystemTime(1001); // shooting needs >1000ms gap from lastRepTime(0)
    const prev = makeLandmarks({
      [15]: { y: 0.6 },  // wrists low
      [16]: { y: 0.6 },
    });
    const landmarks = makeLandmarks({
      [15]: { y: 0.5 },  // wrists raised (y decreases = up)
      [16]: { y: 0.5 },
    });
    const state = freshState();

    const result = detectRep(landmarks, prev, "shooting", state);
    expect(result.rep).toBe(true);
  });

  // ─── Score ranges ───

  it("score components are in 0-100 range", () => {
    const prev = makeLandmarks();
    // Create some moderate movement
    const landmarks = makeLandmarks();
    for (let i = 11; i <= 28; i++) {
      landmarks[i] = { ...landmarks[i], x: prev[i].x + 0.02, y: prev[i].y + 0.01 };
    }

    const state = freshState();
    const result = detectRep(landmarks, prev, "default", state);

    expect(result.score.movement).toBeGreaterThanOrEqual(0);
    expect(result.score.movement).toBeLessThanOrEqual(100);
    expect(result.score.posture).toBeGreaterThanOrEqual(0);
    expect(result.score.posture).toBeLessThanOrEqual(100);
    expect(result.score.arms).toBeGreaterThanOrEqual(0);
    expect(result.score.arms).toBeLessThanOrEqual(100);
    expect(result.score.stance).toBeGreaterThanOrEqual(0);
    expect(result.score.stance).toBeLessThanOrEqual(100);
  });

  // ─── Movement prerequisite ───

  it("low movement → movement score is 0", () => {
    const prev = makeLandmarks();
    // Move each landmark only a tiny amount
    const landmarks = makeLandmarks();
    for (let i = 11; i <= 28; i++) {
      landmarks[i] = { ...landmarks[i], x: prev[i].x + 0.0001, y: prev[i].y };
    }

    const state = freshState();
    const result = detectRep(landmarks, prev, "default", state);

    // movement * 600 should be < 1, so effectively 0 after Math.min(100, ...)
    expect(result.score.movement).toBeLessThan(1);
  });

  // ─── Cooldown ───

  it("respects cooldown — rapid consecutive calls only trigger one rep", () => {
    const prev = makeLandmarks();
    const landmarks = makeLandmarks({
      [15]: { y: prev[15].y + 0.03 },
      [16]: { y: prev[16].y - 0.03 },
    });
    const state = freshState();

    const result1 = detectRep(landmarks, prev, "ball_handling", state);
    expect(result1.rep).toBe(true);

    // Immediately try again (same category, 400ms cooldown)
    const result2 = detectRep(landmarks, prev, "ball_handling", state);
    expect(result2.rep).toBe(false);
  });
});