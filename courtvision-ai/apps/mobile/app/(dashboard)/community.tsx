import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, FlatList, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback } from 'react'
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCommunity, LeaderboardEntry, ChallengeItem, ActivityItem, SearchResult } from '../../hooks/useCommunity'
import { T } from '../../lib/theme'

// ==========================================
// Constants
// ==========================================

const TABS = [
    { key: 'leaderboard', label: '🏆 Classement' },
    { key: 'challenges', label: '⚔️ Défis' },
    { key: 'feed', label: '📡 Feed' },
    { key: 'search', label: '🔍 Joueurs' },
] as const
type TabKey = (typeof TABS)[number]['key']

const METRICS = [
    { key: 'overall', label: 'Global', emoji: '🏆' },
    { key: 'shooting', label: 'Tir', emoji: '🎯' },
    { key: 'mental', label: 'Mental', emoji: '🧠' },
    { key: 'sessions', label: 'Sessions', emoji: '📊' },
]

const SCOPES = [
    { key: 'global', label: 'Global' },
    { key: 'friends', label: 'Amis' },
]

const BADGE_RARITY_COLORS: Record<string, string> = {
    common: T.colors.muted,
    rare: T.colors.primary,
    epic: T.colors.purple,
    legendary: T.colors.orange,
}

const ACTIVITY_EMOJIS: Record<string, string> = {
    session_complete: '🏀', badge_earned: '🎖️', challenge_won: '🏆',
    challenge_joined: '⚔️', follow: '👥', highlight_shared: '🎬',
    level_up: '⬆️', new_record: '🔥',
}

// ==========================================
// Main Component
// ==========================================

export default function Community() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabKey>('leaderboard')
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const {
        leaderboard, leaderboardMetric, leaderboardScope, myRank,
        fetchLeaderboard,
        challenges, fetchChallenges,
        feed, feedHasMore, fetchFeed, loadMoreFeed,
        followUser, unfollowUser,
        myBadges,
        notifications, unreadCount,
        searchResults, searchPlayers,
        loading, error,
    } = useCommunity()

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        if (activeTab === 'leaderboard') await fetchLeaderboard()
        else if (activeTab === 'challenges') await fetchChallenges()
        else if (activeTab === 'feed') await fetchFeed(true)
        setRefreshing(false)
    }, [activeTab, fetchLeaderboard, fetchChallenges, fetchFeed])

    const formatTimeLeft = (endAt: string): string => {
        const diff = new Date(endAt).getTime() - Date.now()
        if (diff <= 0) return 'Terminé'
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        if (days > 0) return `${days}j ${hours}h`
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${mins}m`
    }

    const formatTimeAgo = (date: string): string => {
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / (1000 * 60))
        if (mins < 1) return 'À l\'instant'
        if (mins < 60) return `il y a ${mins}m`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `il y a ${hours}h`
        const days = Math.floor(hours / 24)
        return `il y a ${days}j`
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Header */}
            <View style={{ padding: T.space.xl, paddingBottom: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{
                            color: T.colors.white, fontSize: T.font.xxl + 2,
                            fontWeight: '900', letterSpacing: -0.5,
                        }}>Communauté</Text>
                        <Text style={{ color: T.colors.textSecondary, fontSize: T.font.md + 1, marginTop: 2 }}>
                            Le Strava du basket 🏀
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={{
                            position: 'relative',
                            width: 44, height: 44, borderRadius: T.radius.md,
                            ...T.glass.light,
                            justifyContent: 'center', alignItems: 'center',
                        }}
                        onPress={() => {}}
                    >
                        <Ionicons name="notifications-outline" size={22} color={T.colors.white} />
                        {unreadCount > 0 && (
                            <View style={{
                                position: 'absolute', top: -3, right: -3,
                                backgroundColor: T.colors.red, borderRadius: 10,
                                minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
                                ...T.glow(T.colors.red, 0.3),
                            }}>
                                <Text style={{ color: '#FFF', fontSize: T.font.xs + 1, fontWeight: 'bold' }}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* My Badges Preview */}
                {myBadges.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                        {myBadges.slice(0, 8).map(badge => (
                            <View key={badge.id} style={{
                                ...T.glass.light,
                                borderRadius: T.radius.sm, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
                                borderWidth: 1, borderColor: BADGE_RARITY_COLORS[badge.rarity] || T.colors.muted,
                                flexDirection: 'row', alignItems: 'center',
                            }}>
                                <Text style={{ fontSize: 14, marginRight: 4 }}>{badge.emoji}</Text>
                                <Text style={{ color: BADGE_RARITY_COLORS[badge.rarity], fontSize: T.font.sm, fontWeight: '600' }}>
                                    {badge.name}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, marginHorizontal: 15, marginBottom: 5 }}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={{
                            paddingHorizontal: 16, paddingVertical: 10, marginRight: 6,
                            borderRadius: T.radius.pill,
                            backgroundColor: activeTab === tab.key ? T.colors.accent : 'transparent',
                            ...(activeTab !== tab.key ? T.glass.light : {}),
                            ...(activeTab === tab.key ? T.glow(T.colors.accent, 0.15) : {}),
                        }}
                    >
                        <Text style={{
                            color: activeTab === tab.key ? T.colors.bg : T.colors.muted,
                            fontWeight: activeTab === tab.key ? '700' : '500', fontSize: T.font.md,
                        }}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: T.space.xl, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.colors.accent} />}
            >
                {activeTab === 'leaderboard' && (
                    <LeaderboardTab
                        entries={leaderboard} metric={leaderboardMetric}
                        scope={leaderboardScope} myRank={myRank}
                        onChangeMetric={(m) => fetchLeaderboard(m)}
                        onChangeScope={(s) => fetchLeaderboard(undefined, s)}
                    />
                )}
                {activeTab === 'challenges' && (
                    <ChallengesTab challenges={challenges} formatTimeLeft={formatTimeLeft} />
                )}
                {activeTab === 'feed' && (
                    <FeedTab items={feed} hasMore={feedHasMore} onLoadMore={loadMoreFeed}
                        formatTimeAgo={formatTimeAgo} loading={loading} />
                )}
                {activeTab === 'search' && (
                    <SearchTab query={searchQuery}
                        onQueryChange={(q) => { setSearchQuery(q); searchPlayers(q) }}
                        results={searchResults} onFollow={followUser} onUnfollow={unfollowUser} />
                )}
                {error && (
                    <View style={{ ...T.glass.light, borderColor: `${T.colors.red}30`, borderWidth: 1, padding: 12, borderRadius: T.radius.sm, marginTop: 15 }}>
                        <Text style={{ color: T.colors.red, fontSize: T.font.md }}>⚠️ {error}</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// ── Leaderboard Tab ──
function LeaderboardTab({ entries, metric, scope, myRank, onChangeMetric, onChangeScope }: {
    entries: LeaderboardEntry[]; metric: string; scope: string; myRank?: number;
    onChangeMetric: (m: string) => void; onChangeScope: (s: string) => void
}) {
    return (
        <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {SCOPES.map(s => (
                    <TouchableOpacity key={s.key} onPress={() => onChangeScope(s.key)} style={{
                        paddingHorizontal: 18, paddingVertical: 8, borderRadius: T.radius.pill, marginRight: 8,
                        backgroundColor: scope === s.key ? T.colors.primary : 'transparent',
                        ...(scope !== s.key ? T.glass.light : {}),
                    }}>
                        <Text style={{
                            color: scope === s.key ? '#FFF' : T.colors.muted,
                            fontWeight: '600', fontSize: T.font.md,
                        }}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {METRICS.map(m => (
                    <TouchableOpacity key={m.key} onPress={() => onChangeMetric(m.key)} style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.radius.md, marginRight: 8,
                        ...(metric === m.key ? T.glass.primary : T.glass.light),
                    }}>
                        <Text style={{
                            color: metric === m.key ? T.colors.primaryLight : T.colors.muted,
                            fontSize: T.font.sm + 1, fontWeight: '600',
                        }}>{m.emoji} {m.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            {myRank && (
                <View style={{
                    ...T.glass.primary, borderRadius: T.radius.lg,
                    padding: 15, marginBottom: 15, flexDirection: 'row',
                    alignItems: 'center', justifyContent: 'space-between',
                    ...T.glow(T.colors.primary, 0.08),
                }}>
                    <View>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1 }}>Ta position</Text>
                        <Text style={{ color: T.colors.primaryLight, fontSize: T.font.xxl, fontWeight: '900' }}>#{myRank}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1 }}>sur {entries.length} joueurs</Text>
                        <Text style={{ color: T.colors.accent, fontSize: T.font.md + 1, fontWeight: '600' }}>
                            {METRICS.find(m => m.key === metric)?.emoji} {METRICS.find(m => m.key === metric)?.label}
                        </Text>
                    </View>
                </View>
            )}
            {entries.length >= 3 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: T.space.xl }}>
                    <PodiumItem entry={entries[1]} position={2} />
                    <PodiumItem entry={entries[0]} position={1} />
                    <PodiumItem entry={entries[2]} position={3} />
                </View>
            )}
            {entries.slice(3).map(entry => (
                <LeaderboardRow key={entry.user_id} entry={entry} />
            ))}
            {entries.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>🏆</Text>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.base, textAlign: 'center' }}>
                        Aucun joueur dans le classement.{'\n'}Sois le premier !
                    </Text>
                </View>
            )}
        </View>
    )
}

function PodiumItem({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
    const heights = { 1: 100, 2: 75, 3: 60 }
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
    const colors = { 1: T.colors.gold, 2: '#C0C0C0', 3: '#CD7F32' }

    return (
        <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
            <View style={{
                width: position === 1 ? 64 : 50, height: position === 1 ? 64 : 50,
                backgroundColor: entry.is_me ? T.colors.primaryDim : T.colors.dimmer,
                borderRadius: 32, marginBottom: 6,
                borderWidth: 2, borderColor: colors[position],
                alignItems: 'center', justifyContent: 'center',
                ...(position === 1 ? T.glow(colors[position], 0.2) : {}),
            }}>
                <Text style={{ color: T.colors.white, fontWeight: 'bold', fontSize: position === 1 ? 20 : 15 }}>
                    {entry.username?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <Text style={{ color: T.colors.white, fontWeight: 'bold', fontSize: T.font.sm + 1, marginBottom: 2 }} numberOfLines={1}>
                {entry.is_me ? 'Toi' : entry.username}
            </Text>
            <Text style={{ color: T.colors.accent, fontWeight: 'bold', fontSize: T.font.md + 1 }}>{entry.score}</Text>
            <View style={{
                width: 70, height: heights[position], marginTop: 6,
                backgroundColor: colors[position], borderTopLeftRadius: T.radius.sm, borderTopRightRadius: T.radius.sm,
                alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, opacity: 0.85,
            }}>
                <Text style={{ fontSize: 22 }}>{medals[position]}</Text>
                <Text style={{ color: T.colors.bg, fontSize: T.font.sm, fontWeight: 'bold', marginTop: 2 }}>Nv.{entry.level}</Text>
            </View>
        </View>
    )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
    const trendColor = entry.trend === 'up' ? T.colors.green : entry.trend === 'down' ? T.colors.red : T.colors.muted
    const trendIcon = entry.trend === 'up' ? '↑' : entry.trend === 'down' ? '↓' : '—'
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            ...(entry.is_me ? T.glass.primary : T.glass.light),
            borderRadius: T.radius.lg, padding: 14, marginBottom: 8,
            ...(entry.is_me ? T.glow(T.colors.primary, 0.06) : {}),
        }}>
            <Text style={{
                color: entry.rank <= 5 ? T.colors.gold : T.colors.muted,
                fontWeight: 'bold', fontSize: T.font.lg, width: 35,
            }}>#{entry.rank}</Text>
            <View style={{
                width: 40, height: 40,
                backgroundColor: entry.is_me ? T.colors.primaryDim : T.colors.dimmer,
                borderRadius: 20, marginRight: 12, alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ color: T.colors.white, fontWeight: 'bold' }}>
                    {entry.username?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: T.colors.white, fontWeight: 'bold', fontSize: T.font.base }}>
                    {entry.is_me ? 'Toi' : entry.username}
                </Text>
                <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>
                    {entry.position || '—'} · Nv.{entry.level}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: T.colors.accent, fontWeight: 'bold', fontSize: T.font.lg }}>{entry.score}</Text>
                <Text style={{ color: trendColor, fontSize: T.font.sm + 1 }}>{trendIcon}</Text>
            </View>
        </View>
    )
}

// ── Challenges Tab ──
function ChallengesTab({ challenges, formatTimeLeft }: {
    challenges: ChallengeItem[]; formatTimeLeft: (s: string) => string
}) {
    return (
        <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <MaterialCommunityIcons name="sword-cross" size={20} color={T.colors.gold} />
                <Text style={{ color: T.colors.white, fontSize: T.font.lg, fontWeight: '800', marginLeft: 8 }}>
                    {challenges.length} défi{challenges.length !== 1 ? 's' : ''} actif{challenges.length !== 1 ? 's' : ''}
                </Text>
            </View>
            {challenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} formatTimeLeft={formatTimeLeft} />
            ))}
            {challenges.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>⚔️</Text>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.base, textAlign: 'center' }}>
                        Aucun défi actif pour le moment.{'\n'}Reviens bientôt !
                    </Text>
                </View>
            )}
        </View>
    )
}

function ChallengeCard({ challenge, formatTimeLeft }: { challenge: ChallengeItem; formatTimeLeft: (s: string) => string }) {
    const isLeader = challenge.my_rank === 1
    const timeLeft = formatTimeLeft(challenge.end_at)
    const isExpiringSoon = new Date(challenge.end_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 // < 24h

    return (
        <View style={{
            ...T.glass.light,
            borderRadius: T.radius.xl, padding: T.space.xl, marginBottom: 15,
            borderWidth: 1, borderColor: isLeader ? `${T.colors.green}50` : T.colors.border,
            ...(isLeader ? T.glow(T.colors.green, 0.06) : {}),
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: T.colors.white, fontWeight: '800', fontSize: T.font.lg }}>{challenge.title}</Text>
                    {challenge.description && (
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginTop: 2 }}>{challenge.description}</Text>
                    )}
                </View>
                <View style={{
                    backgroundColor: isExpiringSoon ? T.colors.red : T.colors.dimmer,
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: T.radius.sm, alignSelf: 'flex-start',
                    ...(isExpiringSoon ? T.glow(T.colors.red, 0.15) : {}),
                }}>
                    <Text style={{ color: '#FFF', fontSize: T.font.sm, fontWeight: 'bold' }}>⏱ {timeLeft}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>🥇 Leader</Text>
                    <Text style={{ color: T.colors.gold, fontSize: T.font.md + 1, fontWeight: 'bold' }}>
                        {challenge.leader_name || '—'} — {challenge.leader_value ?? '—'}
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>👥 Participants</Text>
                    <Text style={{ color: T.colors.white, fontSize: T.font.md + 1, fontWeight: 'bold' }}>{challenge.participants_count}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm }}>Toi — #{challenge.my_rank || '—'}</Text>
                    <Text style={{ color: T.colors.accent, fontSize: T.font.md + 1, fontWeight: 'bold' }}>{challenge.my_value ?? '—'}</Text>
                </View>
            </View>
            {challenge.reward && (
                <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginBottom: 12 }}>🎁 Récompense : {challenge.reward}</Text>
            )}
            {challenge.my_rank && challenge.participants_count > 0 && (
                <View style={{ marginBottom: 14 }}>
                    <View style={{ height: 6, backgroundColor: T.colors.dimmer, borderRadius: 3 }}>
                        <View style={{
                            height: 6, borderRadius: 3,
                            backgroundColor: isLeader ? T.colors.green : T.colors.primary,
                            width: `${Math.max(5, (1 - (challenge.my_rank - 1) / challenge.participants_count) * 100)}%`,
                        }} />
                    </View>
                </View>
            )}
            <TouchableOpacity style={{
                backgroundColor: isLeader ? T.colors.green : T.colors.accent,
                paddingVertical: 11, borderRadius: T.radius.md, alignItems: 'center',
                ...(isLeader ? T.glow(T.colors.green, 0.15) : T.glow(T.colors.accent, 0.15)),
            }}>
                <Text style={{ color: T.colors.bg, fontWeight: '800', fontSize: T.font.md + 1 }}>
                    {isLeader ? '👑 Tu es en tête !' : challenge.my_rank ? 'Améliorer mon score' : 'Participer'}
                </Text>
            </TouchableOpacity>
        </View>
    )
}

// ── Feed Tab ──
function FeedTab({ items, hasMore, onLoadMore, formatTimeAgo, loading }: {
    items: ActivityItem[]; hasMore: boolean; onLoadMore: () => void;
    formatTimeAgo: (s: string) => string; loading: boolean
}) {
    return (
        <View style={{ marginTop: 10 }}>
            {items.map(item => (
                <FeedItem key={item.id} item={item} formatTimeAgo={formatTimeAgo} />
            ))}
            {hasMore && (
                <TouchableOpacity onPress={onLoadMore} style={{
                    ...T.glass.light, padding: 14, borderRadius: T.radius.md, alignItems: 'center', marginTop: 8,
                }}>
                    {loading
                        ? <ActivityIndicator color={T.colors.accent} size="small" />
                        : <Text style={{ color: T.colors.accent, fontWeight: '600' }}>Charger plus</Text>
                    }
                </TouchableOpacity>
            )}
            {items.length === 0 && !loading && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>📡</Text>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.base, textAlign: 'center' }}>
                        Rien dans le feed pour le moment.{'\n'}Suis des joueurs pour voir leur activité !
                    </Text>
                </View>
            )}
        </View>
    )
}

function FeedItem({ item, formatTimeAgo }: { item: ActivityItem; formatTimeAgo: (s: string) => string }) {
    const emoji = ACTIVITY_EMOJIS[item.type] || '📌'
    return (
        <View style={{
            ...T.glass.light, borderRadius: T.radius.lg, padding: 15, marginBottom: 10,
            flexDirection: 'row', alignItems: 'flex-start',
        }}>
            <View style={{
                width: 42, height: 42, backgroundColor: T.colors.dimmer, borderRadius: T.radius.md,
                marginRight: 12, alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                    <Text style={{ color: T.colors.accent, fontWeight: 'bold', fontSize: T.font.md }}>
                        {item.username}
                    </Text>
                    <Text style={{ color: T.colors.dimmer, marginHorizontal: 6 }}>·</Text>
                    <Text style={{ color: T.colors.dim, fontSize: T.font.sm }}>{formatTimeAgo(item.created_at)}</Text>
                </View>
                <Text style={{ color: T.colors.white, fontSize: T.font.md + 1 }}>{item.title}</Text>
                {item.description && (
                    <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1, marginTop: 3 }}>{item.description}</Text>
                )}
            </View>
        </View>
    )
}

// ── Search Tab ──
function SearchTab({ query, onQueryChange, results, onFollow, onUnfollow }: {
    query: string; onQueryChange: (q: string) => void; results: SearchResult[];
    onFollow: (id: string) => void; onUnfollow: (id: string) => void
}) {
    return (
        <View style={{ marginTop: 10 }}>
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                ...T.glass.light, borderRadius: T.radius.lg, paddingHorizontal: 15, marginBottom: T.space.xl,
            }}>
                <Feather name="search" size={18} color={T.colors.muted} />
                <TextInput
                    style={{ flex: 1, color: T.colors.white, fontSize: T.font.base, paddingVertical: 14, marginLeft: 10 }}
                    placeholder="Rechercher un joueur..."
                    placeholderTextColor={T.colors.dim}
                    value={query}
                    onChangeText={onQueryChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => onQueryChange('')}>
                        <Ionicons name="close-circle" size={20} color={T.colors.muted} />
                    </TouchableOpacity>
                )}
            </View>
            {results.map(player => (
                <View key={player.user_id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    ...T.glass.light, borderRadius: T.radius.lg, padding: 14, marginBottom: 8,
                }}>
                    <View style={{
                        width: 44, height: 44, backgroundColor: T.colors.dimmer, borderRadius: 22,
                        marginRight: 12, alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Text style={{ color: T.colors.white, fontWeight: 'bold', fontSize: T.font.lg }}>
                            {player.username?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: T.colors.white, fontWeight: 'bold', fontSize: T.font.base }}>{player.username}</Text>
                        <Text style={{ color: T.colors.muted, fontSize: T.font.sm + 1 }}>
                            {player.position || '—'} · Nv.{player.level} · {player.xp} XP
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => player.is_following ? onUnfollow(player.user_id) : onFollow(player.user_id)}
                        style={{
                            paddingHorizontal: 16, paddingVertical: 8, borderRadius: T.radius.pill,
                            backgroundColor: player.is_following ? T.colors.dimmer : T.colors.accent,
                        }}
                    >
                        <Text style={{
                            color: player.is_following ? T.colors.muted : T.colors.bg,
                            fontWeight: '600', fontSize: T.font.sm + 1,
                        }}>
                            {player.is_following ? 'Suivi ✓' : 'Suivre'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ))}
            {query.length > 0 && results.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>🔍</Text>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.md + 1, textAlign: 'center' }}>
                        Aucun joueur trouvé pour "{query}"
                    </Text>
                </View>
            )}
            {query.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>👥</Text>
                    <Text style={{ color: T.colors.muted, fontSize: T.font.md + 1, textAlign: 'center' }}>
                        Recherche un joueur par nom{'\n'}ou pseudo pour le suivre
                    </Text>
                </View>
            )}
        </View>
    )
}
