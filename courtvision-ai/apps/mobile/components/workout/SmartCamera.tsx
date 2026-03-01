/**
 * SmartCamera — Caméra augmentée avec pipeline IA en temps réel.
 *
 * Remplace LiveCamera en ajoutant :
 * - Overlay AR (squelette, arc, bio indicators)
 * - Détection de tir automatique
 * - Feedback instantané visuel + haptique
 * - Boutons make/miss manuels
 * - Stats en temps réel
 *
 * Architecture :
 * - expo-camera pour la capture
 * - useRealtimeAI pour le pipeline IA
 * - AROverlayView pour le rendu AR
 * - Capture frame toutes les ~33ms (30fps) en mode performance
 *
 * Usage :
 *   <SmartCamera
 *     active={true}
 *     onShotDetected={(shot) => console.log(shot)}
 *     showDebug={__DEV__}
 *   />
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    SlideInDown,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated'
import { T, typePresets } from '../../lib/theme'
import { AROverlayView } from './AROverlayView'
import { FrameCaptureService, type CapturedFrame } from '../../lib/frameCapture'
import type { DetectedShot, ARFeedback } from '../../lib/realtimeAIService'

const type = typePresets

// ==========================================
// Types
// ==========================================

interface SmartCameraProps {
    /** La caméra est active et capture des frames */
    active: boolean
    /** Quart-temps en cours (pour les stats) */
    quarter?: number
    /** Afficher les infos de debug */
    showDebug?: boolean
    /** Mode compact (petite preview) */
    compact?: boolean
    /** Mode plein écran */
    fullscreen?: boolean
    /** Callback quand un tir est détecté */
    onShotDetected?: (shot: DetectedShot) => void
    /** Callback quand un tir est enregistré manuellement */
    onManualShot?: (outcome: 'made' | 'missed') => void
    /** Afficher les boutons make/miss */
    showManualButtons?: boolean
    /** FPS du pipeline (fourni par le parent) */
    fps?: number
    /** Phase de tir (fourni par le parent) */
    shotPhase?: string
    /** Score de posture actuel */
    postureQuality?: number
    /** Dernière frame AR */
    arFrame?: any
    /** Dernier feedback */
    feedback?: ARFeedback | null
    /** Callback pour traiter une frame capturée (envoyée au pipeline IA) */
    onFrameCaptured?: (frame: CapturedFrame) => Promise<void>
    /** Mode démo activé (pas de capture réelle) */
    isDemoMode?: boolean
    /** FPS cible de capture (défaut: 10) */
    captureTargetFps?: number
}

// ==========================================
// Composant
// ==========================================

export function SmartCamera({
    active,
    quarter = 1,
    showDebug = false,
    compact = false,
    fullscreen = false,
    onShotDetected,
    onManualShot,
    showManualButtons = true,
    fps = 0,
    shotPhase = 'idle',
    postureQuality = 0,
    arFrame = null,
    feedback = null,
    onFrameCaptured,
    isDemoMode = false,
    captureTargetFps = 10,
}: SmartCameraProps) {
    const [permission, requestPermission] = useCameraPermissions()
    const [facing, setFacing] = useState<CameraType>('back')
    const [cameraReady, setCameraReady] = useState(false)
    const [layout, setLayout] = useState({ width: 0, height: 0 })
    const [captureStats, setCaptureStats] = useState({ fps: 0, dropped: 0 })
    const cameraRef = useRef<CameraView>(null)
    const frameCaptureRef = useRef<FrameCaptureService | null>(null)

    // Pulse animation for recording indicator
    const pulseOpacity = useSharedValue(1)
    useEffect(() => {
        if (active) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.3, { duration: 800 }),
                    withTiming(1, { duration: 800 }),
                ),
                -1,
                true,
            )
        }
    }, [active])

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }))

    const toggleFacing = useCallback(() => {
        setFacing((prev: CameraType) => prev === 'back' ? 'front' : 'back')
    }, [])

    const handleLayout = useCallback((event: any) => {
        const { width, height } = event.nativeEvent.layout
        setLayout({ width, height })
    }, [])

    // ---- Frame Capture Integration ----
    // Start/stop real frame capture when camera is active and ready (non-demo mode)
    useEffect(() => {
        if (!active || !cameraReady || isDemoMode || !onFrameCaptured) {
            // Stop capture if not active
            if (frameCaptureRef.current?.isActive()) {
                frameCaptureRef.current.stop()
            }
            return
        }

        // Initialize frame capture service
        const captureService = new FrameCaptureService()
        captureService.configure({
            targetFps: captureTargetFps,
            quality: 0.4,         // Low quality for speed
            includeBase64: true,   // Needed for IA pipeline
            resizeWidth: 640,
            enableFrameSkip: true,
        })
        frameCaptureRef.current = captureService

        // Start capturing frames and forwarding to IA pipeline
        captureService.start(cameraRef, async (frame: CapturedFrame) => {
            try {
                await onFrameCaptured(frame)
            } catch (err) {
                if (__DEV__) console.debug('[SmartCamera] Frame processing error:', err)
            }
        })

        // Update capture stats periodically
        const statsInterval = setInterval(() => {
            if (frameCaptureRef.current) {
                const stats = frameCaptureRef.current.getStats()
                setCaptureStats({ fps: stats.effectiveFps, dropped: stats.dropRate })
            }
        }, 2000)

        return () => {
            captureService.stop()
            clearInterval(statsInterval)
            frameCaptureRef.current = null
        }
    }, [active, cameraReady, isDemoMode, onFrameCaptured, captureTargetFps])

    // ---- Permission screen ----
    if (!permission) return null

    if (!permission.granted) {
        return (
            <View style={[styles.container, compact && styles.compact, fullscreen && styles.fullscreen]}>
                <View style={styles.permissionBox}>
                    <View style={styles.permissionIconCircle}>
                        <Feather name="camera" size={32} color={T.color.signature.primary} />
                    </View>
                    <Text style={styles.permissionTitle}>Caméra requise</Text>
                    <Text style={styles.permissionText}>
                        CourtVision AI utilise la caméra pour analyser ta mécanique de tir en temps réel avec l'IA.
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Text style={styles.permissionBtnText}>Autoriser la caméra</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    if (!active) return null

    // ---- Camera + AR Overlay ----
    return (
        <View
            style={[styles.container, compact && styles.compact, fullscreen && styles.fullscreen]}
            onLayout={handleLayout}
        >
            {/* Camera feed */}
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                onCameraReady={() => setCameraReady(true)}
            >
                {/* AR Overlay (sur la caméra) */}
                {layout.width > 0 && layout.height > 0 ? (
                    <AROverlayView
                        frame={arFrame}
                        feedback={feedback}
                        width={layout.width}
                        height={layout.height}
                        showDebug={showDebug}
                        shotPhase={shotPhase}
                        fps={fps}
                        postureQuality={postureQuality}
                    />
                ) : null}

                {/* Top bar — status + controls */}
                <View style={styles.topBar}>
                    {/* Recording indicator */}
                    <View style={styles.statusPill}>
                        <Animated.View style={[styles.recordDot, pulseStyle]} />
                        <Text style={styles.statusText}>
                            {cameraReady
                                ? isDemoMode ? 'DEMO' : `AI ${captureStats.fps > 0 ? `${captureStats.fps}fps` : 'Active'}`
                                : 'Loading...'}
                        </Text>
                    </View>

                    {/* Controls */}
                    <View style={styles.topControls}>
                        {/* Flip camera */}
                        <TouchableOpacity style={styles.controlBtn} onPress={toggleFacing}>
                            <Feather name="refresh-cw" size={18} color={T.color.text.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom bar — manual shot buttons */}
                {showManualButtons && !compact ? (
                    <Animated.View
                        entering={SlideInDown.duration(300)}
                        style={styles.bottomBar}
                    >
                        <TouchableOpacity
                            style={[styles.shotBtn, styles.missBtn]}
                            onPress={() => onManualShot?.('missed')}
                            activeOpacity={0.7}
                        >
                            <Feather name="x" size={20} color={T.color.semantic.error} />
                            <Text style={[styles.shotBtnText, { color: T.color.semantic.error }]}>Miss</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.shotBtn, styles.makeBtn]}
                            onPress={() => onManualShot?.('made')}
                            activeOpacity={0.7}
                        >
                            <Feather name="check" size={20} color={T.color.semantic.success} />
                            <Text style={[styles.shotBtnText, { color: T.color.semantic.success }]}>Make</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ) : null}
            </CameraView>
        </View>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 280,
        borderRadius: T.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: T.color.background.primary,
    },
    compact: {
        height: 140,
        borderRadius: T.borderRadius.md,
    },
    fullscreen: {
        height: '100%' as any,
        borderRadius: 0,
    },
    camera: {
        flex: 1,
    },

    // Top bar
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'ios' ? 8 : 8,
        paddingBottom: 8,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5,10,18,0.75)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    recordDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: T.color.semantic.error,
        marginRight: 6,
    },
    statusText: {
        color: T.color.text.primary,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    topControls: {
        flexDirection: 'row',
        gap: 8,
    },
    controlBtn: {
        backgroundColor: 'rgba(5,10,18,0.75)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: T.color.border.base,
    },

    // Bottom bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 12,
    },
    shotBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        minWidth: 100,
        justifyContent: 'center',
        borderWidth: 1,
    },
    missBtn: {
        backgroundColor: 'rgba(255,58,94,0.15)',
        borderColor: 'rgba(255,58,94,0.3)',
    },
    makeBtn: {
        backgroundColor: 'rgba(0,198,122,0.15)',
        borderColor: 'rgba(0,198,122,0.3)',
    },
    shotBtnText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Permission
    permissionBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: T.color.background.tertiary,
    },
    permissionIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: T.color.signature.muted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    permissionTitle: {
        color: T.color.text.primary,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: T.fonts.display.bold,
    },
    permissionText: {
        color: T.color.text.secondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
        fontFamily: T.fonts.body.regular,
    },
    permissionBtn: {
        backgroundColor: T.color.signature.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
        fontFamily: T.fonts.display.bold,
    },
})
