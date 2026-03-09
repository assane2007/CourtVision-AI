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

export async function isCVEngineAvailable(): Promise<boolean> {
    const now = Date.now()
    if (_engineAvailable !== null && now - _lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
        return _engineAvailable
    }
    try {
        const res = await fetch(`${CV_ENGINE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        })
        _engineAvailable = res.ok
    } catch {
        _engineAvailable = false
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
    // Convert base64 to a Blob for multipart upload
    const binaryString = atob(frameBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' })

    const formData = new FormData()
    formData.append('frame_file', blob, 'frame.jpg')

    const response = await fetch(`${CV_ENGINE_URL}/analyze/frame`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(10000),
    })

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

    const response = await fetch(`${CV_ENGINE_URL}/analyze/frame`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
        throw new Error(`CV Engine error: ${response.status}`)
    }

    return response.json()
}
