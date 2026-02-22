import { View, Text, ScrollView, TouchableOpacity, Vibration } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useRef, useEffect } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

type LivePhase = 'idle' | 'active' | 'break' | 'ended'

export default function LiveCoach() {
    const router = useRouter()
    const [phase, setPhase] = useState<LivePhase>('idle')
    const [quarter, setQuarter] = useState(1)
    const [mentalScore, setMentalScore] = useState(78)
    const [alerts, setAlerts] = useState<string[]>([])
    const [makeCount, setMakeCount] = useState(0)
    const [missCount, setMissCount] = useState(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const startLive = () => {
        setPhase('active')
        setAlerts([])
        // Simulate AI alerts arriving every 30s (10s in demo)
        intervalRef.current = setInterval(() => {
            const newAlerts = [
                'Tu as manqué 2 tirs de mi-distance — cherche le layup',
                'Mental Score stable — continue comme ça 💪',
                'Attention : vitesse de déplacement en baisse — fatigue ?',
                'Ton défenseur couvre ta main droite — switch à gauche'
            ]
            const alert = newAlerts[Math.floor(Math.random() * newAlerts.length)]
            setAlerts(prev => [alert, ...prev].slice(0, 5))
            Vibration.vibrate(200)
            setMentalScore(prev => Math.min(100, Math.max(30, prev + (Math.random() > 0.5 ? 3 : -3))))
        }, 8000)
    }

    const endQuarter = () => {
        if (quarter < 4) {
            setPhase('break')
        } else {
            setPhase('ended')
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }

    const nextQuarter = () => {
        setQuarter(prev => prev + 1)
        setPhase('active')
    }

    useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

    const mentalColor = mentalScore >= 70 ? '#00C853' : mentalScore >= 45 ? '#FFB300' : '#FF3D57'

    if (phase === 'idle') return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
            <MaterialCommunityIcons name="radar" size={80} color="#1A73E8" style={{ marginBottom: 30 }} />
            <Text style={{ color: '#E6EDF3', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 }}>Coach Live</Text>
            <Text style={{ color: '#8B949E', textAlign: 'center', lineHeight: 22, marginBottom: 40 }}>
                L'IA analyse ton match en temps réel et t'envoie des alertes discrètes pendant les pauses. Mode vibration uniquement.
            </Text>
            <TouchableOpacity
                style={{ backgroundColor: '#1A73E8', paddingVertical: 18, paddingHorizontal: 50, borderRadius: 30, shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}
                onPress={startLive}
            >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>🏀 Démarrer Q{quarter}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )

    if (phase === 'break') return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
            <Text style={{ color: '#FFB300', fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>⏸ Fin du Q{quarter}</Text>
            <Text style={{ color: '#E6EDF3', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 10 }}>
                Points du quart : {makeCount * 2} pts
            </Text>
            <Text style={{ color: '#E6EDF3', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 30 }}>
                Mental Score : <Text style={{ color: mentalColor, fontWeight: 'bold' }}>{mentalScore}/100</Text>
            </Text>

            <View style={{ backgroundColor: '#161B22', borderRadius: 15, padding: 20, width: '100%', marginBottom: 30 }}>
                <Text style={{ color: '#00D4FF', fontWeight: 'bold', marginBottom: 10 }}>🤖 3 points clés du Coach</Text>
                <Text style={{ color: '#E6EDF3', marginBottom: 8 }}>• Cherche plus le contact en drives</Text>
                <Text style={{ color: '#E6EDF3', marginBottom: 8 }}>• Bonne communication défensive, continue</Text>
                <Text style={{ color: '#E6EDF3' }}>• Ton tempo est bon, ne t'emballe pas en Q{quarter + 1}</Text>
            </View>

            <TouchableOpacity style={{ backgroundColor: '#00C853', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25 }} onPress={nextQuarter}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Démarrer Q{quarter + 1}</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )

    if (phase === 'ended') return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
            <Text style={{ color: '#E6EDF3', fontSize: 26, fontWeight: 'bold', marginBottom: 10 }}>Match terminé ✅</Text>
            <Text style={{ color: '#8B949E', marginBottom: 40 }}>L'analyse complète est en cours de traitement</Text>
            <TouchableOpacity style={{ backgroundColor: '#1A73E8', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25 }} onPress={() => router.replace('/(dashboard)')}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Voir le rapport complet</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )

    // Active phase
    return (
        <View style={{ flex: 1, backgroundColor: '#0D1117' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header compact */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 }}>
                    <View style={{ backgroundColor: '#FF3D57', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4, marginRight: 6 }} />
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>LIVE — Q{quarter}</Text>
                    </View>
                    <Text style={{ color: mentalColor, fontWeight: 'bold', fontSize: 22 }}>{mentalScore}</Text>
                    <TouchableOpacity onPress={endQuarter} style={{ backgroundColor: '#161B22', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 }}>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>Fin Q{quarter}</Text>
                    </TouchableOpacity>
                </View>

                {/* Shot Counter */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 30 }}>
                    <TouchableOpacity
                        style={{ backgroundColor: '#00C853', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setMakeCount(p => p + 1)}
                    >
                        <Text style={{ color: '#FFF', fontSize: 32 }}>+</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{makeCount} IN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ backgroundColor: '#FF3D57', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setMissCount(p => p + 1)}
                    >
                        <Text style={{ color: '#FFF', fontSize: 32 }}>—</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{missCount} OUT</Text>
                    </TouchableOpacity>
                </View>

                {/* Alerts Feed */}
                <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
                    <Text style={{ color: '#8B949E', fontSize: 12, marginBottom: 10 }}>Alertes Coach (vibration)</Text>
                    {alerts.length === 0 && (
                        <Text style={{ color: '#8B949E', textAlign: 'center', marginTop: 30 }}>En attente d'analyse... 🤖</Text>
                    )}
                    {alerts.map((alert, i) => (
                        <View key={i} style={{ backgroundColor: '#161B22', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#1A73E8' }}>
                            <Text style={{ color: '#E6EDF3' }}>{alert}</Text>
                            <Text style={{ color: '#8B949E', fontSize: 11, marginTop: 4 }}>Il y a {i * 8}s</Text>
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    )
}
