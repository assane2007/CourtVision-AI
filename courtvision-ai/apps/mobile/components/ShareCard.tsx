import { View, Text, TouchableOpacity, Animated, ActivityIndicator, Modal, Dimensions } from 'react-native'
import { useRef, useEffect, useState } from 'react'
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import type { TwinCardData, SharePlatform } from '../hooks/useViralShare'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 48
const CARD_HEIGHT = CARD_WIDTH * 1.45

// ==========================================
// Couleurs
// ==========================================
const COLORS = {
    bg: '#0D1117',
    card: '#161B22',
    cardLight: '#1C2333',
    border: '#30363D',
    accent: '#00D4FF',
    accentDim: 'rgba(0,212,255,0.15)',
    green: '#00C853',
    greenDim: 'rgba(0,200,83,0.15)',
    red: '#FF3D57',
    orange: '#FF9800',
    purple: '#B388FF',
    purpleDim: 'rgba(179,136,255,0.15)',
    white: '#E6EDF3',
    muted: '#8B949E',
    gold: '#FFD700',
}

const STYLE_EMOJIS: Record<string, string> = {
    sharpshooter: '🎯', shot_creator: '🪄', slasher: '⚡', playmaker: '🧠',
    two_way: '🛡️', stretch_big: '🏗️', paint_beast: '💥', balanced: '♾️',
}

const PLATFORM_ICONS: Record<SharePlatform, { name: string; color: string; label: string }> = {
    tiktok: { name: 'musical-notes', color: '#EE1D52', label: 'TikTok' },
    instagram: { name: 'logo-instagram', color: '#E4405F', label: 'Instagram' },
    twitter: { name: 'logo-twitter', color: '#1DA1F2', label: 'Twitter/X' },
    generic: { name: 'share-outline', color: COLORS.accent, label: 'Partager' },
}

// ==========================================
// Twin Card Component (la carte exportable)
// ==========================================

interface TwinCardProps {
    data: TwinCardData
    compact?: boolean
}

export function TwinCard({ data, compact }: TwinCardProps) {
    const shimmerAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    const ratingColor = data.overallRating >= 80 ? COLORS.green : data.overallRating >= 60 ? COLORS.accent : data.overallRating >= 40 ? COLORS.orange : COLORS.red

    return (
        <View style={{
            width: compact ? CARD_WIDTH * 0.85 : CARD_WIDTH,
            backgroundColor: '#0A0E14',
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: ratingColor,
            shadowColor: ratingColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 10,
        }}>
            {/* ── Header gradient zone ── */}
            <View style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 14,
                backgroundColor: 'rgba(0,212,255,0.05)',
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.06)',
            }}>
                {/* Top Row: Logo + Badge */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16 }}>🏀</Text>
                        <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '800', marginLeft: 6, letterSpacing: 1 }}>
                            COURTVISION AI
                        </Text>
                    </View>
                    <View style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                    }}>
                        <Text style={{ color: COLORS.muted, fontSize: 9, fontWeight: '600' }}>
                            DIGITAL TWIN {data.modelVersion}
                        </Text>
                    </View>
                </View>

                {/* Player Name + Position */}
                <Text style={{ color: COLORS.white, fontSize: compact ? 20 : 24, fontWeight: '900', letterSpacing: -0.5 }}>
                    {data.fullName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    {data.position && (
                        <View style={{
                            backgroundColor: COLORS.accentDim,
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            marginRight: 8,
                        }}>
                            <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: 'bold' }}>
                                {data.position}
                            </Text>
                        </View>
                    )}
                    <Text style={{ color: COLORS.muted, fontSize: 11 }}>
                        @{data.username} • {data.sessionCount} sessions
                    </Text>
                </View>
            </View>

            {/* ── Overall Rating + Play Style ── */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: compact ? 14 : 18,
                backgroundColor: 'rgba(0,0,0,0.3)',
            }}>
                {/* Rating Circle */}
                <Animated.View style={{
                    width: compact ? 70 : 85,
                    height: compact ? 70 : 85,
                    borderRadius: compact ? 35 : 42.5,
                    backgroundColor: ratingColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: ratingColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 15,
                    opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                }}>
                    <Text style={{ color: '#FFF', fontSize: compact ? 28 : 34, fontWeight: '900' }}>
                        {data.overallRating}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '700' }}>
                        OVERALL
                    </Text>
                </Animated.View>

                {/* Play Style Info */}
                <View style={{ marginLeft: 18, flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 20 }}>
                            {STYLE_EMOJIS[data.playStyle] ?? '🏀'}
                        </Text>
                        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '800', marginLeft: 6 }}>
                            {data.playStyleLabel}
                        </Text>
                    </View>
                    <Text style={{ color: COLORS.muted, fontSize: 10, lineHeight: 14 }} numberOfLines={2}>
                        {data.playStyleDescription}
                    </Text>
                    <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600', marginTop: 3 }}>
                        Archétype : {data.nbaArchetype}
                    </Text>
                </View>
            </View>

            {/* ── Key Attributes Grid ── */}
            <View style={{
                flexDirection: 'row', flexWrap: 'wrap',
                paddingHorizontal: 12, paddingVertical: 10,
                borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
            }}>
                {data.keyAttributes.map((attr: { name: string; value: number; emoji: string }, i: number) => (
                    <View key={i} style={{
                        width: '50%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 5,
                        paddingHorizontal: 6,
                    }}>
                        <Text style={{ fontSize: 12, marginRight: 6 }}>{attr.emoji}</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 11, flex: 1 }} numberOfLines={1}>
                            {attr.name}
                        </Text>
                        <Text style={{
                            color: attr.value >= 80 ? COLORS.green : attr.value >= 60 ? COLORS.accent : COLORS.orange,
                            fontSize: 13,
                            fontWeight: '800',
                        }}>
                            {attr.value}
                        </Text>
                    </View>
                ))}
            </View>

            {/* ── NBA Comparison ── */}
            {data.nbaCompPlayer && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: 'rgba(255,215,0,0.06)',
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.04)',
                }}>
                    <Text style={{ fontSize: 14 }}>🏀</Text>
                    <Text style={{ color: COLORS.muted, fontSize: 11, marginLeft: 6 }}>
                        Comparable à
                    </Text>
                    <Text style={{ color: COLORS.gold, fontSize: 12, fontWeight: '800', marginLeft: 4 }}>
                        {data.nbaCompPlayer}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={{ color: COLORS.gold, fontSize: 11, fontWeight: 'bold' }}>
                            {data.nbaCompSimilarity}% match
                        </Text>
                    </View>
                </View>
            )}

            {/* ── Strengths ── */}
            {data.strengths.length > 0 && (
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap',
                    paddingHorizontal: 16, paddingVertical: 8,
                    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
                }}>
                    {data.strengths.map((s: string, i: number) => (
                        <View key={i} style={{
                            backgroundColor: COLORS.greenDim,
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            marginRight: 6,
                            marginBottom: 4,
                        }}>
                            <Text style={{ color: COLORS.green, fontSize: 10, fontWeight: '600' }}>
                                💪 {s}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* ── Mental Row ── */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.04)',
            }}>
                <MiniStatBadge label="Résilience" value={data.mentalResilience} emoji="🧠" />
                <MiniStatBadge label="Clutch" value={data.clutchFactor} emoji="🔥" />
                <MiniStatBadge
                    label="Pression"
                    value={data.pressureResponse === 'thrives' ? 90 : data.pressureResponse === 'neutral' ? 50 : 20}
                    emoji={data.pressureResponse === 'thrives' ? '🧊' : data.pressureResponse === 'neutral' ? '😐' : '😰'}
                />
            </View>

            {/* ── Footer ── */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: 'rgba(0,212,255,0.04)',
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.06)',
            }}>
                <Text style={{ color: COLORS.muted, fontSize: 9 }}>
                    courtvision.ai • Crée ton propre Twin
                </Text>
                <Text style={{ color: COLORS.accent, fontSize: 9, fontWeight: '700' }}>
                    🏀 TWIN CARD
                </Text>
            </View>
        </View>
    )
}

function MiniStatBadge({ label, value, emoji }: { label: string; value: number; emoji: string }) {
    const color = value >= 80 ? COLORS.green : value >= 50 ? COLORS.accent : COLORS.orange
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14 }}>{emoji}</Text>
            <Text style={{ color, fontSize: 14, fontWeight: '800', marginTop: 2 }}>{value}</Text>
            <Text style={{ color: COLORS.muted, fontSize: 9 }}>{label}</Text>
        </View>
    )
}

// ==========================================
// Share Modal — Sélecteur de plateforme
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
    const slideAnim = useRef(new Animated.Value(300)).current
    const fadeAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 9 }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start()
        } else {
            slideAnim.setValue(300)
            fadeAnim.setValue(0)
        }
    }, [visible])

    const shareTitle = {
        twin_card: '🏀 Partager ta Twin Card',
        session_recap: '📊 Partager le récap',
        badge: '🎖️ Partager le badge',
        highlight_reel: '🎬 Partager les highlights',
    }

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.7)',
                justifyContent: 'flex-end',
                opacity: fadeAnim,
            }}>
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
                <Animated.View style={{
                    backgroundColor: COLORS.card,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    padding: 24,
                    paddingBottom: 40,
                    transform: [{ translateY: slideAnim }],
                }}>
                    {/* Drag indicator */}
                    <View style={{
                        width: 40, height: 4, backgroundColor: COLORS.border,
                        borderRadius: 2, alignSelf: 'center', marginBottom: 20,
                    }} />

                    <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 6 }}>
                        {shareTitle[shareType]}
                    </Text>
                    <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>
                        Choisis ta plateforme, on optimise le format pour toi 🔥
                    </Text>

                    {/* Preview card (mini) */}
                    {cardData && shareType === 'twin_card' && (
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <TwinCard data={cardData} compact />
                        </View>
                    )}

                    {/* Platform buttons */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
                        {(['instagram', 'tiktok', 'twitter', 'generic'] as SharePlatform[]).map(platform => {
                            const info = PLATFORM_ICONS[platform]
                            return (
                                <TouchableOpacity
                                    key={platform}
                                    onPress={() => onShare(platform)}
                                    disabled={sharing}
                                    style={{
                                        alignItems: 'center',
                                        opacity: sharing ? 0.5 : 1,
                                    }}
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
                                            <Ionicons name={info.name as any} size={24} color={info.color} />
                                        )}
                                    </View>
                                    <Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 6, fontWeight: '500' }}>
                                        {info.label}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    {/* XP bonus indicator */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: COLORS.purpleDim,
                        borderRadius: 10,
                        padding: 10,
                    }}>
                        <Text style={{ color: COLORS.purple, fontSize: 12 }}>
                            ✨ +10 XP bonus pour chaque partage
                        </Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    )
}

// ==========================================
// Share Button (inline, pour la toolbar)
// ==========================================

interface ShareButtonProps {
    onPress: () => void
    label?: string
    compact?: boolean
    disabled?: boolean
}

export function ShareButton({ onPress, label = 'Partager', compact, disabled }: ShareButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(0,212,255,0.12)',
                borderRadius: compact ? 8 : 12,
                paddingHorizontal: compact ? 10 : 14,
                paddingVertical: compact ? 6 : 10,
                borderWidth: 1,
                borderColor: 'rgba(0,212,255,0.25)',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <Ionicons name="share-outline" size={compact ? 14 : 16} color={COLORS.accent} />
            {!compact && (
                <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                    {label}
                </Text>
            )}
        </TouchableOpacity>
    )
}
