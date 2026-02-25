/**
 * Highlight Player — V3 Design
 * Full-screen highlight reel viewer with AI commentary,
 * clip selector, share CTA. Reanimated v3, Feather icons, English.
 */
import { View, Text, TouchableOpacity, StatusBar, Share, Modal, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useState, useCallback } from 'react'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
    SlideInDown,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    Easing,
    runOnJS,
} from 'react-native-reanimated'
import { toast } from '../../lib/toast'
import { useStore } from '../../lib/store'
import { T } from '../../lib/theme'

// ── Mock clips (replaced by API data in production) ───────────
const CLIPS = [
    { time: '00:14', label: '3-Pt Made · Q1', score: 96, comment: 'Perfect high release — elbow at 90°. Excellent catch-and-shoot form.' },
    { time: '01:32', label: 'Floater · Q2', score: 88, comment: 'Smart lane drive, well-controlled floater. Great decision-making.' },
    { time: '02:45', label: 'And-1 Drive · Q3', score: 94, comment: 'Explosive first step — dominant body language under contact.' },
]

const SHARE_PLATFORMS = [
    { id: 'tiktok', icon: 'video' as const, label: 'TikTok', color: '#EE1D52' },
    { id: 'instagram', icon: 'camera' as const, label: 'Instagram', color: '#E4405F' },
    { id: 'twitter', icon: 'twitter' as const, label: 'Twitter/X', color: '#1DA1F2' },
    { id: 'whatsapp', icon: 'message-circle' as const, label: 'WhatsApp', color: '#25D366' },
]

// ── Animated Play Button ──────────────────────────────────────
function PlayButton({ onPress }: { onPress: () => void }) {
    const pulse = useSharedValue(1)
    pulse.value = withRepeat(
        withSequence(
            withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
    )
    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))

    return (
        <View style={{ alignItems: 'center' }}>
            <Animated.View style={pulseStyle}>
                <TouchableOpacity
                    onPress={onPress}
                    activeOpacity={0.8}
                    style={{
                        width: 90, height: 90, borderRadius: 45,
                        ...T.glass.accent, ...T.glow(T.colors.accent, 0.25),
                        justifyContent: 'center', alignItems: 'center',
                    }}
                >
                    <Feather name="play" size={38} color={T.colors.accent} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </Animated.View>
        </View>
    )
}

// ── Main Component ────────────────────────────────────────────
export default function HighlightPlayer() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const addXP = useStore(s => s.addXP)

    const [playing, setPlaying] = useState(false)
    const [currentClip, setCurrentClip] = useState(0)
    const [aiCommentary, setAiCommentary] = useState(true)
    const [shareModal, setShareModal] = useState(false)
    const [published, setPublished] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(true)

    // Progress animation
    const progress = useSharedValue(0)
    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }))

    const togglePlay = useCallback(() => {
        if (!playing) {
            setPlaying(true)
            progress.value = withTiming(1, { duration: 30000, easing: Easing.linear })
            // Auto-hide controls after 2.5s
            setTimeout(() => setControlsVisible(false), 2500)
        } else {
            setPlaying(false)
            // Stop progress at current value
            progress.value = progress.value
        }
    }, [playing])

    const showControls = useCallback(() => {
        setControlsVisible(true)
        if (playing) {
            setTimeout(() => setControlsVisible(false), 3000)
        }
    }, [playing])

    const handleNativeShare = useCallback(async () => {
        try {
            await Share.share({
                title: `My Highlight Reel — CourtVision AI`,
                message: `Check out my AI highlight reel — Session #${id}\n3 best plays analyzed by CourtVision AI\nhttps://courtvision.ai/highlight/${id}`,
            })
            addXP(50, 'Highlight shared')
            toast.success('+50 XP!', 'Highlight shared successfully')
        } catch { /* user cancelled */ }
    }, [id])

    const handlePlatformShare = useCallback(async (platform: string) => {
        setShareModal(false)
        await handleNativeShare()
    }, [handleNativeShare])

    const handlePublish = useCallback(() => {
        setPublished(true)
        addXP(100, 'Highlight published to community')
        toast.success('+100 XP!', 'Highlight published to the community')
    }, [])

    const clip = CLIPS[currentClip]

    return (
        <View style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <StatusBar hidden />

            {/* ── Simulated video area ── */}
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={playing ? showControls : togglePlay}
                activeOpacity={1}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.colors.bg }}>
                    {/* Court art — subtle neon lines */}
                    <View style={{ position: 'absolute', width: '72%', height: '58%', borderWidth: 1.5, borderColor: 'rgba(255,107,0,0.04)', borderRadius: 8 }} />
                    <View style={{ position: 'absolute', width: '36%', height: '32%', borderTopLeftRadius: 80, borderTopRightRadius: 80, borderWidth: 1, borderColor: 'rgba(255,107,0,0.03)', borderBottomWidth: 0, top: '22%' }} />

                    {/* Ambient glow */}
                    <View style={{
                        position: 'absolute', width: 200, height: 200, borderRadius: 100,
                        backgroundColor: T.colors.accentGlow, opacity: 0.08,
                    }} />

                    {/* AI Score overlay */}
                    {playing && (
                        <Animated.View
                            entering={FadeIn.duration(300)}
                            exiting={FadeOut.duration(200)}
                            style={{
                                position: 'absolute', top: '28%', right: '8%',
                                borderRadius: T.radius.md, paddingHorizontal: 14, paddingVertical: 10,
                                ...T.glass.primary, ...T.glow(T.colors.primary, 0.3),
                            }}
                        >
                            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, fontWeight: '600', fontFamily: T.fonts.body.medium }}>
                                AI Score
                            </Text>
                            <Text style={{ color: T.colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -1, fontFamily: T.fonts.display.bold }}>
                                {clip?.score}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Play button (when paused) */}
                    {!playing && (
                        <Animated.View entering={FadeIn.duration(300)}>
                            <PlayButton onPress={togglePlay} />
                            <Text style={{
                                color: T.colors.muted, marginTop: T.space.lg,
                                fontSize: T.font.md, fontWeight: '600', textAlign: 'center',
                                fontFamily: T.fonts.body.medium,
                            }}>
                                Highlight Reel #{id} · 1080p AI
                            </Text>
                        </Animated.View>
                    )}
                </View>
            </TouchableOpacity>

            {/* ── Controls Overlay ── */}
            <SafeAreaView
                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                pointerEvents="box-none"
            >
                {controlsVisible && (
                    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>

                        {/* Top bar */}
                        <Animated.View
                            entering={FadeInDown.duration(300).delay(50)}
                            style={{
                                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                paddingHorizontal: T.space.lg, paddingTop: T.space.md,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={{
                                    width: 42, height: 42, borderRadius: 21,
                                    ...T.glass.medium, justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Feather name="x" size={22} color={T.colors.white} />
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
                                <Feather name={aiCommentary ? 'mic' : 'mic-off'} size={14} color={aiCommentary ? T.colors.primaryLight : T.colors.muted} />
                                <Text style={{
                                    color: aiCommentary ? T.colors.primaryLight : T.colors.muted,
                                    fontSize: T.font.sm, fontWeight: '700', fontFamily: T.fonts.body.semibold,
                                }}>
                                    AI Commentary {aiCommentary ? 'ON' : 'OFF'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* AI Commentary banner */}
                        {aiCommentary && playing && (
                            <Animated.View
                                entering={FadeInDown.duration(300).delay(100)}
                                exiting={FadeOut.duration(200)}
                                style={{
                                    marginTop: T.space.sm, marginHorizontal: T.space.lg,
                                    borderRadius: T.radius.md, padding: T.space.md,
                                    ...T.glass.accent, ...T.glow(T.colors.accent, 0.08),
                                    flexDirection: 'row', alignItems: 'center', gap: 8,
                                }}
                            >
                                <Feather name="cpu" size={14} color={T.colors.accent} />
                                <Text style={{
                                    color: T.colors.accent, fontSize: T.font.sm, lineHeight: 19,
                                    flex: 1, fontFamily: T.fonts.body.regular,
                                }}>
                                    "{clip?.comment}"
                                </Text>
                            </Animated.View>
                        )}

                        <View style={{ flex: 1 }} pointerEvents="none" />

                        {/* Bottom panel */}
                        <Animated.View
                            entering={FadeInUp.duration(300).delay(100)}
                            style={{ paddingHorizontal: T.space.lg, paddingBottom: T.space.xl }}
                        >
                            {/* Progress bar */}
                            <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: T.space.md, overflow: 'hidden' }}>
                                <Animated.View style={[{
                                    height: 3, borderRadius: 2,
                                    backgroundColor: T.colors.accent,
                                    ...T.shadow(T.colors.accent, 0.5, 4),
                                }, progressStyle]} />
                            </View>

                            {/* Clip selector */}
                            <View style={{ flexDirection: 'row', gap: 7, marginBottom: T.space.md }}>
                                {CLIPS.map((c, i) => {
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
                                            <Text style={{ color: T.colors.accent, fontSize: T.font.sm, fontWeight: '800', fontFamily: T.fonts.display.bold }}>
                                                {c.time}
                                            </Text>
                                            <Text style={{ color: T.colors.muted, fontSize: 8.5, marginTop: 2, textAlign: 'center', fontFamily: T.fonts.body.regular }}>
                                                {c.label}
                                            </Text>
                                            <Text style={{
                                                color: isActive ? T.colors.white : T.colors.muted,
                                                fontSize: T.font.xs, fontWeight: '700', marginTop: 2,
                                                fontFamily: T.fonts.display.semibold,
                                            }}>
                                                {c.score}pts
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>

                            {/* Controls row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        color: T.colors.white, fontSize: T.font.lg, fontWeight: '800',
                                        letterSpacing: -0.5, fontFamily: T.fonts.display.bold,
                                    }}>
                                        Highlight Reel #{id}
                                    </Text>
                                    <Text style={{
                                        color: T.colors.muted, fontSize: T.font.sm, marginTop: 2,
                                        fontFamily: T.fonts.body.regular,
                                    }}>
                                        3 key plays · AI Groq · 1080p
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
                                            <Feather name="share-2" size={20} color={T.colors.white} />
                                        </TouchableOpacity>
                                        <Text style={{ color: T.colors.muted, fontSize: T.font.xs, marginTop: 3, fontFamily: T.fonts.body.regular }}>
                                            Share
                                        </Text>
                                    </View>

                                    {/* Play/Pause */}
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
                                        <Feather name={playing ? 'pause' : 'play'} size={24} color={T.colors.bg} />
                                    </TouchableOpacity>

                                    {/* Publish */}
                                    <View style={{ alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={{
                                                paddingHorizontal: 14, paddingVertical: 12, borderRadius: T.radius.xl,
                                                ...(published
                                                    ? { ...T.glass.accent, borderColor: T.colors.green, borderWidth: 1 }
                                                    : T.glass.medium),
                                            }}
                                            onPress={handlePublish}
                                            disabled={published}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Feather
                                                    name={published ? 'check-circle' : 'upload-cloud'}
                                                    size={14}
                                                    color={published ? T.colors.green : T.colors.white}
                                                />
                                                <Text style={{
                                                    color: published ? T.colors.green : T.colors.white,
                                                    fontWeight: '700', fontSize: T.font.sm,
                                                    fontFamily: T.fonts.body.semibold,
                                                }}>
                                                    {published ? 'Published' : 'Publish'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                        {!published && (
                                            <Text style={{ color: T.colors.dim, fontSize: T.font.xs, marginTop: 3, fontFamily: T.fonts.body.regular }}>
                                                +100 XP
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </Animated.View>
                )}
            </SafeAreaView>

            {/* ── Share Modal ── */}
            <Modal visible={shareModal} transparent animationType="none" onRequestClose={() => setShareModal(false)}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}
                    onPress={() => setShareModal(false)}
                >
                    <Pressable onPress={() => {}}>
                        <Animated.View
                            entering={SlideInDown.duration(350).damping(18)}
                            style={{
                                backgroundColor: T.colors.card, borderTopLeftRadius: T.radius.xxl, borderTopRightRadius: T.radius.xxl,
                                padding: T.space.xxl, paddingBottom: 44,
                                borderTopWidth: 1, borderColor: T.colors.borderLight,
                            }}
                        >
                            <View style={{ width: 40, height: 4, backgroundColor: T.colors.dim, borderRadius: 2, alignSelf: 'center', marginBottom: T.space.xl }} />

                            <Text style={{
                                color: T.colors.white, fontSize: T.font.xl, fontWeight: '800',
                                marginBottom: T.space.xs, letterSpacing: -0.5,
                                fontFamily: T.fonts.display.bold,
                            }}>
                                Share Highlight
                            </Text>
                            <Text style={{
                                color: T.colors.textSecondary, fontSize: T.font.md, marginBottom: T.space.xxl,
                                fontFamily: T.fonts.body.regular,
                            }}>
                                Show the world what you can do
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: T.space.xl }}>
                                {SHARE_PLATFORMS.map((p, i) => (
                                    <Animated.View key={p.id} entering={FadeInUp.duration(300).delay(i * 60)}>
                                        <TouchableOpacity
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
                                                <Feather name={p.icon} size={26} color={p.color} />
                                            </View>
                                            <Text style={{ color: T.colors.textSecondary, fontSize: T.font.sm, fontWeight: '600', fontFamily: T.fonts.body.medium }}>
                                                {p.label}
                                            </Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={{
                                    borderRadius: T.radius.lg, paddingVertical: 16, alignItems: 'center',
                                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                                    ...T.glass.accent, ...T.glow(T.colors.accent, 0.15),
                                    borderWidth: 1.5, borderColor: `${T.colors.accent}30`,
                                }}
                                onPress={handleNativeShare}
                                activeOpacity={0.8}
                            >
                                <Feather name="share" size={18} color={T.colors.accent} />
                                <Text style={{ color: T.colors.accent, fontWeight: '800', fontSize: T.font.lg, fontFamily: T.fonts.display.bold }}>
                                    Quick Share
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    )
}
