import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Onboarding1() {
    const router = useRouter()
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' }}>
            {/* Simulation d'une animation 3D ou d'un court qui s'illumine via un svg ou une image */}
            <View style={{ width: 200, height: 200, backgroundColor: '#161B22', borderRadius: 100, marginBottom: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                <Text style={{ fontSize: 40 }}>🏀</Text>
            </View>

            <Text style={{ color: '#E6EDF3', fontSize: 32, fontFamily: 'sans-serif-medium', fontWeight: 'bold' }}>Joue comme un pro.</Text>
            <Text style={{ color: '#8B949E', fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }}>
                Analyse ton jeu avec l'Intelligence Artificielle.
            </Text>

            <TouchableOpacity
                style={{ marginTop: 60, backgroundColor: '#1A73E8', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 }}
                onPress={() => router.push('/onboarding2')}
            >
                <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 18 }}>Commencer</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )
}
