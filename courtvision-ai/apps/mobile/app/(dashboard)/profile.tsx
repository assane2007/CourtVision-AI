/**
 * CourtVision AI — Profile V4 REDESIGN
 * "My Profile" — Apple Settings × NBA 2K MyPlayer × Whoop Profile
 *
 * Design rules: T.* tokens, typePresets, glass V4, 4pt grid, 44px touch targets
 */

import {
    View, Text, ScrollView, TouchableOpacity,
    Alert, TextInput, Modal, Pressable, Switch, Share, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'expo-router'
import Animated, {
    FadeInDown, FadeInRight, ZoomIn,
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated'
import { useStore, selectXP, xpToLevel, xpToNextLevel } from '../../lib/store'
import { XPLevelBar } from '../../components/XPBadge'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { toast } from '../../lib/toast'
import { apiFetch } from '../../lib/api'
import { T, typePresets } from '../../lib/theme'

const type = typePresets
const glass = (T as any).glass

// ==========================================
// Constants
// ==========================================
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']
const POSITION_LABELS: Record<string, string> = {
    PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward',
    PF: 'Power Forward', C: 'Center',
}
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro', 'Elite']

const EARNED_BADGES = [
    { emoji: '🎯', name: 'Sniper',        rarity: 'epic',      xp: 500,  desc: 'FG% > 60% over 5 sessions' },
    { emoji: '🔥', name: '7-Day Streak',  rarity: 'rare',      xp: 200,  desc: '7 consecutive days' },
    { emoji: '🧠', name: 'Mental Pro',    rarity: 'legendary', xp: 1000, desc: 'Mental score > 90' },
    { emoji: '⚡', name: 'Quick Release', rarity: 'rare',      xp: 300,  desc: 'Release speed top 5%' },
    { emoji: '🛡️', name: 'Lock Down',     rarity: 'common',    xp: 100,  desc: 'Defender of the week' },
    { emoji: '🏆', name: 'First Win',     rarity: 'common',    xp: 50,   desc: 'First challenge won' },
    { emoji: '💎', name: 'Elite',         rarity: 'legendary', xp: 2000, desc: 'Reach 90+ overall' },
]

const RARITY_COLORS: Record<string, string> = {
    common: T.color.text.secondary, rare: T.color.semantic.info,
    epic: T.color.gamification.purple, legendary: T.color.signature.primary,
}

const RECENT_ACTIVITY = [
    { icon: 'film' as const,        text: 'Session analyzed · Mental 91',  time: '2h ago',    color: T.color.signature.primary },
    { icon: 'zap' as const,         text: '7-day streak reached!',         time: 'Yesterday', color: T.color.semantic.warning },
    { icon: 'arrow-up' as const,    text: 'Level 8 unlocked · +200 XP',   time: 'Yesterday', color: T.color.semantic.success },
    { icon: 'target' as const,      text: 'Sniper Badge earned',           time: '3d ago',    color: T.color.gamification.purple },
    { icon: 'award' as const,       text: 'Top 10 weekly leaderboard',     time: '5d ago',    color: T.color.gamification.gold },
]

// ==========================================
// Animated Stat Tile V4
// ==========================================
function StatTile({ label, value, sub, color, delay }: {
    label: string; value: string; sub: string; color?: string; delay: number
}) {
    return (
        <Animated.View
            entering={ZoomIn.delay(delay).duration(400).springify()}
            style={{
                flex: 1, borderRadius: T.borderRadius.xl, padding: T.spacing[3], alignItems: 'center',
                ...(glass.regular ?? T.glass.light),
                borderColor: color ? `${color}30` : T.color.border.default,
                ...(color ? T.glow(color, 0.1) : {}),
            }}
        >
            <Text style={{ ...type.smallStat, color: color ?? T.color.text.primary, fontSize: 20 }}>{value}</Text>
            <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: 3, textAlign: 'center', fontSize: 11 }}>{label}</Text>
            <Text style={{ ...type.overline, color: T.color.text.tertiary, marginTop: 1, fontSize: 9 }}>{sub}</Text>
        </Animated.View>
    )
}

// ==========================================
// Player Avatar with Initials V4
// ==========================================
function PlayerAvatar({ name, size = 72, onPress }: { name: string; size?: number; onPress?: () => void }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
    const pulse = useSharedValue(1)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            ), -1,
        )
    }, [])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Animated.View style={[{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: T.color.signature.dim,
                borderWidth: 3, borderColor: T.color.signature.primary,
                justifyContent: 'center', alignItems: 'center',
                ...T.glow(T.color.signature.primary, 0.3),
            }, pulseStyle]}>
                <Text style={{ ...type.sectionTitle, color: T.color.text.primary, fontSize: size * 0.3 }}>
                    {initials.length >= 2 ? initials : '?'}
                </Text>
            </Animated.View>
            <View style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: T.color.signature.primary, borderRadius: 12, width: 24, height: 24,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: T.color.background.primary,
            }}>
                <Feather name="camera" size={12} color="#fff" />
            </View>
        </TouchableOpacity>
    )
}

// ==========================================
// Edit Profile Modal V4
// ==========================================
function EditProfileModal({ visible, user, onClose, onSave }: {
    visible: boolean; user: any; onClose: () => void; onSave: (data: any) => void
}) {
    const [fullName, setFullName] = useState(user?.full_name ?? '')
    const [username, setUsername] = useState(user?.username ?? '')
    const [position, setPosition] = useState(user?.position ?? 'PG')
    const [level, setLevel] = useState(user?.level ?? 'Intermediate')
    const [bio, setBio] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (visible) {
            setFullName(user?.full_name ?? '')
            setUsername(user?.username ?? '')
            setPosition(user?.position ?? 'PG')
            setLevel(user?.level ?? 'Intermediate')
            setBio('')
        }
    }, [visible, user])

    const handleSave = async () => {
        if (!fullName.trim()) { toast.error('Required', 'Enter your name'); return }
        setSaving(true)
        try {
            await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({ full_name: fullName, username, position, level, bio }),
            })
            onSave({ full_name: fullName, username, position, level, bio })
            toast.success('Profile updated!', 'Your info has been saved')
            onClose()
        } catch {
            toast.error('Save error', 'Try again in a moment')
        } finally { setSaving(false) }
    }

    const inputStyle = {
        ...(glass.regular ?? T.glass.light),
        color: T.color.text.primary,
        borderRadius: T.borderRadius.lg,
        paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[3],
        fontSize: 15, fontFamily: T.fonts.body.regular,
        marginBottom: T.spacing[3],
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }} onPress={onClose}>
                <Pressable onPress={() => {}}>
                    <View style={{
                        backgroundColor: T.color.background.secondary,
                        borderTopLeftRadius: T.borderRadius['2xl'], borderTopRightRadius: T.borderRadius['2xl'],
                        padding: T.spacing[6], paddingBottom: T.spacing[10],
                        borderWidth: 1, borderColor: T.color.border.default, borderBottomWidth: 0,
                    }}>
                        <View style={{ width: 40, height: 4, backgroundColor: T.color.text.tertiary, borderRadius: 2, alignSelf: 'center', marginBottom: T.spacing[5] }} />
                        <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[5] }}>
                            Edit Profile
                        </Text>

                        <Text style={{ ...type.overline, color: T.color.text.secondary, marginBottom: T.spacing[1] }}>FULL NAME</Text>
                        <TextInput value={fullName} onChangeText={setFullName} style={inputStyle}
                            placeholder="Your full name" placeholderTextColor={T.color.text.tertiary} />

                        <Text style={{ ...type.overline, color: T.color.text.secondary, marginBottom: T.spacing[1] }}>USERNAME</Text>
                        <TextInput value={username} onChangeText={setUsername} style={inputStyle}
                            placeholder="@username" placeholderTextColor={T.color.text.tertiary} autoCapitalize="none" />

                        <Text style={{ ...type.overline, color: T.color.text.secondary, marginBottom: T.spacing[2] }}>POSITION</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: T.spacing[3] }}>
                            {POSITIONS.map(p => (
                                <TouchableOpacity key={p} onPress={() => setPosition(p)} style={{
                                    paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[2],
                                    borderRadius: T.borderRadius.full, minHeight: 44, justifyContent: 'center',
                                    backgroundColor: position === p ? T.color.signature.primary : 'transparent',
                                    ...(position !== p ? (glass.regular ?? T.glass.light) : {}), marginRight: T.spacing[2],
                                }}>
                                    <Text style={{ ...type.cardTitle, color: position === p ? '#fff' : T.color.text.secondary, fontSize: 14 }}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={{ ...type.overline, color: T.color.text.secondary, marginBottom: T.spacing[2] }}>LEVEL</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: T.spacing[3] }}>
                            {LEVELS.map(l => (
                                <TouchableOpacity key={l} onPress={() => setLevel(l)} style={{
                                    paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[2],
                                    borderRadius: T.borderRadius.full, minHeight: 44, justifyContent: 'center',
                                    backgroundColor: level === l ? T.color.semantic.success : 'transparent',
                                    ...(level !== l ? (glass.regular ?? T.glass.light) : {}), marginRight: T.spacing[2],
                                }}>
                                    <Text style={{ ...type.bodySemibold, color: level === l ? '#fff' : T.color.text.secondary, fontSize: 13 }}>{l}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={{ ...type.overline, color: T.color.text.secondary, marginBottom: T.spacing[1] }}>BIO</Text>
                        <TextInput value={bio} onChangeText={setBio} style={{
                            ...inputStyle, minHeight: 70, textAlignVertical: 'top',
                        }} placeholder="Tell us about you..." placeholderTextColor={T.color.text.tertiary} multiline maxLength={150} />

                        <TouchableOpacity style={{
                            backgroundColor: T.color.signature.primary, borderRadius: T.borderRadius.lg,
                            paddingVertical: T.spacing[4], alignItems: 'center', opacity: saving ? 0.7 : 1,
                            ...T.glow(T.color.signature.primary, 0.2), minHeight: 52,
                        }} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                            <Text style={{ ...type.cardTitle, color: '#fff' }}>{saving ? 'Saving...' : 'Save'}</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

// ==========================================
// Menu Item Row V4
// ==========================================
function MenuItem({ icon, color, label, sub, onPress, rightEl }: {
    icon: keyof typeof Feather.glyphMap; color: string; label: string; sub?: string;
    onPress?: () => void; rightEl?: React.ReactNode
}) {
    return (
        <TouchableOpacity style={{
            ...(glass.regular ?? T.glass.light),
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', padding: T.spacing[4],
            borderRadius: T.borderRadius.xl, marginBottom: T.spacing[2],
            minHeight: 56,
        }} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                    width: 40, height: 40, borderRadius: T.borderRadius.md,
                    backgroundColor: `${color}15`,
                    justifyContent: 'center', alignItems: 'center', marginRight: T.spacing[3],
                }}>
                    <Feather name={icon} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ ...type.bodySemibold, color: T.color.text.primary, fontSize: 14 }}>{label}</Text>
                    {sub && <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: 2, fontSize: 11 }}>{sub}</Text>}
                </View>
            </View>
            {rightEl ?? <Feather name="chevron-right" size={16} color={T.color.text.tertiary} />}
        </TouchableOpacity>
    )
}

// ==========================================
// Main Profile Screen V4
// ==========================================
export default function Profile() {
    const router        = useRouter()
    const user          = useStore(s => s.user)
    const userLoading   = useStore(s => s.userLoading)
    const loadProfile   = useStore(s => s.loadProfile)
    const logout        = useStore(s => s.logout)
    const updateUser    = useStore(s => s.updateUser)
    const sessions      = useStore(s => s.sessions)
    const loadSessions  = useStore(s => s.loadSessions)
    const xp            = useStore(selectXP)
    const [editVisible, setEditVisible] = useState(false)
    const [notifEnabled, setNotifEnabled] = useState(true)
    const [publicProfile, setPublicProfile] = useState(true)
    const [showBadgeDetail, setShowBadgeDetail] = useState<typeof EARNED_BADGES[0] | null>(null)

    useEffect(() => {
        if (!user) loadProfile()
        if (sessions.length === 0) loadSessions()
    }, [])

    const displayName   = user?.full_name ?? user?.username ?? 'Player'
    const displayPos    = POSITION_LABELS[user?.position ?? 'PG'] ?? user?.position ?? 'Point Guard'
    const level         = xpToLevel(xp)
    const overallRating = user?.level === 'Elite' ? 93 : user?.level === 'Pro' ? 88 : 78
    const mentalAvg     = user?.mental_score    ?? 81
    const shootingFgPct = user?.shooting_fg_pct ?? 62
    const sessionCount  = user?.total_sessions  ?? sessions.length
    const streak        = user?.streak          ?? 0

    const SEASON_STATS = [
        { label: 'Sessions',  value: String(sessionCount), sub: 'analyzed',     color: T.color.semantic.info },
        { label: 'Mental',    value: String(mentalAvg),    sub: '/ 100',        color: T.color.signature.primary },
        { label: 'FG%',       value: `${shootingFgPct}%`,  sub: 'season',       color: T.color.semantic.success },
        { label: 'Overall',   value: String(overallRating), sub: 'Digital Twin', color: T.color.semantic.warning },
    ]

    const handleProfileSave = useCallback((data: any) => { updateUser(data) }, [updateUser])

    const handleLogout = useCallback(() => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/') } },
        ])
    }, [logout, router])

    const handleShare = useCallback(async () => {
        try {
            await Share.share({
                title: `${displayName} on CourtVision AI`,
                message: `Join CourtVision AI and analyze your basketball game with AI! My overall: ${overallRating}`,
                url: 'https://courtvision.ai',
            })
        } catch {}
    }, [displayName, overallRating])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            <ScrollView
                contentContainerStyle={{ padding: T.spacing[5], paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(500)} style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: T.spacing[5],
                }}>
                    <View>
                        <Text style={{ ...type.screenTitle, color: T.color.text.primary }}>My Profile</Text>
                        <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[1] }}>
                            Level {level} · {xp.toLocaleString()} XP
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleShare} style={{
                        ...(glass.regular ?? T.glass.light), borderRadius: T.borderRadius.md,
                        width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
                    }} accessibilityLabel="Share profile" accessibilityRole="button">
                        <Feather name="share-2" size={18} color={T.color.text.primary} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Player Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{
                    ...(glass.regular ?? T.glass.light), borderRadius: T.borderRadius['2xl'], padding: T.spacing[5],
                    borderColor: T.color.border.accent, borderWidth: 1,
                    marginBottom: T.spacing[5],
                    ...T.glow(T.color.signature.primary, 0.06),
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.spacing[4] }}>
                        <PlayerAvatar name={displayName} size={76} onPress={() => toast.info('Profile photo', 'Coming soon')} />
                        <View style={{ flex: 1, marginLeft: T.spacing[4] }}>
                            {userLoading ? (
                                <View style={{ gap: 8 }}>
                                    <SkeletonLoader height={20} width="70%" />
                                    <SkeletonLoader height={13} width="50%" />
                                    <SkeletonLoader height={11} width="40%" />
                                </View>
                            ) : (
                                <>
                                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary }}>{displayName}</Text>
                                    <Text style={{ ...type.bodySemibold, color: T.color.signature.primary, marginTop: 3, fontSize: 13 }}>{displayPos}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: T.spacing[2], gap: T.spacing[2] }}>
                                        <View style={{
                                            backgroundColor: T.color.semantic.warningDim, borderRadius: T.borderRadius.sm,
                                            paddingHorizontal: T.spacing[2], paddingVertical: 3,
                                            flexDirection: 'row', alignItems: 'center', gap: 3,
                                        }}>
                                            <Feather name="star" size={10} color={T.color.semantic.warning} />
                                            <Text style={{ ...type.overline, color: T.color.semantic.warning, fontSize: 10 }}>
                                                {user?.level ?? 'Intermediate'}
                                            </Text>
                                        </View>
                                        {streak > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                <Text style={{ fontSize: 12 }}>🔥</Text>
                                                <Text style={{ ...type.overline, color: T.color.signature.primary, fontSize: 10 }}>{streak}d</Text>
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}
                        </View>
                        {/* Overall badge */}
                        <View style={{
                            ...T.glass.accent, borderRadius: T.borderRadius.xl,
                            paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[2], alignItems: 'center',
                            borderWidth: 2, borderColor: T.color.border.accent,
                            ...T.glow(T.color.signature.primary, 0.2),
                        }}>
                            <Text style={{ ...type.bigStat, color: T.color.signature.primary, fontSize: 28 }}>{overallRating}</Text>
                            <Text style={{ ...type.overline, color: T.color.signature.primary, fontSize: 9 }}>OVR</Text>
                        </View>
                    </View>

                    <View style={{ marginBottom: T.spacing[4] }}><XPLevelBar xp={xp} compact /></View>

                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingTop: T.spacing[3], borderTopWidth: 1, borderTopColor: T.color.border.subtle,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2] }}>
                            <View style={{
                                backgroundColor: T.color.semantic.warningDim, borderRadius: T.borderRadius.sm,
                                paddingHorizontal: T.spacing[2], paddingVertical: 3,
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                            }}>
                                <Feather name="award" size={12} color={T.color.semantic.warning} />
                                <Text style={{ ...type.overline, color: T.color.semantic.warning, fontSize: 9 }}>COACH</Text>
                            </View>
                            <Text style={{ ...type.caption, color: T.color.text.tertiary, fontSize: 11 }}>Active · Free Beta</Text>
                        </View>
                        <TouchableOpacity style={{
                            ...T.glass.accent, paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[2],
                            borderRadius: T.borderRadius.md, flexDirection: 'row', alignItems: 'center', gap: T.spacing[1],
                            minHeight: 44,
                        }} onPress={() => setEditVisible(true)} accessibilityRole="button">
                            <Feather name="edit-2" size={13} color={T.color.signature.primary} />
                            <Text style={{ ...type.bodySemibold, color: T.color.signature.primary, fontSize: 13 }}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Season Stats */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[3], fontSize: 18 }}>
                        Season Stats
                    </Text>
                </Animated.View>
                <View style={{ flexDirection: 'row', gap: T.spacing[2], marginBottom: T.spacing[6] }}>
                    {SEASON_STATS.map((s, i) => <StatTile key={s.label} {...s} delay={200 + i * 80} />)}
                </View>

                {/* Badges */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.spacing[3],
                }}>
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, fontSize: 18 }}>
                        Badges ({EARNED_BADGES.length})
                    </Text>
                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ ...type.bodySemibold, color: T.color.signature.primary, fontSize: 13 }}>See all</Text>
                    </TouchableOpacity>
                </Animated.View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: T.spacing[6], marginHorizontal: -4 }}>
                    {EARNED_BADGES.map((badge, idx) => (
                        <Animated.View key={badge.name} entering={FadeInRight.delay(400 + idx * 60).duration(300)}>
                            <TouchableOpacity onPress={() => setShowBadgeDetail(badge)}
                                style={{
                                    ...(glass.regular ?? T.glass.light),
                                    borderRadius: T.borderRadius.xl, padding: T.spacing[3],
                                    marginHorizontal: 4, width: 88, alignItems: 'center',
                                    borderColor: RARITY_COLORS[badge.rarity] ? `${RARITY_COLORS[badge.rarity]}30` : T.color.border.default,
                                    ...(RARITY_COLORS[badge.rarity] ? T.glow(RARITY_COLORS[badge.rarity], 0.08) : {}),
                                }}
                                activeOpacity={0.75}
                            >
                                <Text style={{ fontSize: 28, marginBottom: T.spacing[1] }}>{badge.emoji}</Text>
                                <Text style={{ ...type.overline, color: RARITY_COLORS[badge.rarity] ?? T.color.text.secondary, fontSize: 9, textAlign: 'center' }}>
                                    {badge.name}
                                </Text>
                                <Text style={{ ...type.overline, color: T.color.text.tertiary, fontSize: 8, marginTop: 2 }}>
                                    +{badge.xp} XP
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>

                {/* Recent Activity */}
                <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[3], fontSize: 18 }}>
                        Recent Activity
                    </Text>
                </Animated.View>
                <View style={{ marginBottom: T.spacing[6], gap: T.spacing[2] }}>
                    {RECENT_ACTIVITY.map((item, idx) => (
                        <Animated.View key={idx} entering={FadeInDown.delay(550 + idx * 60).duration(300)}
                            style={{
                                ...(glass.regular ?? T.glass.light),
                                flexDirection: 'row', alignItems: 'center',
                                borderRadius: T.borderRadius.lg, padding: T.spacing[3],
                                borderLeftWidth: 3, borderLeftColor: item.color,
                            }}
                        >
                            <View style={{
                                width: 36, height: 36, borderRadius: T.borderRadius.md,
                                backgroundColor: `${item.color}15`,
                                justifyContent: 'center', alignItems: 'center', marginRight: T.spacing[3],
                            }}>
                                <Feather name={item.icon} size={16} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ ...type.bodySemibold, color: T.color.text.primary, fontSize: 13 }}>{item.text}</Text>
                            </View>
                            <Text style={{ ...type.caption, color: T.color.text.tertiary, fontSize: 11 }}>{item.time}</Text>
                        </Animated.View>
                    ))}
                </View>

                {/* Settings */}
                <Animated.View entering={FadeInDown.delay(700).duration(400)}>
                    <Text style={{ ...type.sectionTitle, color: T.color.text.primary, marginBottom: T.spacing[3], fontSize: 18 }}>
                        Settings
                    </Text>
                </Animated.View>
                <View style={{ marginBottom: T.spacing[6], gap: T.spacing[1] }}>
                    <MenuItem icon="bell" color={T.color.semantic.info} label="Notifications" sub="Push reminders"
                        rightEl={<Switch value={notifEnabled} onValueChange={setNotifEnabled}
                            trackColor={{ false: T.color.text.tertiary, true: T.color.signature.primary }}
                            thumbColor="#fff" />} />
                    <MenuItem icon="globe" color={T.color.semantic.success} label="Public Profile" sub="Visible on leaderboard"
                        rightEl={<Switch value={publicProfile} onValueChange={setPublicProfile}
                            trackColor={{ false: T.color.text.tertiary, true: T.color.semantic.success }}
                            thumbColor="#fff" />} />
                    <MenuItem icon="shield" color={T.color.gamification.purple} label="Privacy" sub="Data & permissions"
                        onPress={() => toast.info('Privacy', 'Coming soon')} />
                    <MenuItem icon="help-circle" color={T.color.semantic.warning} label="Help & Support" sub="FAQ, contact us"
                        onPress={() => toast.info('Support', 'Coming soon')} />
                    <MenuItem icon="info" color={T.color.text.secondary} label="About" sub="v1.0.0 · Beta"
                        onPress={() => toast.info('About', 'CourtVision AI v1.0.0')} />
                </View>

                {/* Logout */}
                <Animated.View entering={FadeInDown.delay(800).duration(400)}>
                    <TouchableOpacity style={{
                        ...(glass.regular ?? T.glass.light),
                        borderRadius: T.borderRadius.xl, padding: T.spacing[4],
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        borderColor: `${T.color.semantic.error}30`, minHeight: 52,
                        ...T.glow(T.color.semantic.error, 0.06),
                    }} onPress={handleLogout} activeOpacity={0.75}>
                        <Feather name="log-out" size={18} color={T.color.semantic.error} />
                        <Text style={{ ...type.bodySemibold, color: T.color.semantic.error, marginLeft: T.spacing[2] }}>Log Out</Text>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>

            {/* Edit Profile Modal */}
            <EditProfileModal
                visible={editVisible}
                user={user}
                onClose={() => setEditVisible(false)}
                onSave={handleProfileSave}
            />

            {/* Badge Detail Modal */}
            <Modal visible={!!showBadgeDetail} transparent animationType="fade" onRequestClose={() => setShowBadgeDetail(null)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: T.spacing[8] }}
                    onPress={() => setShowBadgeDetail(null)}>
                    <Pressable onPress={() => {}}>
                        {showBadgeDetail && (
                            <Animated.View entering={ZoomIn.duration(300)} style={{
                                ...(glass.regular ?? T.glass.light),
                                borderRadius: T.borderRadius['2xl'], padding: T.spacing[6],
                                alignItems: 'center', width: 280,
                                borderColor: RARITY_COLORS[showBadgeDetail.rarity] ? `${RARITY_COLORS[showBadgeDetail.rarity]}40` : T.color.border.default,
                                ...T.glow(RARITY_COLORS[showBadgeDetail.rarity] ?? T.color.signature.primary, 0.15),
                            }}>
                                <Text style={{ fontSize: 52, marginBottom: T.spacing[3] }}>{showBadgeDetail.emoji}</Text>
                                <Text style={{ ...type.sectionTitle, color: T.color.text.primary, textAlign: 'center' }}>
                                    {showBadgeDetail.name}
                                </Text>
                                <View style={{
                                    backgroundColor: `${RARITY_COLORS[showBadgeDetail.rarity] ?? T.color.text.secondary}20`,
                                    borderRadius: T.borderRadius.full, paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[1],
                                    marginTop: T.spacing[2],
                                }}>
                                    <Text style={{ ...type.overline, color: RARITY_COLORS[showBadgeDetail.rarity] ?? T.color.text.secondary, fontSize: 10 }}>
                                        {showBadgeDetail.rarity.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={{ ...type.body, color: T.color.text.secondary, textAlign: 'center', marginTop: T.spacing[3] }}>
                                    {showBadgeDetail.desc}
                                </Text>
                                <Text style={{ ...type.bodySemibold, color: T.color.signature.primary, marginTop: T.spacing[3] }}>
                                    +{showBadgeDetail.xp} XP
                                </Text>
                                <TouchableOpacity style={{
                                    marginTop: T.spacing[5], backgroundColor: T.color.signature.primary,
                                    borderRadius: T.borderRadius.lg, paddingHorizontal: T.spacing[6], paddingVertical: T.spacing[3],
                                    minHeight: 44, justifyContent: 'center',
                                }} onPress={() => setShowBadgeDetail(null)} activeOpacity={0.85}>
                                    <Text style={{ ...type.cardTitle, color: '#fff' }}>Close</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

        </SafeAreaView>
    )
}
