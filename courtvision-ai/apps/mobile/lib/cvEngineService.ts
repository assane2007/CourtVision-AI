/**
 * CV Engine Service — Direct HTTP client for the Python CV Engine.
 *
 * Sends camera frames (as JPEG blobs) to the CV Engine's /analyze/frame
 * endpoint and returns real pose estimation + object detection results.
 *
 * The CV Engine runs MediaPipe BlazePose + YOLOv8 and returns:
 * - 3D landmarks (33 BlazePose points)
 * - Skeleton (2D joint positions)
 * - Elbow & knee angles
 * - Player bounding boxes
 * - Ball bounding box
 */

import { Platform } from 'react-native'
import Constants from 'expo-constants'

// ── CV Engine URL ─────────────────────────────────────────────

export const CV_ENGINE_URL =
    Constants.expoConfig?.extra?.cvEngineUrl
    ?? process.env.EXPO_PUBLIC_CV_ENGINE_URL
    ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000')

// ── Response types (mirror of Python Pydantic models) ─────────

export interface Point2D {
    x: number
    y: number
    confidence: number
}

export interface Landmark3D {
    x: number
    y: number
    z: number
    visibility: number
}

export interface BBox {
    x1: number
    y1: number
    x2: number
    y2: number
    confidence: number
    label: string
    track_id?: number
}

export interface CVSkeleton {
    nose?: Point2D | null
    left_eye?: Point2D | null
    right_eye?: Point2D | null
    left_shoulder?: Point2D | null
    right_shoulder?: Point2D | null
    left_elbow?: Point2D | null
    right_elbow?: Point2D | null
    left_wrist?: Point2D | null
    right_wrist?: Point2D | null
    left_hip?: Point2D | null
    right_hip?: Point2D | null
    left_knee?: Point2D | null
    right_knee?: Point2D | null
    left_ankle?: Point2D | null
    right_ankle?: Point2D | null
}

export interface CVFrameResult {
    landmarks_3d: Landmark3D[] | null
    skeleton: CVSkeleton | null
    elbow_angle: number | null
    knee_angle: number | null
    players: BBox[]
    ball: BBox | null
    inference_ms: number
    success: boolean
}

// ── Health check ──────────────────────────────────────────────

let _engineAvailable: boolean | null = null
let _lastHealthCheck = 0
const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_FAILURE_RETRY_MS = 5_000

function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
    const timeoutFactory = (AbortSignal as any)?.timeout as ((ms: number) => AbortSignal) | undefined

    if (typeof timeoutFactory === 'function') {
        return {
            signal: timeoutFactory(timeoutMs),
            cleanup: () => { },
        }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timer),
    }
}

export async function isCVEngineAvailable(forceRefresh = false): Promise<boolean> {
    const now = Date.now()
    const currentInterval = _engineAvailable ? HEALTH_CHECK_INTERVAL_MS : HEALTH_CHECK_FAILURE_RETRY_MS
    if (!forceRefresh && _engineAvailable !== null && now - _lastHealthCheck < currentInterval) {
        return _engineAvailable
    }

    const { signal, cleanup } = createTimeoutSignal(3000)

    try {
        const res = await fetch(`${CV_ENGINE_URL}/health`, {
            method: 'GET',
            signal,
        })
        _engineAvailable = res.ok
    } catch {
        _engineAvailable = false
    } finally {
        cleanup()
    }

    _lastHealthCheck = now
    return _engineAvailable
}

// ── Frame analysis ────────────────────────────────────────────

/**
 * Send a camera frame to the CV Engine for real pose estimation.
 *
 * @param frameBase64 - JPEG image as base64 string (no data: prefix)
 * @returns CVFrameResult with real landmarks, angles, detections
 */
export async function analyzeFrame(frameBase64: string): Promise<CVFrameResult> {
    const normalizedBase64 = frameBase64.includes(',')
        ? frameBase64.slice(frameBase64.indexOf(',') + 1)
        : frameBase64

    const { signal, cleanup } = createTimeoutSignal(10000)
    let response: Response

    try {
        response = await fetch(`${CV_ENGINE_URL}/analyze/frame-base64`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ frame_base64: normalizedBase64 }),
            signal,
        })
    } finally {
        cleanup()
    }

    // Backward compatibility with older CV engines that only expose /analyze/frame.
    if (response.status === 404 || response.status === 405) {
        const formData = new FormData()
        formData.append('frame_file', {
            uri: `data:image/jpeg;base64,${normalizedBase64}`,
            name: 'frame.jpg',
            type: 'image/jpeg',
        } as any)

        const fallback = createTimeoutSignal(10000)
        try {
            response = await fetch(`${CV_ENGINE_URL}/analyze/frame`, {
                method: 'POST',
                body: formData,
                signal: fallback.signal,
            })
        } finally {
            fallback.cleanup()
        }
    }

    if (!response.ok) {
        throw new Error(`CV Engine error: ${response.status}`)
    }

    return response.json()
}

/**
 * Send a frame file URI (from expo-camera) to the CV Engine.
 * Useful on native where we have a file:// URI instead of base64.
 *
 * @param fileUri - Local file path (file:// URI from expo-camera)
 * @returns CVFrameResult
 */
export async function analyzeFrameFromUri(fileUri: string): Promise<CVFrameResult> {
    const formData = new FormData()
    formData.append('frame_file', {
        uri: fileUri,
        name: 'frame.jpg',
        type: 'image/jpeg',
    } as any)

    const { signal, cleanup } = createTimeoutSignal(10000)
    let response: Response

    try {
        response = await fetch(`${CV_ENGINE_URL}/analyze/frame`, {
            method: 'POST',
            body: formData,
            signal,
        })
    } finally {
        cleanup()
    }

    if (!response.ok) {
        throw new Error(`CV Engine error: ${response.status}`)
    }

    return response.json()
}
