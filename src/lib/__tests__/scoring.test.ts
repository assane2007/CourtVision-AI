import { describe, it, expect } from 'vitest';
import {
  computeScore,
  analyzeForm,
  createRepTracker,
  formatTime,
  getScoreColor,
  getGaugeColor,
  getStarCount,
} from '@/components/workout/scoring';
import type { ScoreDetail, Landmark, RepTracker } from '@/components/workout/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScore(overrides: Partial<ScoreDetail> = {}): ScoreDetail {
  return {
    posture: 80,
    stanceWidth: 70,
    armPosition: 75,
    movementQuality: 80,
    ...overrides,
  }
}

function makeLandmarks(overrides: Record<number, Partial<Landmark>> = {}): Landmark[] {
  const defaults: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  for (const [idx, lm] of Object.entries(overrides)) {
    Object.assign(defaults[Number(idx)], lm)
  }
  return defaults
}

function makeTracker(velocityHistory: number[] = []): RepTracker {
  return {
    lastPos: 0,
    direction: 'none',
    lastRepTime: 0,
    peakPositions: [],
    troughPositions: [],
    sampleCount: 0,
    totalMovement: 0,
    lastXPos: 0.5,
    lastYPos: 0.5,
    lastHipY: 0.5,
    lastWristY: 0.5,
    lastAnkleLX: 0.5,
    lastAnkleRX: 0.5,
    velocityHistory,
  }
}

// ─── computeScore ─────────────────────────────────────────────────────────────

describe('computeScore', () => {
  it('returns 0 for empty scores array', () => {
    expect(computeScore([])).toBe(0)
  })

  it('returns 0 when all movement quality is below 10 (prerequisite)', () => {
    const scores = Array.from({ length: 5 }, () =>
      makeScore({ movementQuality: 5, posture: 80, stanceWidth: 80, armPosition: 80 }),
    )
    expect(computeScore(scores)).toBe(0)
  })

  it('returns 100 for perfect scores', () => {
    const scores = Array.from({ length: 5 }, () =>
      makeScore({ movementQuality: 100, posture: 100, stanceWidth: 100, armPosition: 100 }),
    )
    // Weighted: 100*0.55 + 100*0.15 + 100*0.08 + 100*0.22 = 100
    expect(computeScore(scores)).toBe(100)
  })

  it('gives more weight to movement quality (55%)', () => {
    // Movement-heavy: high movement, low everything else
    const movementHeavy = [makeScore({ movementQuality: 100, posture: 0, stanceWidth: 0, armPosition: 0 })]
    // Form-heavy: low movement, high everything else
    const formHeavy = [makeScore({ movementQuality: 0, posture: 100, stanceWidth: 100, armPosition: 100 })]

    const movementResult = computeScore(movementHeavy)
    const formResult = computeScore(formHeavy)

    // Movement-heavy should produce higher score (55% weight vs 45% total for others)
    expect(movementResult).toBeGreaterThan(formResult)
  })

  it('only considers the last 10 scores (recent window)', () => {
    // 15 scores: first 5 are perfect, last 10 are all zero-movement
    const perfectScores = Array.from({ length: 5 }, () =>
      makeScore({ movementQuality: 100, posture: 100, stanceWidth: 100, armPosition: 100 }),
    )
    const badScores = Array.from({ length: 10 }, () =>
      makeScore({ movementQuality: 0, posture: 100, stanceWidth: 100, armPosition: 100 }),
    )
    const allScores = [...perfectScores, ...badScores]
    // The last 10 all have movementQuality=0, avgMovement < 10 → returns 0
    expect(computeScore(allScores)).toBe(0)
  })

  it('clamps score between 0 and 100', () => {
    // Can't really exceed 100 with the formula, but test the boundary
    const scores = [makeScore({ movementQuality: 100, posture: 100, stanceWidth: 100, armPosition: 100 })]
    const result = computeScore(scores)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(100)
  })

  it('computes weighted average correctly for known values', () => {
    // movementQuality=50, posture=0, stanceWidth=0, armPosition=0
    // Weighted: 50*0.55 + 0*0.15 + 0*0.08 + 0*0.22 = 27.5 → 28
    const scores = [makeScore({ movementQuality: 50, posture: 0, stanceWidth: 0, armPosition: 0 })]
    expect(computeScore(scores)).toBe(28)
  })
})

// ─── analyzeForm ──────────────────────────────────────────────────────────────

describe('analyzeForm', () => {
  it('returns high posture score when shoulders are level', () => {
    const landmarks = makeLandmarks({
      11: { x: 0.4, y: 0.3 }, // left shoulder
      12: { x: 0.6, y: 0.3 }, // right shoulder (same y = level)
      27: { x: 0.35, y: 0.9 }, // left ankle
      28: { x: 0.65, y: 0.9 }, // right ankle
    })
    const tracker = makeTracker([0.005, 0.005, 0.005, 0.005, 0.005])
    const result = analyzeForm(landmarks, 'ball_handling', tracker)
    // shoulderDy = 0, postureScore = 90
    expect(result.score.posture).toBe(90)
  })

  it('returns lower posture score when shoulders are tilted', () => {
    const landmarks = makeLandmarks({
      11: { x: 0.4, y: 0.2 }, // left shoulder
      12: { x: 0.6, y: 0.4 }, // right shoulder (0.2 diff → 0.2*600=120, clamped to 0)
      27: { x: 0.35, y: 0.9 },
      28: { x: 0.65, y: 0.9 },
    })
    const tracker = makeTracker([0.005, 0.005, 0.005, 0.005, 0.005])
    const result = analyzeForm(landmarks, 'ball_handling', tracker)
    // shoulderDy = 0.2, postureScore = max(0, 90 - 120) = 0
    expect(result.score.posture).toBe(0)
  })

  it('returns good stance score for proper ankle distance (0.15-0.45)', () => {
    const landmarks = makeLandmarks({
      11: { x: 0.4, y: 0.3 },
      12: { x: 0.6, y: 0.3 },
      27: { x: 0.3, y: 0.9 },  // left ankle
      28: { x: 0.7, y: 0.9 },  // right ankle — dist=0.4, in (0.15, 0.45)
    })
    const tracker = makeTracker([0.005, 0.005, 0.005, 0.005, 0.005])
    const result = analyzeForm(landmarks, 'ball_handling', tracker)
    expect(result.score.stanceWidth).toBe(85)
  })

  it('returns bad stance score for too narrow ankle distance (<0.1)', () => {
    const landmarks = makeLandmarks({
      11: { x: 0.4, y: 0.3 },
      12: { x: 0.6, y: 0.3 },
      27: { x: 0.48, y: 0.9 },
      28: { x: 0.52, y: 0.9 }, // dist=0.04 < 0.1
    })
    const tracker = makeTracker([0.005, 0.005, 0.005, 0.005, 0.005])
    const result = analyzeForm(landmarks, 'ball_handling', tracker)
    expect(result.score.stanceWidth).toBe(15)
  })

  it('returns bad stance score for too wide ankle distance (>0.55)', () => {
    const landmarks = makeLandmarks({
      11: { x: 0.4, y: 0.3 },
      12: { x: 0.6, y: 0.3 },
      27: { x: 0.1, y: 0.9 },
      28: { x: 0.9, y: 0.9 }, // dist=0.8 > 0.55
    })
    const tracker = makeTracker([0.005, 0.005, 0.005, 0.005, 0.005])
    const result = analyzeForm(landmarks, 'ball_handling', tracker)
    expect(result.score.stanceWidth).toBe(20)
  })

  it('returns both score and feedback string', () => {
    const landmarks = makeLandmarks({
      11: { x: 0.4, y: 0.3 },
      12: { x: 0.6, y: 0.3 },
      27: { x: 0.3, y: 0.9 },
      28: { x: 0.7, y: 0.9 },
    })
    const tracker = makeTracker([0.005, 0.005, 0.005, 0.005, 0.005])
    const result = analyzeForm(landmarks, 'ball_handling', tracker)
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('feedback')
    expect(typeof result.feedback).toBe('string')
  })
})

// ─── createRepTracker ─────────────────────────────────────────────────────────

describe('createRepTracker', () => {
  it('returns object with all expected fields initialized', () => {
    const tracker = createRepTracker()
    const expectedKeys = [
      'lastPos', 'direction', 'lastRepTime', 'peakPositions', 'troughPositions',
      'sampleCount', 'totalMovement', 'lastXPos', 'lastYPos', 'lastHipY',
      'lastWristY', 'lastAnkleLX', 'lastAnkleRX', 'velocityHistory',
    ]
    for (const key of expectedKeys) {
      expect(tracker).toHaveProperty(key)
    }
  })

  it('all numeric fields start at 0', () => {
    const tracker = createRepTracker()
    expect(tracker.lastPos).toBe(0)
    expect(tracker.lastRepTime).toBe(0)
    expect(tracker.sampleCount).toBe(0)
    expect(tracker.totalMovement).toBe(0)
    expect(tracker.lastXPos).toBe(0)
    expect(tracker.lastYPos).toBe(0)
    expect(tracker.lastHipY).toBe(0)
    expect(tracker.lastWristY).toBe(0)
    expect(tracker.lastAnkleLX).toBe(0)
    expect(tracker.lastAnkleRX).toBe(0)
  })

  it('array fields start empty', () => {
    const tracker = createRepTracker()
    expect(tracker.peakPositions).toEqual([])
    expect(tracker.troughPositions).toEqual([])
    expect(tracker.velocityHistory).toEqual([])
  })

  it('direction starts as "none"', () => {
    const tracker = createRepTracker()
    expect(tracker.direction).toBe('none')
  })
})

// ─── formatTime ───────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats 0 seconds as "0:00"', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('formats 65 seconds as "1:05"', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('formats 3661 seconds as "61:01"', () => {
    expect(formatTime(3661)).toBe('61:01')
  })

  it('pads single-digit seconds', () => {
    expect(formatTime(5)).toBe('0:05')
  })
})

// ─── getScoreColor ────────────────────────────────────────────────────────────

describe('getScoreColor', () => {
  it('returns red for score 0', () => {
    expect(getScoreColor(0)).toBe('text-red-400')
  })

  it('returns red for score 39', () => {
    expect(getScoreColor(39)).toBe('text-red-400')
  })

  it('returns orange for score 50', () => {
    expect(getScoreColor(50)).toBe('text-orange-400')
  })

  it('returns orange for score 59', () => {
    expect(getScoreColor(59)).toBe('text-orange-400')
  })

  it('returns orange for score 60', () => {
    expect(getScoreColor(60)).toBe('text-orange-400')
  })

  it('returns orange for score 79', () => {
    expect(getScoreColor(79)).toBe('text-orange-400')
  })

  it('returns emerald for score 80', () => {
    expect(getScoreColor(80)).toBe('text-emerald-400')
  })

  it('returns emerald for score 89', () => {
    expect(getScoreColor(89)).toBe('text-emerald-400')
  })

  it('returns emerald for score 90', () => {
    expect(getScoreColor(90)).toBe('text-emerald-400')
  })

  it('returns emerald for score 100', () => {
    expect(getScoreColor(100)).toBe('text-emerald-400')
  })
})

// ─── getGaugeColor ────────────────────────────────────────────────────────────

describe('getGaugeColor', () => {
  it('returns red for score 0', () => {
    expect(getGaugeColor(0)).toBe('#f87171')
  })

  it('returns amber for score 39', () => {
    expect(getGaugeColor(39)).toBe('#fbbf24')
  })

  it('returns amber for score 50', () => {
    expect(getGaugeColor(50)).toBe('#fbbf24')
  })

  it('returns amber for score 59', () => {
    expect(getGaugeColor(59)).toBe('#fbbf24')
  })

  it('returns green-400 for score 60', () => {
    expect(getGaugeColor(60)).toBe('#4ade80')
  })

  it('returns green-400 for score 79', () => {
    expect(getGaugeColor(79)).toBe('#4ade80')
  })

  it('returns emerald for score 80', () => {
    expect(getGaugeColor(80)).toBe('#34d399')
  })

  it('returns emerald for score 89', () => {
    expect(getGaugeColor(89)).toBe('#34d399')
  })

  it('returns emerald for score 90', () => {
    expect(getGaugeColor(90)).toBe('#34d399')
  })

  it('returns emerald for score 100', () => {
    expect(getGaugeColor(100)).toBe('#34d399')
  })
})

// ─── getStarCount ─────────────────────────────────────────────────────────────

describe('getStarCount', () => {
  it('returns 1 star for score 0', () => {
    expect(getStarCount(0)).toBe(1)
  })

  it('returns 1 star for score 39', () => {
    expect(getStarCount(39)).toBe(1)
  })

  it('returns 2 stars for score 50', () => {
    expect(getStarCount(50)).toBe(2)
  })

  it('returns 2 stars for score 59', () => {
    expect(getStarCount(59)).toBe(2)
  })

  it('returns 3 stars for score 60', () => {
    expect(getStarCount(60)).toBe(3)
  })

  it('returns 3 stars for score 74', () => {
    expect(getStarCount(74)).toBe(3)
  })

  it('returns 4 stars for score 79', () => {
    expect(getStarCount(79)).toBe(4)
  })

  it('returns 4 stars for score 80', () => {
    expect(getStarCount(80)).toBe(4)
  })

  it('returns 4 stars for score 89', () => {
    expect(getStarCount(89)).toBe(4)
  })

  it('returns 5 stars for score 90', () => {
    expect(getStarCount(90)).toBe(5)
  })

  it('returns 5 stars for score 100', () => {
    expect(getStarCount(100)).toBe(5)
  })
})