import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons'

export default function AnalysisReport() {
    const { id } = useLocalSearchParams()
    const router = useRouter()

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>

            {/* Header Custom */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#161B22' }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#E6EDF3" />
                </TouchableOpacity>
                <Text style={{ color: '#E6EDF3', fontSize: 20, fontWeight: 'bold', marginLeft: 20 }}>Rapport d'Analyse</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>

                {/* Résumé visuel */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
                    <View style={{ flex: 1, backgroundColor: '#1A73E8', borderRadius: 15, padding: 20, marginRight: 10, alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 12 }}>Tirs (Made/Att)</Text>
                        <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', marginVertical: 10 }}>14/22</Text>
                        <Text style={{ color: 'white', fontSize: 12 }}>+12% vs Moyenne</Text>
                    </View>

                    <View style={{ flex: 1, backgroundColor: '#161B22', borderRadius: 15, padding: 20, marginLeft: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>Mental Score</Text>
                        <Text style={{ color: '#00C853', fontSize: 32, fontWeight: 'bold', marginVertical: 10 }}>85/100</Text>
                        <Text style={{ color: '#00C853', fontSize: 12 }}>Ice in veins</Text>
                    </View>
                </View>

                <Text style={{ color: '#E6EDF3', fontSize: 20, fontWeight: '600', marginBottom: 15 }}>Heatmap (Terrain)</Text>
                {/* Placeholder Terrain interactif */}
                <View style={{ height: 250, backgroundColor: '#161B22', borderRadius: 20, marginBottom: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1A73E8' }}>
                    <MaterialCommunityIcons name="basketball-hoop-outline" size={60} color="#1A73E8" />
                    <Text style={{ color: '#8B949E', marginTop: 10 }}>[HeatmapCanvas 3D React Native]</Text>
                </View>

                <Text style={{ color: '#E6EDF3', fontSize: 20, fontWeight: '600', marginBottom: 15 }}>Radar des Compétences</Text>
                {/* Placeholder Radar */}
                <View style={{ height: 200, backgroundColor: '#161B22', borderRadius: 20, marginBottom: 30, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="radar" size={80} color="#00D4FF" />
                    <Text style={{ color: '#8B949E', marginTop: 10 }}>Vitesse - Tir - Lecture - Mental - Défense</Text>
                </View>

                <Text style={{ color: '#00D4FF', fontSize: 20, fontWeight: '600', marginBottom: 15 }}>Rapport du Coach (IA Groq Llama 3.3)</Text>
                <View style={{ backgroundColor: '#161B22', borderRadius: 20, padding: 20, marginBottom: 40, borderLeftWidth: 4, borderLeftColor: '#00D4FF' }}>
                    <Text style={{ color: '#E6EDF3', fontSize: 16, lineHeight: 24, marginBottom: 15 }}>
                        Excellente lecture de jeu aujourd'hui. Ton temps de prise de décision sur pick-and-roll a baissé de 15%.
                    </Text>
                    <Text style={{ color: '#E6EDF3', fontSize: 16, lineHeight: 24, marginBottom: 15 }}>
                        Points forts du jour : Mécanique de tir très fluide, angle du coude constant à 92 degrés. Ton body language est resté positif même après tes deux ratés consécutifs au Q3.
                    </Text>
                    <Text style={{ color: '#E6EDF3', fontSize: 16, lineHeight: 24 }}>
                        Conseil pour la semaine : Travaille ta reprise d'appuis sur les tirs en sortie de dribble côté faible. Je te mets 3 exercices spécifiques dans ta to-do.
                    </Text>
                </View>

            </ScrollView>

            {/* Bouton Voir Highlights */}
            <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20 }}>
                <TouchableOpacity
                    style={{ backgroundColor: '#1A73E8', paddingVertical: 15, borderRadius: 30, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                    onPress={() => router.push(`/highlight/${id}`)}
                >
                    <Ionicons name="play" size={20} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>Regarder le Highlight Reel</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
}
