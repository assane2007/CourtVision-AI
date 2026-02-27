/**
 * ShareCard - Exportable Twin Card, share modal, share button.
 * V3: Reanimated v3, Feather icons, English, fontFamily.
 */

import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Dimensions } from 'react-native'
import { useEffect } from 'react'
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
import type { TwinCardData, SharePlatform } from '../hooks/useViralShare'
import { T } from '../lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 48

const STYLE_EMOJIS: Record<string, string> = {
    sharpshooter: 'Ã°Å¸Å½Â¯', shot_creator: 'Ã°Å¸Âªâ€ž', slasher: 'Ã¢Å¡Â¡', playmaker: 'Ã°Å¸Â§Â ',
    two_way: 'Ã°Å¸â€ºÂ¡Ã¯Â¸Â', stretch_big: 'Ã°Å¸Ââ€”Ã¯Â¸Â', paint_beast: 'Ã°Å¸â€™Â¥', balanced: 'Ã¢â„¢Â¾Ã¯Â¸Â',
}

const PLATFORM_CONFIG: Record<SharePlatform, { icon: string; color: string; label: string }> = {
    tiktok:    { icon: 'play-circle', color: '#EE1D52', label: 'TikTok' },
    instagram: { icon: 'camera',      color: '#E4405F', label: 'Instagram' },
    twitter:   { icon: 'twitter',     color: '#1DA1F2', label: 'Twitter/X' },
    generic:   { icon: 'share-2',     color: T.color.signature.primary, label: 'Share' },
}

// ==========================================
// Twin Card Component (exportable card)
// ==========================================

interface TwinCardProps {
    data: TwinCardData
    compact?: boolean
}

export function TwinCard({ data, compact }: TwinCardProps) {
    const shimmer = useSharedValue(0)

    useEffect(() => {
        shimmer.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2000 }),
                withTiming(0, { duration: 2000 }),
            ),
            -1,
        )
    }, [])

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.9, 1]),
    }))

    const ratingColor = T.ratingColor(data.overallRating)

    return (
        <View style={{
            width: compact ? CARD_WIDTH * 0.85 : CARD_WIDTH,
            backgroundColor: T.color.background.primary,
            borderRadius: T.borderRadius.xl,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: `${ratingColor}40`,
            ...T.glow(ratingColor, 0.3),
        }}>
            {/* Header */}
            <View style={{
                paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
                ...T.glass.accent,
                borderBottomWidth: 1, borderBottomColor: T.color.border.default,
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="crosshair" size={16} color={T.color.signature.primary} />
                        <Text style={{
                            color: T.color.signature.primary, fontSize: 12, fontWeight: '800', marginLeft: 6,
                            letterSpacing: 1, fontFamily: T.fonts.display.black,
                        }}>
                            COURTVISION AI
                        </Text>
                    </View>
                    <View style={{
                        ...T.glass.light, borderRadius: T.borderRadius.sm,
                        paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                        <Text style={{
                            color: T.color.text.secondary, fontSize: 9, fontWeight: '600',
                            fontFamily: T.fonts.body.semibold,
                        }}>
                            DIGITAL TWIN {data.modelVersion}
                        </Text>
                    </View>
                </View>

                <Text style={{
                    color: T.color.text.primary, fontSize: compact ? 20 : 24, fontWeight: '900',
                    letterSpacing: -0.5, fontFamily: T.fonts.display.black,
                }}>
                    {data.fullName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    {data.position && (
                        <View style={{
                            backgroundColor: T.color.signature.dim, borderRadius: 6,
                            paddingHorizontal: 8, paddingVertical: 2, marginRight: 8,
                        }}>
                            <Text style={{
                                color: T.color.signature.primary, fontSize: 11, fontWeight: 'bold',
                                fontFamily: T.fonts.display.bold,
                            }}>
                                {data.position}
                            </Text>
                        </View>
                    )}
                    <Text style={{
                        color: T.color.text.secondary, fontSize: 11, fontFamily: T.fonts.body.regular,
                    }}>
                        @{data.username} Ã‚Â· {data.sessionCount} sessions
                    </Text>
                </View>
            </View>

            {/* Overall Rating + Play Style */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingVertical: compact ? 14 : 18, ...T.glass.light,
            }}>
                <Animated.View style={[{
                    width: compact ? 70 : 85, height: compact ? 70 : 85,
                    borderRadius: compact ? 35 : 42.5,
                    backgroundColor: T.color.background.tertiary,
                    justifyContent: 'center', alignItems: 'center',
                    ...T.glow(ratingColor, 0.4),
                    borderWidth: 2, borderColor: `${ratingColor}40`,
                }, shimmerStyle]}>
                    <Text style={{
                        color: ratingColor, fontSize: compact ? 28 : 34, fontWeight: '900',
                        fontFamily: T.fonts.display.black,
                    }}>
                        {data.overallRating}
                    </Text>
                    <Text style={{
                        color: T.color.text.secondary, fontSize: 8, fontWeight: '700',
                        fontFamily: T.fonts.display.bold,
                    }}>
                        OVERALL
                    </Text>
                </Animated.View>

                <View style={{ marginLeft: 18, flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 20 }}>
                            {STYLE_EMOJIS[data.playStyle] ?? 'Ã°Å¸Ââ‚¬'}
                        </Text>
                        <Text style={{
                            color: T.color.text.primary, fontSize: 16, fontWeight: '800', marginLeft: 6,
                            fontFamily: T.fonts.display.bold,
                        }}>
                            {data.playStyleLabel}
                        </Text>
                    </View>
                    <Text style={{
                        color: T.color.text.secondary, fontSize: 10, lineHeight: 14,
                        fontFamily: T.fonts.body.regular,
                    }} numberOfLines={2}>
                        {data.playStyleDescription}
                    </Text>
                    <Text style={{
                        color: T.color.signature.primary, fontSize: 10, fontWeight: '600', marginTop: 3,
                        fontFamily: T.fonts.body.semibold,
                    }}>
                        Archetype: {data.nbaArchetype}
                    </Text>
                </View>
            </View>

            {/* Key Attributes Grid */}
            <View style={{
                flexDirection: 'row', flexWrap: 'wrap',
                paddingHorizontal: 12, paddingVertical: 10,
                borderTopWidth: 1, borderTopColor: T.color.border.default,
            }}>
                {data.keyAttributes.map((attr: { name: string; value: number; emoji: string }, i: number) => (
                    <View key={i} style={{
                        width: '50%', flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 5, paddingHorizontal: 6,
                    }}>
                        <Text style={{ fontSize: 12, marginRight: 6 }}>{attr.emoji}</Text>
                        <Text style={{
                            color: T.color.text.secondary, fontSize: 11, flex: 1,
                            fontFamily: T.fonts.body.regular,
                        }} numberOfLines={1}>
                            {attr.name}
                        </Text>
                        <Text style={{
                            color: T.ratingColor(attr.value), fontSize: 13, fontWeight: '800',
                            fontFamily: T.fonts.display.bold,
                        }}>
                            {attr.value}
                        </Text>
                    </View>
                ))}
            </View>

            {/* NBA Comparison */}
            {data.nbaCompPlayer && (
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 8,
                    backgroundColor: T.color.gamification.goldDim,
                    borderTopWidth: 1, borderTopColor: T.color.border.default,
                }}>
                    <Feather name="star" size={14} color={T.color.gamification.gold} />
                    <Text style={{
                        color: T.color.text.secondary, fontSize: 11, marginLeft: 6,
                        fontFamily: T.fonts.body.regular,
                    }}>
                        Comparable to
                    </Text>
                    <Text style={{
                        color: T.color.gamification.gold, fontSize: 12, fontWeight: '800', marginLeft: 4,
                        fontFamily: T.fonts.display.bold,
                    }}>
                        {data.nbaCompPlayer}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={{
                            color: T.color.gamification.gold, fontSize: 11, fontWeight: 'bold',
                            fontFamily: T.fonts.display.bold,
                        }}>
                            {data.nbaCompSimilarity}% match
                        </Text>
                    </View>
                </View>
            )}

            {/* Strengths */}
            {data.strengths.length > 0 && (
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap',
                    paddingHorizontal: 16, paddingVertical: 8,
                    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
                }}>
                    {data.strengths.map((s: string, i: number) => (
                        <View key={i} style={{
                            backgroundColor: T.color.semantic.successDim, borderRadius: 8,
                            paddingHorizontal: 8, paddingVertical: 3,
                            marginRight: 6, marginBottom: 4,
                        }}>
                            <Text style={{
                                color: T.color.semantic.success, fontSize: 10, fontWeight: '600',
                                fontFamily: T.fonts.body.semibold,
                            }}>
                                {s}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Mental Row */}
            <View style={{
                flexDirection: 'row', justifyContent: 'space-around',
                paddingVertical: 10, paddingHorizontal: 16,
                borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
            }}>
                <MiniStatBadge label="Resilience" value={data.mentalResilience} icon="heart" />
                <MiniStatBadge label="Clutch" value={data.clutchFactor} icon="zap" />
                <MiniStatBadge
                    label="Pressure"
                    value={data.pressureResponse === 'thrives' ? 90 : data.pressureResponse === 'neutral' ? 50 : 20}
                    icon={data.pressureResponse === 'thrives' ? 'shield' : data.pressureResponse === 'neutral' ? 'minus-circle' : 'alert-triangle'}
                />
            </View>

            {/* Footer */}
            <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 10,
                backgroundColor: 'rgba(0,212,255,0.04)',
                borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
            }}>
                <Text style={{
                    color: T.color.text.secondary, fontSize: 9, fontFamily: T.fonts.body.regular,
                }}>
                    courtvision.ai Ã‚Â· Create your own Twin
                </Text>
                <Text style={{
                    color: T.color.signature.primary, fontSize: 9, fontWeight: '700',
                    fontFamily: T.fonts.display.bold,
                }}>
                    TWIN CARD
                </Text>
            </View>
        </View>
    )
}

function MiniStatBadge({ label, value, icon }: { label: string; value: number; icon: string }) {
    const color = value >= 80 ? T.color.semantic.success : value >= 50 ? T.color.signature.primary : T.color.semantic.warning
    return (
        <View style={{ alignItems: 'center' }}>
            <Feather name={icon as any} size={14} color={color} />
            <Text style={{
                color, fontSize: 14, fontWeight: '800', marginTop: 2,
                fontFamily: T.fonts.display.bold,
            }}>
                {value}
            </Text>
            <Text style={{
                color: T.color.text.secondary, fontSize: 9, fontFamily: T.fonts.body.regular,
            }}>
                {label}
            </Text>
        </View>
    )
}

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

export function ShareModal({ visible, onClose, onShare, sharing, cardData, shareType }: ShareModalProps) {
    const slide = useSharedValue(300)
    const fade  = useSharedValue(0)

    useEffect(() => {
        if (visible) {
            fade.value = withTiming(1, { duration: 250 })
            slide.value = withSpring(0, { damping: 15, stiffness: 120 })
        } else {
            slide.value = 300
            fade.value = 0
        }
    }, [visible])

    const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }))
    const sheetStyle    = useAnimatedStyle(() => ({ transform: [{ translateY: slide.value }] }))

    const shareTitle: Record<string, string> = {
        twin_card: 'Share Twin Card',
        session_recap: 'Share Session Recap',
        badge: 'Share Badge',
        highlight_reel: 'Share Highlights',
    }

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[{
                flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
            }, backdropStyle]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
                <Animated.View style={[{
                    backgroundColor: T.color.background.tertiary,
                    borderTopLeftRadius: 24, borderTopRightRadius: 24,
                    padding: 24, paddingBottom: 40,
                }, sheetStyle]}>
                    <View style={{
                        width: 40, height: 4, backgroundColor: T.color.border.default,
                        borderRadius: 2, alignSelf: 'center', marginBottom: 20,
                    }} />

                    <Text style={{
                        color: T.color.text.primary, fontSize: 20, fontWeight: '800', marginBottom: 6,
                        fontFamily: T.fonts.display.black,
                    }}>
                        {shareTitle[shareType]}
                    </Text>
                    <Text style={{
                        color: T.color.text.secondary, fontSize: 13, marginBottom: 20,
                        fontFamily: T.fonts.body.regular,
                    }}>
                        Pick a platform Ã¢â‚¬â€ we'll optimize the format for you
                    </Text>

                    {cardData && shareType === 'twin_card' && (
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <TwinCard data={cardData} compact />
                        </View>
                    )}

                    {/* Platform buttons */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
                        {(['instagram', 'tiktok', 'twitter', 'generic'] as SharePlatform[]).map((platform, i) => {
                            const info = PLATFORM_CONFIG[platform]
                            return (
                                <Animated.View key={platform} entering={FadeInUp.duration(300).delay(i * 60)}>
                                    <TouchableOpacity
                                        onPress={() => onShare(platform)}
                                        disabled={sharing}
                                        style={{ alignItems: 'center', opacity: sharing ? 0.5 : 1 }}
                                    >
                                        <View style={{
                                            width: 56, height: 56, borderRadius: 16,
                                            backgroundColor: `${info.color}20`,
                                            justifyContent: 'center', alignItems: 'center',
                                            borderWidth: 1, borderColor: `${info.color}40`,
                                        }}>
                                            {sharing ? (
                                                <ActivityIndicator size="small" color={info.color} />
                                            ) : (
                                                <Feather name={info.icon as any} size={24} color={info.color} />
                                            )}
                                        </View>
                                        <Text style={{
                                            color: T.color.text.secondary, fontSize: 11, marginTop: 6, fontWeight: '500',
                                            fontFamily: T.fonts.body.medium,
                                        }}>
                                            {info.label}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )
                        })}
                    </View>

                    {/* XP bonus */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: T.color.gamification.purpleDim, borderRadius: 10, padding: 10,
                    }}>
                        <Feather name="zap" size={12} color={T.color.gamification.purple} style={{ marginRight: 6 }} />
                        <Text style={{
                            color: T.color.gamification.purple, fontSize: 12,
                            fontFamily: T.fonts.body.medium,
                        }}>
                            +10 XP bonus for each share
                        </Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    )
}

// ==========================================
// Share Button (inline toolbar)
// ==========================================

interface ShareButtonProps {
    onPress: () => void
    label?: string
    compact?: boolean
    disabled?: boolean
}

export function ShareButton({ onPress, label = 'Share', compact, disabled }: ShareButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: 'rgba(0,212,255,0.12)',
                borderRadius: compact ? 8 : 12,
                paddingHorizontal: compact ? 10 : 14,
                paddingVertical: compact ? 6 : 10,
                borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <Feather name="share-2" size={compact ? 14 : 16} color={T.color.signature.primary} />
            {!compact && (
                <Text style={{
                    color: T.color.signature.primary, fontSize: 13, fontWeight: '600', marginLeft: 6,
                    fontFamily: T.fonts.body.semibold,
                }}>
                    {label}
                </Text>
            )}
        </TouchableOpacity>
    )
}
