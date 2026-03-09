import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera'
import { useEdgeAI, initializeEdgeModels, processFrameEdge, releaseEdgeModels } from '../../lib/edgeAI'

/**
 * EdgeVisionCamera — On-device ball & rim detection at 30+ FPS.
 *
 * Uses react-native-fast-tflite via VisionCamera frame processors to run
 * SSD MobileNetV2 models (ball_detector + rim_detector) directly on the
 * device GPU/NPU. Only sends JSON keypoints to the backend, reducing
 * bandwidth by 99% compared to video upload.
 *
 * When TFLite models are not bundled, displays "SERVER MODE" and the caller
 * should use LiveCoachService.sendFrame() instead.
 */

interface Props {
    isActive?: boolean
    onDetection?: (ball: { x: number; y: number; confidence: number } | null, rim: { x: number; y: number; confidence: number } | null) => void
}

export const EdgeVisionCamera = ({ isActive = true, onDetection }: Props) => {
    const device = useCameraDevice('back')
    const [hasPermission, setHasPermission] = useState(false)
    const { isModelLoaded, isLoading, fps, inferenceMs, detectedObjects } = useEdgeAI()

    useEffect(() => {
        ;(async () => {
            const status = await Camera.requestCameraPermission()
            setHasPermission(status === 'granted')
        })()
    }, [])

    // Load models on mount, release on unmount
    useEffect(() => {
        initializeEdgeModels()
        return () => { releaseEdgeModels() }
    }, [])

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet'
        const result = processFrameEdge(frame)
        // Update Zustand store from JS thread
        useEdgeAI.getState().updateDetection(result.ball, result.rim, result.inferenceMs)
    }, [])

    // Forward detections to parent
    useEffect(() => {
        if (onDetection) {
            onDetection(detectedObjects.ball, detectedObjects.rim)
        }
    }, [detectedObjects.ball, detectedObjects.rim, onDetection])

    if (!hasPermission) return <Text style={styles.text}>No Camera Permission</Text>
    if (device == null) return <Text style={styles.text}>No Camera Device Found</Text>

    const modeLabel = isModelLoaded ? 'EDGE AI' : 'SERVER MODE'
    const modeColor = isModelLoaded ? 'rgba(0, 255, 100, 0.2)' : 'rgba(255, 160, 0, 0.2)'
    const modeBorder = isModelLoaded ? 'rgba(0, 255, 100, 0.5)' : 'rgba(255, 160, 0, 0.5)'
    const modeText = isModelLoaded ? '#00FF66' : '#FFA000'

    return (
        <View style={StyleSheet.absoluteFill}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                frameProcessor={isModelLoaded ? frameProcessor : undefined}
                pixelFormat="yuv"
            />

            {/* Detection overlay: ball circle */}
            {detectedObjects.ball && (
                <View style={[styles.detectionCircle, {
                    left: `${detectedObjects.ball.x * 100}%` as any,
                    top: `${detectedObjects.ball.y * 100}%` as any,
                    borderColor: '#FF6B00',
                }]} />
            )}

            {/* Detection overlay: rim marker */}
            {detectedObjects.rim && (
                <View style={[styles.detectionCircle, {
                    left: `${detectedObjects.rim.x * 100}%` as any,
                    top: `${detectedObjects.rim.y * 100}%` as any,
                    borderColor: '#00BFFF',
                    width: 32,
                    height: 32,
                }]} />
            )}

            {/* Status overlay */}
            <View style={[styles.overlay, { backgroundColor: modeColor, borderColor: modeBorder }]}>
                <Text style={[styles.overlayText, { color: modeText }]}>
                    {isLoading ? 'LOADING MODELS...' : modeLabel}
                </Text>
                {isModelLoaded && (
                    <Text style={styles.overlaySubtext}>
                        {fps} FPS · {inferenceMs}ms
                        {detectedObjects.ball ? ' · 🏀' : ''}
                        {detectedObjects.rim ? ' · 🎯' : ''}
                    </Text>
                )}
                {!isModelLoaded && !isLoading && (
                    <Text style={styles.overlaySubtext}>Using server-side detection</Text>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    text: {
        color: 'white',
        alignSelf: 'center',
        marginTop: 100,
    },
    overlay: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    overlayText: {
        fontWeight: '900',
        fontFamily: 'monospace',
        fontSize: 12,
    },
    overlaySubtext: {
        color: 'white',
        fontSize: 10,
        opacity: 0.8,
        marginTop: 2,
    },
    detectionCircle: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        marginLeft: -12,
        marginTop: -12,
    },
})
