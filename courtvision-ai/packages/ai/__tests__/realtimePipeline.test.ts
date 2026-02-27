import { RealtimePipelineEngine, PipelineEvent, PipelineFrameResult } from '../src/realtimePipeline'

// ==========================================
// Tests Realtime Pipeline
// ==========================================

describe('RealtimePipelineEngine', () => {
    describe('initialization', () => {
        it('should create pipeline with default config', () => {
            const pipeline = new RealtimePipelineEngine()
            const stats = pipeline.getStats()

            expect(stats.framesProcessed).toBe(0)
            expect(stats.shotsDetected).toBe(0)
            expect(stats.shotsMade).toBe(0)
            expect(stats.shotsMissed).toBe(0)
            expect(stats.fgPct).toBe(0)
        })

        it('should create pipeline with custom config', () => {
            const pipeline = new RealtimePipelineEngine({
                mode: 'lite',
                enableHaptic: false,
                minFrameIntervalMs: 50,
            })
            const stats = pipeline.getStats()
            expect(stats.framesProcessed).toBe(0)
        })

        it('should initialize the pose engine', async () => {
            const pipeline = new RealtimePipelineEngine()
            const events: PipelineEvent[] = []
            pipeline.on(e => events.push(e))

            await pipeline.initialize()

            expect(events.some(e => e.type === 'pipeline_initialized')).toBe(true)
        })
    })

    describe('processFrame', () => {
        it('should process a frame and return result', async () => {
            const pipeline = new RealtimePipelineEngine()
            await pipeline.initialize()

            const frameData = new Uint8Array(640 * 480 * 3)
            const result = await pipeline.processFrame(
                frameData, 0, 0, 640, 480
            )

            expect(result).toBeDefined()
            expect(result.timestamp).toBe(0)
            expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
        })

        it('should respect rate limiting', async () => {
            const pipeline = new RealtimePipelineEngine({
                minFrameIntervalMs: 100,
            })
            await pipeline.initialize()

            const frameData = new Uint8Array(100)

            // Première frame à t=0
            const r1 = await pipeline.processFrame(frameData, 0, 0, 640, 480)

            // Deuxième frame trop rapide (t=0.01s = 10ms < 100ms)
            const r2 = await pipeline.processFrame(frameData, 1, 0.01, 640, 480)

            // La deuxième devrait être un résultat vide (rate limited)
            expect(r2.pose).toBeNull()
            expect(r2.processingTimeMs).toBe(0)
        })

        it('should update stats after processing', async () => {
            const pipeline = new RealtimePipelineEngine()
            await pipeline.initialize()

            const frameData = new Uint8Array(100)
            await pipeline.processFrame(frameData, 0, 0, 640, 480)

            const stats = pipeline.getStats()
            expect(stats.framesProcessed).toBe(1)
        })
    })

    describe('session stats', () => {
        it('should track session stats correctly', async () => {
            const pipeline = new RealtimePipelineEngine()
            await pipeline.initialize()

            const stats = pipeline.getStats()
            expect(stats.framesProcessed).toBe(0)
            expect(stats.shotsDetected).toBe(0)
            expect(stats.fgPct).toBe(0)
            expect(stats.currentStreak).toBe(0)
            expect(stats.bestStreak).toBe(0)
            expect(stats.allShots).toHaveLength(0)
        })

        it('should reset session correctly', async () => {
            const pipeline = new RealtimePipelineEngine()
            await pipeline.initialize()

            const frameData = new Uint8Array(100)
            await pipeline.processFrame(frameData, 0, 0, 640, 480)

            pipeline.resetSession()
            const stats = pipeline.getStats()
            expect(stats.framesProcessed).toBe(0)
            expect(stats.allShots).toHaveLength(0)
        })
    })

    describe('manual resolution', () => {
        it('should accept manual shot resolution without error', async () => {
            const pipeline = new RealtimePipelineEngine()
            await pipeline.initialize()

            // Should not throw even when there's no pending shot
            expect(() => pipeline.resolveManual('made')).not.toThrow()
            expect(() => pipeline.resolveManual('missed')).not.toThrow()
        })
    })

    describe('events', () => {
        it('should emit pipeline_initialized event', async () => {
            const pipeline = new RealtimePipelineEngine()
            const events: PipelineEvent[] = []
            pipeline.on(e => events.push(e))

            await pipeline.initialize()

            expect(events).toHaveLength(1)
            expect(events[0].type).toBe('pipeline_initialized')
        })

        it('should emit pipeline_stopped event', async () => {
            const pipeline = new RealtimePipelineEngine()
            const events: PipelineEvent[] = []
            pipeline.on(e => events.push(e))

            await pipeline.initialize()
            await pipeline.stop()

            expect(events.some(e => e.type === 'pipeline_stopped')).toBe(true)
        })

        it('should allow unsubscribing from events', async () => {
            const pipeline = new RealtimePipelineEngine()
            const events: PipelineEvent[] = []
            const unsub = pipeline.on(e => events.push(e))

            await pipeline.initialize()
            unsub()
            await pipeline.stop()

            // Should only have the initialize event, not the stop event
            expect(events).toHaveLength(1)
            expect(events[0].type).toBe('pipeline_initialized')
        })
    })

    describe('stop', () => {
        it('should stop pipeline gracefully', async () => {
            const pipeline = new RealtimePipelineEngine()
            await pipeline.initialize()
            await pipeline.stop()

            // Processing after stop should still work (pose engine reinitializes)
            // But in practice, the engine is disposed
        })
    })

    describe('recording mode', () => {
        it('should skip pose estimation in recording mode', async () => {
            const pipeline = new RealtimePipelineEngine({ mode: 'recording' })
            await pipeline.initialize()

            const frameData = new Uint8Array(100)
            const result = await pipeline.processFrame(frameData, 0, 0, 640, 480)

            // In recording mode, pose should be null
            expect(result.pose).toBeNull()
        })
    })
})
