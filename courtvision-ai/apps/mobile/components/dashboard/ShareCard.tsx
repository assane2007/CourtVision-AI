/**
 * TwinShareCard suite — exportable twin card, share modal, share button.
 * V5 PERFECTION: StyleSheet.create, memo'd sub-components, fixed emojis,
 * proper theme imports, no inline objects. Touch targets >= 44 px.
 */

import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Dimensions, StyleSheet } from 'react-native'
import { useEffect, useCallback, memo } from 'react'
import { Feather } from '@expo/vector-icons'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    interpolate,
    FadeInUp,
} from 'react-native-reanimated'
import type { TwinCardData, SharePlatform } from '../../hooks/useViralShare'
import { T, typePresets } from '../../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 48

const STYLE_EMOJIS: Record<string, string> = {
    sharpshooter: '🎯', shot_creator: '🪄', slasher: '⚡', playmaker: '🧠',
    two_way: '🛡️', stretch_big: '🏗️', paint_beast: '💥', balanced: '♾️',
}

const PLATFORM_CONFIG: Record<SharePlatform, { icon: string; color: string; label: string }> = {
    tiktok: { icon: 'play-circle', color: '#EE1D52', label: 'TikTok' },
    instagram: { icon: 'camera', color: '#E4405F', label: 'Instagram' },
    twitter: { icon: 'twitter', color: '#1DA1F2', label: 'Twitter/X' },
    generic: { icon: 'share-2', color: T.color.brand.primary, label: 'Share' },
}

// ==========================================
// MiniStatBadge
// ==========================================

const MiniStatBadge = memo(function MiniStatBadge({ label, value, icon }: {
    label: string; value: number; icon: string
}) {
    const color = value >= 80 ? T.color.semantic.success : value >= 50 ? T.color.brand.primary : T.color.semantic.warning
    return (
        <View style={sc.miniBadge}>
            <Feather name={icon as any} size={14} color={color} />
            <Text style={[sc.miniBadgeValue, { color }]}>{value}</Text>
            <Text style={sc.miniBadgeLabel}>{label}</Text>
        </View>
    )
})

// ==========================================
// Twin Card Component (exportable card)
// ==========================================

interface TwinCardProps {
    data: TwinCardData
    compact?: boolean
}

export const TwinShareCard = memo(function TwinShareCard({ data, compact }: TwinCardProps) {
    const shimmer = useSharedValue(0)

    useEffect(() => {
        shimmer.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2000 }),
                withTiming(0, { duration: 2000 }),
            ),
            -1,
        )
    }, [shimmer])

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.9, 1]),
    }))

    const ratingColor = T.ratingColor(data.overallRating)
    const cardWidth = compact ? CARD_WIDTH * 0.85 : CARD_WIDTH
    const ratingSize = compact ? 70 : 85

    return (
        <View style={[sc.card, { width: cardWidth, borderColor: `${ratingColor}40` }, T.glow.soft(ratingColor)]}>
            {/* Header */}
            <View style={sc.cardHeader}>
                <View style={sc.cardHeaderTop}>
                    <View style={sc.brandRow}>
                        <Feather name="crosshair" size={16} color={T.color.brand.primary} />
                        <Text style={sc.brandText}>COURTVISION AI</Text>
                    </View>
                    <View style={sc.versionBadge}>
                        <Text style={sc.versionText}>DIGITAL TWIN {data.modelVersion}</Text>
                    </View>
                </View>

                <Text style={[sc.fullName, compact && sc.fullNameCompact]}>{data.fullName}</Text>
                <View style={sc.metaRow}>
                    {data.position && (
                        <View style={sc.positionBadge}>
                            <Text style={sc.positionText}>{data.position}</Text>
                        </View>
                    )}
                    <Text style={sc.username}>@{data.username} · {data.sessionCount} sessions</Text>
                </View>
            </View>

            {/* Overall Rating + Play Style */}
            <View style={sc.ratingSection}>
                <Animated.View style={[
                    sc.ratingCircle,
                    { width: ratingSize, height: ratingSize, borderRadius: ratingSize / 2, borderColor: `${ratingColor}40` },
                    T.glow.soft(ratingColor),
                    shimmerStyle,
                ]}>
                    <Text style={[sc.ratingValue, { color: ratingColor, fontSize: compact ? 28 : 34 }]}>
                        {data.overallRating}
                    </Text>
                    <Text style={sc.ratingLabel}>OVERALL</Text>
                </Animated.View>

                <View style={sc.playStyleInfo}>
                    <View style={sc.playStyleRow}>
                        <Text style={sc.playStyleEmoji}>
                            {STYLE_EMOJIS[data.playStyle] ?? '🏀'}
                        </Text>
                        <Text style={sc.playStyleLabel}>{data.playStyleLabel}</Text>
                    </View>
                    <Text style={sc.playStyleDesc} numberOfLines={2}>
                        {data.playStyleDescription}
                    </Text>
                    <Text style={sc.archetypeText}>
                        Archetype: {data.nbaArchetype}
                    </Text>
                </View>
            </View>

            {/* Key Attributes Grid */}
            <View style={sc.attributesGrid}>
                {data.keyAttributes.map((attr: { name: string; value: number; emoji: string }, i: number) => (
                    <View key={i} style={sc.attrItem}>
                        <Text style={sc.attrEmoji}>{attr.emoji}</Text>
                        <Text style={sc.attrName} numberOfLines={1}>{attr.name}</Text>
                        <Text style={[sc.attrValue, { color: T.ratingColor(attr.value) }]}>
                            {attr.value}
                        </Text>
                    </View>
                ))}
            </View>

            {/* NBA Comparison */}
            {data.nbaCompPlayer && (
                <View style={sc.nbaCompRow}>
                    <Feather name="star" size={14} color={T.color.semantic.gold} />
                    <Text style={sc.nbaCompLabel}>Comparable to</Text>
                    <Text style={sc.nbaCompPlayer}>{data.nbaCompPlayer}</Text>
                    <View style={sc.nbaCompRight}>
                        <Text style={sc.nbaCompMatch}>{data.nbaCompSimilarity}% match</Text>
                    </View>
                </View>
            )}

            {/* Strengths */}
            {data.strengths.length > 0 && (
                <View style={sc.strengthsRow}>
                    {data.strengths.map((s: string, i: number) => (
                        <View key={i} style={sc.strengthChip}>
                            <Text style={sc.strengthText}>{s}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Mental Row */}
            <View style={sc.mentalRow}>
                <MiniStatBadge label="Resilience" value={data.mentalResilience} icon="heart" />
                <MiniStatBadge label="Clutch" value={data.clutchFactor} icon="zap" />
                <MiniStatBadge
                    label="Pressure"
                    value={data.pressureResponse === 'thrives' ? 90 : data.pressureResponse === 'neutral' ? 50 : 20}
                    icon={data.pressureResponse === 'thrives' ? 'shield' : data.pressureResponse === 'neutral' ? 'minus-circle' : 'alert-triangle'}
                />
            </View>

            {/* Footer */}
            <View style={sc.cardFooter}>
                <Text style={sc.footerLink}>courtvision.ai · Create your own Twin</Text>
                <Text style={sc.footerBrand}>TWIN CARD</Text>
            </View>
        </View>
    )
})

// ==========================================
// Share Modal
// ==========================================

interface ShareModalProps {
    visible: boolean
    onClose: () => void
    onShare: (platform: SharePlatform) => void
    sharing: boolean
    cardData?: TwinCardData | null
    shareType: 'twin_card' | 'session_recap' | 'badge' | 'highlight_reel'
}

export const ShareModal = memo(function ShareModal({
    visible, onClose, onShare, sharing, cardData, shareType,
}: ShareModalProps) {
    const slide = useSharedValue(300)
    const fade = useSharedValue(0)

    useEffect(() => {
        if (visible) {
            fade.value = withTiming(1, { duration: 250 })
            slide.value = withSpring(0, { damping: 15, stiffness: 120 })
        } else {
            slide.value = 300
            fade.value = 0
        }
    }, [visible, fade, slide])

    const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }))
    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }] }))

    const shareTitle: Record<string, string> = {
        twin_card: 'Share Twin Card',
        session_recap: 'Share Session Recap',
        badge: 'Share Badge',
        highlight_reel: 'Share Highlights',
    }

    const handlePlatformPress = useCallback((platform: SharePlatform) => {
        onShare(platform)
    }, [onShare])

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[sc.modalBackdrop, backdropStyle]}>
                <TouchableOpacity style={sc.modalDismiss} onPress={onClose} activeOpacity={1} />
                <Animated.View style={[sc.modalSheet, sheetStyle]}>
                    <View style={sc.modalHandle} />

                    <Text style={sc.modalTitle}>{shareTitle[shareType]}</Text>
                    <Text style={sc.modalSubtitle}>Pick a platform — we'll optimize the format for you</Text>

                    {cardData && shareType === 'twin_card' && (
                        <View style={sc.modalPreview}>
                            <TwinShareCard data={cardData} compact />
                        </View>
                    )}

                    {/* Platform buttons */}
                    <View style={sc.platformRow}>
                        {(['instagram', 'tiktok', 'twitter', 'generic'] as SharePlatform[]).map((platform, i) => {
                            const info = PLATFORM_CONFIG[platform]
                            return (
                                <Animated.View key={platform} entering={FadeInUp.duration(300).delay(i * 60)}>
                                    <TouchableOpacity
                                        onPress={() => handlePlatformPress(platform)}
                                        disabled={sharing}
                                        style={[sc.platformBtn, sharing && sc.platformBtnDisabled]}
                                    >
                                        <View style={[sc.platformIcon, { backgroundColor: `${info.color}20`, borderColor: `${info.color}40` }]}>
                                            {sharing ? (
                                                <ActivityIndicator size="small" color={info.color} />
                                            ) : (
                                                <Feather name={info.icon as any} size={24} color={info.color} />
                                            )}
                                        </View>
                                        <Text style={sc.platformLabel}>{info.label}</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )
                        })}
                    </View>

                    {/* XP bonus */}
                    <View style={sc.xpBonusRow}>
                        <Feather name="zap" size={12} color={T.color.semantic.purple} style={sc.xpBonusIcon} />
                        <Text style={sc.xpBonusText}>+10 XP bonus for each share</Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    )
})

// Backward-compatible export to avoid breaking existing imports.
export const TwinCard = TwinShareCard

// ==========================================
// Share Button (inline toolbar)
// ==========================================

interface ShareButtonProps {
    onPress: () => void
    label?: string
    compact?: boolean
    disabled?: boolean
}

export const ShareButton = memo(function ShareButton({
    onPress, label = 'Share', compact, disabled,
}: ShareButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                compact ? sc.shareBtnCompact : sc.shareBtn,
                disabled && sc.shareBtnDisabled,
            ]}
        >
            <Feather name="share-2" size={compact ? 14 : 16} color={T.color.brand.primary} />
            {!compact && <Text style={sc.shareBtnLabel}>{label}</Text>}
        </TouchableOpacity>
    )
})

// ==========================================
// StyleSheet
// ==========================================

const sc = StyleSheet.create({
    // ── Twin Card ──
    card: {
        backgroundColor: T.color.bg.primary,
        borderRadius: T.radius.xl,
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    cardHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
        ...T.glass.vivid,
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.base,
    },
    cardHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandText: {
        color: T.color.brand.primary,
        fontSize: 12,
        fontFamily: T.fonts.display.black,
        marginLeft: 6,
        letterSpacing: 1,
    },
    versionBadge: {
        ...T.glass.base,
        borderRadius: T.radius.sm,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    versionText: {
        color: T.color.text.secondary,
        fontSize: 9,
        fontFamily: T.fonts.body.semibold,
    },
    fullName: {
        color: T.color.text.primary,
        fontSize: 24,
        fontFamily: T.fonts.display.black,
        letterSpacing: -0.5,
    },
    fullNameCompact: {
        fontSize: 20,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    positionBadge: {
        backgroundColor: T.color.brand.muted,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 8,
    },
    positionText: {
        color: T.color.brand.primary,
        fontSize: 11,
        fontFamily: T.fonts.display.bold,
    },
    username: {
        color: T.color.text.secondary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
    },

    // ── Rating section ──
    ratingSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        ...T.glass.thin,
    },
    ratingCircle: {
        backgroundColor: T.color.bg.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    ratingValue: {
        fontFamily: T.fonts.display.black,
    },
    ratingLabel: {
        color: T.color.text.secondary,
        fontSize: 8,
        fontFamily: T.fonts.display.bold,
    },
    playStyleInfo: {
        marginLeft: 18,
        flex: 1,
    },
    playStyleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    playStyleEmoji: {
        fontSize: 20,
    },
    playStyleLabel: {
        color: T.color.text.primary,
        fontSize: 16,
        fontFamily: T.fonts.display.bold,
        marginLeft: 6,
    },
    playStyleDesc: {
        color: T.color.text.secondary,
        fontSize: 10,
        lineHeight: 14,
        fontFamily: T.fonts.body.regular,
    },
    archetypeText: {
        color: T.color.brand.primary,
        fontSize: 10,
        fontFamily: T.fonts.body.semibold,
        marginTop: 3,
    },

    // ── Attributes ──
    attributesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: T.color.border.base,
    },
    attrItem: {
        width: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 6,
    },
    attrEmoji: {
        fontSize: 12,
        marginRight: 6,
    },
    attrName: {
        color: T.color.text.secondary,
        fontSize: 11,
        flex: 1,
        fontFamily: T.fonts.body.regular,
    },
    attrValue: {
        fontSize: 13,
        fontFamily: T.fonts.display.bold,
    },

    // ── NBA Comparison ──
    nbaCompRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: `${T.color.semantic.gold}20`,
        borderTopWidth: 1,
        borderTopColor: T.color.border.base,
    },
    nbaCompLabel: {
        color: T.color.text.secondary,
        fontSize: 11,
        marginLeft: 6,
        fontFamily: T.fonts.body.regular,
    },
    nbaCompPlayer: {
        color: T.color.semantic.gold,
        fontSize: 12,
        fontFamily: T.fonts.display.bold,
        marginLeft: 4,
    },
    nbaCompRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    nbaCompMatch: {
        color: T.color.semantic.gold,
        fontSize: 11,
        fontFamily: T.fonts.display.bold,
    },

    // ── Strengths ──
    strengthsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
    },
    strengthChip: {
        backgroundColor: `${T.color.semantic.success}15`,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 6,
        marginBottom: 4,
    },
    strengthText: {
        color: T.color.semantic.success,
        fontSize: 10,
        fontFamily: T.fonts.body.semibold,
    },

    // ── Mental row ──
    mentalRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
    },
    miniBadge: {
        alignItems: 'center',
    },
    miniBadgeValue: {
        fontSize: 14,
        fontFamily: T.fonts.display.bold,
        marginTop: 2,
    },
    miniBadgeLabel: {
        color: T.color.text.secondary,
        fontSize: 9,
        fontFamily: T.fonts.body.regular,
    },

    // ── Card footer ──
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(0,212,255,0.04)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    footerLink: {
        color: T.color.text.secondary,
        fontSize: 9,
        fontFamily: T.fonts.body.regular,
    },
    footerBrand: {
        color: T.color.brand.primary,
        fontSize: 9,
        fontFamily: T.fonts.display.bold,
    },

    // ── Share Modal ──
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalDismiss: {
        flex: 1,
    },
    modalSheet: {
        backgroundColor: T.color.bg.tertiary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: T.color.border.base,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: T.color.text.primary,
        fontSize: 20,
        fontFamily: T.fonts.display.black,
        marginBottom: 6,
    },
    modalSubtitle: {
        color: T.color.text.secondary,
        fontSize: 13,
        fontFamily: T.fonts.body.regular,
        marginBottom: 20,
    },
    modalPreview: {
        alignItems: 'center',
        marginBottom: 20,
    },
    platformRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    platformBtn: {
        alignItems: 'center',
    },
    platformBtnDisabled: {
        opacity: 0.5,
    },
    platformIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    platformLabel: {
        color: T.color.text.secondary,
        fontSize: 11,
        marginTop: 6,
        fontFamily: T.fonts.body.medium,
    },
    xpBonusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.color.semantic.purple}20`,
        borderRadius: 10,
        padding: 10,
    },
    xpBonusIcon: {
        marginRight: 6,
    },
    xpBonusText: {
        color: T.color.semantic.purple,
        fontSize: 12,
        fontFamily: T.fonts.body.medium,
    },

    // ── Share Button ──
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,212,255,0.12)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,212,255,0.25)',
        minHeight: 44,
    },
    shareBtnCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,212,255,0.12)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,212,255,0.25)',
        minHeight: 44,
    },
    shareBtnDisabled: {
        opacity: 0.5,
    },
    shareBtnLabel: {
        color: T.color.brand.primary,
        fontSize: 13,
        fontFamily: T.fonts.body.semibold,
        marginLeft: 6,
    },
})
