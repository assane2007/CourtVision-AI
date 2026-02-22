import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, FontAwesome } from '@expo/vector-icons'

export default function HighlightPlayer() {
    const { id } = useLocalSearchParams()
    const router = useRouter()

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>

            {/* Simulation Video Player Fullscreen */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="play-circle-outline" size={100} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 20 }}>Video.mp4 (1080p AI Edited)</Text>
            </View>

            {/* Overlay Stats & UI */}
            <SafeAreaView style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, pointerEvents: 'box-none' }}>

                {/* Header (Back button) */}
                <View style={{ flexDirection: 'row', padding: 20, justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 }}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ backgroundColor: 'rgba(26,115,232,0.8)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15 }}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>AI COMMENTARY ON</Text>
                    </View>
                </View>

                <View style={{ flex: 1 }} pointerEvents="none" />

                {/* Footer actions */}
                <View style={{ padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <TouchableOpacity style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 30, marginBottom: 5 }}>
                                <Ionicons name="share-social" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>1.2k</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>Highlight Reel #{id}</Text>
                            <Text style={{ color: '#8B949E', fontSize: 14, marginTop: 5 }}>14 Pts • 3 Ast • Généré en 2min</Text>
                        </View>
                        <TouchableOpacity style={{ backgroundColor: '#1A73E8', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 }}>
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Publier</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </SafeAreaView>
        </View>
    )
}
