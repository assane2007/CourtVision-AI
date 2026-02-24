import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'

export default function Onboarding3() {
    const router = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const logoScale = useRef(new Animated.Value(0.8)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 700,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start()
    }, [fadeAnim, slideAnim, logoScale])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', padding: 20 }}>
            {/* Header retour */}
            <TouchableOpacity
                onPress={() => router.back()}
                style={{ marginBottom: 10 }}
                accessibilityLabel="Retour"
            >
                <Ionicons name="arrow-back" size={24} color="#8B949E" />
            </TouchableOpacity>

            {/* Indicateur de progression */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                <View style={{ flex: 1, height: 3, backgroundColor: '#1A73E8', borderRadius: 2 }} />
                <View style={{ flex: 1, height: 3, backgroundColor: '#1A73E8', borderRadius: 2 }} />
                <View style={{ flex: 1, height: 3, backgroundColor: '#1A73E8', borderRadius: 2 }} />
            </View>

            {/* Icon logo */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Animated.View
                    style={{
                        width: 100,
                        height: 100,
                        backgroundColor: '#161B22',
                        borderRadius: 25,
                        marginBottom: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1.5,
                        borderColor: 'rgba(26, 115, 232, 0.3)',
                        transform: [{ scale: logoScale }],
                        opacity: fadeAnim,
                    }}
                >
                    <Text style={{ fontSize: 40 }}>🏀</Text>
                </Animated.View>

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
                    <Text style={{ color: '#E6EDF3', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 }}>CourtVision AI</Text>
                    <Text style={{ color: '#8B949E', fontSize: 14, marginTop: 6 }}>Connecte-toi pour commencer</Text>
                </Animated.View>
            </View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], paddingBottom: 30 }}>
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#E6EDF3',
                        padding: 16,
                        borderRadius: 14,
                        marginBottom: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                    }}
                    onPress={() => router.replace('/(dashboard)')}
                    activeOpacity={0.85}
                    accessibilityLabel="Continuer avec Apple"
                >
                    <AntDesign name="apple1" size={22} color="#0D1117" style={{ marginRight: 15 }} />
                    <Text style={{ color: '#0D1117', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginRight: 37 }}>
                        Continuer avec Apple
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#161B22',
                        padding: 16,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#30363D',
                    }}
                    onPress={() => router.replace('/(dashboard)')}
                    activeOpacity={0.85}
                    accessibilityLabel="Continuer avec Google"
                >
                    <AntDesign name="google" size={22} color="#E6EDF3" style={{ marginRight: 15 }} />
                    <Text style={{ color: '#E6EDF3', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginRight: 37 }}>
                        Continuer avec Google
                    </Text>
                </TouchableOpacity>

                <Text style={{ color: '#484F58', textAlign: 'center', marginTop: 24, fontSize: 12, lineHeight: 18 }}>
                    En continuant, tu acceptes nos{' '}
                    <Text style={{ color: '#8B949E', textDecorationLine: 'underline' }}>CGV</Text>
                    {' '}et notre{' '}
                    <Text style={{ color: '#8B949E', textDecorationLine: 'underline' }}>Politique de confidentialité</Text>.
                </Text>
            </Animated.View>
        </SafeAreaView>
    )
}
