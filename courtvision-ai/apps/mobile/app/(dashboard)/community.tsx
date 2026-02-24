import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, FlatList, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback } from 'react'
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCommunity, LeaderboardEntry, ChallengeItem, ActivityItem, SearchResult } from '../../hooks/useCommunity'

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
    common: '#8B949E',
    rare: '#1A73E8',
    epic: '#9C27B0',
    legendary: '#FFB300',
}

const ACTIVITY_EMOJIS: Record<string, string> = {
    session_complete: '🏀',
    badge_earned: '🎖️',
    challenge_won: '🏆',
    challenge_joined: '⚔️',
    follow: '👥',
    highlight_shared: '🎬',
    level_up: '⬆️',
    new_record: '🔥',
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1117' }}>
            {/* Header */}
            <View style={{ padding: 20, paddingBottom: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: '#E6EDF3', fontSize: 28, fontWeight: 'bold' }}>Communauté</Text>
                        <Text style={{ color: '#8B949E', fontSize: 14, marginTop: 2 }}>Le Strava du basket 🏀</Text>
                    </View>
                    <TouchableOpacity
                        style={{ position: 'relative' }}
                        onPress={() => { /* TODO: notifications screen */ }}
                    >
                        <Ionicons name="notifications-outline" size={26} color="#E6EDF3" />
                        {unreadCount > 0 && (
                            <View style={{
                                position: 'absolute', top: -5, right: -5,
                                backgroundColor: '#FF3D57', borderRadius: 10,
                                minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* My Badges Preview */}
                {myBadges.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                        {myBadges.slice(0, 8).map(badge => (
                            <View key={badge.id} style={{
                                backgroundColor: '#161B22', borderRadius: 12,
                                paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
                                borderWidth: 1, borderColor: BADGE_RARITY_COLORS[badge.rarity] || '#8B949E',
                                flexDirection: 'row', alignItems: 'center',
                            }}>
                                <Text style={{ fontSize: 14, marginRight: 4 }}>{badge.emoji}</Text>
                                <Text style={{ color: BADGE_RARITY_COLORS[badge.rarity], fontSize: 11, fontWeight: '600' }}>{badge.name}</Text>
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
                            borderRadius: 20,
                            backgroundColor: activeTab === tab.key ? '#1A73E8' : '#161B22',
                        }}
                    >
                        <Text style={{
                            color: activeTab === tab.key ? '#FFF' : '#8B949E',
                            fontWeight: '600', fontSize: 13,
                        }}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
            >
                {activeTab === 'leaderboard' && (
                    <LeaderboardTab
                        entries={leaderboard}
                        metric={leaderboardMetric}
                        scope={leaderboardScope}
                        myRank={myRank}
                        onChangeMetric={(m) => fetchLeaderboard(m)}
                        onChangeScope={(s) => fetchLeaderboard(undefined, s)}
                    />
                )}

                {activeTab === 'challenges' && (
                    <ChallengesTab
                        challenges={challenges}
                        formatTimeLeft={formatTimeLeft}
                    />
                )}

                {activeTab === 'feed' && (
                    <FeedTab
                        items={feed}
                        hasMore={feedHasMore}
                        onLoadMore={loadMoreFeed}
                        formatTimeAgo={formatTimeAgo}
                        loading={loading}
                    />
                )}

                {activeTab === 'search' && (
                    <SearchTab
                        query={searchQuery}
                        onQueryChange={(q) => { setSearchQuery(q); searchPlayers(q) }}
                        results={searchResults}
                        onFollow={followUser}
                        onUnfollow={unfollowUser}
                    />
                )}

                {error && (
                    <View style={{ backgroundColor: 'rgba(255,61,87,0.1)', padding: 12, borderRadius: 10, marginTop: 15 }}>
                        <Text style={{ color: '#FF3D57', fontSize: 13 }}>⚠️ {error}</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// ==========================================
// Leaderboard Tab
// ==========================================

function LeaderboardTab({ entries, metric, scope, myRank, onChangeMetric, onChangeScope }: {
    entries: LeaderboardEntry[]
    metric: string
    scope: string
    myRank?: number
    onChangeMetric: (m: string) => void
    onChangeScope: (s: string) => void
}) {
    return (
        <View style={{ marginTop: 10 }}>
            {/* Scope selector */}
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {SCOPES.map(s => (
                    <TouchableOpacity
                        key={s.key}
                        onPress={() => onChangeScope(s.key)}
                        style={{
                            paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginRight: 8,
                            backgroundColor: scope === s.key ? '#1A73E8' : '#161B22',
                        }}
                    >
                        <Text style={{ color: scope === s.key ? '#FFF' : '#8B949E', fontWeight: '600', fontSize: 13 }}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Metric selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {METRICS.map(m => (
                    <TouchableOpacity
                        key={m.key}
                        onPress={() => onChangeMetric(m.key)}
                        style={{
                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginRight: 8,
                            backgroundColor: metric === m.key ? 'rgba(26,115,232,0.2)' : '#161B22',
                            borderWidth: 1, borderColor: metric === m.key ? '#1A73E8' : '#161B22',
                        }}
                    >
                        <Text style={{ color: metric === m.key ? '#1A73E8' : '#8B949E', fontSize: 12, fontWeight: '600' }}>
                            {m.emoji} {m.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* My rank card */}
            {myRank && (
                <View style={{
                    backgroundColor: 'rgba(26,115,232,0.1)', borderRadius: 15, padding: 15, marginBottom: 15,
                    borderWidth: 1, borderColor: '#1A73E8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <View>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>Ta position</Text>
                        <Text style={{ color: '#1A73E8', fontSize: 24, fontWeight: 'bold' }}>#{myRank}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>sur {entries.length} joueurs</Text>
                        <Text style={{ color: '#00D4FF', fontSize: 14, fontWeight: '600' }}>
                            {METRICS.find(m => m.key === metric)?.emoji} {METRICS.find(m => m.key === metric)?.label}
                        </Text>
                    </View>
                </View>
            )}

            {/* Podium (top 3) */}
            {entries.length >= 3 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 20 }}>
                    {/* 2nd */}
                    <PodiumItem entry={entries[1]} position={2} />
                    {/* 1st */}
                    <PodiumItem entry={entries[0]} position={1} />
                    {/* 3rd */}
                    <PodiumItem entry={entries[2]} position={3} />
                </View>
            )}

            {/* Rest of the list */}
            {entries.slice(3).map(entry => (
                <LeaderboardRow key={entry.user_id} entry={entry} />
            ))}

            {entries.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>🏆</Text>
                    <Text style={{ color: '#8B949E', fontSize: 15, textAlign: 'center' }}>
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
    const colors = { 1: '#FFB300', 2: '#C0C0C0', 3: '#CD7F32' }

    return (
        <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
            {/* Avatar */}
            <View style={{
                width: position === 1 ? 60 : 48, height: position === 1 ? 60 : 48,
                backgroundColor: entry.is_me ? '#1A73E8' : '#30363D',
                borderRadius: 30, marginBottom: 6,
                borderWidth: 2, borderColor: colors[position],
                alignItems: 'center', justifyContent: 'center'
            }}>
                <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: position === 1 ? 18 : 14 }}>
                    {entry.username?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 12, marginBottom: 2 }} numberOfLines={1}>
                {entry.is_me ? 'Toi' : entry.username}
            </Text>
            <Text style={{ color: '#00D4FF', fontWeight: 'bold', fontSize: 14 }}>{entry.score}</Text>

            {/* Podium bar */}
            <View style={{
                width: 70, height: heights[position], marginTop: 6,
                backgroundColor: colors[position], borderTopLeftRadius: 10, borderTopRightRadius: 10,
                alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8,
                opacity: 0.8,
            }}>
                <Text style={{ fontSize: 22 }}>{medals[position]}</Text>
                <Text style={{ color: '#0D1117', fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>Nv.{entry.level}</Text>
            </View>
        </View>
    )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
    const trendColor = entry.trend === 'up' ? '#00C853' : entry.trend === 'down' ? '#FF3D57' : '#8B949E'
    const trendIcon = entry.trend === 'up' ? '↑' : entry.trend === 'down' ? '↓' : '—'

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: entry.is_me ? 'rgba(26,115,232,0.12)' : '#161B22',
            borderRadius: 15, padding: 14, marginBottom: 8,
            borderWidth: entry.is_me ? 1 : 0, borderColor: '#1A73E8',
        }}>
            <Text style={{
                color: entry.rank <= 5 ? '#FFB300' : '#8B949E',
                fontWeight: 'bold', fontSize: 16, width: 35
            }}>#{entry.rank}</Text>

            <View style={{
                width: 40, height: 40, backgroundColor: entry.is_me ? '#1A73E8' : '#30363D',
                borderRadius: 20, marginRight: 12, alignItems: 'center', justifyContent: 'center'
            }}>
                <Text style={{ color: '#E6EDF3', fontWeight: 'bold' }}>
                    {entry.username?.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={{ flex: 1 }}>
                <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 15 }}>
                    {entry.is_me ? 'Toi' : entry.username}
                </Text>
                <Text style={{ color: '#8B949E', fontSize: 11 }}>
                    {entry.position || '—'} · Nv.{entry.level}
                </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#00D4FF', fontWeight: 'bold', fontSize: 17 }}>{entry.score}</Text>
                <Text style={{ color: trendColor, fontSize: 12 }}>{trendIcon}</Text>
            </View>
        </View>
    )
}

// ==========================================
// Challenges Tab
// ==========================================

function ChallengesTab({ challenges, formatTimeLeft }: {
    challenges: ChallengeItem[]
    formatTimeLeft: (s: string) => string
}) {
    return (
        <View style={{ marginTop: 10 }}>
            {/* Active challenges header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <MaterialCommunityIcons name="sword-cross" size={20} color="#FFB300" />
                <Text style={{ color: '#E6EDF3', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
                    {challenges.length} défi{challenges.length !== 1 ? 's' : ''} actif{challenges.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {challenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} formatTimeLeft={formatTimeLeft} />
            ))}

            {challenges.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>⚔️</Text>
                    <Text style={{ color: '#8B949E', fontSize: 15, textAlign: 'center' }}>
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
            backgroundColor: '#161B22', borderRadius: 20, padding: 20, marginBottom: 15,
            borderWidth: 1, borderColor: isLeader ? '#00C853' : '#21262D',
        }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 16 }}>{challenge.title}</Text>
                    {challenge.description && (
                        <Text style={{ color: '#8B949E', fontSize: 12, marginTop: 2 }}>{challenge.description}</Text>
                    )}
                </View>
                <View style={{
                    backgroundColor: isExpiringSoon ? '#FF3D57' : '#30363D',
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start'
                }}>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>⏱ {timeLeft}</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                    <Text style={{ color: '#8B949E', fontSize: 11 }}>🥇 Leader</Text>
                    <Text style={{ color: '#FFB300', fontSize: 14, fontWeight: 'bold' }}>
                        {challenge.leader_name || '—'} — {challenge.leader_value ?? '—'}
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#8B949E', fontSize: 11 }}>👥 Participants</Text>
                    <Text style={{ color: '#E6EDF3', fontSize: 14, fontWeight: 'bold' }}>{challenge.participants_count}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#8B949E', fontSize: 11 }}>Toi — #{challenge.my_rank || '—'}</Text>
                    <Text style={{ color: '#00D4FF', fontSize: 14, fontWeight: 'bold' }}>{challenge.my_value ?? '—'}</Text>
                </View>
            </View>

            {/* Reward */}
            {challenge.reward && (
                <Text style={{ color: '#8B949E', fontSize: 12, marginBottom: 12 }}>
                    🎁 Récompense : {challenge.reward}
                </Text>
            )}

            {/* Progress bar (my rank vs total) */}
            {challenge.my_rank && challenge.participants_count > 0 && (
                <View style={{ marginBottom: 14 }}>
                    <View style={{ height: 6, backgroundColor: '#21262D', borderRadius: 3 }}>
                        <View style={{
                            height: 6, borderRadius: 3,
                            backgroundColor: isLeader ? '#00C853' : '#1A73E8',
                            width: `${Math.max(5, (1 - (challenge.my_rank - 1) / challenge.participants_count) * 100)}%`,
                        }} />
                    </View>
                </View>
            )}

            {/* CTA */}
            <TouchableOpacity style={{
                backgroundColor: isLeader ? '#00C853' : '#1A73E8',
                paddingVertical: 11, borderRadius: 12, alignItems: 'center',
            }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                    {isLeader ? '👑 Tu es en tête !' : challenge.my_rank ? 'Améliorer mon score' : 'Participer'}
                </Text>
            </TouchableOpacity>
        </View>
    )
}

// ==========================================
// Feed Tab
// ==========================================

function FeedTab({ items, hasMore, onLoadMore, formatTimeAgo, loading }: {
    items: ActivityItem[]
    hasMore: boolean
    onLoadMore: () => void
    formatTimeAgo: (s: string) => string
    loading: boolean
}) {
    return (
        <View style={{ marginTop: 10 }}>
            {items.map(item => (
                <FeedItem key={item.id} item={item} formatTimeAgo={formatTimeAgo} />
            ))}

            {hasMore && (
                <TouchableOpacity
                    onPress={onLoadMore}
                    style={{
                        backgroundColor: '#161B22', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8,
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color="#1A73E8" size="small" />
                    ) : (
                        <Text style={{ color: '#1A73E8', fontWeight: '600' }}>Charger plus</Text>
                    )}
                </TouchableOpacity>
            )}

            {items.length === 0 && !loading && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>📡</Text>
                    <Text style={{ color: '#8B949E', fontSize: 15, textAlign: 'center' }}>
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
            backgroundColor: '#161B22', borderRadius: 15, padding: 15, marginBottom: 10,
            flexDirection: 'row', alignItems: 'flex-start',
        }}>
            {/* Avatar */}
            <View style={{
                width: 42, height: 42, backgroundColor: '#30363D', borderRadius: 21,
                marginRight: 12, alignItems: 'center', justifyContent: 'center'
            }}>
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                    <Text style={{ color: '#1A73E8', fontWeight: 'bold', fontSize: 13 }}>{item.username}</Text>
                    <Text style={{ color: '#30363D', marginHorizontal: 6 }}>·</Text>
                    <Text style={{ color: '#484F58', fontSize: 11 }}>{formatTimeAgo(item.created_at)}</Text>
                </View>
                <Text style={{ color: '#E6EDF3', fontSize: 14 }}>{item.title}</Text>
                {item.description && (
                    <Text style={{ color: '#8B949E', fontSize: 12, marginTop: 3 }}>{item.description}</Text>
                )}
            </View>
        </View>
    )
}

// ==========================================
// Search Tab
// ==========================================

function SearchTab({ query, onQueryChange, results, onFollow, onUnfollow }: {
    query: string
    onQueryChange: (q: string) => void
    results: SearchResult[]
    onFollow: (id: string) => void
    onUnfollow: (id: string) => void
}) {
    return (
        <View style={{ marginTop: 10 }}>
            {/* Search bar */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#161B22', borderRadius: 15, paddingHorizontal: 15, marginBottom: 20,
                borderWidth: 1, borderColor: '#21262D',
            }}>
                <Feather name="search" size={18} color="#8B949E" />
                <TextInput
                    style={{
                        flex: 1, color: '#E6EDF3', fontSize: 15, paddingVertical: 14, marginLeft: 10,
                    }}
                    placeholder="Rechercher un joueur..."
                    placeholderTextColor="#484F58"
                    value={query}
                    onChangeText={onQueryChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => onQueryChange('')}>
                        <Ionicons name="close-circle" size={20} color="#8B949E" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Results */}
            {results.map(player => (
                <View key={player.user_id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#161B22', borderRadius: 15, padding: 14, marginBottom: 8,
                }}>
                    <View style={{
                        width: 44, height: 44, backgroundColor: '#30363D', borderRadius: 22,
                        marginRight: 12, alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 16 }}>
                            {player.username?.charAt(0).toUpperCase()}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: 15 }}>{player.username}</Text>
                        <Text style={{ color: '#8B949E', fontSize: 12 }}>
                            {player.position || '—'} · Nv.{player.level} · {player.xp} XP
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => player.is_following ? onUnfollow(player.user_id) : onFollow(player.user_id)}
                        style={{
                            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                            backgroundColor: player.is_following ? '#21262D' : '#1A73E8',
                        }}
                    >
                        <Text style={{
                            color: player.is_following ? '#8B949E' : '#FFF',
                            fontWeight: '600', fontSize: 12,
                        }}>
                            {player.is_following ? 'Suivi ✓' : 'Suivre'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ))}

            {query.length > 0 && results.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>🔍</Text>
                    <Text style={{ color: '#8B949E', fontSize: 14, textAlign: 'center' }}>
                        Aucun joueur trouvé pour "{query}"
                    </Text>
                </View>
            )}

            {query.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>👥</Text>
                    <Text style={{ color: '#8B949E', fontSize: 14, textAlign: 'center' }}>
                        Recherche un joueur par nom{'\n'}ou pseudo pour le suivre
                    </Text>
                </View>
            )}
        </View>
    )
}
