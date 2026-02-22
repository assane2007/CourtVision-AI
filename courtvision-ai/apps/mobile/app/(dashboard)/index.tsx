import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function DashboardIndex() {
    const router = useRouter()

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text style={{ color: '#E6EDF3', fontSize: 28, fontWeight: 'bold' }}>Dashboard</Text>
                <Text style={{ color: '#8B949E', fontSize: 14, marginBottom: 20 }}>Streak: 🔥 3 jours consécutifs</Text>

                {/* Bouton Central (Action principale) */}
                <TouchableOpacity
                    style={{ backgroundColor: '#1A73E8', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 25, shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}
                    onPress={() => router.push('/(dashboard)/upload')}
                >
                    <Ionicons name="scan-circle" size={50} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Analyser un match</Text>
                </TouchableOpacity>

                <Text style={{ color: '#E6EDF3', fontSize: 20, fontWeight: '600', marginBottom: 15 }}>Progression Hebdo</Text>
                <View style={{ height: 150, backgroundColor: '#161B22', borderRadius: 15, marginBottom: 25, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#8B949E' }}>[Graphique de Tendance (Courbe)]</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
                    {/* Mental Score */}
                    <View style={{ flex: 1, backgroundColor: '#161B22', borderRadius: 15, padding: 20, marginRight: 10 }}>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>Mental Score (der. match)</Text>
                        <Text style={{ color: '#00C853', fontSize: 32, fontWeight: 'bold', marginVertical: 10 }}>85/100</Text>
                        <Text style={{ color: '#00C853', fontSize: 12 }}>+5% ↑</Text>
                    </View>

                    {/* Efficacité tir */}
                    <View style={{ flex: 1, backgroundColor: '#161B22', borderRadius: 15, padding: 20, marginLeft: 10 }}>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>Shooting Form</Text>
                        <Text style={{ color: '#FFB300', fontSize: 32, fontWeight: 'bold', marginVertical: 10 }}>B-</Text>
                        <Text style={{ color: '#FFB300', fontSize: 12 }}>Release Height bas</Text>
                    </View>
                </View>

                <Text style={{ color: '#E6EDF3', fontSize: 20, fontWeight: '600', marginBottom: 15 }}>Derniers Highlights</Text>
                <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3].map(item => (
                        <TouchableOpacity key={item} style={{ width: 100, height: 160, backgroundColor: '#161B22', borderRadius: 10, marginRight: 15, justifyContent: 'flex-end', padding: 10 }} onPress={() => router.push(`/highlight/${item}`)}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>Match {item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    )
}
