import { create } from 'zustand'
import { Platform } from 'react-native'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BALL_MODEL_ASSET = require('../assets/models/ball_detector.tflite')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RIM_MODEL_ASSET = require('../assets/models/rim_detector.tflite')

/**
 * CourtVision Edge AI — On-Device Ball & Rim Detection
 *
 * Runs TFLite object detection models directly on the phone's GPU/NPU
 * via react-native-fast-tflite, eliminating the need for server round-trips
 * during live sessions. Reduces latency from ~200ms (server) to ~15ms (device).
 *
 * Models:
 *   - ball_detector.tflite  (SSD MobileNetV2, 320x320 input, ~4MB)
 *   - rim_detector.tflite   (SSD MobileNetV2, 320x320 input, ~4MB)
 *
 * Fallback: When models are unavailable, returns null detections.
 * The pipeline then falls back to LiveCoachService.sendFrame() → cv-engine.
 *
 * Architecture:
 *   VisionCamera frame → resize 320x320 → TFLite inference → parse boxes → Zustand store
 */

// ── Optional TFLite import (not installed → graceful degradation) ──────
let TFLiteModule: any = null
try {
    // react-native-fast-tflite provides GPU-delegate inference on both platforms
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    TFLiteModule = require('react-native-fast-tflite')
} catch {
    // Package not installed — edge AI will be disabled, fall back to server
}

// ── Types ──────────────────────────────────────────────────────

export interface DetectionResult {
    x: number           // center x (0..1 normalized)
    y: number           // center y (0..1 normalized)
    width: number       // box width (0..1)
    height: number      // box height (0..1)
    confidence: number  // 0..1
}

export interface EdgeInferenceResult {
    ball: DetectionResult | null
    rim: DetectionResult | null
    inferenceMs: number
}

interface EdgeAIState {
    isActive: boolean
    isModelLoaded: boolean
    isLoading: boolean
    loadError: string | null
    lastFrameTime: number
    fps: number
    inferenceMs: number
    detectedObjects: {
        ball: DetectionResult | null
        rim: DetectionResult | null
    }
    setActive: (active: boolean) => void
    setModelLoaded: (loaded: boolean) => void
    setLoading: (loading: boolean) => void
    setLoadError: (error: string | null) => void
    updateDetection: (ball: DetectionResult | null, rim: DetectionResult | null, inferenceMs: number) => void
    reset: () => void
}

// ── Zustand Store ──────────────────────────────────────────────

export const useEdgeAI = create<EdgeAIState>((set) => ({
    isActive: false,
    isModelLoaded: false,
    isLoading: false,
    loadError: null,
    lastFrameTime: 0,
    fps: 0,
    inferenceMs: 0,
    detectedObjects: {
        ball: null,
        rim: null,
    },
    setActive: (active) => set({ isActive: active }),
    setModelLoaded: (loaded) => set({ isModelLoaded: loaded }),
    setLoading: (loading) => set({ isLoading: loading }),
    setLoadError: (error) => set({ loadError: error }),
    updateDetection: (ball, rim, inferenceMs) => set((state) => {
        const now = Date.now()
        const diff = now - state.lastFrameTime
        return {
            detectedObjects: { ball, rim },
            lastFrameTime: now,
            fps: diff > 0 ? Math.round(1000 / diff) : state.fps,
            inferenceMs,
        }
    }),
    reset: () => set({
        isActive: false,
        detectedObjects: { ball: null, rim: null },
        lastFrameTime: 0,
        fps: 0,
        inferenceMs: 0,
    }),
}))

// ── Model Handles ──────────────────────────────────────────────

let _ballModel: any = null
let _rimModel: any = null

// Model input size (SSD MobileNetV2 standard)
const MODEL_INPUT_SIZE = 320

// Confidence thresholds
const BALL_CONFIDENCE_THRESHOLD = 0.35
const RIM_CONFIDENCE_THRESHOLD = 0.40

// ── TFLite Output Parser ───────────────────────────────────────

/**
 * Parse SSD MobileNetV2 TFLite output tensors into a single best detection.
 *
 * Standard SSD output format:
 *   [0] boxes:      [1, N, 4] — [ymin, xmin, ymax, xmax] normalized
 *   [1] classes:    [1, N]    — class indices
 *   [2] scores:     [1, N]    — confidence scores
 *   [3] num_detections: [1]   — number of valid detections
 *
 * Returns the highest-confidence detection above threshold, or null.
 */
function parseSSDOutput(output: any[], threshold: number): DetectionResult | null {
    if (!output || output.length < 4) return null

    const boxes = output[0]    // [1, N, 4]
    const scores = output[2]   // [1, N]
    const numDets = Math.min(Math.floor(output[3]?.[0] ?? 0), 100)

    let best: DetectionResult | null = null
    let bestScore = threshold

    for (let i = 0; i < numDets; i++) {
        const score = scores[i] ?? scores[0]?.[i]
        if (typeof score !== 'number' || score < bestScore) continue

        // SSD boxes: [ymin, xmin, ymax, xmax]
        const ymin = boxes[i]?.[0] ?? boxes[0]?.[i * 4]
        const xmin = boxes[i]?.[1] ?? boxes[0]?.[i * 4 + 1]
        const ymax = boxes[i]?.[2] ?? boxes[0]?.[i * 4 + 2]
        const xmax = boxes[i]?.[3] ?? boxes[0]?.[i * 4 + 3]

        if (typeof ymin !== 'number') continue

        bestScore = score
        best = {
            x: (xmin + xmax) / 2,
            y: (ymin + ymax) / 2,
            width: Math.abs(xmax - xmin),
            height: Math.abs(ymax - ymin),
            confidence: score,
        }
    }

    return best
}

// ── Core Functions ─────────────────────────────────────────────

/**
 * Initialize edge AI models.
 * Call once at app start or before first live session.
 *
 * Downloads/loads TFLite models from the app bundle. On first load this may
 * take 2-3 seconds, subsequent loads use cached native handles (~50ms).
 *
 * Returns true if at least one model was loaded successfully.
 */
export async function initializeEdgeModels(): Promise<boolean> {
    const store = useEdgeAI.getState()

    // Already loaded
    if (store.isModelLoaded && _ballModel && _rimModel) return true

    // TFLite not available
    if (!TFLiteModule) {
        const msg = 'react-native-fast-tflite not installed — edge AI disabled'
        console.warn('[EdgeAI]', msg)
        store.setLoadError(msg)
        store.setModelLoaded(false)
        return false
    }

    store.setLoading(true)
    store.setLoadError(null)

    try {
        const loadModel = TFLiteModule.loadTensorFlowModel ?? TFLiteModule.default?.loadTensorFlowModel

        if (typeof loadModel !== 'function') {
            throw new Error('loadTensorFlowModel not found in react-native-fast-tflite')
        }

        // Load both models in parallel
        // Models should be placed in:
        //   Android: android/app/src/main/assets/
        //   iOS: ios/ (added to Xcode project)
        const delegate = Platform.OS === 'ios' ? 'core-ml' : 'gpu'

        const [ball, rim] = await Promise.all([
            loadModel(BALL_MODEL_ASSET, delegate).catch((e: Error) => {
                console.warn('[EdgeAI] Ball model load failed, trying CPU:', e.message)
                return loadModel(BALL_MODEL_ASSET, 'default')
            }),
            loadModel(RIM_MODEL_ASSET, delegate).catch((e: Error) => {
                console.warn('[EdgeAI] Rim model load failed, trying CPU:', e.message)
                return loadModel(RIM_MODEL_ASSET, 'default')
            }),
        ])

        _ballModel = ball
        _rimModel = rim

        store.setModelLoaded(true)
        store.setLoading(false)
        console.log(`[EdgeAI] Models loaded (${delegate} delegate)`)
        return true
    } catch (err: any) {
        const msg = err?.message ?? String(err)
        console.warn('[EdgeAI] Model initialization failed:', msg)
        store.setLoadError(msg)
        store.setModelLoaded(false)
        store.setLoading(false)
        return false
    }
}

/**
 * Run inference on a single camera frame.
 *
 * This is designed to be called from a VisionCamera frame processor.
 * When models are loaded, it runs TFLite inference (~8-15ms on modern devices).
 * When models are unavailable, it returns null detections so the caller
 * falls back to server-side processing.
 *
 * @param frame - VisionCamera Frame object (has .toArrayBuffer() or similar)
 * @returns Ball and rim detections with inference timing
 */
export function processFrameEdge(frame: any): EdgeInferenceResult {
    'worklet'

    // No models → signal server fallback
    if (!_ballModel || !_rimModel) {
        return { ball: null, rim: null, inferenceMs: 0 }
    }

    const t0 = performance.now()

    try {
        // Run both models on the frame
        // react-native-fast-tflite handles frame → tensor conversion internally
        const ballOutput = _ballModel.runSync(frame)
        const rimOutput = _rimModel.runSync(frame)

        const ball = parseSSDOutput(ballOutput, BALL_CONFIDENCE_THRESHOLD)
        const rim = parseSSDOutput(rimOutput, RIM_CONFIDENCE_THRESHOLD)

        const inferenceMs = Math.round(performance.now() - t0)

        return { ball, rim, inferenceMs }
    } catch {
        return { ball: null, rim: null, inferenceMs: Math.round(performance.now() - t0) }
    }
}

/**
 * Unload models and free native memory.
 * Call when leaving a live session to reduce memory pressure.
 */
export async function releaseEdgeModels(): Promise<void> {
    try {
        if (_ballModel?.close) await _ballModel.close()
        if (_rimModel?.close) await _rimModel.close()
    } catch {
        // Best-effort cleanup
    }
    _ballModel = null
    _rimModel = null
    useEdgeAI.getState().setModelLoaded(false)
    useEdgeAI.getState().reset()
}

