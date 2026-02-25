import {
    View, Text, ScrollView, TouchableOpacity,
    Alert, TextInput, Modal, Pressable, Switch, Share,
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
import { T } from '../../lib/theme'

// ==========================================
// Constants
// ==========================================
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']
const POSITION_LABELS: Record<string, string> = {
    PG: 'Point Guard (PG)', SG: 'Shooting Guard (SG)', SF: 'Small Forward (SF)',
    PF: 'Power Forward (PF)', C: 'Center (C)',
}
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Pro', 'Elite']

const EARNED_BADGES = [
    { emoji: '', name: 'Sniper',        rarity: 'epic',      xp: 500,  desc: 'FG% > 60% over 5 sessions' },
    { emoji: '', name: '7-Day Streak',  rarity: 'rare',      xp: 200,  desc: '7 consecutive days' },
    { emoji: '', name: 'Mental Pro',    rarity: 'legendary', xp: 1000, desc: 'Mental score > 90' },
    { emoji: '', name: 'Quick Release', rarity: 'rare',      xp: 300,  desc: 'Release speed top 5%' },
    { emoji: '', name: 'Lock Down',     rarity: 'common',    xp: 100,  desc: 'Defender of the week' },
    { emoji: '', name: 'First Win',     rarity: 'common',    xp: 50,   desc: 'First challenge won' },
    { emoji: '', name: 'Elite',         rarity: 'legendary', xp: 2000, desc: 'Reach 90+ overall' },
]

const RARITY_COLORS: Record<string, string> = {
    common: T.colors.muted, rare: T.colors.primary, epic: T.colors.purple, legendary: T.colors.orange,
}

const RECENT_ACTIVITY = [
    { icon: 'film' as const,        text: 'Session analyzed  Mental 91/100', time: '2h ago',    color: T.colors.accent },
    { icon: 'zap' as const,         text: '7-day streak reached!',             time: 'Yesterday', color: T.colors.orange },
    { icon: 'arrow-up' as const,    text: 'Level 8 unlocked  +200 XP',       time: 'Yesterday', color: T.colors.green },
    { icon: 'target' as const,      text: 'Sniper Badge earned',               time: '3d ago',    color: T.colors.purple },
    { icon: 'award' as const,       text: 'Top 10 weekly leaderboard',         time: '5d ago',    color: T.colors.gold },
]

// ==========================================
// Animated Stat Tile
// ==========================================
function StatTile({ label, value, sub, color, delay }: {
    label: string; value: string; sub: string; color?: string; delay: number
}) {
    return (
        <Animated.View
            entering={ZoomIn.delay(delay).duration(400).springify()}
            style={{
                flex: 1, borderRadius: T.radius.lg, padding: 14, alignItems: 'center',
                ...T.glass.light,
                borderColor: color ? `${color}30` : T.colors.border,
                ...(color ? T.glow(color, 0.1) : {}),
            }}
        >
            <Text style={{ color: color ?? T.colors.white, fontSize: T.font.xl, fontWeight: '900', fontFamily: T.fonts.display.black }}>{value}</Text>
            <Text style={{ color: T.colors.muted, fontSize: T.font.xs + 1, fontFamily: T.fonts.body.regular, marginTop: 3, textAlign: 'center' }}>{label}</Text>
            <Text style={{ color: T.colors.dim, fontSize: T.font.xs, marginTop: 1 }}>{sub}</Text>
        </Animated.View>
    )
}

// ==========================================
// Player Avatar with Initials
// ==========================================
function PlayerAvatar({ name, size = 72, onPress }: { name: string; size?: number; onPress?: () => void }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
    const pulse = useSharedValue(1)

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
        )
    }, [])

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Animated.View style={[{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: T.colors.primaryDim,
                borderWidth: 3, borderColor: T.colors.accent,
                justifyContent: 'center', alignItems: 'center',
                ...T.glow(T.colors.accent, 0.35),
            }, pulseStyle]}>
                <Text style={{ fontSize: size * 0.35, fontWeight: '800', color: T.colors.white, fontFamily: T.fonts.display.bold }}>
                    {initials.length >= 2 ? initials : '?'}
                </Text>
            </Animated.View>
            <View style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: T.colors.accent, borderRadius: 12, width: 24, height: 24,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: T.colors.bg,
            }}>
                <Feather name="camera" size={12} color={T.colors.bg} />
            </View>
        </TouchableOpacity>
    )
}

// ==========================================
// Edit Profile Modal
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

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }} onPress={onClose}>
                <Pressable onPress={() => {}}>
                    <View style={{
                        backgroundColor: T.colors.card, borderTopLeftRadius: T.radius.xxl, borderTopRightRadius: T.radius.xxl,
                        padding: 24, paddingBottom: 40,
                        borderWidth: 1, borderColor: T.colors.borderLight, borderBottomWidth: 0,
                    }}>
                        <View style={{ width: 40, height: 4, backgroundColor: T.colors.dim, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                        <Text style={{ color: T.colors.white, fontSize: T.font.xl, fontWeight: '900', marginBottom: 20, fontFamily: T.fonts.display.black }}>
                            Edit Profile
                        </Text>

                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginBottom: 6, letterSpacing: 1 }}>FULL NAME</Text>
                        <TextInput value={fullName} onChangeText={setFullName} style={{
                            ...T.glass.light, color: T.colors.white, borderRadius: T.radius.md,
                            paddingHorizontal: 16, paddingVertical: 12, fontSize: T.font.base, marginBottom: 14,
                        }} placeholder="Your full name" placeholderTextColor={T.colors.dim} />

                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginBottom: 6, letterSpacing: 1 }}>USERNAME</Text>
                        <TextInput value={username} onChangeText={setUsername} style={{
                            ...T.glass.light, color: T.colors.white, borderRadius: T.radius.md,
                            paddingHorizontal: 16, paddingVertical: 12, fontSize: T.font.base, marginBottom: 14,
                        }} placeholder="@username" placeholderTextColor={T.colors.dim} autoCapitalize="none" />

                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginBottom: 8, letterSpacing: 1 }}>POSITION</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {POSITIONS.map(p => (
                                <TouchableOpacity key={p} onPress={() => setPosition(p)} style={{
                                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: T.radius.pill,
                                    backgroundColor: position === p ? T.colors.accent : 'transparent',
                                    ...(position !== p ? T.glass.light : {}), marginRight: 8,
                                }}>
                                    <Text style={{ color: position === p ? T.colors.bg : T.colors.muted, fontWeight: '700', fontSize: T.font.md, fontFamily: T.fonts.display.bold }}>
                                        {p}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginBottom: 8, letterSpacing: 1 }}>LEVEL</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {LEVELS.map(l => (
                                <TouchableOpacity key={l} onPress={() => setLevel(l)} style={{
                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.radius.pill,
                                    backgroundColor: level === l ? T.colors.green : 'transparent',
                                    ...(level !== l ? T.glass.light : {}), marginRight: 8,
                                }}>
                                    <Text style={{ color: level === l ? T.colors.bg : T.colors.muted, fontWeight: '700', fontSize: T.font.sm + 1, fontFamily: T.fonts.body.bold }}>
                                        {l}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm, marginBottom: 6, letterSpacing: 1 }}>BIO</Text>
                        <TextInput value={bio} onChangeText={setBio} style={{
                            ...T.glass.light, color: T.colors.white, borderRadius: T.radius.md,
                            paddingHorizontal: 16, paddingVertical: 12, fontSize: T.font.md + 1,
                            marginBottom: 20, minHeight: 70, textAlignVertical: 'top',
                        }} placeholder="Tell us about you..." placeholderTextColor={T.colors.dim} multiline maxLength={150} />

                        <TouchableOpacity style={{
                            backgroundColor: T.colors.accent, borderRadius: T.radius.lg,
                            paddingVertical: 16, alignItems: 'center', opacity: saving ? 0.7 : 1,
                            ...T.glow(T.colors.accent, 0.2),
                        }} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                            <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: T.font.lg, fontFamily: T.fonts.display.bold }}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

// ==========================================
// Menu Item Row
// ==========================================
function MenuItem({ icon, color, label, sub, onPress, rightEl }: {
    icon: keyof typeof Feather.glyphMap; color: string; label: string; sub?: string;
    onPress?: () => void; rightEl?: React.ReactNode
}) {
    return (
        <TouchableOpacity style={{
            ...T.glass.light, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between', padding: T.space.lg + 2,
            borderRadius: T.radius.lg, marginBottom: 10,
        }} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                    width: 40, height: 40, borderRadius: T.radius.md,
                    backgroundColor: `${color}15`,
                    justifyContent: 'center', alignItems: 'center', marginRight: 14,
                }}>
                    <Feather name={icon} size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.base, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>{label}</Text>
                    {sub && <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginTop: 2 }}>{sub}</Text>}
                </View>
            </View>
            {rightEl ?? <Feather name="chevron-right" size={16} color={T.colors.dim} />}
        </TouchableOpacity>
    )
}

// ==========================================
// Main Profile Screen
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
    const displayPos    = POSITION_LABELS[user?.position ?? 'PG'] ?? user?.position ?? 'Point Guard (PG)'
    const level         = xpToLevel(xp)
    const overallRating = user?.level === 'Elite' ? 93 : user?.level === 'Pro' ? 88 : 78
    const mentalAvg     = user?.mental_score    ?? 81
    const shootingFgPct = user?.shooting_fg_pct ?? 62
    const sessionCount  = user?.total_sessions  ?? sessions.length
    const streak        = user?.streak          ?? 0

    const SEASON_STATS = [
        { label: 'Sessions',  value: String(sessionCount), sub: 'analyzed',     color: T.colors.primary },
        { label: 'Mental',    value: String(mentalAvg),    sub: '/ 100',        color: T.colors.accent },
        { label: 'FG%',       value: `${shootingFgPct}%`,  sub: 'season',       color: T.colors.green },
        { label: 'Overall',   value: String(overallRating), sub: 'Digital Twin', color: T.colors.orange },
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
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            <ScrollView contentContainerStyle={{ padding: T.space.xl, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <Animated.View entering={FadeInDown.duration(500)} style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: T.space.xl,
                }}>
                    <View>
                        <Text style={{ color: T.colors.white, fontSize: T.font.xxl, fontWeight: '900', fontFamily: T.fonts.display.black, letterSpacing: -0.5 }}>
                            My Profile
                        </Text>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md, marginTop: 2 }}>
                            Level {level}  {xp.toLocaleString()} XP
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleShare} style={{
                        ...T.glass.primary, borderRadius: T.radius.md, padding: 10,
                    }}>
                        <Feather name="share-2" size={20} color={T.colors.primaryLight} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Player Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{
                    ...T.glass.medium, borderRadius: T.radius.xxl, padding: 22,
                    borderColor: T.colors.borderAccent,
                    marginBottom: T.space.xl,
                    ...T.glow(T.colors.accent, 0.08),
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: T.space.lg + 2 }}>
                        <PlayerAvatar name={displayName} size={76} onPress={() => toast.info('Profile photo', 'Coming soon')} />
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            {userLoading ? (
                                <View style={{ gap: 8 }}>
                                    <SkeletonLoader height={20} width="70%" />
                                    <SkeletonLoader height={13} width="50%" />
                                    <SkeletonLoader height={11} width="40%" />
                                </View>
                            ) : (
                                <>
                                    <Text style={{ color: T.colors.white, fontSize: T.font.xl + 1, fontWeight: '900', fontFamily: T.fonts.display.black, letterSpacing: -0.3 }}>
                                        {displayName}
                                    </Text>
                                    <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '600', fontFamily: T.fonts.body.semibold, marginTop: 3 }}>
                                        {displayPos}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 }}>
                                        <View style={{
                                            backgroundColor: T.colors.orangeDim, borderRadius: 8,
                                            paddingHorizontal: 7, paddingVertical: 3,
                                            flexDirection: 'row', alignItems: 'center', gap: 3,
                                        }}>
                                            <Feather name="star" size={10} color={T.colors.orange} />
                                            <Text style={{ color: T.colors.orange, fontSize: T.font.sm, fontWeight: '700' }}>
                                                {user?.level ?? 'Intermediate'}
                                            </Text>
                                        </View>
                                        {streak > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                <Feather name="zap" size={12} color={T.colors.orange} />
                                                <Text style={{ color: T.colors.orange, fontSize: T.font.sm, fontWeight: '700' }}>
                                                    {streak}d streak
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}
                        </View>
                        {/* Overall badge */}
                        <View style={{
                            ...T.glass.accent, borderRadius: T.radius.lg,
                            paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center',
                            borderWidth: 2, borderColor: T.colors.borderAccent,
                            ...T.glow(T.colors.accent, 0.25),
                        }}>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.xxl, fontWeight: '900', fontFamily: T.fonts.display.black }}>{overallRating}</Text>
                            <Text style={{ color: T.colors.accent, fontSize: T.font.xs, fontWeight: '800', fontFamily: T.fonts.display.black, letterSpacing: 1 }}>OVR</Text>
                        </View>
                    </View>

                    <View style={{ marginBottom: 16 }}><XPLevelBar xp={xp} compact /></View>

                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', paddingTop: 14,
                        borderTopWidth: 1, borderTopColor: T.colors.border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{
                                backgroundColor: T.colors.orangeDim, borderRadius: 8,
                                paddingHorizontal: 8, paddingVertical: 4,
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                            }}>
                                <Feather name="award" size={12} color={T.colors.orange} />
                                <Text style={{ color: T.colors.orange, fontSize: T.font.sm, fontWeight: '800', fontFamily: T.fonts.display.bold }}>COACH</Text>
                            </View>
                            <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1 }}>Active  Free Beta</Text>
                        </View>
                        <TouchableOpacity style={{
                            ...T.glass.accent, paddingHorizontal: 18, paddingVertical: 8,
                            borderRadius: T.radius.md, flexDirection: 'row', alignItems: 'center', gap: 6,
                        }} onPress={() => setEditVisible(true)} accessibilityRole="button">
                            <Feather name="edit-2" size={13} color={T.colors.accent} />
                            <Text style={{ color: T.colors.accent, fontWeight: '700', fontSize: T.font.md, fontFamily: T.fonts.body.bold }}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Season Stats */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, marginBottom: 12 }}>
                        Season Stats
                    </Text>
                </Animated.View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: T.space.xxl }}>
                    {SEASON_STATS.map((s, i) => <StatTile key={s.label} {...s} delay={200 + i * 80} />)}
                </View>

                {/* Badges */}
                <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
                }}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black }}>
                        Badges ({EARNED_BADGES.length})
                    </Text>
                    <TouchableOpacity>
                        <Text style={{ color: T.colors.accent, fontSize: T.font.md, fontWeight: '600' }}>See all</Text>
                    </TouchableOpacity>
                </Animated.View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: T.space.xxl, marginHorizontal: -4 }}>
                    {EARNED_BADGES.map((badge, idx) => (
                        <Animated.View key={badge.name} entering={FadeInRight.delay(400 + idx * 60).duration(300)}>
                            <TouchableOpacity onPress={() => setShowBadgeDetail(badge)} style={{
                                ...T.glass.light, borderRadius: T.radius.lg,
                                paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 4,
                                alignItems: 'center', minWidth: 90,
                                borderWidth: 1.5, borderColor: RARITY_COLORS[badge.rarity],
                                ...T.glow(RARITY_COLORS[badge.rarity], 0.12),
                            }} activeOpacity={0.8}>
                                <Text style={{ fontSize: 28, marginBottom: 5 }}>{badge.emoji}</Text>
                                <Text style={{ color: RARITY_COLORS[badge.rarity], fontSize: T.font.sm, fontWeight: '700', textAlign: 'center' }}>
                                    {badge.name}
                                </Text>
                                <Text style={{ color: T.colors.dim, fontSize: T.font.xs, marginTop: 2, textTransform: 'capitalize' }}>
                                    {badge.rarity}
                                </Text>
                                <Text style={{ color: T.colors.purple, fontSize: T.font.xs, marginTop: 3, fontWeight: '700' }}>
                                    +{badge.xp} XP
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                    <View style={{
                        ...T.glass.light, borderRadius: T.radius.lg,
                        paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 4,
                        alignItems: 'center', minWidth: 90, opacity: 0.5,
                    }}>
                        <Text style={{ fontSize: 28, marginBottom: 5 }}></Text>
                        <Text style={{ color: T.colors.dim, fontSize: T.font.sm, fontWeight: '600', textAlign: 'center' }}>7 more</Text>
                        <Text style={{ color: T.colors.dim, fontSize: T.font.xs }}>Unlock</Text>
                    </View>
                </ScrollView>

                {/* Recent Activity */}
                <Animated.View entering={FadeInDown.delay(600).duration(400)}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, marginBottom: 12 }}>
                        Recent Activity
                    </Text>
                </Animated.View>
                <View style={{ ...T.glass.light, borderRadius: T.radius.xl, overflow: 'hidden', marginBottom: T.space.xxl }}>
                    {RECENT_ACTIVITY.map((item, i) => (
                        <View key={i} style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 16, paddingVertical: 13,
                            borderBottomWidth: i < RECENT_ACTIVITY.length - 1 ? 1 : 0,
                            borderBottomColor: T.colors.border,
                        }}>
                            <View style={{
                                width: 34, height: 34, borderRadius: T.radius.sm,
                                backgroundColor: `${item.color}12`, justifyContent: 'center', alignItems: 'center', marginRight: 12,
                            }}>
                                <Feather name={item.icon} size={16} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: T.colors.white, fontSize: T.font.md, fontWeight: '600' }}>{item.text}</Text>
                                <Text style={{ color: T.colors.dim, fontSize: T.font.sm, marginTop: 2 }}>{item.time}</Text>
                            </View>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }} />
                        </View>
                    ))}
                </View>

                {/* Account Menu */}
                <Animated.View entering={FadeInDown.delay(700).duration(400)}>
                    <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', fontFamily: T.fonts.display.black, marginBottom: 12 }}>
                        Account
                    </Text>
                </Animated.View>

                <MenuItem icon="file-text" color={T.colors.red} label="Recruitment Sheet" sub="PDF Export  Share with your coaches"
                    onPress={() => toast.info('Recruitment Sheet', 'PDF export generating...')} />
                <MenuItem icon="share-2" color={T.colors.accent} label="Share my Profile" sub="Instagram, TikTok, Twitter"
                    onPress={handleShare} />
                <MenuItem icon="users" color={T.colors.green} label="Invite Friends" sub="+500 XP per friend invited"
                    onPress={() => toast.info('Invite', 'Coming soon')} />
                <MenuItem icon="star" color={T.colors.orange} label="Subscription" sub="Free Beta  Coach plan active"
                    onPress={() => toast.info('Subscription', 'Coming soon')} />

                {/* Switches */}
                <View style={{ ...T.glass.light, borderRadius: T.radius.lg, overflow: 'hidden', marginBottom: 10 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        padding: T.space.lg + 2,
                        borderBottomWidth: 1, borderBottomColor: T.colors.border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: T.radius.md,
                                backgroundColor: T.colors.primaryDim,
                                justifyContent: 'center', alignItems: 'center', marginRight: 14,
                            }}>
                                <Feather name="bell" size={20} color={T.colors.primaryLight} />
                            </View>
                            <View>
                                <Text style={{ color: T.colors.white, fontSize: T.font.base, fontWeight: '600' }}>Push Notifications</Text>
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginTop: 2 }}>Daily challenge & streak reminders</Text>
                            </View>
                        </View>
                        <Switch value={notifEnabled} onValueChange={setNotifEnabled}
                            trackColor={{ false: T.colors.dimmer, true: `${T.colors.accent}50` }}
                            thumbColor={notifEnabled ? T.colors.accent : T.colors.muted} />
                    </View>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        padding: T.space.lg + 2,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: T.radius.md,
                                backgroundColor: T.colors.greenDim,
                                justifyContent: 'center', alignItems: 'center', marginRight: 14,
                            }}>
                                <Feather name="eye" size={20} color={T.colors.green} />
                            </View>
                            <View>
                                <Text style={{ color: T.colors.white, fontSize: T.font.base, fontWeight: '600' }}>Public Profile</Text>
                                <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginTop: 2 }}>Visible in leaderboard</Text>
                            </View>
                        </View>
                        <Switch value={publicProfile} onValueChange={setPublicProfile}
                            trackColor={{ false: T.colors.dimmer, true: `${T.colors.green}50` }}
                            thumbColor={publicProfile ? T.colors.green : T.colors.muted} />
                    </View>
                </View>

                <MenuItem icon="help-circle" color={T.colors.muted} label="Help & Support" sub="FAQ, contact the team"
                    onPress={() => toast.info('Support', 'support@courtvision.ai')} />

                {/* Log Out */}
                <TouchableOpacity style={{
                    backgroundColor: T.colors.redDim, flexDirection: 'row', alignItems: 'center',
                    padding: T.space.lg + 2, borderRadius: T.radius.lg, marginBottom: 10,
                    borderWidth: 1, borderColor: `${T.colors.red}30`, marginTop: 4,
                }} onPress={handleLogout} activeOpacity={0.75}>
                    <View style={{
                        width: 40, height: 40, borderRadius: T.radius.md,
                        backgroundColor: `${T.colors.red}18`, justifyContent: 'center', alignItems: 'center', marginRight: 14,
                    }}>
                        <Feather name="log-out" size={20} color={T.colors.red} />
                    </View>
                    <Text style={{ color: T.colors.red, fontSize: T.font.base, fontWeight: '700', fontFamily: T.fonts.body.bold }}>Log Out</Text>
                </TouchableOpacity>

                <Text style={{ color: T.colors.dim, textAlign: 'center', marginTop: 20, fontSize: T.font.sm }}>
                    CourtVision AI v3.0.0
                </Text>
            </ScrollView>

            <EditProfileModal visible={editVisible} user={user} onClose={() => setEditVisible(false)} onSave={handleProfileSave} />

            {/* Badge Detail Modal */}
            <Modal visible={!!showBadgeDetail} transparent animationType="fade" onRequestClose={() => setShowBadgeDetail(null)}>
                <Pressable style={{
                    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
                    justifyContent: 'center', alignItems: 'center', padding: 30,
                }} onPress={() => setShowBadgeDetail(null)}>
                    {showBadgeDetail && (
                        <View style={{
                            backgroundColor: T.colors.card, borderRadius: T.radius.xxl, padding: 30, alignItems: 'center',
                            borderWidth: 2, borderColor: RARITY_COLORS[showBadgeDetail.rarity],
                            ...T.glow(RARITY_COLORS[showBadgeDetail.rarity], 0.3), width: '100%',
                        }}>
                            <Text style={{ fontSize: 56, marginBottom: 12 }}>{showBadgeDetail.emoji}</Text>
                            <Text style={{
                                color: RARITY_COLORS[showBadgeDetail.rarity], fontSize: T.font.xl,
                                fontWeight: '900', fontFamily: T.fonts.display.black, marginBottom: 6,
                            }}>
                                {showBadgeDetail.name}
                            </Text>
                            <View style={{
                                backgroundColor: `${RARITY_COLORS[showBadgeDetail.rarity]}20`,
                                borderRadius: T.radius.sm, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
                            }}>
                                <Text style={{
                                    color: RARITY_COLORS[showBadgeDetail.rarity], fontSize: T.font.sm,
                                    fontWeight: '800', textTransform: 'uppercase',
                                }}>
                                    {showBadgeDetail.rarity}
                                </Text>
                            </View>
                            <Text style={{
                                color: T.colors.muted, fontSize: T.font.md + 1,
                                textAlign: 'center', lineHeight: 20, marginBottom: 16,
                            }}>
                                {showBadgeDetail.desc}
                            </Text>
                            <Text style={{
                                color: T.colors.purple, fontSize: T.font.lg, fontWeight: '900',
                                fontFamily: T.fonts.display.black, ...T.glow(T.colors.purple, 0.2),
                            }}>
                                +{showBadgeDetail.xp} XP
                            </Text>
                        </View>
                    )}
                </Pressable>
            </Modal>
        </SafeAreaView>
    )
}
