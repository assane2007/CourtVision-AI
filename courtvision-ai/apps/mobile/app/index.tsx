import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useRef } from 'react'
import { T } from '../lib/theme'

const { width: SCREEN_W } = Dimensions.get('window')

// Animated particle ring for hero
function ParticleRing() {
    const rotateAnim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: true })
        ).start()
    }, [])
    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    return (
        <Animated.View style={{
            position: 'absolute', width: 220, height: 220,
            borderRadius: 110,
            borderWidth: 1,
            borderColor: 'rgba(0,229,255,0.08)',
            transform: [{ rotate }],
        }}>
            {/* Dots on the ring */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <View key={i} style={{
                    position: 'absolute',
                    width: i % 2 === 0 ? 6 : 4,
                    height: i % 2 === 0 ? 6 : 4,
                    borderRadius: 3,
                    backgroundColor: i % 2 === 0 ? T.colors.accent : T.colors.primary,
                    opacity: 0.5 + (i % 3) * 0.2,
                    top: 110 + Math.sin(deg * Math.PI / 180) * 110 - 3,
                    left: 110 + Math.cos(deg * Math.PI / 180) * 110 - 3,
                }} />
            ))}
        </Animated.View>
    )
}

export default function Onboarding1() {
    const router = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const scaleAnim = useRef(new Animated.Value(0.6)).current
    const glowAnim = useRef(new Animated.Value(0.2)).current
    const btnSlide = useRef(new Animated.Value(80)).current

    useEffect(() => {
        // Staggered entrance
        Animated.sequence([
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(btnSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
        ]).start()

        // Pulsing glow
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 0.5, duration: 2000, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0.2, duration: 2000, useNativeDriver: false }),
            ])
        ).start()
    }, [])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Background gradient overlay */}
            <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '60%',
                backgroundColor: 'rgba(0,229,255,0.02)',
                borderBottomLeftRadius: 200,
                borderBottomRightRadius: 200,
            }} />

            {/* Progress dots */}
            <View style={{ paddingTop: 20, paddingHorizontal: 32 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, height: 3, backgroundColor: T.colors.accent, borderRadius: 2, ...T.glow(T.colors.accent, 0.3) }} />
                    <View style={{ flex: 1, height: 3, backgroundColor: T.colors.dimmer, borderRadius: 2 }} />
                    <View style={{ flex: 1, height: 3, backgroundColor: T.colors.dimmer, borderRadius: 2 }} />
                    <View style={{ flex: 1, height: 3, backgroundColor: T.colors.dimmer, borderRadius: 2 }} />
                </View>
            </View>

            {/* Main content */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                {/* Hero Logo */}
                <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 56 }}>
                    <ParticleRing />
                    <Animated.View style={{
                        width: 140, height: 140,
                        borderRadius: 70,
                        justifyContent: 'center', alignItems: 'center',
                        transform: [{ scale: scaleAnim }],
                        opacity: fadeAnim,
                        ...T.glass.accent,
                        ...T.glow(T.colors.accent, 0.3),
                    }}>
                        <View style={{
                            width: 110, height: 110, borderRadius: 55,
                            backgroundColor: 'rgba(0,229,255,0.08)',
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 56 }}>🏀</Text>
                        </View>
                    </Animated.View>
                </View>

                {/* Text content */}
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <Text style={{
                        color: T.colors.white,
                        fontSize: T.font.hero,
                        fontWeight: '900',
                        textAlign: 'center',
                        letterSpacing: -1.5,
                        lineHeight: 48,
                    }}>
                        Joue comme{'\n'}
                        <Text style={{ color: T.colors.accent }}>un pro.</Text>
                    </Text>

                    <Text style={{
                        color: T.colors.textSecondary,
                        fontSize: T.font.base,
                        marginTop: 20,
                        textAlign: 'center',
                        lineHeight: 24,
                        letterSpacing: 0.2,
                    }}>
                        Analyse ton jeu avec l'Intelligence{'\n'}Artificielle. Ton coach dans ta poche.
                    </Text>
                </Animated.View>
            </View>

            {/* CTA */}
            <Animated.View style={{
                paddingHorizontal: 32,
                paddingBottom: 40,
                opacity: fadeAnim,
                transform: [{ translateY: btnSlide }],
            }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: T.colors.accent,
                        paddingVertical: 18,
                        borderRadius: T.radius.pill,
                        alignItems: 'center',
                        ...T.glow(T.colors.accent, 0.4),
                    }}
                    onPress={() => router.push('/onboarding2')}
                    activeOpacity={0.85}
                    accessibilityLabel="Commencer l'onboarding"
                    accessibilityRole="button"
                >
                    <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: 18, letterSpacing: 0.5 }}>
                        Commencer
                    </Text>
                </TouchableOpacity>

                <Text style={{
                    color: T.colors.dim,
                    fontSize: 12,
                    textAlign: 'center',
                    marginTop: 16,
                    letterSpacing: 0.3,
                }}>
                    Gratuit pendant la beta • Pas de carte requise
                </Text>
            </Animated.View>
        </SafeAreaView>
    )
}
