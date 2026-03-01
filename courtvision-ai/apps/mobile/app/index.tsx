import { View, Text, TouchableOpacity, Dimensions, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withSpring,
    withSequence, withDelay, withRepeat, Easing, interpolate,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { T } from '../lib/theme'

const { width: W } = Dimensions.get('window')
const type = T.type
const spring = T.spring

//  Isometric 3D Scanner 

function IsometricScanner() {
    const pulse = useSharedValue(0)
    const scanLineY = useSharedValue(-200)
    const rotation = useSharedValue(0)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
            ),
            -1, true
        )

        scanLineY.value = withRepeat(
            withTiming(200, { duration: 3000, easing: Easing.linear }),
            -1, false
        )

        rotation.value = withRepeat(
            withTiming(360, { duration: 15000, easing: Easing.linear }),
            -1, false
        )
    }, [])

    const gridStyle = useAnimatedStyle(() => ({
        transform: [
            { rotateX: '60deg' },
            { rotateZ: '45deg' },
            { rotateY: `${pulse.value * 5}deg` },
            { scale: 1 + (pulse.value * 0.05) }
        ],
        opacity: 0.3 + (pulse.value * 0.3),
    }))

    const scanStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: scanLineY.value }],
        opacity: 0.8 - Math.abs(scanLineY.value) / 200,
    }))

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
        opacity: 0.2 + (pulse.value * 0.4),
    }))

    return (
        <View style={{ width: 280, height: 280, justifyContent: 'center', alignItems: 'center' }}>
            {/* Outer Rotating Data Rings */}
            <Animated.View style={[{
                position: 'absolute', width: 280, height: 280, borderRadius: 140,
                borderWidth: 1, borderColor: T.color.brand.primary,
                borderStyle: 'dashed',
            }, ringStyle]} />
            <Animated.View style={[{
                position: 'absolute', width: 240, height: 240, borderRadius: 120,
                borderWidth: 1, borderColor: `${T.color.brand.primary}40`,
            }, ringStyle]} />

            {/* 3D Isometric Grid */}
            <Animated.View style={[{
                width: 200, height: 200,
                borderWidth: 1, borderColor: T.color.brand.primary,
                overflow: 'hidden',
                backgroundColor: `${T.color.brand.primary}05`,
            }, gridStyle]}>
                {/* Horizontal Grid Lines */}
                {[...Array(10)].map((_, i) => (
                    <View key={`h-${i}`} style={{
                        position: 'absolute', top: i * 20, left: 0, right: 0, height: 1,
                        backgroundColor: `${T.color.brand.primary}30`
                    }} />
                ))}
                {/* Vertical Grid Lines */}
                {[...Array(10)].map((_, i) => (
                    <View key={`v-${i}`} style={{
                        position: 'absolute', left: i * 20, top: 0, bottom: 0, width: 1,
                        backgroundColor: `${T.color.brand.primary}30`
                    }} />
                ))}
                {/* Moving Scan Line */}
                <Animated.View style={[{
                    position: 'absolute', left: 0, right: 0, height: 4,
                    backgroundColor: T.color.brand.primary,
                    shadowColor: T.color.brand.primary, shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1, shadowRadius: 10,
                }, scanStyle]} />
            </Animated.View>
        </View>
    )
}

//  Screen 

export default function Onboarding1() {
    const router = useRouter()

    // Shared values
    const logoScale = useSharedValue(0.5)
    const logoOpacity = useSharedValue(0)
    const textY = useSharedValue(40)
    const textOpacity = useSharedValue(0)
    const btnY = useSharedValue(60)
    const btnOpacity = useSharedValue(0)
    const glowOpacity = useSharedValue(0.15)

    useEffect(() => {
        // Logo entrance
        logoScale.value = withSpring(1, { damping: 12, stiffness: 100 })
        logoOpacity.value = withTiming(1, { duration: 600 })
        // Text entrance (staggered)
        textY.value = withDelay(300, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }))
        textOpacity.value = withDelay(300, withTiming(1, { duration: 500 }))
        // Button entrance
        btnY.value = withDelay(600, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }))
        btnOpacity.value = withDelay(600, withTiming(1, { duration: 500 }))
        // Glow pulse
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.45, { duration: 2000 }),
                withTiming(0.15, { duration: 2000 }),
            ),
            -1, true,
        )
    }, [])

    const logoAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
        opacity: logoOpacity.value,
    }))

    const textAnimStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: textY.value }],
        opacity: textOpacity.value,
    }))

    const btnAnimStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: btnY.value }],
        opacity: btnOpacity.value,
    }))

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }))

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.bg.primary }}>
            {/* Ambient glow */}
            <Animated.View style={[{
                position: 'absolute', top: -80, left: W / 2 - 160,
                width: 320, height: 320, borderRadius: 160,
                backgroundColor: T.color.brand.primary,
            }, glowStyle]} />

            {/* Progress bar */}
            <View style={{ paddingTop: 20, paddingHorizontal: 32 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{
                        flex: 1, height: 3, borderRadius: 2,
                        backgroundColor: T.color.brand.primary,
                        ...T.glow.soft(T.color.brand.primary),
                    }} />
                    {[1, 2, 3].map(i => (
                        <View key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            backgroundColor: T.color.bg.tertiary,
                        }} />
                    ))}
                </View>
            </View>

            {/* Hero section */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 56, marginTop: 40 }}>
                    <IsometricScanner />
                    <Animated.View style={[{
                        position: 'absolute',
                        width: 100, height: 100, borderRadius: 50,
                        justifyContent: 'center', alignItems: 'center',
                        ...T.glass.vivid,
                        ...T.glow.hero(T.color.bg.primary),
                        borderWidth: 2, borderColor: `${T.color.brand.primary}50`,
                    }, logoAnimStyle]}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: `${T.color.brand.primary}25`,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 42 }}>🏀</Text>
                        </View>
                    </Animated.View>
                </View>

                <Animated.View style={[{ alignItems: 'center' }, textAnimStyle]}>
                    <Text style={{
                        ...type.h1,
                        color: T.color.text.primary, textAlign: 'center',
                        fontSize: 48, lineHeight: 52, letterSpacing: -2,
                    }}>
                        Apex{'\n'}
                        <Text style={{ color: T.color.brand.primary, fontFamily: T.fonts.display.black, textTransform: 'uppercase' }}>Intelligence</Text>
                    </Text>

                    <Text style={{
                        ...type.body,
                        color: T.color.text.secondary,
                        marginTop: T.spacing[5], textAlign: 'center',
                        lineHeight: 24, letterSpacing: 0.5,
                        fontFamily: T.fonts.body.regular,
                    }}>
                        Analyze your game with military precision.{'\n'}Your digital twin awaits.
                    </Text>
                </Animated.View>
            </View>

            {/* CTA */}
            <Animated.View style={[{ paddingHorizontal: 32, paddingBottom: 40 }, btnAnimStyle]}>
                <TouchableOpacity
                    style={{
                        backgroundColor: T.color.brand.primary,
                        paddingVertical: 18, borderRadius: T.radius.full,
                        alignItems: 'center',
                        ...T.glow.hero(T.color.brand.primary),
                    }}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        router.push('/onboarding2')
                    }}
                    activeOpacity={0.85}
                    accessibilityLabel="Get started"
                    accessibilityRole="button"
                >
                    <Text style={{
                        color: '#fff', fontFamily: T.fonts.display.black,
                        fontSize: 18, letterSpacing: 0.5,
                    }}>
                        Get Started
                    </Text>
                </TouchableOpacity>

                <Text style={{
                    ...type.caption,
                    color: T.color.text.tertiary,
                    textAlign: 'center', marginTop: 16, letterSpacing: 0.3,
                }}>
                    Free during beta · No credit card required
                </Text>
            </Animated.View>
        </SafeAreaView>
    )
}
