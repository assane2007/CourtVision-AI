/**
 * Onboarding Calibration — "Film 3 Shots" Flow
 *
 * Replaces the old cosmetic calibration screen with a real
 * "shoot 3 shots → we analyze your mechanics" hook.
 *
 * Flow:
 * 1. Camera permission → live camera feed
 * 2. User films themselves shooting 3 times
 * 3. Each shot is captured & analyzed via CV Engine
 * 4. Results shown with real elbow angle, posture score
 * 5. CTA → continue to login/signup
 */

import { View, Text, TouchableOpacity, Dimensions, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState, useRef, useCallback } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    withSequence, FadeInDown, FadeIn, ZoomIn,
    Easing,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { colors, space } from '../constants/tokens'
import { isCVEngineAvailable, analyzeFrame, type CVFrameResult } from '../lib/cvEngineService'
import { useStore, type OnboardingCalibrationDraft } from '../lib/store'

const { width: SW, height: SH } = Dimensions.get('window')
const TOTAL_SHOTS = 3
const FILMING_READY_DELAY_MS = 3000
const CAPTURE_ANALYSIS_ATTEMPTS = 3
const CAPTURE_ANALYSIS_RETRY_DELAY_MS = 350
const DETECTION_CHECK_ATTEMPTS = 2
const MIN_AVG_VISIBILITY = 0.35
const MIN_VISIBLE_LANDMARKS = 8
const MIN_VALID_ELBOW_ANGLE = 45
const MAX_VALID_ELBOW_ANGLE = 155

type CameraFacing = 'front' | 'back'
type PoseDetectionState = 'idle' | 'checking' | 'detected' | 'not-detected'

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function toShotResult(cvResult: CVFrameResult): ShotResult | null {
    if (!cvResult.success || cvResult.elbow_angle == null) return null

    const elbow = cvResult.elbow_angle
    if (elbow < MIN_VALID_ELBOW_ANGLE || elbow > MAX_VALID_ELBOW_ANGLE) {
        return null
    }

    const landmarks = cvResult.landmarks_3d ?? []
    if (landmarks.length > 0) {
        const avgVisibility = landmarks.reduce((sum, landmark) => sum + landmark.visibility, 0) / landmarks.length
        const visibleCount = landmarks.filter(landmark => landmark.visibility >= MIN_AVG_VISIBILITY).length

        if (avgVisibility < MIN_AVG_VISIBILITY || visibleCount < MIN_VISIBLE_LANDMARKS) {
            return null
        }
    }

    const knee = cvResult.knee_angle ?? 135
    const confidence = landmarks.length > 0
        ? landmarks.reduce((sum, landmark) => sum + landmark.visibility, 0) / landmarks.length
        : 0.7

    return {
        elbowAngle: elbow,
        kneeAngle: knee,
        postureScore: Math.max(0, Math.round(100 - Math.abs(elbow - 95) * 2)),
        confidence,
    }
}

function getPoseGuidanceMessage(streak: number): string {
    if (streak <= 1) {
        return 'Pose not locked yet. Step back a little and keep your full body in frame.'
    }

    if (streak === 2) {
        return 'Still calibrating pose. Keep shoulders, hips, knees and ankles visible, then retry.'
    }

    return 'Pose still unstable. Move phone farther away, improve lighting, then retry.'
}

interface ShotResult {
    elbowAngle: number
    kneeAngle: number
    postureScore: number
    confidence: number
}

// ── Shot Result Card ─────────────────────────

function ShotResultCard({ shot, index }: { shot: ShotResult; index: number }) {
    const isGoodElbow = shot.elbowAngle >= 85 && shot.elbowAngle <= 100
    const isGoodKnee = shot.kneeAngle >= 120 && shot.kneeAngle <= 155

    return (
        <Animated.View entering={ZoomIn.delay(index * 150).duration(400)} style={s.shotCard}>
            <View style={s.shotCardHeader}>
                <Text style={s.shotNumber}>Shot {index + 1}</Text>
                <View style={[s.shotBadge, { backgroundColor: shot.postureScore >= 70 ? 'rgba(0,217,126,0.15)' : 'rgba(255,196,0,0.15)' }]}>
                    <Text style={[s.shotBadgeText, { color: shot.postureScore >= 70 ? '#00D97E' : '#FFC400' }]}>
                        {shot.postureScore >= 70 ? 'Good' : 'Improve'}
                    </Text>
                </View>
            </View>
            <View style={s.shotMetrics}>
                <View style={s.metric}>
                    <Text style={[s.metricValue, { color: isGoodElbow ? '#00D97E' : '#FFC400' }]}>
                        {Math.round(shot.elbowAngle)}°
                    </Text>
                    <Text style={s.metricLabel}>Elbow</Text>
                </View>
                <View style={s.metric}>
                    <Text style={[s.metricValue, { color: isGoodKnee ? '#00D97E' : '#FFC400' }]}>
                        {Math.round(shot.kneeAngle)}°
                    </Text>
                    <Text style={s.metricLabel}>Knee</Text>
                </View>
                <View style={s.metric}>
                    <Text style={[s.metricValue, { color: colors.fire }]}>
                        {shot.postureScore}
                    </Text>
                    <Text style={s.metricLabel}>Posture</Text>
                </View>
            </View>
        </Animated.View>
    )
}

// ── Main Component ───────────────────────────

export default function OnboardingCamera() {
    const router = useRouter()
    const [permission, requestPermission] = useCameraPermissions()
    const cameraRef = useRef<CameraView>(null)
    const isAuthenticated = useStore(s => s.isAuthenticated)
    const setOnboardingCalibrationDraft = useStore(s => s.setOnboardingCalibrationDraft)
    const syncOnboardingCalibrationDraft = useStore(s => s.syncOnboardingCalibrationDraft)

    const [phase, setPhase] = useState<'intro' | 'filming' | 'analyzing' | 'results'>('intro')
    const [shotCount, setShotCount] = useState(0)
    const [shots, setShots] = useState<ShotResult[]>([])
    const [cvAvailable, setCvAvailable] = useState(false)
    const [capturing, setCapturing] = useState(false)
    const [captureError, setCaptureError] = useState<string | null>(null)
    const [filmingReady, setFilmingReady] = useState(false)
    const [readyCountdown, setReadyCountdown] = useState(0)
    const [invalidPoseStreak, setInvalidPoseStreak] = useState(0)
    const [cameraFacing, setCameraFacing] = useState<CameraFacing>('front')
    const [poseDetectionState, setPoseDetectionState] = useState<PoseDetectionState>('idle')
    const [poseDetectionHint, setPoseDetectionHint] = useState('Tap check to verify your full body is detected before shooting.')
    const [lastDetectionConfidence, setLastDetectionConfidence] = useState<number | null>(null)

    // Animations
    const pulseScale = useSharedValue(1)

    useEffect(() => {
        if (!permission?.granted && permission?.canAskAgain) {
            requestPermission()
        }
    }, [permission])

    // Check CV Engine on mount
    useEffect(() => {
        isCVEngineAvailable().then(setCvAvailable)
    }, [])

    // Pulse animation for capture button
    useEffect(() => {
        if (phase === 'filming') {
            pulseScale.value = withSequence(
                withTiming(1.06, { duration: 180, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 220, easing: Easing.inOut(Easing.sin) }),
            )
        }
    }, [phase, shotCount, pulseScale])

    useEffect(() => {
        if (phase !== 'filming') {
            setFilmingReady(false)
            setReadyCountdown(0)
            return
        }

        const readyAt = Date.now() + FILMING_READY_DELAY_MS
        const tick = () => {
            const remainingMs = Math.max(0, readyAt - Date.now())
            const remainingSeconds = Math.ceil(remainingMs / 1000)
            setReadyCountdown(remainingSeconds)

            if (remainingMs <= 0) {
                setFilmingReady(true)
                setReadyCountdown(0)
            }
        }

        tick()
        const interval = setInterval(tick, 200)
        return () => clearInterval(interval)
    }, [phase])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }))

    const handleStart = useCallback(() => {
        if (!cvAvailable) {
            setCaptureError('CV engine unavailable. Start backend services, then retry.')
            return
        }
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setCaptureError(null)
        setInvalidPoseStreak(0)
        setPoseDetectionState('idle')
        setPoseDetectionHint('Tap check to verify your full body is detected before shooting.')
        setLastDetectionConfidence(null)
        setPhase('filming')
    }, [cvAvailable])

    const toggleCameraFacing = useCallback(() => {
        setCameraFacing(current => current === 'front' ? 'back' : 'front')
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
    }, [])

    const retryCvConnection = useCallback(async () => {
        const available = await isCVEngineAvailable(true)
        setCvAvailable(available)
        if (available) {
            setCaptureError(null)
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } else {
            setCaptureError('CV engine still unreachable. Check EXPO_PUBLIC_CV_ENGINE_URL and try again.')
        }
    }, [])

    const captureShot = useCallback(async () => {
        if (capturing || shotCount >= TOTAL_SHOTS || !filmingReady) return
        setCapturing(true)
        setCaptureError(null)
        setPoseDetectionState('checking')
        setPoseDetectionHint('Checking body detection while capturing...')

        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

        try {
            if (!cvAvailable) {
                throw new Error('CV engine unavailable')
            }

            if (!cameraRef.current) {
                throw new Error('Camera not ready')
            }

            let result: ShotResult | null = null
            for (let attempt = 0; attempt < CAPTURE_ANALYSIS_ATTEMPTS; attempt++) {
                const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 })
                if (!photo?.base64) {
                    throw new Error('Unable to capture frame')
                }

                const cvResult = await analyzeFrame(photo.base64)
                result = toShotResult(cvResult)
                if (result) {
                    break
                }

                if (attempt < CAPTURE_ANALYSIS_ATTEMPTS - 1) {
                    await sleep(CAPTURE_ANALYSIS_RETRY_DELAY_MS)
                }
            }

            if (!result) {
                const streak = invalidPoseStreak + 1
                setInvalidPoseStreak(streak)
                const poseError = new Error(getPoseGuidanceMessage(streak))
                poseError.name = 'PoseValidationError'
                throw poseError
            }

            setInvalidPoseStreak(0)
            setPoseDetectionState('detected')
            setLastDetectionConfidence(result.confidence)
            setPoseDetectionHint(`Body detected (${Math.round(result.confidence * 100)}% confidence).`)

            const newShots = [...shots, result]
            setShots(newShots)
            const newCount = shotCount + 1
            setShotCount(newCount)

            if (newCount >= TOTAL_SHOTS) {
                setPhase('analyzing')
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                setTimeout(() => setPhase('results'), 1800)
            } else {
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Capture failed. Please retry.'
            setCaptureError(message)
            setPoseDetectionState('not-detected')
            setLastDetectionConfidence(null)
            setPoseDetectionHint(message)
            if (Platform.OS !== 'web') {
                const isPoseValidationError = err instanceof Error && err.name === 'PoseValidationError'
                Haptics.notificationAsync(
                    isPoseValidationError
                        ? Haptics.NotificationFeedbackType.Warning
                        : Haptics.NotificationFeedbackType.Error
                )
            }
        } finally {
            setCapturing(false)
        }
    }, [capturing, shotCount, shots, cvAvailable, filmingReady, invalidPoseStreak])

    const checkPoseDetection = useCallback(async () => {
        if (capturing || !filmingReady) return

        setCapturing(true)
        setCaptureError(null)
        setPoseDetectionState('checking')
        setPoseDetectionHint('Checking full body visibility...')

        try {
            if (!cvAvailable) {
                throw new Error('CV engine unavailable')
            }

            if (!cameraRef.current) {
                throw new Error('Camera not ready')
            }

            let result: ShotResult | null = null

            for (let attempt = 0; attempt < DETECTION_CHECK_ATTEMPTS; attempt++) {
                const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.65 })
                if (!photo?.base64) {
                    throw new Error('Unable to capture frame')
                }

                const cvResult = await analyzeFrame(photo.base64)
                result = toShotResult(cvResult)
                if (result) {
                    break
                }

                if (attempt < DETECTION_CHECK_ATTEMPTS - 1) {
                    await sleep(CAPTURE_ANALYSIS_RETRY_DELAY_MS)
                }
            }

            if (!result) {
                const streak = invalidPoseStreak + 1
                setInvalidPoseStreak(streak)
                setPoseDetectionState('not-detected')
                setLastDetectionConfidence(null)
                setPoseDetectionHint(getPoseGuidanceMessage(streak))
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                return
            }

            setInvalidPoseStreak(0)
            setPoseDetectionState('detected')
            setLastDetectionConfidence(result.confidence)
            setPoseDetectionHint(`Body detected (${Math.round(result.confidence * 100)}% confidence). Ready to capture.`)
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Body detection check failed.'
            setPoseDetectionState('not-detected')
            setLastDetectionConfidence(null)
            setPoseDetectionHint(message)
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        } finally {
            setCapturing(false)
        }
    }, [capturing, cvAvailable, filmingReady, invalidPoseStreak])

    const handleContinue = useCallback(() => {
        if (shots.length > 0) {
            const draft: OnboardingCalibrationDraft = {
                shots: shots.map(shot => ({
                    elbowAngle: Math.round(shot.elbowAngle * 10) / 10,
                    kneeAngle: Math.round(shot.kneeAngle * 10) / 10,
                    postureScore: shot.postureScore,
                    confidence: Math.round(shot.confidence * 1000) / 1000,
                })),
                averageElbowAngle: Math.round((shots.reduce((sum, shot) => sum + shot.elbowAngle, 0) / shots.length) * 10) / 10,
                averageKneeAngle: Math.round((shots.reduce((sum, shot) => sum + shot.kneeAngle, 0) / shots.length) * 10) / 10,
                averagePostureScore: Math.round(shots.reduce((sum, shot) => sum + shot.postureScore, 0) / shots.length),
                averageConfidence: Math.round((shots.reduce((sum, shot) => sum + shot.confidence, 0) / shots.length) * 1000) / 1000,
                capturedAt: new Date().toISOString(),
                source: 'onboarding-camera-v2',
            }

            setOnboardingCalibrationDraft(draft)

            if (isAuthenticated) {
                void syncOnboardingCalibrationDraft().catch(() => { })
            }
        }

        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.push('/onboarding3')
    }, [router, shots, isAuthenticated, setOnboardingCalibrationDraft, syncOnboardingCalibrationDraft])

    const poseStatusAccent = poseDetectionState === 'detected'
        ? colors.live
        : poseDetectionState === 'checking'
            ? colors.caution
            : poseDetectionState === 'not-detected'
                ? colors.fire
                : 'rgba(255,255,255,0.45)'

    const poseStatusTitle = poseDetectionState === 'detected'
        ? 'Body detected'
        : poseDetectionState === 'checking'
            ? 'Checking body...'
            : poseDetectionState === 'not-detected'
                ? 'Body not detected'
                : 'Detection not checked yet'

    // ── RESULTS SCREEN ───────────────────────

    if (phase === 'results') {
        const avgElbow = shots.reduce((s, sh) => s + sh.elbowAngle, 0) / shots.length
        const avgPosture = Math.round(shots.reduce((s, sh) => s + sh.postureScore, 0) / shots.length)
        const grade = avgPosture >= 80 ? 'A' : avgPosture >= 65 ? 'B+' : avgPosture >= 50 ? 'B' : 'C'
        const gradeColor = avgPosture >= 80 ? colors.live : avgPosture >= 65 ? colors.fire : colors.caution

        return (
            <SafeAreaView style={s.container}>
                <Animated.View entering={FadeIn.duration(500)} style={s.resultsContainer}>
                    {/* Grade hero */}
                    <Animated.View entering={ZoomIn.duration(500)} style={s.gradeHero}>
                        <View style={[s.gradeCircle, { borderColor: gradeColor }]}>
                            <Text style={[s.gradeText, { color: gradeColor }]}>{grade}</Text>
                        </View>
                        <Text style={s.resultsTitle}>Your Shooting Profile</Text>
                        <Text style={s.resultsSubtitle}>
                            Avg. elbow {Math.round(avgElbow)}° · Posture {avgPosture}/100
                        </Text>
                    </Animated.View>

                    {/* Shot breakdown */}
                    <View style={s.shotsBreakdown}>
                        {shots.map((shot, i) => (
                            <ShotResultCard key={i} shot={shot} index={i} />
                        ))}
                    </View>

                    {/* Insight */}
                    <Animated.View entering={FadeInDown.delay(500).duration(400)} style={s.insightCard}>
                        <Feather name="cpu" size={16} color={colors.ice} />
                        <Text style={s.insightText}>
                            {avgElbow >= 85 && avgElbow <= 100
                                ? 'Great mechanics! Your elbow alignment is solid. CourtVision AI will refine your consistency over time.'
                                : avgElbow < 85
                                    ? `Your elbow angle (${Math.round(avgElbow)}°) is tight — aim for 90-100°. CourtVision AI will coach you in real-time.`
                                    : `Your elbow is opening wide (${Math.round(avgElbow)}°). The AI will guide you toward the optimal 90-100° range.`
                            }
                        </Text>
                    </Animated.View>

                    {/* CTA */}
                    <Animated.View entering={FadeInDown.delay(700).duration(400)} style={s.ctaContainer}>
                        <TouchableOpacity style={s.ctaBtn} onPress={handleContinue} activeOpacity={0.8}>
                            <Text style={s.ctaBtnText}>Create Account</Text>
                            <Feather name="arrow-right" size={18} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={s.ctaSkip} onPress={handleContinue}>
                            Skip for now
                        </Text>
                    </Animated.View>
                </Animated.View>
            </SafeAreaView>
        )
    }

    // ── ANALYZING SCREEN ─────────────────────

    if (phase === 'analyzing') {
        return (
            <View style={s.container}>
                <View style={s.analyzingCenter}>
                    <Animated.View entering={ZoomIn.duration(400)} style={s.analyzingRing}>
                        <Feather name="cpu" size={40} color={colors.ice} />
                    </Animated.View>
                    <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.analyzingTitle}>
                        Analyzing Your Mechanics
                    </Animated.Text>
                    <Animated.Text entering={FadeInDown.delay(400).duration(400)} style={s.analyzingSubtext}>
                        Processing {TOTAL_SHOTS} shots with AI biomechanics engine...
                    </Animated.Text>
                </View>
            </View>
        )
    }

    // ── FILMING / INTRO SCREEN ───────────────

    return (
        <View style={s.container}>
            {/* Camera feed */}
            {permission?.granted ? (
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={cameraFacing} />
            ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.base }]} />
            )}

            {/* Dark overlay */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />

            {/* Top HUD */}
            <SafeAreaView edges={['top']} style={s.topBar}>
                <View style={s.topBarInner}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Feather name="arrow-left" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={s.hudTitle}>CALIBRATION</Text>
                    <View style={s.topRightControls}>
                        <View style={s.shotCounter}>
                            <Text style={s.shotCounterText}>{shotCount}/{TOTAL_SHOTS}</Text>
                        </View>
                        {permission?.granted ? (
                            <TouchableOpacity style={s.flipCameraBtn} onPress={toggleCameraFacing} activeOpacity={0.8}>
                                <Feather name="refresh-cw" size={14} color="#FFF" />
                                <Text style={s.flipCameraText}>{cameraFacing === 'front' ? 'Front' : 'Back'}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {/* Progress dots */}
                <View style={s.progressDots}>
                    {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                s.progressDot,
                                i < shotCount ? s.progressDotDone : i === shotCount && phase === 'filming' ? s.progressDotActive : null,
                            ]}
                        />
                    ))}
                </View>
            </SafeAreaView>

            {/* Bottom area */}
            <SafeAreaView edges={['bottom']} style={s.bottomArea}>
                {phase === 'intro' ? (
                    <BlurView intensity={40} tint="dark" style={s.introCard}>
                        <Text style={s.introTitle}>Film 3 Shots</Text>
                        <Text style={s.introDesc}>
                            Position your phone on a tripod or against a wall.{'\n'}
                            Film yourself shooting 3 times — we'll analyze your mechanics instantly.
                        </Text>

                        <View style={[s.engineBadge, { backgroundColor: cvAvailable ? 'rgba(0,217,126,0.15)' : 'rgba(255,107,0,0.18)' }]}>
                            <Text style={[s.engineBadgeText, { color: cvAvailable ? colors.live : colors.fire }]}>
                                {cvAvailable ? 'CV Engine Connected' : 'CV Engine Disconnected'}
                            </Text>
                        </View>

                        {captureError ? (
                            <Text style={s.captureErrorText}>{captureError}</Text>
                        ) : null}

                        <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.8}>
                            <Text style={s.startBtnText}>START CALIBRATION</Text>
                        </TouchableOpacity>

                        {!cvAvailable ? (
                            <TouchableOpacity style={s.retryEngineBtn} onPress={retryCvConnection} activeOpacity={0.8}>
                                <Text style={s.retryEngineText}>RETRY CONNECTION</Text>
                            </TouchableOpacity>
                        ) : null}
                    </BlurView>
                ) : (
                    <View style={s.filmingControls}>
                        {/* Last shot feedback */}
                        {shots.length > 0 && (
                            <Animated.View entering={FadeInDown.duration(300)} style={s.lastShotFeedback}>
                                <Text style={s.lastShotText}>
                                    Shot {shots.length}: Elbow {Math.round(shots[shots.length - 1].elbowAngle)}° · Posture {shots[shots.length - 1].postureScore}/100
                                </Text>
                            </Animated.View>
                        )}

                        <View style={[s.poseCheckCard, { borderColor: `${poseStatusAccent}80` }]}>
                            <View style={s.poseCheckHeader}>
                                <View style={[s.poseCheckDot, { backgroundColor: poseStatusAccent }]} />
                                <Text style={s.poseCheckTitle}>{poseStatusTitle}</Text>
                            </View>
                            <Text style={s.poseCheckHint}>{poseDetectionHint}</Text>
                            {lastDetectionConfidence != null ? (
                                <Text style={[s.poseCheckConfidence, { color: poseStatusAccent }]}>Confidence {Math.round(lastDetectionConfidence * 100)}%</Text>
                            ) : null}
                            <TouchableOpacity
                                style={[s.poseCheckBtn, (capturing || !filmingReady || !cvAvailable) && s.poseCheckBtnDisabled]}
                                onPress={checkPoseDetection}
                                disabled={capturing || !filmingReady || !cvAvailable}
                                activeOpacity={0.8}
                            >
                                <Text style={s.poseCheckBtnText}>{poseDetectionState === 'checking' ? 'CHECKING...' : 'CHECK BODY DETECTION'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Capture button */}
                        <View style={s.captureRow}>
                            {captureError ? (
                                <Text style={s.captureErrorText}>{captureError}</Text>
                            ) : null}
                            <Text style={s.captureHint}>
                                {shotCount >= TOTAL_SHOTS
                                    ? 'All shots captured!'
                                    : filmingReady
                                        ? 'Tap when your full body is visible'
                                        : `Get in position... ${readyCountdown}s`}
                            </Text>
                            {!filmingReady ? (
                                <Text style={s.captureWarmupText}>Step back until head, hips, knees and ankles are visible.</Text>
                            ) : null}
                            <Animated.View style={pulseStyle}>
                                <TouchableOpacity
                                    style={[s.captureBtn, (capturing || !filmingReady) && s.captureBtnDisabled]}
                                    onPress={captureShot}
                                    disabled={capturing || shotCount >= TOTAL_SHOTS || !filmingReady}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.captureBtnInner} />
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </View>
    )
}

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.void,
    },

    // Top bar
    topBar: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
    },
    topBarInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backBtn: {
        width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
    },
    hudTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 2,
    },
    shotCounter: {
        backgroundColor: 'rgba(0,240,255,0.14)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: 'rgba(0,240,255,0.32)',
    },
    shotCounterText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.ice,
    },
    flipCameraBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 34,
        paddingHorizontal: 9,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.13)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    flipCameraText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    progressDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 4,
    },
    progressDot: {
        width: 32, height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    progressDotActive: {
        backgroundColor: colors.fireTrace,
    },
    progressDotDone: {
        backgroundColor: colors.live,
    },

    // Bottom
    bottomArea: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: 20,
        zIndex: 10,
    },

    // Intro card
    introCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    introTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    introDesc: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 22,
        marginBottom: 24,
    },
    engineBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        marginBottom: 12,
    },
    engineBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    startBtn: {
        backgroundColor: colors.fire,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    startBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    retryEngineBtn: {
        marginTop: 10,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(5,5,5,0.35)',
    },
    retryEngineText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E8EDF6',
        letterSpacing: 0.8,
    },

    // Filming controls
    filmingControls: {
        alignItems: 'center',
        width: '100%',
    },
    lastShotFeedback: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 0.5,
        borderColor: 'rgba(68,214,255,0.3)',
    },
    lastShotText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.ice,
    },
    poseCheckCard: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.56)',
        borderWidth: 0.5,
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
    },
    poseCheckHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    poseCheckDot: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
    },
    poseCheckTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    poseCheckHint: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 6,
    },
    poseCheckConfidence: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 10,
    },
    poseCheckBtn: {
        height: 38,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    poseCheckBtnDisabled: {
        opacity: 0.45,
    },
    poseCheckBtnText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.7,
    },
    captureRow: {
        alignItems: 'center',
        width: '100%',
    },
    captureHint: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 16,
    },
    captureWarmupText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.66)',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 12,
    },
    captureErrorText: {
        fontSize: 12,
        color: '#FFB39C',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 17,
    },
    captureBtn: {
        width: 72, height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: colors.cloud,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtnDisabled: {
        opacity: 0.4,
    },
    captureBtnInner: {
        width: 56, height: 56,
        borderRadius: 28,
        backgroundColor: colors.fire,
    },

    // Analyzing
    analyzingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    analyzingRing: {
        width: 100, height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,240,255,0.1)',
        borderWidth: 0.5,
        borderColor: 'rgba(0,240,255,0.28)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    analyzingTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    analyzingSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },

    // Results
    resultsContainer: {
        flex: 1,
        padding: 24,
    },
    gradeHero: {
        alignItems: 'center',
        paddingTop: 20,
        marginBottom: 24,
    },
    gradeCircle: {
        width: 88, height: 88,
        borderRadius: 44,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginBottom: 16,
    },
    gradeText: {
        fontSize: 36,
        fontWeight: '900',
    },
    resultsTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    resultsSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 6,
    },

    // Shot cards
    shotsBreakdown: {
        gap: 10,
        marginBottom: 16,
    },
    shotCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 16,
    },
    shotCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    shotNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    shotBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    shotBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    shotMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    metric: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
        marginTop: 2,
    },

    // Insight card
    insightCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,240,255,0.08)',
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: 'rgba(0,240,255,0.2)',
        padding: 14,
        gap: 10,
        marginBottom: 24,
        alignItems: 'flex-start',
    },
    insightText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 19,
    },

    // CTA
    ctaContainer: {
        alignItems: 'center',
    },
    ctaBtn: {
        flexDirection: 'row',
        backgroundColor: colors.fire,
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
    },
    ctaBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFF',
    },
    ctaSkip: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.4)',
        marginTop: 16,
        padding: 8,
    },
})
