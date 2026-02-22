import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Onboarding2() {
    const router = useRouter()
    const positions = ['Meneur (PG)', 'Arrière (SG)', 'Ailier (SF)', 'Ailier Fort (PF)', 'Pivot (C)']
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', padding: 20 }}>
            <Text style={{ color: '#E6EDF3', fontSize: 28, fontWeight: 'bold', marginTop: 40, marginBottom: 10 }}>Quel est ton poste ?</Text>
            <Text style={{ color: '#8B949E', fontSize: 16, marginBottom: 40 }}>
                Pour générer un Digital Twin optimisé, choisis ta position de prédilection.
            </Text>

            {positions.map(p => (
                <TouchableOpacity
                    key={p}
                    style={{ backgroundColor: '#161B22', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#1A73E8' }}
                    onPress={() => router.push('/onboarding3')}
                >
                    <Text style={{ color: '#E6EDF3', fontSize: 18, fontWeight: 'bold' }}>{p}</Text>
                </TouchableOpacity>
            ))}
        </SafeAreaView>
    )
}
