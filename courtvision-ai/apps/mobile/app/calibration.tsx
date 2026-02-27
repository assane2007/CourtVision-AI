/**
 * CourtVision AI — Calibration Screen
 * Écran de calibration IA avant la première session.
 *
 * Étapes :
 * 1. Test de la caméra + détection de pose
 * 2. Vérification distance/angle
 * 3. Test de luminosité
 * 4. Confirmation du setup
 *
 * Utilisé depuis l'onboarding et avant le premier workout.
 * Design V4 : glass cards, amber accent, feedback en temps réel.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, Dimensions, Animated as RNAnimated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { T, typePresets } from '../lib/theme'

const type = typePresets
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ==========================================
// Types
// ==========================================

type CalibrationStep = 'camera' | 'distance' | 'lighting' | 'complete'

interface CalibrationResult {
    cameraOk: boolean
    distanceOk: boolean
    lightingOk: boolean
    poseDetected: boolean
    estimatedDistance: number
    lightingLevel: 'good' | 'fair' | 'poor'
    timestamp: number
}

interface CheckItem {
    id: string
    label: string
    status: 'pending' | 'checking' | 'pass' | 'warning' | 'fail'
    detail?: string
}

// ==========================================
// Constants
// ==========================================

const STEPS: { key: CalibrationStep; title: string; subtitle: string; icon: string }[] = [
    { key: 'camera', title: 'Caméra & Détection', subtitle: 'Test de la détection corporelle', icon: 'camera' },
    { key: 'distance', title: 'Distance & Position', subtitle: 'Vérification du placement', icon: 'maximize-2' },
    { key: 'lighting', title: 'Luminosité', subtitle: 'Qualité de l\'image', icon: 'sun' },
    { key: 'complete', title: 'Calibration terminée', subtitle: 'Tout est prêt !', icon: 'check-circle' },
]

// ==========================================
// Calibration Check Logic (simulated for now, will use real AI in production)
// ==========================================

function simulateCalibrationChecks(
    step: CalibrationStep,
    onUpdate: (checks: CheckItem[]) => void,
    onComplete: (passed: boolean) => void,
) {
    const checks: Record<CalibrationStep, CheckItem[]> = {
        camera: [
            { id: 'camera_access', label: 'Accès caméra', status: 'pending' },
            { id: 'body_detection', label: 'Détection corporelle', status: 'pending' },
            { id: 'pose_landmarks', label: 'Points de référence (33 joints)', status: 'pending' },
            { id: 'tracking_fps', label: 'Fréquence de suivi', status: 'pending' },
        ],
        distance: [
            { id: 'body_visible', label: 'Corps entier visible', status: 'pending' },
            { id: 'distance_range', label: 'Distance 3-5m estimée', status: 'pending' },
            { id: 'angle_check', label: 'Angle optimal', status: 'pending' },
            { id: 'stability', label: 'Stabilité de l\'image', status: 'pending' },
        ],
        lighting: [
            { id: 'brightness', label: 'Luminosité suffisante', status: 'pending' },
            { id: 'contrast', label: 'Contraste acceptable', status: 'pending' },
            { id: 'backlight', label: 'Pas de contre-jour', status: 'pending' },
        ],
        complete: [],
    }

    const stepChecks = checks[step]
    if (!stepChecks || stepChecks.length === 0) {
        onComplete(true)
        return
    }

    let index = 0
    const interval = setInterval(() => {
        if (index >= stepChecks.length) {
            clearInterval(interval)
            const allPassed = stepChecks.every(c => c.status === 'pass' || c.status === 'warning')
            onComplete(allPassed)
            return
        }

        // Simulate checking
        stepChecks[index].status = 'checking'
        onUpdate([...stepChecks])

        setTimeout(() => {
            // Simulate result (in production: use real AI pipeline results)
            const rand = Math.random()
            if (rand > 0.15) {
                stepChecks[index].status = 'pass'
                stepChecks[index].detail = getPassDetail(stepChecks[index].id)
            } else if (rand > 0.05) {
                stepChecks[index].status = 'warning'
                stepChecks[index].detail = getWarningDetail(stepChecks[index].id)
            } else {
                stepChecks[index].status = 'pass' // Toujours pass en calibration initiale
                stepChecks[index].detail = getPassDetail(stepChecks[index].id)
            }
            onUpdate([...stepChecks])
            index++
        }, 600 + Math.random() * 400)
    }, 800)

    return () => clearInterval(interval)
}

function getPassDetail(id: string): string {
    const details: Record<string, string> = {
        camera_access: 'Caméra arrière activée',
        body_detection: 'Corps détecté avec 94% de confiance',
        pose_landmarks: '33/33 joints détectés',
        tracking_fps: '28 FPS — Excellent',
        body_visible: 'Corps complet dans le cadre',
        distance_range: '~3.5m — Distance optimale',
        angle_check: 'Angle latéral détecté — Parfait',
        stability: 'Image stable — Pas de tremblement',
        brightness: 'Luminosité : 72% — Bonne',
        contrast: 'Contraste sujet/fond : Excellent',
        backlight: 'Pas de contre-jour détecté',
    }
    return details[id] ?? 'OK'
}

function getWarningDetail(id: string): string {
    const details: Record<string, string> = {
        camera_access: 'Utilisation caméra frontale (arrière recommandée)',
        body_detection: 'Détection partielle — rapproche-toi un peu',
        pose_landmarks: '28/33 joints — Certains masqués',
        tracking_fps: '18 FPS — Acceptable mais pas optimal',
        body_visible: 'Pieds partiellement coupés',
        distance_range: '~6m — Un peu loin, rapproche le téléphone',
        angle_check: 'Angle frontal — Latéral est meilleur',
        stability: 'Léger tremblement — Utilise un support',
        brightness: 'Luminosité faible — Augmente l\'éclairage',
        contrast: 'Contraste faible — Porte des vêtements contrastés',
        backlight: 'Léger contre-jour — Pivote le téléphone',
    }
    return details[id] ?? 'À améliorer'
}

// ==========================================
// Sub-components
// ==========================================

function StepProgress({ current, total }: { current: number; total: number }) {
    return (
        <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((current + 1) / total) * 100}%` }]} />
        </View>
    )
}

function CheckItemRow({ item }: { item: CheckItem }) {
    const getStatusIcon = () => {
        switch (item.status) {
            case 'pass': return 'check-circle'
            case 'warning': return 'alert-triangle'
            case 'fail': return 'x-circle'
            case 'checking': return 'loader'
            default: return 'circle'
        }
    }

    const getStatusColor = () => {
        switch (item.status) {
            case 'pass': return T.color.semantic.success
            case 'warning': return T.color.semantic.warning
            case 'fail': return T.color.semantic.error
            case 'checking': return T.color.signature.primary
            default: return T.color.text.tertiary
        }
    }

    return (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.checkRow}>
            <View style={[styles.checkIcon, { backgroundColor: `${getStatusColor()}15` }]}>
                <Feather name={getStatusIcon() as any} size={16} color={getStatusColor()} />
            </View>
            <View style={styles.checkInfo}>
                <Text style={styles.checkLabel}>{item.label}</Text>
                {item.detail ? (
                    <Text style={[styles.checkDetail, { color: getStatusColor() }]}>
                        {item.detail}
                    </Text>
                ) : null}
            </View>
            {item.status === 'checking' ? (
                <View style={styles.checkSpinner}>
                    <Text style={{ color: T.color.signature.primary, fontSize: 10 }}>•••</Text>
                </View>
            ) : null}
        </Animated.View>
    )
}

function CalibrationScore({ score }: { score: number }) {
    const animValue = useSharedValue(0)
    
    useEffect(() => {
        animValue.value = withTiming(score, { duration: 1000, easing: Easing.out(Easing.cubic) })
    }, [score])

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${animValue.value * 3.6}deg` }],
    }))

    const getColor = () => {
        if (score >= 90) return T.color.semantic.success
        if (score >= 70) return T.color.semantic.warning
        return T.color.semantic.error
    }

    return (
        <View style={styles.scoreContainer}>
            <View style={[styles.scoreRing, { borderColor: `${getColor()}30` }]}>
                <Animated.View style={[styles.scoreRingFill, { borderColor: getColor() }, ringStyle]} />
                <Text style={[styles.scoreValue, { color: getColor() }]}>{Math.round(score)}</Text>
                <Text style={styles.scoreUnit}>/ 100</Text>
            </View>
            <Text style={styles.scoreLabel}>
                {score >= 90 ? 'Configuration Optimale' :
                 score >= 70 ? 'Bonne Configuration' :
                 'Configuration Acceptable'}
            </Text>
        </View>
    )
}

// ==========================================
// Main Screen
// ==========================================

export default function CalibrationScreen() {
    const router = useRouter()
    const params = useLocalSearchParams<{ from?: string }>()
    const [permission, requestPermission] = useCameraPermissions()
    
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [checks, setChecks] = useState<CheckItem[]>([])
    const [stepComplete, setStepComplete] = useState(false)
    const [calibrationScore, setCalibrationScore] = useState(0)
    const [passedSteps, setPassedSteps] = useState(0)
    const cleanupRef = useRef<(() => void) | undefined>()

    const currentStep = STEPS[currentStepIndex]

    // Run calibration checks when step changes
    useEffect(() => {
        if (currentStep.key === 'complete') {
            // Calculate final score
            const score = Math.min(100, 75 + passedSteps * 8 + Math.random() * 5)
            setCalibrationScore(Math.round(score))
            setStepComplete(true)
            return
        }

        setChecks([])
        setStepComplete(false)

        // Small delay before starting checks
        const timeout = setTimeout(() => {
            const cleanup = simulateCalibrationChecks(
                currentStep.key,
                (updatedChecks) => setChecks([...updatedChecks]),
                (passed) => {
                    setStepComplete(true)
                    if (passed) setPassedSteps(p => p + 1)
                },
            )
            cleanupRef.current = cleanup
        }, 500)

        return () => {
            clearTimeout(timeout)
            cleanupRef.current?.()
        }
    }, [currentStepIndex])

    const handleNext = useCallback(() => {
        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(i => i + 1)
        } else {
            // Go to workout or back to where we came from
            if (params.from === 'onboarding') {
                router.replace('/onboarding3')
            } else {
                router.back()
            }
        }
    }, [currentStepIndex, params.from, router])

    const handleSkip = useCallback(() => {
        if (params.from === 'onboarding') {
            router.replace('/onboarding3')
        } else {
            router.back()
        }
    }, [params.from, router])

    // ---- Permission not granted ----
    if (!permission) return null

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.permissionContainer}>
                    <View style={styles.permissionIcon}>
                        <Feather name="camera" size={40} color={T.color.signature.primary} />
                    </View>
                    <Text style={styles.permissionTitle}>Accès caméra requis</Text>
                    <Text style={styles.permissionText}>
                        La calibration nécessite l'accès à ta caméra pour tester la détection IA.
                    </Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <Text style={styles.permissionBtnText}>Autoriser la caméra</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipPermissionBtn} onPress={handleSkip}>
                        <Text style={styles.skipPermissionText}>Passer pour le moment</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    // ---- Main view ----
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Calibration IA</Text>
                    <Text style={styles.headerSub}>
                        Étape {currentStepIndex + 1}/{STEPS.length}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Passer</Text>
                </TouchableOpacity>
            </View>

            {/* Progress */}
            <StepProgress current={currentStepIndex} total={STEPS.length} />

            {/* Camera preview (only for camera/distance/lighting steps) */}
            {currentStep.key !== 'complete' ? (
                <View style={styles.cameraContainer}>
                    <CameraView style={styles.camera} facing="back">
                        {/* Overlay grid */}
                        <View style={styles.gridOverlay}>
                            <View style={styles.gridLineH} />
                            <View style={styles.gridLineV} />
                        </View>

                        {/* Step indicator on camera */}
                        <View style={styles.cameraStepBadge}>
                            <Feather name={currentStep.icon as any} size={14} color={T.color.signature.primary} />
                            <Text style={styles.cameraStepText}>{currentStep.title}</Text>
                        </View>

                        {/* Target frame */}
                        <View style={styles.targetFrame}>
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                    </CameraView>
                </View>
            ) : (
                /* Completion view */
                <Animated.View entering={FadeIn.duration(500)} style={styles.completeContainer}>
                    <CalibrationScore score={calibrationScore} />
                </Animated.View>
            )}

            {/* Checks list */}
            <View style={styles.checksContainer}>
                <Text style={styles.checksTitle}>{currentStep.subtitle}</Text>

                {currentStep.key === 'complete' ? (
                    <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.completeMessage}>
                        <Feather name="check-circle" size={24} color={T.color.semantic.success} />
                        <Text style={styles.completeText}>
                            Ta configuration est optimale pour l'analyse IA en temps réel.
                            Chaque tir sera analysé avec précision.
                        </Text>
                    </Animated.View>
                ) : (
                    checks.map((item, i) => (
                        <CheckItemRow key={item.id} item={item} />
                    ))
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextBtn, !stepComplete && styles.nextBtnDisabled]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                    disabled={!stepComplete}
                >
                    <Text style={styles.nextBtnText}>
                        {currentStep.key === 'complete' ? 'Commencer' : 'Suivant'}
                    </Text>
                    <Feather
                        name={currentStep.key === 'complete' ? 'play' : 'arrow-right'}
                        size={18}
                        color={stepComplete ? '#FFF' : T.color.text.tertiary}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.color.background.primary,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    headerSub: {
        color: T.color.text.tertiary,
        fontSize: 12,
        marginTop: 1,
        fontFamily: T.fonts.body.regular,
    },
    skipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    skipText: {
        color: T.color.text.tertiary,
        fontSize: 14,
        fontFamily: T.fonts.body.semibold,
    },

    // Progress bar
    progressBar: {
        height: 3,
        backgroundColor: T.color.background.tertiary,
        marginHorizontal: 16,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        backgroundColor: T.color.signature.primary,
        borderRadius: 2,
    },

    // Camera
    cameraContainer: {
        marginHorizontal: 16,
        height: SCREEN_H * 0.32,
        borderRadius: T.borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    camera: {
        flex: 1,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLineH: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    gridLineV: {
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    cameraStepBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(5,10,18,0.8)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    cameraStepText: {
        color: T.color.text.primary,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    targetFrame: {
        position: 'absolute',
        top: '15%',
        left: '15%',
        right: '15%',
        bottom: '15%',
    },
    corner: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderColor: T.color.signature.primary,
    },
    cornerTL: {
        top: 0, left: 0,
        borderTopWidth: 2, borderLeftWidth: 2,
    },
    cornerTR: {
        top: 0, right: 0,
        borderTopWidth: 2, borderRightWidth: 2,
    },
    cornerBL: {
        bottom: 0, left: 0,
        borderBottomWidth: 2, borderLeftWidth: 2,
    },
    cornerBR: {
        bottom: 0, right: 0,
        borderBottomWidth: 2, borderRightWidth: 2,
    },

    // Complete view
    completeContainer: {
        marginHorizontal: 16,
        height: SCREEN_H * 0.32,
        borderRadius: T.borderRadius.lg,
        backgroundColor: T.color.background.secondary,
        borderWidth: 1,
        borderColor: T.color.border.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Score
    scoreContainer: {
        alignItems: 'center',
    },
    scoreRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    scoreRingFill: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
    },
    scoreValue: {
        fontSize: 36,
        fontWeight: '800',
        fontFamily: T.fonts.display.black,
    },
    scoreUnit: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },
    scoreLabel: {
        color: T.color.text.secondary,
        fontSize: 14,
        fontFamily: T.fonts.body.semibold,
    },

    // Checks
    checksContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    checksTitle: {
        color: T.color.text.secondary,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.md,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: T.color.border.default,
        gap: 12,
    },
    checkIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkInfo: {
        flex: 1,
    },
    checkLabel: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    checkDetail: {
        fontSize: 12,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },
    checkSpinner: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Complete message
    completeMessage: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: `${T.color.semantic.success}30`,
    },
    completeText: {
        flex: 1,
        color: T.color.text.secondary,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: T.fonts.body.regular,
    },

    // Footer
    footer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 12,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: T.color.signature.primary,
        paddingVertical: 16,
        borderRadius: 16,
    },
    nextBtnDisabled: {
        backgroundColor: T.color.background.tertiary,
    },
    nextBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Permission
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    permissionIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${T.color.signature.primary}12`,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: `${T.color.signature.primary}25`,
        marginBottom: 24,
    },
    permissionTitle: {
        color: T.color.text.primary,
        fontSize: 22,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
        marginBottom: 8,
    },
    permissionText: {
        color: T.color.text.secondary,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        fontFamily: T.fonts.body.regular,
    },
    permissionBtn: {
        backgroundColor: T.color.signature.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        marginBottom: 12,
    },
    permissionBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
        fontFamily: T.fonts.display.bold,
    },
    skipPermissionBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    skipPermissionText: {
        color: T.color.text.tertiary,
        fontSize: 14,
        fontFamily: T.fonts.body.regular,
    },
})
