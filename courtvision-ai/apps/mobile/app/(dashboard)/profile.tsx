import { View, Text, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useStore } from '../../lib/store'

// ─────────────────────────────────────────────
const C = {
    bg: '#0D1117', card: '#161B22', border: '#21262D',
    accent: '#00D4FF', blue: '#1A73E8',
    green: '#00C853', orange: '#FFB300', red: '#FF3D57',
    white: '#E6EDF3', muted: '#8B949E', dim: '#484F58',
}

const EARNED_BADGES = [
    { emoji: '🎯', name: 'Sniper', rarity: 'epic' },
    { emoji: '🔥', name: 'Streak 7j', rarity: 'rare' },
    { emoji: '🧠', name: 'Mental Pro', rarity: 'legendary' },
    { emoji: '⚡', name: 'Quick Release', rarity: 'rare' },
    { emoji: '🛡️', name: 'Lock Down', rarity: 'common' },
]

const RARITY_COLORS: Record<string, string> = {
    common: C.muted,
    rare: C.blue,
    epic: '#9C27B0',
    legendary: C.orange,
}

const STATIC_MENU = [
    { icon: 'picture-as-pdf', iconLib: 'material', color: C.red,    label: 'Générer ma fiche recrutement', sub: 'Export PDF · Partage directement' },
    { icon: 'star-outline',   iconLib: 'ionicons',  color: C.orange, label: 'Gérer mon abonnement',          sub: 'Plan Coach · Actif' },
    { icon: 'settings',       iconLib: 'material',  color: C.muted,  label: 'Réglages Compte',               sub: 'Notifications, confidentialité…' },
    { icon: 'help-circle-outline', iconLib: 'ionicons', color: C.accent, label: 'Aide & Support',            sub: "FAQ, contacter l'équipe" },
]

// ── Animated stat tile ────────────────────────────────────────
function StatTile({ label, value, sub, delay }: { label: string; value: string; sub: string; delay: number }) {
    const anim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start()
    }, [])
    return (
        <Animated.View style={{
            flex: 1,
            backgroundColor: C.card,
            borderRadius: 14, padding: 14, alignItems: 'center',
            borderWidth: 1, borderColor: C.border,
            opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }}>
            <Text style={{ color: C.white, fontSize: 20, fontWeight: '900' }}>{value}</Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{label}</Text>
            <Text style={{ color: C.dim, fontSize: 9, marginTop: 1 }}>{sub}</Text>
        </Animated.View>
    )
}

// ── Menu Row ──────────────────────────────────────────────────
function MenuItem({ item, onPress }: { item: typeof STATIC_MENU[0]; onPress?: () => void }) {
    const IconComp = item.iconLib === 'ionicons' ? Ionicons : MaterialIcons
    return (
        <TouchableOpacity
            style={{
                backgroundColor: C.card, flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', padding: 18, borderRadius: 15,
                marginBottom: 10, borderWidth: 1, borderColor: C.border,
            }}
            onPress={onPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={item.label}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: `${item.color}18`,
                    justifyContent: 'center', alignItems: 'center',
                    marginRight: 14,
                }}>
                    <IconComp name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: item.label === 'Se déconnecter' ? C.red : C.white, fontSize: 15, fontWeight: '600' }}>
                        {item.label}
                    </Text>
                    {item.sub && (
                        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{item.sub}</Text>
                    )}
                </View>
            </View>
            {item.label !== 'Se déconnecter' && (
                <FontAwesome5 name="chevron-right" size={13} color={C.dim} />
            )}
        </TouchableOpacity>
    )
}

// ── Main ──────────────────────────────────────────────────────
export default function Profile() {
    const router     = useRouter()
    const user       = useStore(s => s.user)
    const userLoading = useStore(s => s.userLoading)
    const loadProfile = useStore(s => s.loadProfile)
    const logout     = useStore(s => s.logout)
    const fadeAnim   = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start()
        if (!user) loadProfile()
    }, [])

    const displayName    = user?.full_name ?? user?.username ?? 'Joueur'
    const displayPos     = user?.position  ?? 'Meneur (PG)'
    const overallRating  = user?.level === 'Pro' ? 88 : 78
    const mentalAvg      = user?.mental_score    ?? 81
    const shootingFgPct  = user?.shooting_fg_pct ?? 62
    const sessionCount   = 24        // real count comes from sessions store

    const SEASON_STATS = [
        { label: 'Sessions',   value: String(sessionCount), sub: 'analysées' },
        { label: 'Mental Avg', value: String(mentalAvg),    sub: '/ 100' },
        { label: 'FG%',        value: `${shootingFgPct}%`,  sub: 'saison' },
        { label: 'Overall',    value: String(overallRating), sub: 'Digital Twin' },
    ]

    const handleLogout = async () => {
        await logout()
        router.replace('/')
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

                {/* ── Player Card ── */}
                <Animated.View style={{
                    backgroundColor: C.card, borderRadius: 22, padding: 22,
                    borderWidth: 1, borderColor: 'rgba(26,115,232,0.35)',
                    marginBottom: 20, opacity: fadeAnim,
                    shadowColor: C.blue, shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2, shadowRadius: 16,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                        {/* Avatar */}
                        <View style={{
                            width: 72, height: 72, borderRadius: 36,
                            backgroundColor: '#1C2333',
                            borderWidth: 2.5, borderColor: C.blue,
                            justifyContent: 'center', alignItems: 'center',
                            marginRight: 16,
                            shadowColor: C.blue, shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.4, shadowRadius: 8,
                        }}>
                            <Text style={{ fontSize: 32 }}>🏀</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            {userLoading ? (
                                <ActivityIndicator size="small" color={C.blue} />
                            ) : (
                                <>
                                    <Text style={{ color: C.white, fontSize: 20, fontWeight: '800' }}>
                                        {displayName}
                                    </Text>
                                    <Text style={{ color: C.accent, fontSize: 14, fontWeight: '600', marginTop: 2 }}>
                                        {displayPos}
                                    </Text>
                                </>
                            )}
                        </View>
                        {/* Overall badge */}
                        <View style={{
                            backgroundColor: 'rgba(26,115,232,0.15)',
                            borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8,
                            borderWidth: 1.5, borderColor: C.blue, alignItems: 'center',
                        }}>
                            <Text style={{ color: C.blue, fontSize: 22, fontWeight: '900' }}>{overallRating}</Text>
                            <Text style={{ color: C.blue, fontSize: 9, fontWeight: '700' }}>OVR</Text>
                        </View>
                    </View>

                    {/* Plan + Edit */}
                    <View style={{
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', paddingTop: 14,
                        borderTopWidth: 1, borderTopColor: C.border,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{
                                backgroundColor: 'rgba(255,179,0,0.15)',
                                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                            }}>
                                <Ionicons name="star" size={12} color={C.orange} />
                                <Text style={{ color: C.orange, fontSize: 11, fontWeight: '700' }}>COACH</Text>
                            </View>
                            <Text style={{ color: C.muted, fontSize: 12 }}>Plan Actif</Text>
                        </View>
                        <TouchableOpacity style={{
                            backgroundColor: 'rgba(26,115,232,0.15)',
                            paddingHorizontal: 16, paddingVertical: 7,
                            borderRadius: 10, borderWidth: 1, borderColor: 'rgba(26,115,232,0.4)',
                        }}>
                            <Text style={{ color: C.blue, fontWeight: '700', fontSize: 13 }}>Modifier</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ── Season Stats ── */}
                <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
                    Stats Saison
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
                    {SEASON_STATS.map((s, i) => (
                        <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub} delay={i * 70} />
                    ))}
                </View>

                {/* ── Badges ── */}
                <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
                    Badges Débloqués
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22, marginHorizontal: -4 }}>
                    {EARNED_BADGES.map(badge => (
                        <View key={badge.name} style={{
                            backgroundColor: C.card, borderRadius: 14,
                            paddingHorizontal: 12, paddingVertical: 10,
                            marginHorizontal: 4, alignItems: 'center',
                            borderWidth: 1.5, borderColor: RARITY_COLORS[badge.rarity],
                            minWidth: 80,
                        }}>
                            <Text style={{ fontSize: 24, marginBottom: 4 }}>{badge.emoji}</Text>
                            <Text style={{ color: RARITY_COLORS[badge.rarity], fontSize: 10, fontWeight: '700' }}>
                                {badge.name}
                            </Text>
                            <Text style={{ color: C.dim, fontSize: 9, marginTop: 1, textTransform: 'capitalize' }}>
                                {badge.rarity}
                            </Text>
                        </View>
                    ))}
                </ScrollView>

                {/* ── Menu ── */}
                <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
                    Compte
                </Text>
                {STATIC_MENU.map(item => (
                    <MenuItem key={item.label} item={item} />
                ))}
                {/* Logout — separate so it gets the real handler */}
                <TouchableOpacity
                    style={{
                        backgroundColor: C.card, flexDirection: 'row', alignItems: 'center',
                        padding: 18, borderRadius: 15,
                        marginBottom: 10, borderWidth: 1, borderColor: C.border,
                    }}
                    onPress={handleLogout}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Se déconnecter"
                >
                    <View style={{
                        width: 38, height: 38, borderRadius: 10,
                        backgroundColor: `${C.red}18`,
                        justifyContent: 'center', alignItems: 'center',
                        marginRight: 14,
                    }}>
                        <Ionicons name="log-out-outline" size={20} color={C.red} />
                    </View>
                    <Text style={{ color: C.red, fontSize: 15, fontWeight: '600' }}>Se déconnecter</Text>
                </TouchableOpacity>

                <Text style={{ color: C.dim, textAlign: 'center', marginTop: 24, fontSize: 11 }}>
                    CourtVision AI v1.0.0 · Fait avec ❤️
                </Text>

            </ScrollView>
        </SafeAreaView>
    )
}
