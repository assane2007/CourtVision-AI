/**
 * Tests pour PipelineThrottler
 */

import { PipelineThrottler } from '../lib/pipelineThrottler'

describe('PipelineThrottler', () => {
    let throttler: PipelineThrottler

    beforeEach(() => {
        throttler = new PipelineThrottler({
            maxFps: 15,
            minFps: 5,
            burstFps: 25,
            processingTimeThresholdMs: 50,
            enableDynamicAdaptation: true,
            windowSize: 30,
        })
    })

    describe('basic functionality', () => {
        it('should allow first frame', () => {
            expect(throttler.shouldProcessFrame()).toBe(true)
        })

        it('should drop frames that are too close together', () => {
            // First frame is always processed
            throttler.shouldProcessFrame()
            
            // Second frame immediately after should be dropped (< 1000/15 = 66.7ms gap)
            const result = throttler.shouldProcessFrame()
            expect(result).toBe(false)
        })

        it('should track stats correctly', () => {
            throttler.shouldProcessFrame()
            throttler.shouldProcessFrame()
            throttler.shouldProcessFrame()

            const stats = throttler.getStats()
            expect(stats.totalFrames).toBe(3)
            expect(stats.droppedFrames).toBeGreaterThanOrEqual(0)
        })
    })

    describe('configuration', () => {
        it('should accept custom config', () => {
            const custom = new PipelineThrottler({ maxFps: 30, minFps: 10 })
            expect(custom.getTargetFps()).toBe(30)
        })

        it('should update config via configure()', () => {
            throttler.configure({ maxFps: 10 })
            expect(throttler.getTargetFps()).toBeLessThanOrEqual(10)
        })
    })

    describe('burst mode', () => {
        it('should activate burst mode', () => {
            throttler.activateBurst(3000)
            expect(throttler.getMode()).toBe('burst')
            expect(throttler.getTargetFps()).toBe(25)
        })

        it('should have higher FPS in burst mode', () => {
            const normalTarget = throttler.getTargetFps()
            throttler.activateBurst(5000)
            expect(throttler.getTargetFps()).toBeGreaterThan(normalTarget)
        })
    })

    describe('eco mode', () => {
        it('should activate eco mode', () => {
            throttler.activateEcoMode()
            expect(throttler.getMode()).toBe('eco')
            expect(throttler.getTargetFps()).toBe(5)
        })

        it('should deactivate eco mode', () => {
            throttler.activateEcoMode()
            throttler.deactivateEcoMode()
            expect(throttler.getMode()).toBe('normal')
        })

        it('should have lower FPS in eco mode', () => {
            throttler.activateEcoMode()
            const stats = throttler.getStats()
            expect(stats.targetFps).toBe(5)
            expect(stats.throttleReason).toBe('battery_low')
        })
    })

    describe('dynamic adaptation', () => {
        it('should reduce FPS when processing is slow', () => {
            throttler.shouldProcessFrame()
            
            // Report many slow processing times
            for (let i = 0; i < 10; i++) {
                throttler.reportProcessingTime(120) // Way over threshold
            }

            const stats = throttler.getStats()
            expect(stats.targetFps).toBeLessThanOrEqual(15)
            expect(stats.throttleReason).toBe('processing_slow')
        })

        it('should not throttle when processing is fast', () => {
            throttler.shouldProcessFrame()
            
            // Report fast processing times
            for (let i = 0; i < 10; i++) {
                throttler.reportProcessingTime(10) // Well under threshold
            }

            const stats = throttler.getStats()
            expect(stats.throttleReason).toBe('none')
        })
    })

    describe('reset', () => {
        it('should reset all state', () => {
            throttler.shouldProcessFrame()
            throttler.shouldProcessFrame()
            throttler.activateBurst()
            throttler.reportProcessingTime(100)

            throttler.reset()

            const stats = throttler.getStats()
            expect(stats.totalFrames).toBe(0)
            expect(stats.droppedFrames).toBe(0)
            expect(stats.mode).toBe('normal')
            expect(stats.throttleReason).toBe('none')
        })
    })

    describe('stats', () => {
        it('should compute drop rate', () => {
            // First frame is processed
            throttler.shouldProcessFrame()
            // Rapid fire → many drops
            for (let i = 0; i < 10; i++) {
                throttler.shouldProcessFrame()
            }

            const stats = throttler.getStats()
            expect(stats.dropRate).toBeGreaterThan(0)
        })

        it('should report average processing time', () => {
            throttler.reportProcessingTime(10)
            throttler.reportProcessingTime(20)
            throttler.reportProcessingTime(30)

            const avg = throttler.getAverageProcessingTime()
            expect(avg).toBe(20)
        })
    })
})
