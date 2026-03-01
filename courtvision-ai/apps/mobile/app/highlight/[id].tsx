/**
 * Highlight Player — V4 Design
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
import { T, typePresets } from '../../lib/theme'

const type = typePresets

// ── Mock clips ────────────────────────────────────────────────
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
                        ...T.glass.vivid, ...T.glow(T.color.signature.primary, 0.25),
                        justifyContent: 'center', alignItems: 'center',
                    }}
                >
                    <Feather name="play" size={38} color={T.color.signature.primary} style={{ marginLeft: 4 }} />
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
        <View style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <StatusBar hidden />

            {/* ── Simulated video area ── */}
            <TouchableOpacity
                style={{ flex: 1 }}
                onPress={playing ? showControls : togglePlay}
                activeOpacity={1}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.color.background.primary }}>
                    {/* Court art */}
                    <View style={{ position: 'absolute', width: '72%', height: '58%', borderWidth: 1.5, borderColor: 'rgba(255,107,0,0.04)', borderRadius: 8 }} />
                    <View style={{ position: 'absolute', width: '36%', height: '32%', borderTopLeftRadius: 80, borderTopRightRadius: 80, borderWidth: 1, borderColor: 'rgba(255,107,0,0.03)', borderBottomWidth: 0, top: '22%' }} />

                    {/* Ambient glow */}
                    <View style={{
                        position: 'absolute', width: 200, height: 200, borderRadius: 100,
                        backgroundColor: T.color.signature.glow, opacity: 0.08,
                    }} />

                    {/* AI Score overlay */}
                    {playing && (
                        <Animated.View
                            entering={FadeIn.duration(300)}
                            exiting={FadeOut.duration(200)}
                            style={{
                                position: 'absolute', top: '28%', right: '8%',
                                borderRadius: T.borderRadius.md, paddingHorizontal: 14, paddingVertical: 10,
                                ...T.glass.vivid, ...T.glow(T.color.semantic.info, 0.3),
                            }}
                        >
                            <Text style={{ ...type.caption, color: T.color.text.secondary, fontFamily: T.fonts.body.medium }}>
                                AI Score
                            </Text>
                            <Text style={{ color: T.color.text.primary, fontSize: 28, fontFamily: T.fonts.display.bold, letterSpacing: -1 }}>
                                {clip?.score}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Play button (when paused) */}
                    {!playing && (
                        <Animated.View entering={FadeIn.duration(300)}>
                            <PlayButton onPress={togglePlay} />
                            <Text style={{
                                ...type.body, color: T.color.text.secondary,
                                marginTop: T.spacing[4], textAlign: 'center',
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
                                paddingHorizontal: T.spacing[4], paddingTop: T.spacing[3],
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={{
                                    width: 42, height: 42, borderRadius: 21,
                                    ...T.glass.base, justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Feather name="x" size={22} color={T.color.text.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setAiCommentary(v => !v)}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 8,
                                    borderRadius: T.borderRadius.full, flexDirection: 'row', alignItems: 'center', gap: 5,
                                    ...(aiCommentary ? T.glass.vivid : T.glass.base),
                                    ...(aiCommentary ? T.glow(T.color.semantic.info, 0.15) : {}),
                                }}
                            >
                                <Feather name={aiCommentary ? 'mic' : 'mic-off'} size={14} color={aiCommentary ? T.color.semantic.info : T.color.text.secondary} />
                                <Text style={{
                                    ...type.caption,
                                    color: aiCommentary ? T.color.semantic.info : T.color.text.secondary,
                                    fontFamily: T.fonts.body.semibold,
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
                                    marginTop: T.spacing[2], marginHorizontal: T.spacing[4],
                                    borderRadius: T.borderRadius.md, padding: T.spacing[3],
                                    ...T.glass.vivid, ...T.glow(T.color.signature.primary, 0.08),
                                    flexDirection: 'row', alignItems: 'center', gap: 8,
                                }}
                            >
                                <Feather name="cpu" size={14} color={T.color.signature.primary} />
                                <Text style={{
                                    ...type.caption, color: T.color.signature.primary,
                                    lineHeight: 19, flex: 1,
                                }}>
                                    "{clip?.comment}"
                                </Text>
                            </Animated.View>
                        )}

                        <View style={{ flex: 1 }} pointerEvents="none" />

                        {/* Bottom panel */}
                        <Animated.View
                            entering={FadeInUp.duration(300).delay(100)}
                            style={{ paddingHorizontal: T.spacing[4], paddingBottom: T.spacing[5] }}
                        >
                            {/* Progress bar */}
                            <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: T.spacing[3], overflow: 'hidden' }}>
                                <Animated.View style={[{
                                    height: 3, borderRadius: 2,
                                    backgroundColor: T.color.signature.primary,
                                    ...T.glow.soft(),
                                }, progressStyle]} />
                            </View>

                            {/* Clip selector */}
                            <View style={{ flexDirection: 'row', gap: 7, marginBottom: T.spacing[3] }}>
                                {CLIPS.map((c, i) => {
                                    const isActive = currentClip === i
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            onPress={() => setCurrentClip(i)}
                                            activeOpacity={0.7}
                                            style={{
                                                flex: 1, borderRadius: T.borderRadius.sm, padding: T.spacing[2], alignItems: 'center',
                                                ...(isActive ? T.glass.vivid : T.glass.thin),
                                                ...(isActive ? T.glow(T.color.semantic.info, 0.12) : {}),
                                            }}
                                        >
                                            <Text style={{ color: T.color.signature.primary, fontSize: 13, fontFamily: T.fonts.display.bold }}>
                                                {c.time}
                                            </Text>
                                            <Text style={{ ...type.overline, color: T.color.text.secondary, fontSize: 8.5, marginTop: 2, textAlign: 'center' }}>
                                                {c.label}
                                            </Text>
                                            <Text style={{
                                                color: isActive ? T.color.text.primary : T.color.text.secondary,
                                                fontSize: 11, fontFamily: T.fonts.display.semibold, marginTop: 2,
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
                                        ...type.cardTitle,
                                        color: T.color.text.primary, fontSize: 20,
                                    }}>
                                        Highlight Reel #{id}
                                    </Text>
                                    <Text style={{
                                        ...type.caption,
                                        color: T.color.text.secondary, marginTop: 2,
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
                                                ...T.glass.base, justifyContent: 'center', alignItems: 'center',
                                            }}
                                            onPress={() => setShareModal(true)}
                                        >
                                            <Feather name="share-2" size={20} color={T.color.text.primary} />
                                        </TouchableOpacity>
                                        <Text style={{ ...type.overline, color: T.color.text.secondary, marginTop: 3, fontSize: 10 }}>
                                            Share
                                        </Text>
                                    </View>

                                    {/* Play/Pause */}
                                    <TouchableOpacity
                                        style={{
                                            width: 56, height: 56, borderRadius: 28,
                                            backgroundColor: T.color.signature.primary,
                                            justifyContent: 'center', alignItems: 'center',
                                            ...T.glow(T.color.signature.primary, 0.4),
                                        }}
                                        onPress={togglePlay}
                                        activeOpacity={0.8}
                                    >
                                        <Feather name={playing ? 'pause' : 'play'} size={24} color={T.color.background.primary} />
                                    </TouchableOpacity>

                                    {/* Publish */}
                                    <View style={{ alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={{
                                                paddingHorizontal: 14, paddingVertical: 12, borderRadius: T.borderRadius.xl,
                                                ...(published
                                                    ? { ...T.glass.vivid, borderColor: T.color.semantic.success, borderWidth: 1 }
                                                    : T.glass.base),
                                            }}
                                            onPress={handlePublish}
                                            disabled={published}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Feather
                                                    name={published ? 'check-circle' : 'upload-cloud'}
                                                    size={14}
                                                    color={published ? T.color.semantic.success : T.color.text.primary}
                                                />
                                                <Text style={{
                                                    ...type.caption,
                                                    color: published ? T.color.semantic.success : T.color.text.primary,
                                                    fontFamily: T.fonts.body.bold,
                                                }}>
                                                    {published ? 'Published' : 'Publish'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                        {!published && (
                                            <Text style={{ ...type.overline, color: T.color.text.tertiary, marginTop: 3, fontSize: 10 }}>
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
                    <Pressable onPress={() => { }}>
                        <Animated.View
                            entering={SlideInDown.duration(350).damping(18)}
                            style={{
                                backgroundColor: T.color.background.tertiary,
                                borderTopLeftRadius: T.borderRadius['2xl'],
                                borderTopRightRadius: T.borderRadius['2xl'],
                                padding: T.spacing[6], paddingBottom: 44,
                                borderTopWidth: 1, borderColor: T.color.border.base,
                            }}
                        >
                            <View style={{ width: 40, height: 4, backgroundColor: T.color.text.tertiary, borderRadius: 2, alignSelf: 'center', marginBottom: T.spacing[5] }} />

                            <Text style={{
                                ...type.sectionTitle,
                                color: T.color.text.primary,
                                marginBottom: T.spacing[1],
                            }}>
                                Share Highlight
                            </Text>
                            <Text style={{
                                ...type.body,
                                color: T.color.text.secondary, marginBottom: T.spacing[6],
                            }}>
                                Show the world what you can do
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: T.spacing[5] }}>
                                {SHARE_PLATFORMS.map((p, i) => (
                                    <Animated.View key={p.id} entering={FadeInUp.duration(300).delay(i * 60)}>
                                        <TouchableOpacity
                                            onPress={() => handlePlatformShare(p.id)}
                                            activeOpacity={0.7}
                                            style={{ alignItems: 'center', gap: 8 }}
                                        >
                                            <View style={{
                                                width: 60, height: 60, borderRadius: T.borderRadius.xl,
                                                backgroundColor: `${p.color}15`, justifyContent: 'center', alignItems: 'center',
                                                borderWidth: 1.5, borderColor: `${p.color}30`,
                                                ...T.glow.soft(),
                                            }}>
                                                <Feather name={p.icon} size={26} color={p.color} />
                                            </View>
                                            <Text style={{ ...type.caption, color: T.color.text.secondary, fontFamily: T.fonts.body.medium }}>
                                                {p.label}
                                            </Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={{
                                    borderRadius: T.borderRadius.lg, paddingVertical: 16, alignItems: 'center',
                                    flexDirection: 'row', justifyContent: 'center', gap: 8,
                                    ...T.glass.vivid, ...T.glow(T.color.signature.primary, 0.15),
                                    borderWidth: 1.5, borderColor: `${T.color.signature.primary}30`,
                                }}
                                onPress={handleNativeShare}
                                activeOpacity={0.8}
                            >
                                <Feather name="share" size={18} color={T.color.signature.primary} />
                                <Text style={{ color: T.color.signature.primary, fontFamily: T.fonts.display.bold, fontSize: 18 }}>
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
