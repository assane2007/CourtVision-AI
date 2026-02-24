import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'

const POSITIONS = [
    { label: 'Meneur (PG)', value: 'PG', emoji: '⚡' },
    { label: 'Arrière (SG)', value: 'SG', emoji: '🎯' },
    { label: 'Ailier (SF)', value: 'SF', emoji: '🦅' },
    { label: 'Ailier Fort (PF)', value: 'PF', emoji: '💪' },
    { label: 'Pivot (C)', value: 'C', emoji: '🛡️' },
]

export default function Onboarding2() {
    const router = useRouter()
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const [selected, setSelected] = useState<string | null>(null)

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start()
    }, [fadeAnim, slideAnim])

    const handleSelect = (value: string) => {
        setSelected(value)
    }

    const handleContinue = () => {
        // TODO: Sauvegarder le poste dans le store (Zustand) ou le contexte utilisateur
        router.push('/onboarding3')
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', padding: 20 }}>
            {/* Header avec bouton retour */}
            <TouchableOpacity
                onPress={() => router.back()}
                style={{ marginBottom: 10 }}
                accessibilityLabel="Retour"
            >
                <Ionicons name="arrow-back" size={24} color="#8B949E" />
            </TouchableOpacity>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }}>
                {/* Indicateur de progression */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 30 }}>
                    <View style={{ flex: 1, height: 3, backgroundColor: '#1A73E8', borderRadius: 2 }} />
                    <View style={{ flex: 1, height: 3, backgroundColor: '#1A73E8', borderRadius: 2 }} />
                    <View style={{ flex: 1, height: 3, backgroundColor: '#161B22', borderRadius: 2 }} />
                </View>

                <Text style={{ color: '#E6EDF3', fontSize: 28, fontWeight: '800', marginBottom: 10, letterSpacing: -0.3 }}>
                    Quel est ton poste ?
                </Text>
                <Text style={{ color: '#8B949E', fontSize: 16, marginBottom: 30, lineHeight: 24 }}>
                    Pour générer un Digital Twin optimisé, choisis ta position de prédilection.
                </Text>

                {POSITIONS.map((p) => {
                    const isSelected = selected === p.value
                    return (
                        <TouchableOpacity
                            key={p.value}
                            style={{
                                backgroundColor: isSelected ? 'rgba(26, 115, 232, 0.15)' : '#161B22',
                                padding: 18,
                                borderRadius: 15,
                                marginBottom: 12,
                                borderWidth: 1.5,
                                borderColor: isSelected ? '#1A73E8' : '#21262D',
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                            onPress={() => handleSelect(p.value)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Sélectionner le poste ${p.label}`}
                        >
                            <Text style={{ fontSize: 24, marginRight: 14 }}>{p.emoji}</Text>
                            <Text style={{ color: '#E6EDF3', fontSize: 17, fontWeight: '600', flex: 1 }}>{p.label}</Text>
                            {isSelected && <Ionicons name="checkmark-circle" size={24} color="#1A73E8" />}
                        </TouchableOpacity>
                    )
                })}

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* CTA Continuer */}
                <TouchableOpacity
                    style={{
                        backgroundColor: selected ? '#1A73E8' : '#161B22',
                        paddingVertical: 18,
                        borderRadius: 30,
                        alignItems: 'center',
                        opacity: selected ? 1 : 0.5,
                        marginBottom: 10,
                    }}
                    onPress={handleContinue}
                    disabled={!selected}
                    activeOpacity={0.85}
                    accessibilityLabel="Continuer vers l'étape suivante"
                >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>Continuer</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    )
}
