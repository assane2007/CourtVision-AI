import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome5, Foundation } from '@expo/vector-icons'

export default function DigitalTwin() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ color: '#E6EDF3', fontSize: 24, fontWeight: 'bold' }}>Ton Jumeau Numérique</Text>
                    <FontAwesome5 name="user-astronaut" size={24} color="#00D4FF" />
                </View>

                <Text style={{ color: '#8B949E', fontSize: 14, marginBottom: 30 }}>
                    Basé sur l'analyse de tes 14 derniers matchs. Ce modèle IA reproduit ton style de jeu exact.
                </Text>

                {/* 3D Avatar Placeholder */}
                <View style={{ height: 300, backgroundColor: '#161B22', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00D4FF', marginBottom: 30 }}>
                    <Text style={{ color: '#8B949E' }}>[Rendu d'Avatar 3D Interactif]</Text>
                    <Foundation name="target" size={30} color="#00D4FF" style={{ marginTop: 20 }} />
                </View>

                <Text style={{ color: '#E6EDF3', fontSize: 20, fontWeight: '600', marginBottom: 15 }}>ADN de ton jeu</Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0, 200, 83, 0.1)', padding: 15, borderRadius: 15, marginRight: 10 }}>
                        <Text style={{ color: '#00C853', fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>Points Forts</Text>
                        <Text style={{ color: '#E6EDF3', fontSize: 12 }}>• Quick release off-dribble</Text>
                        <Text style={{ color: '#E6EDF3', fontSize: 12 }}>• Resistance pression (+85%)</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255, 61, 87, 0.1)', padding: 15, borderRadius: 15, marginLeft: 10 }}>
                        <Text style={{ color: '#FF3D57', fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>Points Faibles</Text>
                        <Text style={{ color: '#E6EDF3', fontSize: 12 }}>• Drives main gauche</Text>
                        <Text style={{ color: '#E6EDF3', fontSize: 12 }}>• Repli defensif lent</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={{ backgroundColor: '#00D4FF', borderRadius: 15, padding: 20, alignItems: 'center', marginTop: 20 }}
                >
                    <Text style={{ color: '#0D1117', fontSize: 16, fontWeight: 'bold' }}>Lancer Simualteur de Match</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    )
}
