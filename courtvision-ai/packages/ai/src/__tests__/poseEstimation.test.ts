import { PoseEstimationEngine } from '../poseEstimation'

describe('PoseEstimationEngine', () => {
    it('returns deterministic landmarks for identical frame bytes', async () => {
        const engine = new PoseEstimationEngine({ enableSmoothing: false })
        await engine.initialize()

        const frame = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
        const first = await engine.processFrame(frame, 1, 1, 640, 480)
        const second = await engine.processFrame(frame, 2, 2, 640, 480)

        expect(first).not.toBeNull()
        expect(second).not.toBeNull()

        const a = first!.normalizedLandmarks.slice(0, 5).map((lm) => [lm.x, lm.y, lm.z, lm.visibility])
        const b = second!.normalizedLandmarks.slice(0, 5).map((lm) => [lm.x, lm.y, lm.z, lm.visibility])

        expect(a).toEqual(b)

        await engine.dispose()
    })

    it('returns different landmarks when frame bytes differ', async () => {
        const engine = new PoseEstimationEngine({ enableSmoothing: false })
        await engine.initialize()

        const frameA = new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88])
        const frameB = new Uint8Array([88, 77, 66, 55, 44, 33, 22, 11])

        const resultA = await engine.processFrame(frameA, 1, 1, 640, 480)
        const resultB = await engine.processFrame(frameB, 2, 2, 640, 480)

        expect(resultA).not.toBeNull()
        expect(resultB).not.toBeNull()

        const firstA = resultA!.normalizedLandmarks[0]
        const firstB = resultB!.normalizedLandmarks[0]

        expect(firstA.x).not.toBe(firstB.x)

        await engine.dispose()
    })
})
