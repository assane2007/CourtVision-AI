import { View, Text, TouchableOpacity, Animated, StatusBar, Share, Modal, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast'
import { useStore } from '../../lib/store'

const C = {
    bg: '#0D1117', card: '#161B22', border: '#21262D',
    blue: '#1A73E8', accent: '#00D4FF',
    green: '#00C853', orange: '#FFB300',
    white: '#E6EDF3', muted: '#8B949E',
}

const CLIPS = [
    { time: '00:14', label: '3-Pt Made · Q1', score: 96, comment: 'Release parfaitement haut — coude à 90°. Excellent catch-and-shoot.' },
    { time: '01:32', label: 'Floater · Q2',   score: 88, comment: 'Bonne décision dans le couloir, floater maîtrisé.' },
    { time: '02:45', label: 'And-1 Drive · Q3', score: 94, comment: 'Explosivité sur la première pas — body language de leader.' },
]

const SHARE_PLATFORMS = [
    { id: 'tiktok',     icon: '🎵', label: 'TikTok',     color: '#EE1D52' },
    { id: 'instagram',  icon: '📸', label: 'Instagram',  color: '#E4405F' },
    { id: 'twitter',    icon: '🐦', label: 'Twitter/X',  color: '#1DA1F2' },
    { id: 'whatsapp',   icon: '💬', label: 'WhatsApp',   color: '#25D366' },
]

export default function HighlightPlayer() {
    const { id }       = useLocalSearchParams<{ id: string }>()

    const router       = useRouter()
    const addXP        = useStore(s => s.addXP)
    const [playing, setPlaying]           = useState(false)
    const [currentClip, setCurrentClip]   = useState(0)
    const [aiCommentary, setAiCommentary] = useState(true)
    const [shareModal, setShareModal]     = useState(false)
    const [published, setPublished]       = useState(false)
    const fadeAnim      = useRef(new Animated.Value(0)).current
    const controlsAnim  = useRef(new Animated.Value(1)).current
    const progressAnim  = useRef(new Animated.Value(0)).current
    const clipAnim      = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    }, [])

    // Animate clip highlight on change
    useEffect(() => {
        Animated.sequence([
            Animated.timing(clipAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(clipAnim, { toValue: 0, duration: 3000, delay: 500, useNativeDriver: true }),
        ]).start()
    }, [currentClip])

    const togglePlay = () => {
        setPlaying(p => !p)
        if (!playing) {
            controlsAnim.setValue(1)
            Animated.sequence([
                Animated.delay(2500),
                Animated.timing(controlsAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start()
            // Simulate progress
            Animated.timing(progressAnim, {
                toValue: 1, duration: 30000, useNativeDriver: false,
            }).start()
        } else {
            Animated.timing(controlsAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
            progressAnim.stopAnimation()
        }
    }

    const showControls = () => {
        Animated.timing(controlsAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    }

    const handleNativeShare = async () => {
        try {
            await Share.share({
                title: `Mon Highlight Reel — CourtVision AI`,
                message: `🏀 Regarde mon highlight reel IA — Session #${id}\n🎯 3 meilleures actions · Analysé par CourtVision AI\nhttps://courtvision.ai/highlight/${id}`,
            })
            addXP(50, '🎬 Highlight partagé')
            toast.success('+50 XP !', 'Highlight partagé avec succès')
        } catch {}
    }

    const handlePlatformShare = async (platform: string) => {
        setShareModal(false)
        await handleNativeShare()
    }

    const handlePublish = () => {
        setPublished(true)
        addXP(100, '📡 Highlight publié sur la communauté')
        toast.success('+100 XP !', 'Highlight publié dans la communauté')
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar hidden />

            {/* ── Simulated video ── */}
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={playing ? showControls : togglePlay}
                activeOpacity={1}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#060912' }}>
                    {/* Court art */}
                    <View style={{ position: 'absolute', width: '72%', height: '58%', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
                    <View style={{ position: 'absolute', width: '36%', height: '32%', borderTopLeftRadius: 80, borderTopRightRadius: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 0, top: '22%' }} />
                    <View style={{ position: 'absolute', bottom: '22%', width: '22%', height: '18%', borderTopLeftRadius: 40, borderTopRightRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 0 }} />

                    {/* AI Score overlay */}
                    <Animated.View style={{
                        position: 'absolute', top: '28%', right: '8%',
                        backgroundColor: 'rgba(26,115,232,0.85)',
                        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                        opacity: clipAnim,
                    }}>
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>AI Score</Text>
                        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900' }}>
                            {CLIPS[currentClip]?.score}
                        </Text>
                    </Animated.View>

                    {!playing && (
                        <View style={{ alignItems: 'center' }}>
                            <Ionicons name="play-circle" size={90} color="rgba(255,255,255,0.55)" />
                            <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14, fontWeight: '600' }}>
                                Highlight Reel #{id} · 1080p IA
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* ── Overlay ── */}
            <SafeAreaView
                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                pointerEvents="box-none"
            >
                <Animated.View style={{ flex: 1, opacity: fadeAnim }}>

                    {/* Top bar */}
                    <Animated.View style={{
                        opacity: controlsAnim, flexDirection: 'row',
                        justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 16, paddingTop: 12,
                    }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 }}
                        >
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setAiCommentary(v => !v)}
                            style={{
                                backgroundColor: aiCommentary ? 'rgba(26,115,232,0.85)' : 'rgba(0,0,0,0.6)',
                                paddingHorizontal: 14, paddingVertical: 8,
                                borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 5,
                            }}
                        >
                            <Ionicons name="mic" size={14} color="#FFF" />
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                                Commentary IA {aiCommentary ? '🟢' : '⭕'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* AI Commentary banner */}
                    {aiCommentary && (
                        <Animated.View style={{
                            opacity: clipAnim,
                            marginTop: 10, marginHorizontal: 16,
                            backgroundColor: 'rgba(0,212,255,0.15)',
                            borderRadius: 14, padding: 12,
                            borderWidth: 1, borderColor: 'rgba(0,212,255,0.35)',
                        }}>
                            <Text style={{ color: '#00D4FF', fontSize: 12, lineHeight: 18 }}>
                                🤖 "{CLIPS[currentClip]?.comment}"
                            </Text>
                        </Animated.View>
                    )}

                    <View style={{ flex: 1 }} pointerEvents="none" />

                    {/* Bottom panel */}
                    <Animated.View style={{ opacity: controlsAnim, paddingHorizontal: 16, paddingBottom: 20 }}>
                        {/* Progress */}
                        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
                            <Animated.View style={{
                                height: 3, backgroundColor: C.blue, borderRadius: 2,
                                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                            }} />
                        </View>

                        {/* Clips */}
                        <View style={{ flexDirection: 'row', gap: 7, marginBottom: 14 }}>
                            {CLIPS.map((clip, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => setCurrentClip(i)}
                                    style={{
                                        flex: 1, backgroundColor: currentClip === i ? 'rgba(26,115,232,0.75)' : 'rgba(22,27,34,0.85)',
                                        borderRadius: 10, padding: 8, alignItems: 'center',
                                        borderWidth: 1, borderColor: currentClip === i ? 'rgba(26,115,232,0.8)' : 'rgba(255,255,255,0.07)',
                                    }}
                                >
                                    <Text style={{ color: C.accent, fontSize: 11, fontWeight: '800' }}>{clip.time}</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 8.5, marginTop: 2, textAlign: 'center' }}>{clip.label}</Text>
                                    <Text style={{ color: currentClip === i ? '#FFF' : C.muted, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                                        {clip.score}pts
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Controls row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800' }}>Highlight Reel #{id}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                                    3 actions clés · IA Groq · 1080p
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                {/* Share */}
                                <View style={{ alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 25 }}
                                        onPress={() => setShareModal(true)}
                                    >
                                        <Ionicons name="share-social" size={22} color="#FFF" />
                                    </TouchableOpacity>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3 }}>Partager</Text>
                                </View>

                                {/* Play */}
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: C.blue, padding: 15, borderRadius: 32,
                                        shadowColor: C.blue, shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.6, shadowRadius: 12,
                                    }}
                                    onPress={togglePlay}
                                >
                                    <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#FFF" />
                                </TouchableOpacity>

                                {/* Publish */}
                                <View style={{ alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: published ? 'rgba(0,200,83,0.25)' : 'rgba(22,27,34,0.85)',
                                            paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22,
                                            borderWidth: 1, borderColor: published ? C.green : 'rgba(255,255,255,0.1)',
                                        }}
                                        onPress={handlePublish}
                                        disabled={published}
                                    >
                                        <Text style={{ color: published ? C.green : '#E6EDF3', fontWeight: '700', fontSize: 12 }}>
                                            {published ? '✅ Publié' : 'Publier'}
                                        </Text>
                                    </TouchableOpacity>
                                    {!published && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 3 }}>+100 XP</Text>}
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                </Animated.View>
            </SafeAreaView>

            {/* ── Share Modal ── */}
            <Modal visible={shareModal} transparent animationType="slide" onRequestClose={() => setShareModal(false)}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
                    onPress={() => setShareModal(false)}
                >
                    <Pressable onPress={() => {}}>
                        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
                            <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                            <Text style={{ color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Partager le Highlight</Text>
                            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>
                                Montre ton talent au monde entier 🔥
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
                                {SHARE_PLATFORMS.map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => handlePlatformShare(p.id)}
                                        style={{ alignItems: 'center', gap: 8 }}
                                    >
                                        <View style={{
                                            width: 60, height: 60, borderRadius: 20,
                                            backgroundColor: `${p.color}20`, justifyContent: 'center', alignItems: 'center',
                                            borderWidth: 1.5, borderColor: `${p.color}40`,
                                        }}>
                                            <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                                        </View>
                                        <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={{ backgroundColor: C.blue, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}
                                onPress={handleNativeShare}
                            >
                                <Text style={{ color: C.white, fontWeight: '800', fontSize: 16 }}>📤 Partage Rapide</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    )
}
