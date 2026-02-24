import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons'

export default function Profile() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>

                {/* Player Card (Glassmorphism effect placeholder) */}
                <View style={{ backgroundColor: '#161B22', borderRadius: 20, padding: 25, shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, borderWidth: 1, borderColor: '#1A73E8', marginBottom: 30 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ width: 80, height: 80, backgroundColor: '#8B949E', borderRadius: 40 }} />
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#E6EDF3', fontSize: 24, fontWeight: 'bold' }}>S. Curry #30</Text>
                            <Text style={{ color: '#00D4FF', fontSize: 16 }}>Meneur (PG)</Text>
                            <Text style={{ color: '#8B949E', fontSize: 14 }}>188cm • 84kg</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={{ color: '#8B949E', fontSize: 12 }}>PRO PLAN</Text>
                            <Text style={{ color: '#E6EDF3', fontSize: 14, fontWeight: '600' }}>Coach</Text>
                        </View>
                        <TouchableOpacity style={{ backgroundColor: 'rgba(26,115,232,0.2)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10 }}>
                            <Text style={{ color: '#1A73E8', fontWeight: 'bold' }}>Gérer</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={{ backgroundColor: '#161B22', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 15, marginBottom: 15 }}
                    accessibilityLabel="Générer ma fiche de recrutement en PDF"
                    accessibilityRole="button"
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="picture-as-pdf" size={24} color="#FF3D57" style={{ marginRight: 15 }} />
                        <Text style={{ color: '#E6EDF3', fontSize: 16, fontWeight: '600' }}>Générer ma fiche recrutement</Text>
                    </View>
                    <FontAwesome5 name="chevron-right" size={16} color="#8B949E" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ backgroundColor: '#161B22', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 15, marginBottom: 15 }}
                    accessibilityLabel="Ouvrir les réglages du compte"
                    accessibilityRole="button"
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="settings" size={24} color="#8B949E" style={{ marginRight: 15 }} />
                        <Text style={{ color: '#E6EDF3', fontSize: 16, fontWeight: '600' }}>Réglages Compte</Text>
                    </View>
                    <FontAwesome5 name="chevron-right" size={16} color="#8B949E" />
                </TouchableOpacity>

                <Text style={{ color: '#8B949E', textAlign: 'center', marginTop: 50, fontSize: 12 }}>
                    CourtVision AI v1.0.0
                </Text>

            </ScrollView>
        </SafeAreaView>
    )
}
