import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function DashboardIndex() {
    const router = useRouter()

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <Text style={{ color: '#E6EDF3', fontSize: 28, fontWeight: '800', letterSpacing: -0.3 }}>Dashboard</Text>
                <Text style={{ color: '#8B949E', fontSize: 14, marginBottom: 20 }}>Streak: 🔥 3 jours consécutifs</Text>

                {/* Bouton Central (Action principale) */}
                <TouchableOpacity
                    style={{
                        backgroundColor: '#1A73E8',
                        borderRadius: 20,
                        padding: 30,
                        alignItems: 'center',
                        marginBottom: 15,
                        shadowColor: '#1A73E8',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.5,
                        shadowRadius: 20,
                        elevation: 8,
                    }}
                    onPress={() => router.push('/(dashboard)/upload')}
                    activeOpacity={0.85}
                    accessibilityLabel="Analyser un match — importer une vidéo"
                >
                    <Ionicons name="scan-circle" size={50} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>Analyser un match</Text>
                </TouchableOpacity>

                {/* Boutons secondaires : Coach Live + Programme */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 25 }}>
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: '#161B22',
                            borderRadius: 15,
                            padding: 18,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#FF3D57',
                        }}
                        onPress={() => router.push('/live')}
                        activeOpacity={0.85}
                        accessibilityLabel="Lancer le Coach Live en temps réel"
                    >
                        <MaterialCommunityIcons name="radar" size={28} color="#FF3D57" />
                        <Text style={{ color: '#E6EDF3', fontSize: 14, fontWeight: '600', marginTop: 6 }}>Coach Live</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: '#161B22',
                            borderRadius: 15,
                            padding: 18,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#00C853',
                        }}
                        onPress={() => router.push('/program')}
                        activeOpacity={0.85}
                        accessibilityLabel="Voir le programme d'entraînement"
                    >
                        <Ionicons name="fitness" size={28} color="#00C853" />
                        <Text style={{ color: '#E6EDF3', fontSize: 14, fontWeight: '600', marginTop: 6 }}>Programme</Text>
                    </TouchableOpacity>
                </View>

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
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[1, 2, 3].map(item => (
                        <TouchableOpacity
                            key={item}
                            style={{
                                width: 110,
                                height: 170,
                                backgroundColor: '#161B22',
                                borderRadius: 12,
                                marginRight: 12,
                                justifyContent: 'flex-end',
                                padding: 10,
                                borderWidth: 1,
                                borderColor: '#21262D',
                            }}
                            onPress={() => router.push(`/highlight/${item}`)}
                            activeOpacity={0.85}
                            accessibilityLabel={`Voir le highlight du match ${item}`}
                        >
                            <Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', top: 60, alignSelf: 'center' }} />
                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Match {item}</Text>
                            <Text style={{ color: '#8B949E', fontSize: 10, marginTop: 2 }}>Il y a {item}j</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ScrollView>
        </SafeAreaView>
    )
}
