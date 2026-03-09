import { View, Text, TouchableOpacity, Dimensions, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withRepeat,
    Easing, FadeInDown, withSequence, interpolate,
    withSpring
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { colors, space } from '../constants/tokens'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// A component that erratically moves around to simulate tracking a subject
function BoundingBox({ delay, startX, startY, color }: { delay: number, startX: number, startY: number, color: string }) {
    const x = useSharedValue(startX)
    const y = useSharedValue(startY)
    const scale = useSharedValue(1)

    useEffect(() => {
        // Random wandering
        const move = () => {
            const nextX = Math.random() * (SCREEN_WIDTH - 100)
            const nextY = Math.random() * (SCREEN_HEIGHT - 300)
            x.value = withTiming(nextX, { duration: 1500, easing: Easing.inOut(Easing.quad) })
            y.value = withTiming(nextY, { duration: 1500, easing: Easing.inOut(Easing.quad) })
            scale.value = withSequence(
                withTiming(1.1, { duration: 750 }),
                withTiming(1.0, { duration: 750 })
            )
        }

        const timeout = setTimeout(() => {
            move()
            setInterval(move, 1500)
        }, delay)

        return () => clearTimeout(timeout)
    }, [])

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }]
    }))

    return (
        <Animated.View style={[styles.boundingBox, animStyle, { borderColor: color }]}>
            <View style={[styles.boxCorner, { top: -2, left: -2, borderTopWidth: 2, borderLeftWidth: 2, borderColor: color }]} />
            <View style={[styles.boxCorner, { top: -2, right: -2, borderTopWidth: 2, borderRightWidth: 2, borderColor: color }]} />
            <View style={[styles.boxCorner, { bottom: -2, left: -2, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: color }]} />
            <View style={[styles.boxCorner, { bottom: -2, right: -2, borderBottomWidth: 2, borderRightWidth: 2, borderColor: color }]} />
            <Text style={[styles.trackingText, { color }]}>TRGT_LOCK</Text>
        </Animated.View>
    )
}

export default function OnboardingCamera() {
    const router = useRouter()
    const [logLines, setLogLines] = useState<string[]>([])
    const [permission, requestPermission] = useCameraPermissions()

    // Animations
    const scanLineY = useSharedValue(0)
    const gridOpacity = useSharedValue(0.1)

    useEffect(() => {
        // Scanner Sweep
        scanLineY.value = withRepeat(
            withSequence(
                withTiming(SCREEN_HEIGHT, { duration: 2500, easing: Easing.linear }),
                withTiming(0, { duration: 0 }) // instant snap back to top
            ), -1, false
        )

        // Pulsing Grid
        gridOpacity.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 1000 }),
                withTiming(0.1, { duration: 1000 })
            ), -1, true
        )

        // Generate fake logs
        const logs = [
            'CALCULATING ANGLE OFFSET...',
            'DETECTED: JOINT MAPPING [82%]',
            'CALIBRATING 3D DEPTH MAP...',
            'LENS DISTORTION CORRECTED.',
            'NEURAL NET COMPILED.',
            'TRACKING FLUIDITY: 60 FPS',
        ]
        let i = 0
        const interval = setInterval(() => {
            setLogLines(prev => {
                const newLogs = [...prev, `[${new Date().toISOString().split('T')[1].slice(0, -1)}] ${logs[i % logs.length]}`]
                if (newLogs.length > 5) newLogs.shift()
                return newLogs
            })
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            i++
        }, 1200)

        // Haptic feedback loop for realism
        const hapticInterval = setInterval(() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }, 200)

        return () => {
            clearInterval(interval)
            clearInterval(hapticInterval)
        }
    }, [])

    const handleLaunch = () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.push('/onboarding3')
    }

    useEffect(() => {
        if (!permission?.granted && permission?.canAskAgain) {
            requestPermission()
        }
    }, [permission])

    const rScan = useAnimatedStyle(() => ({
        transform: [{ translateY: scanLineY.value }]
    }))

    const rGrid = useAnimatedStyle(() => ({
        opacity: gridOpacity.value
    }))

    return (
        <View style={styles.container}>

            {/* Live Camera Feed */}
            {permission?.granted ? (
                <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
            ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]} />
            )}

            {/* Darker glass overlay to keep the focus on AI elements while showing the court feed */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 0 }]} />

            {/* Viewfinder Elements */}
            <View style={styles.cameraFrame}>
                {/* Simulated grid */}
                <Animated.View style={[StyleSheet.absoluteFill, rGrid]}>
                    <View style={styles.gridVertical} />
                    <View style={styles.gridHorizontal} />
                    <View style={[styles.gridVertical, { left: '75%' }]} />
                    <View style={[styles.gridHorizontal, { top: '75%' }]} />
                </Animated.View>

                {/* Tracking Subjects */}
                <BoundingBox delay={0} startX={50} startY={200} color={colors.fire} />
                <BoundingBox delay={500} startX={250} startY={400} color="#00ffcc" />
                <BoundingBox delay={250} startX={100} startY={500} color={colors.live} />

                {/* Aggressive Scanning Laser */}
                <Animated.View style={[styles.scanBeam, rScan]}>
                    <View style={styles.scanCore} />
                </Animated.View>
            </View>

            {/* Top HUD overlay */}
            <SafeAreaView edges={['top']} style={styles.topBar}>
                <View style={styles.topBarInner}>
                    <Text style={styles.hudTitle}>SYSTEM CALIBRATION</Text>
                    <View style={styles.statusPill}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>REC</Text>
                    </View>
                </View>

                {/* Scrolling Data Logs */}
                <View style={styles.logContainer}>
                    {logLines.map((line, idx) => (
                        <Text key={idx} style={styles.logText}>{line}</Text>
                    ))}
                </View>
            </SafeAreaView>

            {/* Bottom Content Area */}
            <SafeAreaView edges={['bottom']} style={styles.bottomArea}>
                <BlurView intensity={40} tint="dark" style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Frame The Court</Text>
                    <Text style={styles.infoDesc}>
                        Point your camera at the play area. Our neural engine will automatically map player joints, calculate shooting arcs, and track physical metrics.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleLaunch}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryBtnText}>INITIALIZE TRACKER</Text>
                    </TouchableOpacity>
                </BlurView>
            </SafeAreaView>

        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraFrame: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    gridVertical: {
        position: 'absolute',
        top: 0, bottom: 0, left: '25%', width: 1,
        backgroundColor: colors.live,
    },
    gridHorizontal: {
        position: 'absolute',
        left: 0, right: 0, top: '25%', height: 1,
        backgroundColor: colors.live,
    },
    scanBeam: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 150,
        backgroundColor: 'rgba(255, 68, 0, 0.1)',
        borderBottomWidth: 3,
        borderBottomColor: colors.fire,
        shadowColor: colors.fire,
        shadowRadius: 20,
        shadowOpacity: 1,
    },
    scanCore: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 1,
        backgroundColor: '#fff',
    },
    boundingBox: {
        position: 'absolute',
        width: 120, height: 200,
        borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    boxCorner: {
        position: 'absolute',
        width: 15, height: 15,
    },
    trackingText: {
        position: 'absolute',
        top: -20, left: 0,
        fontFamily: 'Sora_700Bold',
        fontSize: 10,
        fontWeight: 'bold',
    },
    topBar: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
    },
    topBarInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: space[6],
        paddingVertical: space[4],
    },
    hudTitle: {
        fontFamily: 'Sora_800ExtraBold',
        fontSize: 18,
        fontWeight: '900',
        color: colors.snow,
        letterSpacing: 2,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.5)',
    },
    statusDot: {
        width: 8, height: 8,
        borderRadius: 4,
        backgroundColor: '#ff0000',
        marginRight: 6,
    },
    statusText: {
        fontFamily: 'Sora_700Bold',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ff0000',
    },
    logContainer: {
        paddingHorizontal: space[6],
        marginTop: space[2],
    },
    logText: {
        fontFamily: 'Sora_400Regular',
        fontSize: 10,
        color: colors.live,
        marginBottom: 2,
        textShadowColor: colors.live,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },
    bottomArea: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: space[4],
        zIndex: 10,
    },
    infoCard: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    infoTitle: {
        fontFamily: 'Sora_800ExtraBold',
        fontSize: 24,
        fontWeight: '900',
        color: colors.snow,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    infoDesc: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 15,
        color: colors.fog,
        lineHeight: 22,
        marginBottom: 24,
    },
    primaryBtn: {
        backgroundColor: colors.snow,
        width: '100%',
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtnText: {
        fontFamily: 'Sora_800ExtraBold',
        color: '#000',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    }
})
