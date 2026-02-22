import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AntDesign, FontAwesome } from '@expo/vector-icons'

export default function Onboarding3() {
    const router = useRouter()
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', padding: 20 }}>
            {/* Icon logo */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 100, height: 100, backgroundColor: '#161B22', borderRadius: 20, marginBottom: 20 }} />
                <Text style={{ color: '#E6EDF3', fontSize: 24, fontWeight: 'bold' }}>CourtVision AI</Text>
                <Text style={{ color: '#8B949E', fontSize: 14, marginTop: 5 }}>Connecte-toi pour commencer</Text>
            </View>

            <View style={{ paddingBottom: 50 }}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6EDF3', padding: 15, borderRadius: 12, marginBottom: 15 }}
                    onPress={() => router.replace('/(dashboard)')}
                >
                    <AntDesign name="apple1" size={24} color="#0D1117" style={{ marginRight: 15 }} />
                    <Text style={{ color: '#0D1117', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' }}>Continuer avec Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#8B949E' }}
                    onPress={() => router.replace('/(dashboard)')}
                >
                    <AntDesign name="google" size={24} color="#E6EDF3" style={{ marginRight: 15 }} />
                    <Text style={{ color: '#E6EDF3', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' }}>Continuer avec Google</Text>
                </TouchableOpacity>

                <Text style={{ color: '#8B949E', textAlign: 'center', marginTop: 30, fontSize: 12 }}>
                    En continuant, tu acceptes nos CGV.
                </Text>
            </View>
        </SafeAreaView>
    )
}
