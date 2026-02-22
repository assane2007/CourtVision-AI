import { View, Text, TouchableOpacity, ProgressBarAndroid } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function UploadAnalyze() {
    const router = useRouter()
    const [analyzing, setAnalyzing] = useState(false)
    const [progress, setProgress] = useState(0)

    const handleUpload = () => {
        setAnalyzing(true)
        let p = 0
        const inter = setInterval(() => {
            p += 10
            setProgress(p)
            if (p >= 100) {
                clearInterval(inter)
                router.push('/analysis/123')
            }
        }, 500)
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', padding: 20 }}>
            <Text style={{ color: '#E6EDF3', fontSize: 24, fontWeight: 'bold', marginBottom: 30 }}>Upload & Analyse</Text>

            {!analyzing ? (
                <>
                    <Text style={{ color: '#8B949E', fontSize: 16, marginBottom: 40, textAlign: 'center' }}>
                        Importe une vidéo depuis ta galerie ou filme directement ton match. L'IA s'occupe du reste.
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <TouchableOpacity
                            style={{ backgroundColor: '#161B22', borderRadius: 20, padding: 40, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1A73E8', borderStyle: 'dashed' }}
                            onPress={handleUpload}
                        >
                            <Ionicons name="images-outline" size={50} color="#1A73E8" />
                            <Text style={{ color: '#E6EDF3', fontSize: 18, fontWeight: 'bold', marginTop: 15 }}>Choisir dans la galerie</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ backgroundColor: '#161B22', borderRadius: 20, padding: 40, alignItems: 'center', marginBottom: 20 }}
                            onPress={handleUpload}
                        >
                            <AntDesign name="camera" size={50} color="#00D4FF" />
                            <Text style={{ color: '#E6EDF3', fontSize: 18, fontWeight: 'bold', marginTop: 15 }}>Filmer un match</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="radar" size={80} color="#00D4FF" />
                    <Text style={{ color: '#E6EDF3', fontSize: 20, fontWeight: 'bold', marginTop: 30 }}>Analyse IA en cours...</Text>
                    <Text style={{ color: '#8B949E', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
                        Etape {Math.ceil(progress / 15)}/7 : Extraction des modèles de jeu
                    </Text>
                    <View style={{ width: '80%', height: 10, backgroundColor: '#161B22', borderRadius: 5, marginTop: 30, overflow: 'hidden' }}>
                        <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#00D4FF' }} />
                    </View>
                </View>
            )}
        </SafeAreaView>
    )
}
