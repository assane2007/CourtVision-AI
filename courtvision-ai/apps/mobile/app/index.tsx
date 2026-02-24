import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useRef } from 'react'

export default function Onboarding1() {
    const router = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(40)).current
    const scaleAnim = useRef(new Animated.Value(0.8)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start()
    }, [fadeAnim, slideAnim, scaleAnim])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            {/* Indicateur de progression */}
            <View style={{ position: 'absolute', top: 60, left: 32, right: 32, flexDirection: 'row', gap: 6 }}>
                <View style={{ flex: 1, height: 3, backgroundColor: '#1A73E8', borderRadius: 2 }} />
                <View style={{ flex: 1, height: 3, backgroundColor: '#161B22', borderRadius: 2 }} />
                <View style={{ flex: 1, height: 3, backgroundColor: '#161B22', borderRadius: 2 }} />
            </View>

            {/* Logo animé */}
            <Animated.View
                style={{
                    width: 160,
                    height: 160,
                    backgroundColor: '#161B22',
                    borderRadius: 80,
                    marginBottom: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: 'rgba(26, 115, 232, 0.3)',
                    transform: [{ scale: scaleAnim }],
                    opacity: fadeAnim,
                }}
            >
                <Text style={{ fontSize: 56 }}>🏀</Text>
            </Animated.View>

            {/* Titre */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                <Text style={{
                    color: '#E6EDF3',
                    fontSize: 36,
                    fontWeight: '800',
                    textAlign: 'center',
                    letterSpacing: -0.5,
                }}>
                    Joue comme{'\n'}
                    <Text style={{ color: '#1A73E8' }}>un pro.</Text>
                </Text>

                <Text style={{
                    color: '#8B949E',
                    fontSize: 16,
                    marginTop: 16,
                    textAlign: 'center',
                    lineHeight: 24,
                }}>
                    Analyse ton jeu avec l'Intelligence{'\n'}Artificielle. Ton coach dans ta poche.
                </Text>
            </Animated.View>

            {/* CTA */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', marginTop: 56 }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#1A73E8',
                        paddingVertical: 18,
                        borderRadius: 30,
                        alignItems: 'center',
                        shadowColor: '#1A73E8',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                    onPress={() => router.push('/onboarding2')}
                    activeOpacity={0.85}
                    accessibilityLabel="Commencer l'onboarding"
                    accessibilityRole="button"
                >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>Commencer</Text>
                </TouchableOpacity>

                {/* Skip */}
                <Text style={{
                    color: '#484F58',
                    fontSize: 13,
                    textAlign: 'center',
                    marginTop: 16,
                }}>
                    Gratuit pendant la beta • Pas de carte requise
                </Text>
            </Animated.View>
        </SafeAreaView>
    )
}
