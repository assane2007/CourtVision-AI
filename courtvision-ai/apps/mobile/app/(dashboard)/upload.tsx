import { View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const PIPELINE_STEPS = [
    'Prétraitement vidéo',
    'Tracking des joueurs',
    'Reconstruction 3D',
    'Analyse des tirs',
    'Analyse mentale',
    'Génération du rapport',
    'Création des highlights',
]

export default function UploadAnalyze() {
    const router = useRouter()
    const [analyzing, setAnalyzing] = useState(false)
    const [progress, setProgress] = useState(0)

    const currentStep = Math.min(Math.floor((progress / 100) * PIPELINE_STEPS.length), PIPELINE_STEPS.length - 1)

    const handleUpload = () => {
        setAnalyzing(true)
        setProgress(0)
        let p = 0
        const inter = setInterval(() => {
            p += 5
            setProgress(p)
            if (p >= 100) {
                clearInterval(inter)
                setTimeout(() => router.push('/analysis/123'), 300)
            }
        }, 400)
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', padding: 20 }}>
            <Text style={{ color: '#E6EDF3', fontSize: 24, fontWeight: '800', marginBottom: 30, letterSpacing: -0.3 }}>
                Upload & Analyse
            </Text>

            {!analyzing ? (
                <>
                    <Text style={{ color: '#8B949E', fontSize: 16, marginBottom: 40, textAlign: 'center', lineHeight: 24 }}>
                        Importe une vidéo depuis ta galerie ou filme directement ton match. L'IA s'occupe du reste.
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#161B22',
                                borderRadius: 20,
                                padding: 40,
                                alignItems: 'center',
                                marginBottom: 20,
                                borderWidth: 1.5,
                                borderColor: '#1A73E8',
                                borderStyle: 'dashed',
                            }}
                            onPress={handleUpload}
                            activeOpacity={0.8}
                            accessibilityLabel="Choisir une vidéo dans la galerie"
                        >
                            <Ionicons name="images-outline" size={50} color="#1A73E8" />
                            <Text style={{ color: '#E6EDF3', fontSize: 18, fontWeight: '700', marginTop: 15 }}>
                                Choisir dans la galerie
                            </Text>
                            <Text style={{ color: '#8B949E', fontSize: 13, marginTop: 6 }}>
                                MP4, MOV — max 500 Mo
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#161B22',
                                borderRadius: 20,
                                padding: 40,
                                alignItems: 'center',
                                marginBottom: 20,
                            }}
                            onPress={handleUpload}
                            activeOpacity={0.8}
                            accessibilityLabel="Filmer un match en direct"
                        >
                            <AntDesign name="camera" size={50} color="#00D4FF" />
                            <Text style={{ color: '#E6EDF3', fontSize: 18, fontWeight: '700', marginTop: 15 }}>
                                Filmer un match
                            </Text>
                            <Text style={{ color: '#8B949E', fontSize: 13, marginTop: 6 }}>
                                Ouvre la caméra directement
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="radar" size={80} color="#00D4FF" />
                    <Text style={{ color: '#E6EDF3', fontSize: 22, fontWeight: '800', marginTop: 30 }}>
                        Analyse IA en cours...
                    </Text>
                    <Text style={{ color: '#8B949E', fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
                        Étape {currentStep + 1}/{PIPELINE_STEPS.length} : {PIPELINE_STEPS[currentStep]}
                    </Text>

                    {/* Progress bar */}
                    <View style={{ width: '85%', height: 8, backgroundColor: '#161B22', borderRadius: 4, marginTop: 30, overflow: 'hidden' }}>
                        <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#00D4FF', borderRadius: 4 }} />
                    </View>
                    <Text style={{ color: '#484F58', fontSize: 12, marginTop: 8 }}>{progress}%</Text>

                    {/* Étapes mini */}
                    <View style={{ marginTop: 30, width: '85%' }}>
                        {PIPELINE_STEPS.map((step, i) => {
                            const stepProgress = (i / PIPELINE_STEPS.length) * 100
                            const isDone = progress > stepProgress + (100 / PIPELINE_STEPS.length)
                            const isCurrent = i === currentStep
                            return (
                                <View key={step} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={{
                                        width: 20, height: 20, borderRadius: 10,
                                        backgroundColor: isDone ? '#00C853' : isCurrent ? '#1A73E8' : '#161B22',
                                        justifyContent: 'center', alignItems: 'center',
                                        marginRight: 10,
                                    }}>
                                        {isDone && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                        {isCurrent && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />}
                                    </View>
                                    <Text style={{
                                        color: isDone ? '#00C853' : isCurrent ? '#E6EDF3' : '#484F58',
                                        fontSize: 13,
                                        fontWeight: isCurrent ? '600' : '400',
                                    }}>
                                        {step}
                                    </Text>
                                </View>
                            )
                        })}
                    </View>
                </View>
            )}
        </SafeAreaView>
    )
}
