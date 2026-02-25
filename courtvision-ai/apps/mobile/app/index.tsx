import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withSpring,
    withSequence, withDelay, withRepeat, Easing, interpolate,
} from 'react-native-reanimated'
import { T } from '../lib/theme'

const { width: W } = Dimensions.get('window')

//  Animated Particle Ring 

function ParticleRing() {
    const rotation = useSharedValue(0)

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 10000, easing: Easing.linear }),
            -1, false,
        )
    }, [])

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }))

    const DOTS = [0, 60, 120, 180, 240, 300]

    return (
        <Animated.View style={[{
            position: 'absolute', width: 240, height: 240, borderRadius: 120,
            borderWidth: 1, borderColor: `${T.colors.accent}12`,
        }, ringStyle]}>
            {DOTS.map((deg, i) => {
                const rad = (deg * Math.PI) / 180
                const size = i % 2 === 0 ? 6 : 4
                return (
                    <View key={i} style={{
                        position: 'absolute',
                        width: size, height: size, borderRadius: size / 2,
                        backgroundColor: i % 2 === 0 ? T.colors.accent : T.colors.white,
                        opacity: 0.4 + (i % 3) * 0.2,
                        top: 120 + Math.sin(rad) * 120 - size / 2,
                        left: 120 + Math.cos(rad) * 120 - size / 2,
                    }} />
                )
            })}
        </Animated.View>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Ambient glow */}
            <Animated.View style={[{
                position: 'absolute', top: -80, left: W / 2 - 160,
                width: 320, height: 320, borderRadius: 160,
                backgroundColor: T.colors.accent,
            }, glowStyle]} />

            {/* Progress bar */}
            <View style={{ paddingTop: 20, paddingHorizontal: 32 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{
                        flex: 1, height: 3, borderRadius: 2,
                        backgroundColor: T.colors.accent,
                        ...T.glow(T.colors.accent, 0.3),
                    }} />
                    {[1, 2, 3].map(i => (
                        <View key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            backgroundColor: T.colors.dimmer,
                        }} />
                    ))}
                </View>
            </View>

            {/* Hero section */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 56 }}>
                    <ParticleRing />
                    <Animated.View style={[{
                        width: 140, height: 140, borderRadius: 70,
                        justifyContent: 'center', alignItems: 'center',
                        ...T.glass.accent,
                        ...T.glow(T.colors.accent, 0.35),
                    }, logoAnimStyle]}>
                        <View style={{
                            width: 110, height: 110, borderRadius: 55,
                            backgroundColor: `${T.colors.accent}15`,
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 56 }}></Text>
                        </View>
                    </Animated.View>
                </View>

                <Animated.View style={[{ alignItems: 'center' }, textAnimStyle]}>
                    <Text style={{
                        color: T.colors.white, fontSize: T.font.hero,
                        fontWeight: '900', textAlign: 'center',
                        letterSpacing: -1.5, lineHeight: 48,
                    }}>
                        Play like{'\n'}
                        <Text style={{ color: T.colors.accent }}>a pro.</Text>
                    </Text>

                    <Text style={{
                        color: T.colors.textSecondary, fontSize: T.font.base,
                        marginTop: 20, textAlign: 'center',
                        lineHeight: 24, letterSpacing: 0.2,
                    }}>
                        Analyze your game with AI.{'\n'}Your coach, in your pocket.
                    </Text>
                </Animated.View>
            </View>

            {/* CTA */}
            <Animated.View style={[{ paddingHorizontal: 32, paddingBottom: 40 }, btnAnimStyle]}>
                <TouchableOpacity
                    style={{
                        backgroundColor: T.colors.accent,
                        paddingVertical: 18, borderRadius: T.radius.pill,
                        alignItems: 'center',
                        ...T.glow(T.colors.accent, 0.4),
                    }}
                    onPress={() => router.push('/onboarding2')}
                    activeOpacity={0.85}
                    accessibilityLabel="Get started"
                    accessibilityRole="button"
                >
                    <Text style={{
                        color: T.colors.bg, fontWeight: '800',
                        fontSize: 18, letterSpacing: 0.5,
                    }}>
                        Get Started
                    </Text>
                </TouchableOpacity>

                <Text style={{
                    color: T.colors.dim, fontSize: 12,
                    textAlign: 'center', marginTop: 16, letterSpacing: 0.3,
                }}>
                    Free during beta  No credit card required
                </Text>
            </Animated.View>
        </SafeAreaView>
    )
}
