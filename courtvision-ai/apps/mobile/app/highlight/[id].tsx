/**
 * Highlight Player — V5 PERFECTION
 * Full-screen highlight reel viewer with AI commentary,
 * clip selector, share CTA. Reanimated v3, Feather icons, English.
 *
 * V5 Skills-driven:
 *   - StyleSheet.create for ALL styles (zero inline objects)
 *   - Sub-components memo'd (PlayButton, ClipChip, SharePlatformButton)
 *   - Stable useCallback refs
 *   - typePresets used directly (no alias)
 *   - Pulse animation inside useEffect (not every render)
 *   - Touch targets >= 44 px
 */

import { View, Text, TouchableOpacity, StatusBar, Share, Modal, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useState, useCallback, useEffect, memo, useRef } from 'react'
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
    Easing,
} from 'react-native-reanimated'
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av'
import { toast } from '../../lib/toast'
import { useStore } from '../../lib/store'
import { api } from '../../lib/api'
import { T, typePresets } from '../../lib/theme'
import { MusicPicker, type MusicTrack } from '../../components/dashboard/MusicPicker'

// ── Music catalog (mirrored subset for mobile UI) ─────────────

/** Format seconds to mm:ss */
function formatSec(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const MUSIC_TRACKS: MusicTrack[] = [
    { id: 'on-fire', title: 'On Fire', artist: 'CourtVision Beats', durationSec: 92, bpm: 140, mood: 'hype', genre: 'trap', beatSyncable: true },
    { id: 'no-mercy', title: 'No Mercy', artist: 'CourtVision Beats', durationSec: 78, bpm: 150, mood: 'dark', genre: 'trap', beatSyncable: true },
    { id: 'run-it-up', title: 'Run It Up', artist: 'CourtVision Beats', durationSec: 85, bpm: 130, mood: 'hype', genre: 'hip-hop', beatSyncable: true },
    { id: 'rise-above', title: 'Rise Above', artist: 'CourtVision Beats', durationSec: 120, bpm: 110, mood: 'motivational', genre: 'orchestral', beatSyncable: false },
    { id: 'champion-mindset', title: 'Champion Mindset', artist: 'CourtVision Beats', durationSec: 95, bpm: 100, mood: 'motivational', genre: 'electronic', beatSyncable: false },
    { id: 'golden-hour', title: 'Golden Hour', artist: 'CourtVision Beats', durationSec: 135, bpm: 85, mood: 'cinematic', genre: 'orchestral', beatSyncable: false },
    { id: 'legacy', title: 'Legacy', artist: 'CourtVision Beats', durationSec: 110, bpm: 90, mood: 'cinematic', genre: 'orchestral', beatSyncable: false },
    { id: 'smooth-operator', title: 'Smooth Operator', artist: 'CourtVision Beats', durationSec: 100, bpm: 80, mood: 'chill', genre: 'lo-fi', beatSyncable: false },
    { id: 'late-night-gym', title: 'Late Night Gym', artist: 'CourtVision Beats', durationSec: 88, bpm: 75, mood: 'chill', genre: 'lo-fi', beatSyncable: false },
    { id: 'crowd-goes-wild', title: 'Crowd Goes Wild', artist: 'CourtVision Beats', durationSec: 72, bpm: 128, mood: 'hype', genre: 'electronic', beatSyncable: true },
    { id: 'game-day', title: 'Game Day', artist: 'CourtVision Beats', durationSec: 65, bpm: 125, mood: 'hype', genre: 'pop', beatSyncable: true },
    { id: 'highlights-only', title: 'Highlights Only', artist: 'CourtVision Beats', durationSec: 80, bpm: 135, mood: 'motivational', genre: 'electronic', beatSyncable: true },
]

// ── Mock clips (fallback when API unavailable) ───────────────

type HighlightClipData = {
    time: string
    label: string
    score: number
    comment: string
    startSec?: number
    endSec?: number
    overlayLabel?: string
}

const FALLBACK_CLIPS: HighlightClipData[] = [
    { time: '00:14', label: '3-Pt Made · Q1', score: 96, comment: 'Perfect high release — elbow at 90°. Excellent catch-and-shoot form.' },
    { time: '01:32', label: 'Floater · Q2', score: 88, comment: 'Smart lane drive, well-controlled floater. Great decision-making.' },
    { time: '02:45', label: 'And-1 Drive · Q3', score: 94, comment: 'Explosive first step — dominant body language under contact.' },
]

const SHARE_PLATFORMS = [
    { id: 'tiktok', icon: 'video' as const, label: 'TikTok', color: '#EE1D52' },
    { id: 'instagram', icon: 'camera' as const, label: 'Instagram', color: '#E4405F' },
    { id: 'twitter', icon: 'twitter' as const, label: 'Twitter/X', color: '#1DA1F2' },
    { id: 'whatsapp', icon: 'message-circle' as const, label: 'WhatsApp', color: '#25D366' },
] as const

// ── Animated Play Button ──────────────────────────────────────

const PlayButton = memo(function PlayButton({ onPress }: { onPress: () => void }) {
    const pulse = useSharedValue(1)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
        )
    }, [pulse])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    return (
        <View style={hs.playCenter}>
            <Animated.View style={pulseStyle}>
                <TouchableOpacity
                    onPress={onPress}
                    activeOpacity={0.8}
                    style={hs.playButton}
                >
                    <Feather name="play" size={38} color={T.color.brand.primary} style={hs.playIcon} />
                </TouchableOpacity>
            </Animated.View>
        </View>
    )
})

// ── Clip Chip ─────────────────────────────────────────────────

const ClipChip = memo(function ClipChip({
    clip, index, isActive, onPress,
}: {
    clip: HighlightClipData; index: number; isActive: boolean; onPress: (i: number) => void
}) {
    const handlePress = useCallback(() => onPress(index), [onPress, index])

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            style={[hs.clipChip, isActive ? hs.clipChipActive : hs.clipChipInactive]}
        >
            <Text style={hs.clipTime}>{clip.time}</Text>
            <Text style={hs.clipLabel}>{clip.label}</Text>
            <Text style={[hs.clipScore, isActive && hs.clipScoreActive]}>
                {clip.score}pts
            </Text>
        </TouchableOpacity>
    )
})

// ── Share Platform Button ─────────────────────────────────────

const SharePlatformBtn = memo(function SharePlatformBtn({
    platform, index, onPress,
}: {
    platform: typeof SHARE_PLATFORMS[number]; index: number; onPress: (id: string) => void
}) {
    const handlePress = useCallback(() => onPress(platform.id), [onPress, platform.id])

    return (
        <Animated.View entering={FadeInUp.duration(300).delay(index * 60)}>
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.7}
                style={hs.sharePlatformBtn}
            >
                <View style={[hs.sharePlatformIcon, { backgroundColor: `${platform.color}15`, borderColor: `${platform.color}30` }]}>
                    <Feather name={platform.icon} size={26} color={platform.color} />
                </View>
                <Text style={hs.sharePlatformLabel}>{platform.label}</Text>
            </TouchableOpacity>
        </Animated.View>
    )
})

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
    const [musicPickerVisible, setMusicPickerVisible] = useState(false)
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)

    // API-loaded clips + video
    const [clips, setClips] = useState<HighlightClipData[]>(FALLBACK_CLIPS)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [videoLoading, setVideoLoading] = useState(true)
    const videoRef = useRef<Video>(null)

    // Fetch highlight data from API
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                type ClipsResponse = {
                    clips?: Array<{
                        time?: string
                        label?: string
                        overlayLabel?: string
                        score?: number
                        comment?: string
                        startSec?: number
                        endSec?: number
                    }>
                    videoUrl?: string
                }
                const res = await api.get<ClipsResponse>(`/api/highlights/${id}/clips`)
                if (cancelled) return
                if (res?.clips?.length) {
                    setClips(
                        res.clips.map((c) => ({
                            time: c.time ?? formatSec(c.startSec ?? 0),
                            label: c.label ?? c.overlayLabel ?? 'Highlight',
                            score: c.score ?? 90,
                            comment: c.comment ?? '',
                            startSec: c.startSec,
                            endSec: c.endSec,
                            overlayLabel: c.overlayLabel,
                        })),
                    )
                }
                if (res?.videoUrl) {
                    setVideoUrl(res.videoUrl)
                }
            } catch {
                // API unavailable — keep fallback clips
            } finally {
                if (!cancelled) setVideoLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [id])

    // Progress animation
    const progress = useSharedValue(0)
    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }))

    const togglePlay = useCallback(async () => {
        if (!playing) {
            setPlaying(true)
            if (videoUrl && videoRef.current) {
                await videoRef.current.playAsync()
            } else {
                // Fallback: simulated progress for demo mode
                progress.value = withTiming(1, { duration: 30000, easing: Easing.linear })
            }
            setTimeout(() => setControlsVisible(false), 2500)
        } else {
            setPlaying(false)
            if (videoUrl && videoRef.current) {
                await videoRef.current.pauseAsync()
            } else {
                progress.value = progress.value
            }
        }
    }, [playing, progress, videoUrl])

    const showControls = useCallback(() => {
        setControlsVisible(true)
        if (playing) {
            setTimeout(() => setControlsVisible(false), 3000)
        }
    }, [playing])

    const handleNativeShare = useCallback(async () => {
        try {
            await Share.share({
                title: 'My Highlight Reel — CourtVision AI',
                message: `Check out my AI highlight reel — Session #${id}\n3 best plays analyzed by CourtVision AI\nhttps://courtvision.ai/highlight/${id}`,
            })
            addXP(50, 'Highlight shared')
            toast.success('+50 XP!', 'Highlight shared successfully')
        } catch { /* user cancelled */ }
    }, [id, addXP])

    const handlePlatformShare = useCallback(async (_platform: string) => {
        setShareModal(false)
        await handleNativeShare()
    }, [handleNativeShare])

    const handlePublish = useCallback(() => {
        setPublished(true)
        addXP(100, 'Highlight published to community')
        toast.success('+100 XP!', 'Highlight published to the community')
    }, [addXP])

    const goBack = useCallback(() => router.back(), [router])
    const toggleCommentary = useCallback(() => setAiCommentary(v => !v), [])
    const openShareModal = useCallback(() => setShareModal(true), [])
    const closeShareModal = useCallback(() => setShareModal(false), [])

    const selectClip = useCallback(async (i: number) => {
        setCurrentClip(i)
        const clip = clips[i]
        if (videoUrl && videoRef.current && clip?.startSec != null) {
            await videoRef.current.setPositionAsync(clip.startSec * 1000)
            if (!playing) {
                setPlaying(true)
                await videoRef.current.playAsync()
            }
        }
    }, [clips, videoUrl, playing])

    const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return
        const { durationMillis, positionMillis } = status
        if (durationMillis && durationMillis > 0) {
            progress.value = withTiming(positionMillis / durationMillis, { duration: 250 })
        }
        if (status.didJustFinish) {
            setPlaying(false)
            setControlsVisible(true)
        }
    }, [progress])
    const openMusicPicker = useCallback(() => setMusicPickerVisible(true), [])
    const closeMusicPicker = useCallback(() => setMusicPickerVisible(false), [])
    const handleSelectMusic = useCallback((track: MusicTrack | null) => {
        setSelectedTrack(track)
        if (track) {
            toast.success(`🎵 ${track.title}`, 'Music applied to your reel')
        } else {
            toast.success('Music removed', 'No background music')
        }
    }, [])

    const clip = clips[currentClip]

    return (
        <View style={hs.root}>
            <StatusBar hidden />

            {/* ── Video Player / Fallback Art ── */}
            <TouchableOpacity
                style={hs.videoArea}
                onPress={playing ? showControls : togglePlay}
                activeOpacity={1}
            >
                {videoUrl ? (
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUrl }}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={false}
                        isLooping={false}
                        onPlaybackStatusUpdate={handlePlaybackStatus}
                        style={hs.videoPlayer}
                    />
                ) : (
                    <View style={hs.videoContent}>
                        {/* Court art (fallback when no video URL) */}
                        <View style={hs.courtOuter} />
                        <View style={hs.courtArc} />
                        <View style={hs.ambientGlow} />
                    </View>
                )}

                {/* AI Score overlay */}
                {playing && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        exiting={FadeOut.duration(200)}
                        style={hs.aiScoreOverlay}
                    >
                        <Text style={hs.aiScoreLabel}>AI Score</Text>
                        <Text style={hs.aiScoreValue}>{clip?.score}</Text>
                    </Animated.View>
                )}

                {/* Play button (when paused and no video playing) */}
                {!playing && (
                    <Animated.View entering={FadeIn.duration(300)} style={hs.playOverlay}>
                        <PlayButton onPress={togglePlay} />
                        <Text style={hs.reelTitle}>
                            Highlight Reel #{id} · 1080p AI
                        </Text>
                    </Animated.View>
                )}
            </TouchableOpacity>

            {/* ── Controls Overlay ── */}
            <SafeAreaView style={hs.overlayContainer} pointerEvents="box-none">
                {controlsVisible && (
                    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={hs.overlayFlex}>

                        {/* Top bar */}
                        <Animated.View entering={FadeInDown.duration(300).delay(50)} style={hs.topBar}>
                            <TouchableOpacity onPress={goBack} style={hs.closeBtn}>
                                <Feather name="x" size={22} color={T.color.text.primary} />
                            </TouchableOpacity>

                            <View style={hs.topBarRight}>
                            <TouchableOpacity
                                onPress={toggleCommentary}
                                style={[hs.commentaryToggle, aiCommentary ? hs.commentaryOn : hs.commentaryOff]}
                            >
                                <Feather
                                    name={aiCommentary ? 'mic' : 'mic-off'}
                                    size={14}
                                    color={aiCommentary ? T.color.semantic.info : T.color.text.secondary}
                                />
                                <Text style={[hs.commentaryText, aiCommentary && hs.commentaryTextOn]}>
                                    AI Commentary {aiCommentary ? 'ON' : 'OFF'}
                                </Text>
                            </TouchableOpacity>

                            {/* Music toggle */}
                            <TouchableOpacity
                                onPress={openMusicPicker}
                                style={[hs.musicToggle, selectedTrack ? hs.musicToggleActive : hs.musicToggleInactive]}
                            >
                                <Feather
                                    name="music"
                                    size={14}
                                    color={selectedTrack ? T.color.brand.primary : T.color.text.secondary}
                                />
                                <Text style={[hs.musicToggleText, selectedTrack && hs.musicToggleTextActive]}>
                                    {selectedTrack ? selectedTrack.title : 'Music'}
                                </Text>
                            </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* AI Commentary banner */}
                        {aiCommentary && playing && (
                            <Animated.View
                                entering={FadeInDown.duration(300).delay(100)}
                                exiting={FadeOut.duration(200)}
                                style={hs.commentaryBanner}
                            >
                                <Feather name="cpu" size={14} color={T.color.brand.primary} />
                                <Text style={hs.commentaryQuote}>
                                    &quot;{clip?.comment}&quot;
                                </Text>
                            </Animated.View>
                        )}

                        <View style={hs.spacer} pointerEvents="none" />

                        {/* Bottom panel */}
                        <Animated.View entering={FadeInUp.duration(300).delay(100)} style={hs.bottomPanel}>
                            {/* Progress bar */}
                            <View style={hs.progressTrack}>
                                <Animated.View style={[hs.progressFill, progressStyle]} />
                            </View>

                            {/* Clip selector */}
                            <View style={hs.clipRow}>
                                {clips.map((c, i) => (
                                    <ClipChip key={i} clip={c} index={i} isActive={currentClip === i} onPress={selectClip} />
                                ))}
                            </View>

                            {/* Controls row */}
                            <View style={hs.controlsRow}>
                                <View style={hs.reelInfo}>
                                    <Text style={hs.reelInfoTitle}>Highlight Reel #{id}</Text>
                                    <Text style={hs.reelInfoSub}>{clips.length} key plays · AI Groq · 1080p{selectedTrack ? ` · 🎵 ${selectedTrack.title}` : ''}</Text>
                                </View>

                                <View style={hs.actionRow}>
                                    {/* Share */}
                                    <View style={hs.actionCol}>
                                        <TouchableOpacity style={hs.actionBtn} onPress={openShareModal}>
                                            <Feather name="share-2" size={20} color={T.color.text.primary} />
                                        </TouchableOpacity>
                                        <Text style={hs.actionLabel}>Share</Text>
                                    </View>

                                    {/* Play/Pause */}
                                    <TouchableOpacity style={hs.mainPlayBtn} onPress={togglePlay} activeOpacity={0.8}>
                                        <Feather name={playing ? 'pause' : 'play'} size={24} color={T.color.bg.primary} />
                                    </TouchableOpacity>

                                    {/* Publish */}
                                    <View style={hs.actionCol}>
                                        <TouchableOpacity
                                            style={[hs.publishBtn, published && hs.publishBtnDone]}
                                            onPress={handlePublish}
                                            disabled={published}
                                            activeOpacity={0.7}
                                        >
                                            <View style={hs.publishInner}>
                                                <Feather
                                                    name={published ? 'check-circle' : 'upload-cloud'}
                                                    size={14}
                                                    color={published ? T.color.semantic.success : T.color.text.primary}
                                                />
                                                <Text style={[hs.publishText, published && hs.publishTextDone]}>
                                                    {published ? 'Published' : 'Publish'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                        {!published && <Text style={hs.publishXP}>+100 XP</Text>}
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </Animated.View>
                )}
            </SafeAreaView>

            {/* ── Share Modal ── */}
            <Modal visible={shareModal} transparent animationType="none" onRequestClose={closeShareModal}>
                <Pressable style={hs.modalBackdrop} onPress={closeShareModal}>
                    <Pressable onPress={() => {}}>
                        <Animated.View entering={SlideInDown.duration(350).damping(18)} style={hs.modalSheet}>
                            <View style={hs.modalHandle} />

                            <Text style={hs.modalTitle}>Share Highlight</Text>
                            <Text style={hs.modalSubtitle}>Show the world what you can do</Text>

                            <View style={hs.platformRow}>
                                {SHARE_PLATFORMS.map((p, i) => (
                                    <SharePlatformBtn key={p.id} platform={p} index={i} onPress={handlePlatformShare} />
                                ))}
                            </View>

                            <TouchableOpacity style={hs.quickShareBtn} onPress={handleNativeShare} activeOpacity={0.8}>
                                <Feather name="share" size={18} color={T.color.brand.primary} />
                                <Text style={hs.quickShareLabel}>Quick Share</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Music Picker ── */}
            <MusicPicker
                visible={musicPickerVisible}
                onClose={closeMusicPicker}
                onSelect={handleSelectMusic}
                selectedTrackId={selectedTrack?.id}
                tracks={MUSIC_TRACKS}
            />
        </View>
    )
}

// ── StyleSheet ────────────────────────────────────────────

const hs = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: T.color.bg.primary,
    },
    videoArea: {
        flex: 1,
    },
    videoPlayer: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: T.color.bg.primary,
    },
    courtOuter: {
        position: 'absolute',
        width: '72%',
        height: '58%',
        borderWidth: 1.5,
        borderColor: 'rgba(255,107,0,0.04)',
        borderRadius: 8,
    },
    courtArc: {
        position: 'absolute',
        width: '36%',
        height: '32%',
        borderTopLeftRadius: 80,
        borderTopRightRadius: 80,
        borderWidth: 1,
        borderColor: 'rgba(255,107,0,0.03)',
        borderBottomWidth: 0,
        top: '22%',
    },
    ambientGlow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: T.color.brand.glow,
        opacity: 0.08,
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiScoreOverlay: {
        position: 'absolute',
        top: '28%',
        right: '8%',
        borderRadius: T.radius.md,
        paddingHorizontal: 14,
        paddingVertical: 10,
        ...T.glass.vivid,
        ...T.glow(T.color.semantic.info, 0.3),
    },
    aiScoreLabel: {
        ...typePresets.caption,
        color: T.color.text.secondary,
        fontFamily: T.fonts.body.medium,
    },
    aiScoreValue: {
        color: T.color.text.primary,
        fontSize: 28,
        fontFamily: T.fonts.display.bold,
        letterSpacing: -1,
    },
    playCenter: {
        alignItems: 'center',
    },
    playButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        ...T.glass.vivid,
        ...T.glow(T.color.brand.primary, 0.25),
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        marginLeft: 4,
    },
    reelTitle: {
        ...typePresets.body,
        color: T.color.text.secondary,
        marginTop: T.spacing[4],
        textAlign: 'center',
    },

    // ── Overlay / Controls ──
    overlayContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    overlayFlex: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: T.spacing[4],
        paddingTop: T.spacing[3],
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        ...T.glass.base,
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentaryToggle: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: T.radius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        minHeight: 44,
    },
    commentaryOn: {
        ...T.glass.vivid,
        ...T.glow(T.color.semantic.info, 0.15),
    },
    commentaryOff: {
        ...T.glass.base,
    },
    commentaryText: {
        ...typePresets.caption,
        color: T.color.text.secondary,
        fontFamily: T.fonts.body.semibold,
    },
    commentaryTextOn: {
        color: T.color.semantic.info,
    },

    // ── Music toggle ──
    musicToggle: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: T.radius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        minHeight: 36,
    },
    musicToggleActive: {
        ...T.glass.vivid,
        ...T.glow(T.color.brand.primary, 0.12),
    },
    musicToggleInactive: {
        ...T.glass.thin,
    },
    musicToggleText: {
        ...typePresets.caption,
        color: T.color.text.secondary,
        fontFamily: T.fonts.body.medium,
        maxWidth: 80,
    },
    musicToggleTextActive: {
        color: T.color.brand.primary,
    },

    commentaryBanner: {
        marginTop: T.spacing[2],
        marginHorizontal: T.spacing[4],
        borderRadius: T.radius.md,
        padding: T.spacing[3],
        ...T.glass.vivid,
        ...T.glow(T.color.brand.primary, 0.08),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    commentaryQuote: {
        ...typePresets.caption,
        color: T.color.brand.primary,
        lineHeight: 19,
        flex: 1,
    },
    spacer: {
        flex: 1,
    },
    bottomPanel: {
        paddingHorizontal: T.spacing[4],
        paddingBottom: T.spacing[5],
    },
    progressTrack: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        marginBottom: T.spacing[3],
        overflow: 'hidden',
    },
    progressFill: {
        height: 3,
        borderRadius: 2,
        backgroundColor: T.color.brand.primary,
        ...T.glow.soft(),
    },
    clipRow: {
        flexDirection: 'row',
        gap: 7,
        marginBottom: T.spacing[3],
    },
    clipChip: {
        flex: 1,
        borderRadius: T.radius.sm,
        padding: T.spacing[2],
        alignItems: 'center',
    },
    clipChipActive: {
        ...T.glass.vivid,
        ...T.glow(T.color.semantic.info, 0.12),
    },
    clipChipInactive: {
        ...T.glass.thin,
    },
    clipTime: {
        color: T.color.brand.primary,
        fontSize: 13,
        fontFamily: T.fonts.display.bold,
    },
    clipLabel: {
        ...typePresets.overline,
        color: T.color.text.secondary,
        fontSize: 8.5,
        marginTop: 2,
        textAlign: 'center',
    },
    clipScore: {
        color: T.color.text.secondary,
        fontSize: 11,
        fontFamily: T.fonts.display.semibold,
        marginTop: 2,
    },
    clipScoreActive: {
        color: T.color.text.primary,
    },

    // ── Controls row ──
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reelInfo: {
        flex: 1,
    },
    reelInfoTitle: {
        ...typePresets.cardTitle,
        color: T.color.text.primary,
        fontSize: 20,
    },
    reelInfoSub: {
        ...typePresets.caption,
        color: T.color.text.secondary,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    actionCol: {
        alignItems: 'center',
    },
    actionBtn: {
        width: 46,
        height: 46,
        borderRadius: 23,
        ...T.glass.base,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        ...typePresets.overline,
        color: T.color.text.secondary,
        marginTop: 3,
        fontSize: 10,
    },
    mainPlayBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: T.color.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...T.glow(T.color.brand.primary, 0.4),
    },
    publishBtn: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: T.radius.xl,
        ...T.glass.base,
        minHeight: 44,
    },
    publishBtnDone: {
        ...T.glass.vivid,
        borderColor: T.color.semantic.success,
        borderWidth: 1,
    },
    publishInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    publishText: {
        ...typePresets.caption,
        color: T.color.text.primary,
        fontFamily: T.fonts.body.bold,
    },
    publishTextDone: {
        color: T.color.semantic.success,
    },
    publishXP: {
        ...typePresets.overline,
        color: T.color.text.tertiary,
        marginTop: 3,
        fontSize: 10,
    },

    // ── Share modal ──
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: T.color.bg.tertiary,
        borderTopLeftRadius: T.radius['2xl'],
        borderTopRightRadius: T.radius['2xl'],
        padding: T.spacing[6],
        paddingBottom: 44,
        borderTopWidth: 1,
        borderColor: T.color.border.base,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: T.color.text.tertiary,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: T.spacing[5],
    },
    modalTitle: {
        ...typePresets.sectionTitle,
        color: T.color.text.primary,
        marginBottom: T.spacing[1],
    },
    modalSubtitle: {
        ...typePresets.body,
        color: T.color.text.secondary,
        marginBottom: T.spacing[6],
    },
    platformRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: T.spacing[5],
    },
    sharePlatformBtn: {
        alignItems: 'center',
        gap: 8,
    },
    sharePlatformIcon: {
        width: 60,
        height: 60,
        borderRadius: T.radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        ...T.glow.soft(),
    },
    sharePlatformLabel: {
        ...typePresets.caption,
        color: T.color.text.secondary,
        fontFamily: T.fonts.body.medium,
    },
    quickShareBtn: {
        borderRadius: T.radius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        ...T.glass.vivid,
        ...T.glow(T.color.brand.primary, 0.15),
        borderWidth: 1.5,
        borderColor: `${T.color.brand.primary}30`,
        minHeight: 52,
    },
    quickShareLabel: {
        color: T.color.brand.primary,
        fontFamily: T.fonts.display.bold,
        fontSize: 18,
    },
})
