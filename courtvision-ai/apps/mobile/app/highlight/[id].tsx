import { View, Text, TouchableOpacity, Animated, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'

const CLIPS = [
    { time: '00:14', label: '3-Pt Made · Q1', score: 96 },
    { time: '01:32', label: 'Floater · Q2', score: 88 },
    { time: '02:45', label: 'And-1 Drive · Q3', score: 94 },
]

export default function HighlightPlayer() {
    const { id } = useLocalSearchParams()
    const router = useRouter()
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0.3)
    const [aiCommentary, setAiCommentary] = useState(true)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const controlsAnim = useRef(new Animated.Value(1)).current
    const progressAnim = useRef(new Animated.Value(0.3)).current

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    }, [])

    const togglePlay = () => {
        setPlaying(p => !p)
        // Auto-hide controls after play
        if (!playing) {
            controlsAnim.setValue(1)
            Animated.sequence([
                Animated.delay(2500),
                Animated.timing(controlsAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start()
        } else {
            Animated.timing(controlsAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
        }
    }

    const showControls = () => {
        Animated.timing(controlsAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar hidden />

            {/* ── Simulated video area ── */}
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={playing ? showControls : togglePlay}
                activeOpacity={1}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0D14' }}>
                    {/* Fake courts lines bg */}
                    <View style={{
                        position: 'absolute', width: '70%', height: '55%',
                        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)',
                        borderRadius: 8,
                    }} />
                    <View style={{
                        position: 'absolute', width: '35%', height: '30%',
                        borderTopLeftRadius: 80, borderTopRightRadius: 80,
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
                        borderBottomWidth: 0, top: '22%',
                    }} />

                    {playing ? (
                        <View style={{ alignItems: 'center' }}>
                            <Animated.View style={{ opacity: controlsAnim }}>
                                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                                    ▶ En lecture
                                </Text>
                            </Animated.View>
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.5)" />
                            <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 10, fontSize: 13 }}>
                                Highlight Reel #{id} · 1080p
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* ── Overlay UI ── */}
            <SafeAreaView
                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                pointerEvents="box-none"
            >
                <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

                    {/* Top bar */}
                    <Animated.View style={{
                        opacity: controlsAnim,
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', paddingHorizontal: 16, paddingTop: 12,
                    }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ backgroundColor: 'rgba(0,0,0,0.55)', padding: 10, borderRadius: 20 }}
                            accessibilityLabel="Fermer le lecteur"
                        >
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setAiCommentary(v => !v)}
                            style={{
                                backgroundColor: aiCommentary ? 'rgba(26,115,232,0.8)' : 'rgba(0,0,0,0.55)',
                                paddingHorizontal: 12, paddingVertical: 7,
                                borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 5,
                            }}
                        >
                            <Ionicons name="mic" size={14} color="#FFF" />
                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                                Commentary IA
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* AI commentary banner */}
                    {aiCommentary && playing && (
                        <View style={{
                            marginTop: 10, marginHorizontal: 16,
                            backgroundColor: 'rgba(0,212,255,0.15)',
                            borderRadius: 12, padding: 10,
                            borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
                        }}>
                            <Text style={{ color: '#00D4FF', fontSize: 12, lineHeight: 18 }}>
                                🤖 "Release parfaitement haut — coude à 90°. Bon équilibre sur ce catch-and-shoot."
                            </Text>
                        </View>
                    )}

                    <View style={{ flex: 1 }} pointerEvents="none" />

                    {/* Bottom panel */}
                    <Animated.View style={{
                        opacity: controlsAnim,
                        paddingHorizontal: 16, paddingBottom: 20,
                    }}>
                        {/* Progress bar */}
                        <View style={{
                            height: 3, backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 2, marginBottom: 16, overflow: 'hidden',
                        }}>
                            <View style={{
                                height: 3, backgroundColor: '#1A73E8',
                                width: `${progress * 100}%`, borderRadius: 2,
                            }} />
                        </View>

                        {/* Clip timestamps */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                            {CLIPS.map((clip, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={{
                                        flex: 1, backgroundColor: 'rgba(22,27,34,0.85)',
                                        borderRadius: 10, padding: 8, alignItems: 'center',
                                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={{ color: '#00D4FF', fontSize: 11, fontWeight: '700' }}>
                                        {clip.time}
                                    </Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2, textAlign: 'center' }}>
                                        {clip.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Play controls */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
                                    Highlight Reel #{id}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                    14 Pts · 3 Ast · 2 min de génération IA
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                {/* Share */}
                                <View style={{ alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={{ backgroundColor: 'rgba(0,0,0,0.55)', padding: 12, borderRadius: 25 }}
                                        accessibilityLabel="Partager le highlight"
                                    >
                                        <Ionicons name="share-social" size={22} color="#FFF" />
                                    </TouchableOpacity>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3 }}>1.2k</Text>
                                </View>

                                {/* Play/Pause */}
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#1A73E8', padding: 14,
                                        borderRadius: 30,
                                        shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.5, shadowRadius: 10,
                                    }}
                                    onPress={togglePlay}
                                    accessibilityLabel={playing ? 'Pause' : 'Lire'}
                                >
                                    <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#FFF" />
                                </TouchableOpacity>

                                {/* Publish */}
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: 'rgba(22,27,34,0.85)',
                                        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22,
                                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                                    }}
                                    accessibilityLabel="Publier sur la communauté"
                                >
                                    <Text style={{ color: '#E6EDF3', fontWeight: '700', fontSize: 13 }}>Publier</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </Animated.View>
            </SafeAreaView>
        </View>
    )
}
