import {
    View, Text, ScrollView, TouchableOpacity, Animated,
    Alert, TextInput, Modal, Pressable, Switch, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'expo-router'
import { useStore, selectXP, xpToLevel, xpToNextLevel } from '../../lib/store'
import { XPLevelBar } from '../../components/XPBadge'
import { SkeletonLoader } from '../../components/SkeletonLoader'
import { toast } from '../../lib/toast'
import { apiFetch } from '../../lib/api'

// ─────────────────────────────────────────────
const C = {
    bg: '#0D1117', card: '#161B22', cardLight: '#1C2333', border: '#21262D',
    accent: '#00D4FF', blue: '#1A73E8',
    green: '#00C853', orange: '#FFB300', red: '#FF3D57', purple: '#B388FF',
    white: '#E6EDF3', muted: '#8B949E', dim: '#484F58',
}

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']
const POSITION_LABELS: Record<string, string> = {
    PG: 'Meneur (PG)', SG: 'Arrière (SG)', SF: 'Ailier (SF)',
    PF: 'Ailier Fort (PF)', C: 'Pivot (C)',
}
const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Pro', 'Elite']

const EARNED_BADGES = [
    { emoji: '🎯', name: 'Sniper',        rarity: 'epic',      xp: 500,  desc: 'FG% > 60% sur 5 sessions' },
    { emoji: '🔥', name: 'Streak 7j',     rarity: 'rare',      xp: 200,  desc: '7 jours consécutifs' },
    { emoji: '🧠', name: 'Mental Pro',    rarity: 'legendary', xp: 1000, desc: 'Score mental > 90' },
    { emoji: '⚡', name: 'Quick Release', rarity: 'rare',      xp: 300,  desc: 'Vitesse de tir top 5%' },
    { emoji: '🛡️', name: 'Lock Down',     rarity: 'common',    xp: 100,  desc: 'Défenseur de la semaine' },
    { emoji: '🏆', name: 'First Win',     rarity: 'common',    xp: 50,   desc: 'Premier défi remporté' },
    { emoji: '💎', name: 'Elite',         rarity: 'legendary', xp: 2000, desc: 'Atteindre 90+ overall' },
]

const RARITY_COLORS: Record<string, string> = {
    common: C.muted, rare: C.blue, epic: C.purple, legendary: C.orange,
}

const RECENT_ACTIVITY = [
    { icon: '🏀', text: 'Session analysée — Mental 91/100', time: 'Il y a 2h',  color: C.accent },
    { icon: '🔥', text: 'Streak 7 jours atteint !',          time: 'Hier',       color: C.orange },
    { icon: '⬆️', text: 'Niveau 8 débloqué — +200 XP',       time: 'Hier',       color: C.green },
    { icon: '🎯', text: 'Badge Sniper obtenu',                 time: 'Il y a 3j',  color: C.purple },
    { icon: '🏆', text: 'Top 10 classement hebdo',             time: 'Il y a 5j',  color: C.orange },
]

// ── Animated stat tile ────────────────────────────────────────
function StatTile({ label, value, sub, color, delay }: {
    label: string; value: string; sub: string; color?: string; delay: number
}) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, delay, useNativeDriver: true, tension: 80, friction: 8 }).start()
    }, [])
    return (
        <Animated.View style={{
            flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: 'center',
            borderWidth: 1, borderColor: color ? `${color}30` : C.border,
            opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            shadowColor: color ?? C.blue, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 8,
        }}>
            <Text style={{ color: color ?? C.white, fontSize: 22, fontWeight: '900' }}>{value}</Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 3, textAlign: 'center' }}>{label}</Text>
            <Text style={{ color: C.dim, fontSize: 9, marginTop: 1 }}>{sub}</Text>
        </Animated.View>
    )
}

// ── Avatar avec initiales ─────────────────────────────────────
function PlayerAvatar({ name, size = 72, onPress }: { name: string; size?: number; onPress?: () => void }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '🏀'
    const pulseAnim = useRef(new Animated.Value(1)).current
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])).start()
    }, [])
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Animated.View style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: '#1A2540',
                borderWidth: 3, borderColor: C.blue,
                justifyContent: 'center', alignItems: 'center',
                transform: [{ scale: pulseAnim }],
                shadowColor: C.blue, shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5, shadowRadius: 12,
            }}>
                <Text style={{ fontSize: size * 0.35, fontWeight: '800', color: C.white }}>
                    {initials.length >= 2 ? initials : '🏀'}
                </Text>
            </Animated.View>
            <View style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: C.blue, borderRadius: 12, width: 24, height: 24,
                justifyContent: 'center', alignItems: 'center',
                borderWidth: 2, borderColor: C.bg,
            }}>
                <Ionicons name="camera" size={12} color={C.white} />
            </View>
        </TouchableOpacity>
    )
}

// ── Modal édition profil ──────────────────────────────────────
function EditProfileModal({ visible, user, onClose, onSave }: {
    visible: boolean
    user: any
    onClose: () => void
    onSave: (data: any) => void
}) {
    const [fullName, setFullName] = useState(user?.full_name ?? '')
    const [username, setUsername] = useState(user?.username ?? '')
    const [position, setPosition] = useState(user?.position ?? 'PG')
    const [level, setLevel] = useState(user?.level ?? 'Intermédiaire')
    const [bio, setBio] = useState(user?.bio ?? '')
    const [saving, setSaving] = useState(false)
    const slideAnim = useRef(new Animated.Value(400)).current

    useEffect(() => {
        if (visible) {
            setFullName(user?.full_name ?? '')
            setUsername(user?.username ?? '')
            setPosition(user?.position ?? 'PG')
            setLevel(user?.level ?? 'Intermédiaire')
            setBio(user?.bio ?? '')
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 9 }).start()
        } else {
            slideAnim.setValue(400)
        }
    }, [visible, user])

    const handleSave = async () => {
        if (!fullName.trim()) { toast.error('Champs requis', 'Entre ton nom'); return }
        setSaving(true)
        try {
            await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({ full_name: fullName, username, position, level, bio }),
            })
            onSave({ full_name: fullName, username, position, level, bio })
            toast.success('Profil mis à jour !', 'Tes infos ont été sauvegardées')
            onClose()
        } catch {
            toast.error('Erreur de sauvegarde', 'Réessaie dans un instant')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }} onPress={onClose}>
                <Pressable onPress={() => {}}>
                    <Animated.View style={{
                        backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        padding: 24, paddingBottom: 40,
                        transform: [{ translateY: slideAnim }],
                    }}>
                        {/* Handle */}
                        <View style={{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

                        <Text style={{ color: C.white, fontSize: 20, fontWeight: '800', marginBottom: 20 }}>
                            Modifier mon Profil
                        </Text>

                        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>NOM COMPLET</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            style={{
                                backgroundColor: C.bg, color: C.white, borderRadius: 12,
                                paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
                                borderWidth: 1, borderColor: C.border, marginBottom: 14,
                            }}
                            placeholder="Ton nom complet"
                            placeholderTextColor={C.dim}
                        />

                        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>USERNAME</Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            style={{
                                backgroundColor: C.bg, color: C.white, borderRadius: 12,
                                paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
                                borderWidth: 1, borderColor: C.border, marginBottom: 14,
                            }}
                            placeholder="@username"
                            placeholderTextColor={C.dim}
                            autoCapitalize="none"
                        />

                        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>POSTE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {POSITIONS.map(p => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPosition(p)}
                                    style={{
                                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                                        backgroundColor: position === p ? C.blue : C.bg,
                                        borderWidth: 1, borderColor: position === p ? C.blue : C.border,
                                        marginRight: 8,
                                    }}
                                >
                                    <Text style={{ color: position === p ? C.white : C.muted, fontWeight: '700', fontSize: 13 }}>
                                        {p}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>NIVEAU</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            {LEVELS.map(l => (
                                <TouchableOpacity
                                    key={l}
                                    onPress={() => setLevel(l)}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                                        backgroundColor: level === l ? C.green : C.bg,
                                        borderWidth: 1, borderColor: level === l ? C.green : C.border,
                                        marginRight: 8,
                                    }}
                                >
                                    <Text style={{ color: level === l ? C.white : C.muted, fontWeight: '700', fontSize: 12 }}>
                                        {l}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>BIO (optionnel)</Text>
                        <TextInput
                            value={bio}
                            onChangeText={setBio}
                            style={{
                                backgroundColor: C.bg, color: C.white, borderRadius: 12,
                                paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
                                borderWidth: 1, borderColor: C.border, marginBottom: 20,
                                minHeight: 70, textAlignVertical: 'top',
                            }}
                            placeholder="Parle de toi…"
                            placeholderTextColor={C.dim}
                            multiline
                            maxLength={150}
                        />

                        <TouchableOpacity
                            style={{
                                backgroundColor: C.blue, borderRadius: 16,
                                paddingVertical: 16, alignItems: 'center',
                                opacity: saving ? 0.7 : 1,
                            }}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            <Text style={{ color: C.white, fontWeight: '800', fontSize: 16 }}>
                                {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

// ── Menu Row ──────────────────────────────────────────────────
function MenuItem({ icon, iconLib, color, label, sub, onPress, rightEl }: {
    icon: string; iconLib: string; color: string; label: string; sub?: string
    onPress?: () => void; rightEl?: React.ReactNode
}) {
    const IconComp = iconLib === 'ionicons' ? Ionicons
        : iconLib === 'mci' ? MaterialCommunityIcons
        : MaterialIcons
    return (
        <TouchableOpacity
            style={{
                backgroundColor: C.card, flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', padding: 18, borderRadius: 16,
                marginBottom: 10, borderWidth: 1, borderColor: C.border,
            }}
            onPress={onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: `${color}18`,
                    justifyContent: 'center', alignItems: 'center', marginRight: 14,
                }}>
                    <IconComp name={icon as any} size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontSize: 15, fontWeight: '600' }}>{label}</Text>
                    {sub && <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>}
                </View>
            </View>
            {rightEl ?? <FontAwesome5 name="chevron-right" size={13} color={C.dim} />}
        </TouchableOpacity>
    )
}

// ── Main ──────────────────────────────────────────────────────
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
    const fadeAnim      = useRef(new Animated.Value(0)).current
    const headerAnim    = useRef(new Animated.Value(-30)).current
    const [editVisible, setEditVisible] = useState(false)
    const [notifEnabled, setNotifEnabled] = useState(true)
    const [publicProfile, setPublicProfile] = useState(true)
    const [showBadgeDetail, setShowBadgeDetail] = useState<typeof EARNED_BADGES[0] | null>(null)

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(headerAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 9 }),
        ]).start()
        if (!user) loadProfile()
        if (sessions.length === 0) loadSessions()
    }, [])

    const displayName   = user?.full_name ?? user?.username ?? 'Joueur'
    const displayPos    = POSITION_LABELS[user?.position ?? 'PG'] ?? user?.position ?? 'Meneur (PG)'
    const level         = xpToLevel(xp)
    const { pct }       = xpToNextLevel(xp)
    const overallRating = user?.level === 'Elite' ? 93 : user?.level === 'Pro' ? 88 : 78
    const mentalAvg     = user?.mental_score    ?? 81
    const shootingFgPct = user?.shooting_fg_pct ?? 62
    const sessionCount  = user?.total_sessions  ?? sessions.length
    const streak        = user?.streak          ?? 0

    const SEASON_STATS = [
        { label: 'Sessions',  value: String(sessionCount), sub: 'analysées',   color: C.blue },
        { label: 'Mental',    value: String(mentalAvg),    sub: '/ 100',        color: C.accent },
        { label: 'FG%',       value: `${shootingFgPct}%`,  sub: 'saison',       color: C.green },
        { label: 'Overall',   value: String(overallRating), sub: 'Digital Twin', color: C.orange },
    ]

    const handleProfileSave = useCallback((data: any) => {
        updateUser(data)
    }, [updateUser])

    const handleLogout = useCallback(() => {
        Alert.alert(
            'Se déconnecter',
            'Es-tu sûr de vouloir te déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Déconnexion',
                    style: 'destructive',
                    onPress: async () => {
                        await logout()
                        router.replace('/')
                    },
                },
            ]
        )
    }, [logout, router])

    const handleGeneratePDF = useCallback(() => {
        toast.info('Fiche de recrutement', 'Export PDF en cours de génération…')
        // TODO: call /api/report/generate
    }, [])

    const handleShare = useCallback(async () => {
        try {
            await Share.share({
                title: `${displayName} sur CourtVision AI`,
                message: `Rejoins CourtVision AI et analyse ton jeu basket avec l'IA ! Mon overall : ${overallRating} 🏀`,
                url: 'https://courtvision.ai',
            })
        } catch {}
    }, [displayName, overallRating])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header titre ── */}
                <Animated.View style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 20,
                    opacity: fadeAnim, transform: [{ translateY: headerAnim }],
                }}>
                    <View>
                        <Text style={{ color: C.white, fontSize: 26, fontWeight: '900' }}>Mon Profil</Text>
                        <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
                            Niveau {level} · {xp.toLocaleString()} XP
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleShare}
                        style={{
                            backgroundColor: `${C.blue}20`, borderRadius: 14,
                            padding: 10, borderWidth: 1, borderColor: `${C.blue}40`,
                        }}
                    >
                        <Ionicons name="share-social-outline" size={22} color={C.blue} />
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Player Card ── */}
                <Animated.View style={{
                    backgroundColor: C.card, borderRadius: 24, padding: 22,
                    borderWidth: 1, borderColor: `${C.blue}50`,
                    marginBottom: 20, opacity: fadeAnim,
                    shadowColor: C.blue, shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25, shadowRadius: 20,
                }}>
                    {/* Top row : avatar + infos + badge OVR */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                        <PlayerAvatar
                            name={displayName}
                            size={76}
                            onPress={() => toast.info('Photo de profil', 'Bientôt disponible')}
                        />
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            {userLoading ? (
                                <View style={{ gap: 8 }}>
                                    <SkeletonLoader height={20} width="70%" />
                                    <SkeletonLoader height={13} width="50%" />
                                    <SkeletonLoader height={11} width="40%" />
                                </View>
                            ) : (
                                <>
                                    <Text style={{ color: C.white, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 }}>
                                        {displayName}
                                    </Text>
                                    <Text style={{ color: C.accent, fontSize: 13, fontWeight: '600', marginTop: 3 }}>
                                        {displayPos}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 }}>
                                        <View style={{
                                            backgroundColor: `${C.orange}18`, borderRadius: 8,
                                            paddingHorizontal: 7, paddingVertical: 3,
                                            flexDirection: 'row', alignItems: 'center', gap: 3,
                                        }}>
                                            <Ionicons name="star" size={10} color={C.orange} />
                                            <Text style={{ color: C.orange, fontSize: 10, fontWeight: '700' }}>
                                                {user?.level ?? 'Intermédiaire'}
                                            </Text>
                                        </View>
                                        {streak > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                <Text style={{ fontSize: 11 }}>🔥</Text>
                                                <Text style={{ color: C.orange, fontSize: 11, fontWeight: '700' }}>
                                                    {streak}j streak
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}
                        </View>
                        {/* Overall badge */}
                        <View style={{
                            backgroundColor: `${C.blue}18`, borderRadius: 16,
                            paddingHorizontal: 12, paddingVertical: 10,
                            borderWidth: 2, borderColor: `${C.blue}60`,
                            alignItems: 'center',
                            shadowColor: C.blue, shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.4, shadowRadius: 10,
                        }}>
                            <Text style={{ color: C.blue, fontSize: 26, fontWeight: '900' }}>{overallRating}</Text>
                            <Text style={{ color: C.blue, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>OVR</Text>
                        </View>
                    </View>

                    {/* XP Bar */}
                    <View style={{ marginBottom: 16 }}>
                        <XPLevelBar xp={xp} compact />
                    </View>

                    {/* Plan + Edit */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', paddingTop: 14,
                        borderTopWidth: 1, borderTopColor: C.border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{
                                backgroundColor: `${C.orange}18`, borderRadius: 8,
                                paddingHorizontal: 8, paddingVertical: 4,
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                            }}>
                                <Text style={{ fontSize: 11 }}>⭐</Text>
                                <Text style={{ color: C.orange, fontSize: 11, fontWeight: '800' }}>COACH</Text>
                            </View>
                            <Text style={{ color: C.muted, fontSize: 12 }}>Actif · Beta Gratuit</Text>
                        </View>
                        <TouchableOpacity
                            style={{
                                backgroundColor: `${C.blue}18`, paddingHorizontal: 18, paddingVertical: 8,
                                borderRadius: 12, borderWidth: 1, borderColor: `${C.blue}40`,
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                            }}
                            onPress={() => setEditVisible(true)}
                            accessibilityRole="button"
                        >
                            <Ionicons name="pencil" size={13} color={C.blue} />
                            <Text style={{ color: C.blue, fontWeight: '700', fontSize: 13 }}>Modifier</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Season Stats ── */}
                <Text style={{ color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    📊 Stats Saison
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                    {SEASON_STATS.map((s, i) => (
                        <StatTile key={s.label} {...s} delay={i * 80} />
                    ))}
                </View>

                {/* ── Badges Section ── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: C.white, fontSize: 16, fontWeight: '800' }}>
                        🎖️ Badges ({EARNED_BADGES.length})
                    </Text>
                    <TouchableOpacity>
                        <Text style={{ color: C.blue, fontSize: 13, fontWeight: '600' }}>Voir tout →</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginHorizontal: -4 }}>
                    {EARNED_BADGES.map((badge, i) => (
                        <TouchableOpacity
                            key={badge.name}
                            onPress={() => setShowBadgeDetail(badge)}
                            style={{
                                backgroundColor: C.card, borderRadius: 16,
                                paddingHorizontal: 14, paddingVertical: 12,
                                marginHorizontal: 4, alignItems: 'center',
                                borderWidth: 1.5, borderColor: RARITY_COLORS[badge.rarity],
                                minWidth: 90,
                                shadowColor: RARITY_COLORS[badge.rarity],
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.2, shadowRadius: 6,
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 28, marginBottom: 5 }}>{badge.emoji}</Text>
                            <Text style={{ color: RARITY_COLORS[badge.rarity], fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
                                {badge.name}
                            </Text>
                            <Text style={{ color: C.dim, fontSize: 9, marginTop: 2, textTransform: 'capitalize' }}>
                                {badge.rarity}
                            </Text>
                            <Text style={{ color: C.purple, fontSize: 9, marginTop: 3, fontWeight: '700' }}>
                                +{badge.xp} XP
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {/* Locked teaser */}
                    <View style={{
                        backgroundColor: C.card, borderRadius: 16,
                        paddingHorizontal: 14, paddingVertical: 12,
                        marginHorizontal: 4, alignItems: 'center',
                        borderWidth: 1.5, borderColor: C.border,
                        minWidth: 90, opacity: 0.5,
                    }}>
                        <Text style={{ fontSize: 28, marginBottom: 5 }}>🔒</Text>
                        <Text style={{ color: C.dim, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>7 autres</Text>
                        <Text style={{ color: C.dim, fontSize: 9 }}>À débloquer</Text>
                    </View>
                </ScrollView>

                {/* ── Activité récente ── */}
                <Text style={{ color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    ⚡ Activité Récente
                </Text>
                <View style={{
                    backgroundColor: C.card, borderRadius: 18, overflow: 'hidden',
                    borderWidth: 1, borderColor: C.border, marginBottom: 24,
                }}>
                    {RECENT_ACTIVITY.map((item, i) => (
                        <View key={i} style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 16, paddingVertical: 13,
                            borderBottomWidth: i < RECENT_ACTIVITY.length - 1 ? 1 : 0,
                            borderBottomColor: C.border,
                        }}>
                            <View style={{
                                width: 34, height: 34, borderRadius: 10,
                                backgroundColor: `${item.color}15`,
                                justifyContent: 'center', alignItems: 'center', marginRight: 12,
                            }}>
                                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: C.white, fontSize: 13, fontWeight: '600' }}>{item.text}</Text>
                                <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{item.time}</Text>
                            </View>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }} />
                        </View>
                    ))}
                </View>

                {/* ── Menu Compte ── */}
                <Text style={{ color: C.white, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
                    ⚙️ Compte
                </Text>
                <MenuItem
                    icon="picture-as-pdf" iconLib="material" color={C.red}
                    label="Fiche de Recrutement" sub="Export PDF · Partage à tes coachs"
                    onPress={handleGeneratePDF}
                />
                <MenuItem
                    icon="share-social-outline" iconLib="ionicons" color={C.accent}
                    label="Partager mon Profil" sub="Instagram, TikTok, Twitter"
                    onPress={handleShare}
                />
                <MenuItem
                    icon="people-outline" iconLib="ionicons" color={C.green}
                    label="Inviter des amis" sub="+500 XP par ami invité"
                    onPress={() => toast.info('Invitation', 'Bientôt disponible')}
                />
                <MenuItem
                    icon="star-outline" iconLib="ionicons" color={C.orange}
                    label="Plan Abonnement" sub="Beta gratuite · Plan Coach actif"
                    onPress={() => toast.info('Abonnement', 'Bientôt disponible')}
                />

                {/* Notifications & Profil public avec switch */}
                <View style={{
                    backgroundColor: C.card, borderRadius: 16, overflow: 'hidden',
                    borderWidth: 1, borderColor: C.border, marginBottom: 10,
                }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between', padding: 18,
                        borderBottomWidth: 1, borderBottomColor: C.border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 12,
                                backgroundColor: `${C.blue}18`, justifyContent: 'center',
                                alignItems: 'center', marginRight: 14,
                            }}>
                                <Ionicons name="notifications-outline" size={20} color={C.blue} />
                            </View>
                            <View>
                                <Text style={{ color: C.white, fontSize: 15, fontWeight: '600' }}>
                                    Notifications Push
                                </Text>
                                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                                    Rappels daily challenge, streak
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={notifEnabled}
                            onValueChange={setNotifEnabled}
                            trackColor={{ false: C.border, true: `${C.blue}60` }}
                            thumbColor={notifEnabled ? C.blue : C.muted}
                        />
                    </View>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between', padding: 18,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 12,
                                backgroundColor: `${C.green}18`, justifyContent: 'center',
                                alignItems: 'center', marginRight: 14,
                            }}>
                                <Ionicons name="eye-outline" size={20} color={C.green} />
                            </View>
                            <View>
                                <Text style={{ color: C.white, fontSize: 15, fontWeight: '600' }}>
                                    Profil Public
                                </Text>
                                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                                    Visible dans le classement
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={publicProfile}
                            onValueChange={setPublicProfile}
                            trackColor={{ false: C.border, true: `${C.green}60` }}
                            thumbColor={publicProfile ? C.green : C.muted}
                        />
                    </View>
                </View>

                <MenuItem
                    icon="help-circle-outline" iconLib="ionicons" color={C.muted}
                    label="Aide & Support" sub="FAQ, contacter l'équipe"
                    onPress={() => toast.info('Support', 'support@courtvision.ai')}
                />

                {/* Déconnexion */}
                <TouchableOpacity
                    style={{
                        backgroundColor: `${C.red}10`, flexDirection: 'row', alignItems: 'center',
                        padding: 18, borderRadius: 16, marginBottom: 10,
                        borderWidth: 1, borderColor: `${C.red}30`,
                        marginTop: 4,
                    }}
                    onPress={handleLogout}
                    activeOpacity={0.75}
                >
                    <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: `${C.red}18`, justifyContent: 'center',
                        alignItems: 'center', marginRight: 14,
                    }}>
                        <Ionicons name="log-out-outline" size={20} color={C.red} />
                    </View>
                    <Text style={{ color: C.red, fontSize: 15, fontWeight: '700' }}>Se déconnecter</Text>
                </TouchableOpacity>

                <Text style={{ color: C.dim, textAlign: 'center', marginTop: 20, fontSize: 11 }}>
                    CourtVision AI v2.0.0 · Fait avec ❤️ pour les joueurs
                </Text>
            </ScrollView>

            {/* ── Edit Profile Modal ── */}
            <EditProfileModal
                visible={editVisible}
                user={user}
                onClose={() => setEditVisible(false)}
                onSave={handleProfileSave}
            />

            {/* ── Badge Detail Modal ── */}
            <Modal visible={!!showBadgeDetail} transparent animationType="fade" onRequestClose={() => setShowBadgeDetail(null)}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 30 }}
                    onPress={() => setShowBadgeDetail(null)}
                >
                    {showBadgeDetail && (
                        <View style={{
                            backgroundColor: C.card, borderRadius: 24, padding: 30, alignItems: 'center',
                            borderWidth: 2, borderColor: RARITY_COLORS[showBadgeDetail.rarity],
                            shadowColor: RARITY_COLORS[showBadgeDetail.rarity],
                            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20,
                            width: '100%',
                        }}>
                            <Text style={{ fontSize: 56, marginBottom: 12 }}>{showBadgeDetail.emoji}</Text>
                            <Text style={{ color: RARITY_COLORS[showBadgeDetail.rarity], fontSize: 22, fontWeight: '900', marginBottom: 6 }}>
                                {showBadgeDetail.name}
                            </Text>
                            <View style={{
                                backgroundColor: `${RARITY_COLORS[showBadgeDetail.rarity]}20`,
                                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
                            }}>
                                <Text style={{ color: RARITY_COLORS[showBadgeDetail.rarity], fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                    {showBadgeDetail.rarity}
                                </Text>
                            </View>
                            <Text style={{ color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
                                {showBadgeDetail.desc}
                            </Text>
                            <Text style={{ color: C.purple, fontSize: 18, fontWeight: '900' }}>
                                +{showBadgeDetail.xp} XP
                            </Text>
                        </View>
                    )}
                </Pressable>
            </Modal>
        </SafeAreaView>
    )
}
