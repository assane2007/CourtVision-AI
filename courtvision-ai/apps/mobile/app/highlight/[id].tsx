import { View, Text, TouchableOpacity, Animated, StatusBar, Share, Modal, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast'
import { useStore } from '../../lib/store'
import { T } from '../../lib/theme'

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
        <View style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <StatusBar hidden />

            {/* ── Simulated video ── */}
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={playing ? showControls : togglePlay}
                activeOpacity={1}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.colors.bg }}>
                    {/* Court art — subtle neon lines */}
                    <View style={{ position: 'absolute', width: '72%', height: '58%', borderWidth: 1.5, borderColor: 'rgba(0,229,255,0.04)', borderRadius: 8 }} />
                    <View style={{ position: 'absolute', width: '36%', height: '32%', borderTopLeftRadius: 80, borderTopRightRadius: 80, borderWidth: 1, borderColor: 'rgba(0,229,255,0.03)', borderBottomWidth: 0, top: '22%' }} />
                    <View style={{ position: 'absolute', bottom: '22%', width: '22%', height: '18%', borderTopLeftRadius: 40, borderTopRightRadius: 40, borderWidth: 1, borderColor: 'rgba(0,229,255,0.03)', borderBottomWidth: 0 }} />

                    {/* Ambient glow behind video */}
                    <View style={{
                        position: 'absolute', width: 200, height: 200, borderRadius: 100,
                        backgroundColor: T.colors.accentGlow, opacity: 0.08,
                    }} />

                    {/* AI Score overlay */}
                    <Animated.View style={{
                        position: 'absolute', top: '28%', right: '8%',
                        borderRadius: T.radius.md, paddingHorizontal: 14, paddingVertical: 10,
                        opacity: clipAnim,
                        ...T.glass.primary, ...T.glow(T.colors.primary, 0.3),
                    }}>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, fontWeight: '600' }}>AI Score</Text>
                        <Text style={{ color: T.colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -1 }}>
                            {CLIPS[currentClip]?.score}
                        </Text>
                    </Animated.View>

                    {!playing && (
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                width: 90, height: 90, borderRadius: 45,
                                ...T.glass.accent, ...T.glow(T.colors.accent, 0.25),
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <Ionicons name="play" size={40} color={T.colors.accent} style={{ marginLeft: 4 }} />
                            </View>
                            <Text style={{ color: T.colors.muted, marginTop: T.space.lg, fontSize: T.font.md, fontWeight: '600' }}>
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
                        paddingHorizontal: T.space.lg, paddingTop: T.space.md,
                    }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 42, height: 42, borderRadius: 21,
                                ...T.glass.medium, justifyContent: 'center', alignItems: 'center',
                            }}
                        >
                            <Ionicons name="close" size={22} color={T.colors.white} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setAiCommentary(v => !v)}
                            style={{
                                paddingHorizontal: 14, paddingVertical: 8,
                                borderRadius: T.radius.pill, flexDirection: 'row', alignItems: 'center', gap: 5,
                                ...(aiCommentary ? T.glass.primary : T.glass.medium),
                                ...(aiCommentary ? T.glow(T.colors.primary, 0.15) : {}),
                            }}
                        >
                            <Ionicons name="mic" size={14} color={aiCommentary ? T.colors.primaryLight : T.colors.muted} />
                            <Text style={{ color: aiCommentary ? T.colors.primaryLight : T.colors.muted, fontSize: T.font.sm, fontWeight: '700' }}>
                                Commentary IA {aiCommentary ? '🟢' : '⭕'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* AI Commentary banner */}
                    {aiCommentary && (
                        <Animated.View style={{
                            opacity: clipAnim,
                            marginTop: T.space.sm, marginHorizontal: T.space.lg,
                            borderRadius: T.radius.md, padding: T.space.md,
                            ...T.glass.accent, ...T.glow(T.colors.accent, 0.08),
                        }}>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.sm, lineHeight: 19 }}>
                                🤖 "{CLIPS[currentClip]?.comment}"
                            </Text>
                        </Animated.View>
                    )}

                    <View style={{ flex: 1 }} pointerEvents="none" />

                    {/* Bottom panel */}
                    <Animated.View style={{ opacity: controlsAnim, paddingHorizontal: T.space.lg, paddingBottom: T.space.xl }}>
                        {/* Progress */}
                        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: T.space.md, overflow: 'hidden' }}>
                            <Animated.View style={{
                                height: 3, borderRadius: 2,
                                backgroundColor: T.colors.accent,
                                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                                ...T.shadow(T.colors.accent, 0.5, 4),
                            }} />
                        </View>

                        {/* Clips */}
                        <View style={{ flexDirection: 'row', gap: 7, marginBottom: T.space.md }}>
                            {CLIPS.map((clip, i) => {
                                const isActive = currentClip === i
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => setCurrentClip(i)}
                                        activeOpacity={0.7}
                                        style={{
                                            flex: 1, borderRadius: T.radius.sm, padding: T.space.sm, alignItems: 'center',
                                            ...(isActive ? T.glass.primary : T.glass.light),
                                            ...(isActive ? T.glow(T.colors.primary, 0.12) : {}),
                                        }}
                                    >
                                        <Text style={{ color: T.colors.accent, fontSize: T.font.sm, fontWeight: '800' }}>{clip.time}</Text>
                                        <Text style={{ color: T.colors.muted, fontSize: 8.5, marginTop: 2, textAlign: 'center' }}>{clip.label}</Text>
                                        <Text style={{ color: isActive ? T.colors.white : T.colors.muted, fontSize: T.font.xs, fontWeight: '700', marginTop: 2 }}>
                                            {clip.score}pts
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                        {/* Controls row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', letterSpacing: -0.5 }}>
                                    Highlight Reel #{id}
                                </Text>
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginTop: 2 }}>
                                    3 actions clés · IA Groq · 1080p
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                {/* Share */}
                                <View style={{ alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={{
                                            width: 46, height: 46, borderRadius: 23,
                                            ...T.glass.medium, justifyContent: 'center', alignItems: 'center',
                                        }}
                                        onPress={() => setShareModal(true)}
                                    >
                                        <Ionicons name="share-social" size={20} color={T.colors.white} />
                                    </TouchableOpacity>
                                    <Text style={{ color: T.colors.muted, fontSize: T.font.xs, marginTop: 3 }}>Partager</Text>
                                </View>

                                {/* Play */}
                                <TouchableOpacity
                                    style={{
                                        width: 56, height: 56, borderRadius: 28,
                                        backgroundColor: T.colors.accent,
                                        justifyContent: 'center', alignItems: 'center',
                                        ...T.glow(T.colors.accent, 0.4),
                                    }}
                                    onPress={togglePlay}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name={playing ? 'pause' : 'play'} size={24} color={T.colors.bg} />
                                </TouchableOpacity>

                                {/* Publish */}
                                <View style={{ alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={{
                                            paddingHorizontal: 14, paddingVertical: 12, borderRadius: T.radius.xl,
                                            ...(published ? { ...T.glass.accent, borderColor: T.colors.green, borderWidth: 1 } : T.glass.medium),
                                        }}
                                        onPress={handlePublish}
                                        disabled={published}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ color: published ? T.colors.green : T.colors.white, fontWeight: '700', fontSize: T.font.sm }}>
                                            {published ? '✅ Publié' : 'Publier'}
                                        </Text>
                                    </TouchableOpacity>
                                    {!published && <Text style={{ color: T.colors.dim, fontSize: T.font.xs, marginTop: 3 }}>+100 XP</Text>}
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                </Animated.View>
            </SafeAreaView>

            {/* ── Share Modal ── */}
            <Modal visible={shareModal} transparent animationType="slide" onRequestClose={() => setShareModal(false)}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}
                    onPress={() => setShareModal(false)}
                >
                    <Pressable onPress={() => {}}>
                        <View style={{
                            backgroundColor: T.colors.card, borderTopLeftRadius: T.radius.xxl, borderTopRightRadius: T.radius.xxl,
                            padding: T.space.xxl, paddingBottom: 44,
                            borderTopWidth: 1, borderColor: T.colors.borderLight,
                        }}>
                            <View style={{ width: 40, height: 4, backgroundColor: T.colors.dim, borderRadius: 2, alignSelf: 'center', marginBottom: T.space.xl }} />
                            <Text style={{ color: T.colors.white, fontSize: T.font.xl, fontWeight: '800', marginBottom: T.space.xs, letterSpacing: -0.5 }}>
                                Partager le Highlight
                            </Text>
                            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md, marginBottom: T.space.xxl }}>
                                Montre ton talent au monde entier 🔥
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: T.space.xl }}>
                                {SHARE_PLATFORMS.map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => handlePlatformShare(p.id)}
                                        activeOpacity={0.7}
                                        style={{ alignItems: 'center', gap: 8 }}
                                    >
                                        <View style={{
                                            width: 60, height: 60, borderRadius: T.radius.xl,
                                            backgroundColor: `${p.color}15`, justifyContent: 'center', alignItems: 'center',
                                            borderWidth: 1.5, borderColor: `${p.color}30`,
                                            ...T.shadow(p.color, 0.15, 8),
                                        }}>
                                            <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                                        </View>
                                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, fontWeight: '600' }}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={{
                                    borderRadius: T.radius.lg, paddingVertical: 16, alignItems: 'center',
                                    ...T.glass.accent, ...T.glow(T.colors.accent, 0.15),
                                    borderWidth: 1.5, borderColor: `${T.colors.accent}30`,
                                }}
                                onPress={handleNativeShare}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: T.colors.accent, fontWeight: '800', fontSize: T.font.lg }}>📤 Partage Rapide</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    )
}
