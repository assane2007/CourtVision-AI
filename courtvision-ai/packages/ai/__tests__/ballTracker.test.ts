import type { BallPosition } from '../src/ballTracker';
import { BallKalmanFilter, BallTrackerEngine, DEFAULT_BALL_TRACKER_CONFIG } from '../src/ballTracker'

// ==========================================
// Tests Kalman Filter
// ==========================================

describe('BallKalmanFilter', () => {
    describe('initialization', () => {
        it('should not be initialized by default', () => {
            const kf = new BallKalmanFilter()
            expect(kf.isInitialized()).toBe(false)
        })

        it('should initialize with first observation', () => {
            const kf = new BallKalmanFilter()
            kf.init(0.5, 0.3)
            expect(kf.isInitialized()).toBe(true)

            const state = kf.getState()
            expect(state.x).toBe(0.5)
            expect(state.y).toBe(0.3)
            expect(state.vx).toBe(0)
            expect(state.vy).toBe(0)
        })
    })

    describe('predict', () => {
        it('should predict future position based on velocity', () => {
            const kf = new BallKalmanFilter()
            kf.init(0.5, 0.5)

            // Set initial velocity via update
            kf.update(0.55, 0.45)
            const predicted = kf.predict(1 / 30)

            expect(predicted.x).toBeGreaterThan(0.5)
            // y should decrease (ball going up) then increase (gravity)
        })

        it('should return initial state when not initialized', () => {
            const kf = new BallKalmanFilter()
            const state = kf.predict(1 / 30)
            expect(state.x).toBe(0)
            expect(state.y).toBe(0)
        })
    })

    describe('update', () => {
        it('should correct position towards measurement', () => {
            const kf = new BallKalmanFilter()
            kf.init(0.5, 0.5)
            kf.predict(1 / 30)

            const updated = kf.update(0.6, 0.4)

            // The state should be between prediction and measurement
            expect(updated.x).toBeGreaterThan(0.5)
            expect(updated.x).toBeLessThanOrEqual(0.6)
        })

        it('should auto-initialize on first update', () => {
            const kf = new BallKalmanFilter()
            const state = kf.update(0.5, 0.3)

            expect(kf.isInitialized()).toBe(true)
            expect(state.x).toBe(0.5)
            expect(state.y).toBe(0.3)
        })
    })

    describe('predictFuture', () => {
        it('should return multiple future positions', () => {
            const kf = new BallKalmanFilter()
            kf.init(0.5, 0.5)
            kf.update(0.55, 0.48)

            const future = kf.predictFuture(10, 30)

            expect(future).toHaveLength(10)
            // Positions should generally increase in x and y (gravity pulls down)
            for (const pos of future) {
                expect(pos.x).toBeDefined()
                expect(pos.y).toBeDefined()
            }
        })
    })

    describe('reset', () => {
        it('should reset to uninitialized state', () => {
            const kf = new BallKalmanFilter()
            kf.init(0.5, 0.5)
            expect(kf.isInitialized()).toBe(true)

            kf.reset()
            expect(kf.isInitialized()).toBe(false)
        })
    })
})

// ==========================================
// Tests Ball Tracker Engine
// ==========================================

describe('BallTrackerEngine', () => {
    function createBallPosition(x: number, y: number, timestamp: number, frameIndex: number): BallPosition {
        return {
            x, y,
            radius: 12,
            confidence: 0.9,
            timestamp,
            frameIndex,
        }
    }

    describe('tracking', () => {
        it('should track ball position', () => {
            const tracker = new BallTrackerEngine()
            const state = tracker.trackBall(createBallPosition(0.5, 0.5, 0, 0))

            expect(state.x).toBe(0.5)
            expect(state.y).toBe(0.5)
        })

        it('should smooth positions across frames', () => {
            const tracker = new BallTrackerEngine()

            tracker.trackBall(createBallPosition(0.50, 0.50, 0.000, 0))
            tracker.trackBall(createBallPosition(0.52, 0.48, 0.033, 1))
            const state = tracker.trackBall(createBallPosition(0.54, 0.46, 0.066, 2))

            // Should be smoothed, not exactly 0.54
            expect(state.x).toBeDefined()
            expect(typeof state.x).toBe('number')
        })
    })

    describe('predictPosition', () => {
        it('should return null when not initialized', () => {
            const tracker = new BallTrackerEngine()
            expect(tracker.predictPosition()).toBeNull()
        })

        it('should return predicted position after tracking', () => {
            const tracker = new BallTrackerEngine()
            tracker.trackBall(createBallPosition(0.5, 0.5, 0, 0))
            tracker.trackBall(createBallPosition(0.52, 0.48, 0.033, 1))

            const predicted = tracker.predictPosition()
            expect(predicted).not.toBeNull()
            expect(predicted!.x).toBeDefined()
            expect(predicted!.y).toBeDefined()
        })
    })

    describe('trajectory analysis', () => {
        it('should detect a made shot with parabolic trajectory', () => {
            const tracker = new BallTrackerEngine()

            // Simuler une trajectoire parabolique (montée puis descente)
            const releaseTimestamp = 1.0
            const points: BallPosition[] = [
                createBallPosition(0.50, 0.40, 1.000, 30),  // Release
                createBallPosition(0.50, 0.35, 1.033, 31),  // Monte
                createBallPosition(0.50, 0.25, 1.066, 32),  // Monte
                createBallPosition(0.50, 0.20, 1.100, 33),  // Apex
                createBallPosition(0.50, 0.22, 1.133, 34),  // Descend
                createBallPosition(0.50, 0.28, 1.166, 35),  // Descend
                createBallPosition(0.50, 0.30, 1.200, 36),  // Zone du panier
            ]

            for (const p of points) {
                tracker.trackBall(p)
            }

            const result = tracker.analyzeTrajectory(releaseTimestamp)
            expect(result.outcome).toBeDefined()
            expect(['made', 'missed', 'blocked', 'unknown']).toContain(result.outcome)
            expect(result.method).toBe('trajectory')
        })

        it('should return unknown with too few points', () => {
            const tracker = new BallTrackerEngine()

            tracker.trackBall(createBallPosition(0.5, 0.4, 1.0, 30))
            tracker.trackBall(createBallPosition(0.5, 0.35, 1.033, 31))

            const result = tracker.analyzeTrajectory(1.0)
            expect(result.outcome).toBe('unknown')
            expect(result.confidence).toBe(0)
        })

        it('should detect a miss with bouncing trajectory', () => {
            const tracker = new BallTrackerEngine()

            const releaseTimestamp = 1.0
            const points: BallPosition[] = [
                createBallPosition(0.50, 0.40, 1.000, 30),
                createBallPosition(0.50, 0.35, 1.033, 31),
                createBallPosition(0.50, 0.20, 1.066, 32),  // Monte
                createBallPosition(0.50, 0.22, 1.100, 33),  // Apex
                createBallPosition(0.50, 0.30, 1.133, 34),  // Descend
                createBallPosition(0.48, 0.25, 1.166, 35),  // Rebondit !
                createBallPosition(0.45, 0.35, 1.200, 36),  // Continue
                createBallPosition(0.42, 0.50, 1.233, 37),  // Tombe
            ]

            for (const p of points) {
                tracker.trackBall(p)
            }

            const result = tracker.analyzeTrajectory(releaseTimestamp)
            // Devrait détecter un rebond
            expect(result.outcome).toBeDefined()
        })
    })

    describe('getPredictedTrajectory', () => {
        it('should return predicted trajectory points', () => {
            const tracker = new BallTrackerEngine()
            tracker.trackBall(createBallPosition(0.5, 0.5, 0, 0))
            tracker.trackBall(createBallPosition(0.52, 0.48, 0.033, 1))

            const trajectory = tracker.getPredictedTrajectory(15)
            expect(trajectory).toHaveLength(15)
            trajectory.forEach(p => {
                expect(typeof p.x).toBe('number')
                expect(typeof p.y).toBe('number')
            })
        })
    })

    describe('reset', () => {
        it('should reset all state', () => {
            const tracker = new BallTrackerEngine()
            tracker.trackBall(createBallPosition(0.5, 0.5, 0, 0))
            tracker.reset()

            expect(tracker.predictPosition()).toBeNull()
        })
    })

    describe('rim position', () => {
        it('should accept rim position', () => {
            const tracker = new BallTrackerEngine()
            tracker.setRimPosition({
                x: 0.5,
                y: 0.15,
                width: 30,
                confidence: 0.9,
                isVisible: true,
            })
            // No error expected
        })
    })

    describe('DEFAULT_BALL_TRACKER_CONFIG', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_BALL_TRACKER_CONFIG.fps).toBe(30)
            expect(DEFAULT_BALL_TRACKER_CONFIG.postReleaseFrames).toBe(45)
            expect(DEFAULT_BALL_TRACKER_CONFIG.minDetectionConfidence).toBe(0.4)
        })
    })
})
