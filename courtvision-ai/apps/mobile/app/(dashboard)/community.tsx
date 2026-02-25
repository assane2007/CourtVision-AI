/**
 * CourtVision AI  Community V3
 * 
 * "Squad" tab  3 sub-tabs:
 *   1. Rankings (podium + leaderboard + search)
 *   2. Feed (activity stream)
 *   3. Challenges (active challenges)
 * 
 */

import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback } from 'react'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { useCommunity, LeaderboardEntry, ChallengeItem, ActivityItem, SearchResult } from '../../hooks/useCommunity'
import { T } from '../../lib/theme'

//  Constants 

const TABS = [
    { key: 'rankings',   label: 'Rankings',   icon: 'award' as const },
    { key: 'feed',       label: 'Feed',       icon: 'rss' as const },
    { key: 'challenges', label: 'Challenges', icon: 'target' as const },
] as const
type TabKey = (typeof TABS)[number]['key']

const METRICS = [
    { key: 'overall',  label: 'Overall',  emoji: 'award' as const },
    { key: 'shooting', label: 'Shooting', emoji: 'crosshair' as const },
    { key: 'mental',   label: 'Mental',   emoji: 'activity' as const },
    { key: 'sessions', label: 'Sessions', emoji: 'bar-chart-2' as const },
]

const SCOPES = [
    { key: 'global',  label: 'Global' },
    { key: 'friends', label: 'Friends' },
]

const ACTIVITY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
    session_complete: 'play-circle',
    badge_earned: 'award',
    challenge_won: 'award',
    challenge_joined: 'target',
    follow: 'user-plus',
    highlight_shared: 'film',
    level_up: 'trending-up',
    new_record: 'zap',
}

const BADGE_RARITY_COLORS: Record<string, string> = {
    common: T.colors.muted,
    rare: T.colors.primary,
    epic: T.colors.purple,
    legendary: T.colors.accent,
}

//  Glass Card 

function Glass({ children, style, accent = false }: any) {
    return (
        <View style={[{
            borderRadius: T.radius.lg, padding: 16,
            ...(accent ? T.glass.accent : T.glass.light),
        }, style]}>
            {children}
        </View>
    )
}

//  Time helpers 

function formatTimeLeft(endAt: string): string {
    const diff = new Date(endAt).getTime() - Date.now()
    if (diff <= 0) return 'Ended'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m`
}

function formatTimeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / (1000 * 60))
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

// 
// MAIN COMPONENT
// 

export default function Community() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabKey>('rankings')
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const {
        leaderboard, leaderboardMetric, leaderboardScope, myRank,
        fetchLeaderboard,
        challenges, fetchChallenges,
        feed, feedHasMore, fetchFeed, loadMoreFeed,
        followUser, unfollowUser,
        myBadges, notifications, unreadCount,
        searchResults, searchPlayers,
        loading, error,
    } = useCommunity()

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        if (activeTab === 'rankings') await fetchLeaderboard()
        else if (activeTab === 'challenges') await fetchChallenges()
        else if (activeTab === 'feed') await fetchFeed(true)
        setRefreshing(false)
    }, [activeTab, fetchLeaderboard, fetchChallenges, fetchFeed])

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: T.colors.bg }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Animated.Text
                            entering={FadeInDown.duration(400)}
                            style={{
                                color: T.colors.white, fontSize: 26,
                                fontWeight: '900', fontFamily: T.fonts.display.black, letterSpacing: -0.5,
                            }}
                        >
                            Squad
                        </Animated.Text>
                        <Text style={{ color: T.colors.muted, fontSize: 12, fontFamily: T.fonts.body.regular, marginTop: 2 }}>
                            The Strava of basketball
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={{
                            position: 'relative', width: 40, height: 40,
                            borderRadius: T.radius.md, ...T.glass.light,
                            justifyContent: 'center', alignItems: 'center',
                        }}
                        onPress={() => {}}
                    >
                        <Feather name="bell" size={18} color={T.colors.white} />
                        {unreadCount > 0 && (
                            <View style={{
                                position: 'absolute', top: -3, right: -3,
                                backgroundColor: T.colors.red, borderRadius: 8,
                                minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800', fontFamily: T.fonts.display.bold }}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Badge preview */}
                {myBadges.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                        {myBadges.slice(0, 6).map(badge => (
                            <View key={badge.id} style={{
                                ...T.glass.light, borderRadius: 8,
                                paddingHorizontal: 8, paddingVertical: 5, marginRight: 6,
                                borderWidth: 1, borderColor: `${BADGE_RARITY_COLORS[badge.rarity] || T.colors.muted}30`,
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                            }}>
                                <Text style={{ fontSize: 12 }}>{badge.emoji}</Text>
                                <Text style={{
                                    color: BADGE_RARITY_COLORS[badge.rarity] || T.colors.muted,
                                    fontSize: 10, fontWeight: '700',
                                    fontFamily: T.fonts.body.bold,
                                }}>{badge.name}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Tab Pills */}
            <View style={{
                flexDirection: 'row', marginHorizontal: 20, marginVertical: 10,
                ...T.glass.light, borderRadius: T.radius.md, padding: 3,
            }}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                            flexDirection: 'row', justifyContent: 'center', gap: 5,
                            backgroundColor: activeTab === tab.key ? T.colors.accent : 'transparent',
                        }}
                    >
                        <Feather
                            name={tab.icon}
                            size={13}
                            color={activeTab === tab.key ? '#fff' : T.colors.dim}
                        />
                        <Text style={{
                            color: activeTab === tab.key ? '#fff' : T.colors.dim,
                            fontWeight: '700', fontSize: 12,
                            fontFamily: T.fonts.body.bold,
                        }}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.colors.accent} />
                }
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'rankings' && (
                    <RankingsTab
                        entries={leaderboard} metric={leaderboardMetric}
                        scope={leaderboardScope} myRank={myRank}
                        onChangeMetric={(m) => fetchLeaderboard(m)}
                        onChangeScope={(s) => fetchLeaderboard(undefined, s)}
                        searchQuery={searchQuery}
                        onSearchChange={(q) => { setSearchQuery(q); searchPlayers(q) }}
                        searchResults={searchResults}
                        onFollow={followUser} onUnfollow={unfollowUser}
                    />
                )}
                {activeTab === 'feed' && (
                    <FeedTab items={feed} hasMore={feedHasMore} onLoadMore={loadMoreFeed} loading={loading} />
                )}
                {activeTab === 'challenges' && (
                    <ChallengesTab challenges={challenges} />
                )}
                {error && (
                    <Glass style={{ borderColor: `${T.colors.red}30`, marginTop: 12 }}>
                        <Text style={{ color: T.colors.red, fontSize: 12 }}>Error: {error}</Text>
                    </Glass>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// 
// RANKINGS TAB
// 

function RankingsTab({ entries, metric, scope, myRank, onChangeMetric, onChangeScope,
    searchQuery, onSearchChange, searchResults, onFollow, onUnfollow }: {
    entries: LeaderboardEntry[]; metric: string; scope: string; myRank?: number;
    onChangeMetric: (m: string) => void; onChangeScope: (s: string) => void;
    searchQuery: string; onSearchChange: (q: string) => void;
    searchResults: SearchResult[]; onFollow: (id: string) => void; onUnfollow: (id: string) => void;
}) {
    return (
        <View style={{ marginTop: 8 }}>
            {/* Search bar */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                ...T.glass.light, borderRadius: T.radius.md, paddingHorizontal: 12, marginBottom: 12,
            }}>
                <Feather name="search" size={16} color={T.colors.dim} />
                <TextInput
                    style={{ flex: 1, color: T.colors.white, fontSize: 13, paddingVertical: 11, marginLeft: 8 }}
                    placeholder="Search players..."
                    placeholderTextColor={T.colors.dim}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    autoCapitalize="none" autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange('')}>
                        <Feather name="x-circle" size={16} color={T.colors.dim} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Search results overlay */}
            {searchQuery.length > 0 ? (
                <View>
                    {searchResults.map(player => (
                        <SearchResultRow key={player.user_id} player={player}
                            onFollow={onFollow} onUnfollow={onUnfollow} />
                    ))}
                    {searchResults.length === 0 && (
                        <View style={{ alignItems: 'center', padding: 32 }}>
                            <Feather name="search" size={28} color={T.colors.dim} />
                            <Text style={{ color: T.colors.muted, fontSize: 13, marginTop: 8 }}>
                                No players found for "{searchQuery}"
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <>
                    {/* Scope + Metric filters */}
                    <View style={{ flexDirection: 'row', marginBottom: 10, gap: 6 }}>
                        {SCOPES.map(s => (
                            <TouchableOpacity key={s.key} onPress={() => onChangeScope(s.key)} style={{
                                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                                backgroundColor: scope === s.key ? T.colors.accent : 'transparent',
                                ...(scope !== s.key ? T.glass.light : {}),
                            }}>
                                <Text style={{
                                    color: scope === s.key ? '#fff' : T.colors.muted,
                                    fontWeight: '700', fontSize: 12,
                                    fontFamily: T.fonts.body.bold,
                                }}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                        {METRICS.map(m => (
                            <TouchableOpacity key={m.key} onPress={() => onChangeMetric(m.key)} style={{
                                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, marginRight: 6,
                                backgroundColor: metric === m.key ? `${T.colors.accent}15` : 'transparent',
                                ...(metric !== m.key ? T.glass.light : {}),
                                borderWidth: metric === m.key ? 1 : 0,
                                borderColor: `${T.colors.accent}30`,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Feather name={m.emoji} size={12}
                                        color={metric === m.key ? T.colors.accent : T.colors.dim} />
                                    <Text style={{
                                        color: metric === m.key ? T.colors.accent : T.colors.muted,
                                        fontSize: 11, fontWeight: '600',
                                        fontFamily: T.fonts.body.semibold,
                                    }}>{m.label}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* My Rank */}
                    {myRank != null && (
                        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                            <Glass accent style={{
                                marginBottom: 14, flexDirection: 'row',
                                alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <View>
                                    <Text style={{ color: T.colors.muted, fontSize: 10, fontWeight: '600', fontFamily: T.fonts.body.semibold }}>Your rank</Text>
                                    <Text style={{ color: T.colors.accent, fontSize: 26, fontWeight: '900', fontFamily: T.fonts.display.black }}>#{myRank}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: T.colors.dim, fontSize: 10 }}>of {entries.length} players</Text>
                                    <Text style={{ color: T.colors.accent, fontSize: 12, fontWeight: '600', marginTop: 2, fontFamily: T.fonts.body.semibold }}>
                                        {METRICS.find(m => m.key === metric)?.label}
                                    </Text>
                                </View>
                            </Glass>
                        </Animated.View>
                    )}

                    {/* Podium */}
                    {entries.length >= 3 && (
                        <Animated.View
                            entering={FadeInDown.delay(200).duration(500)}
                            style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 20 }}
                        >
                            <PodiumItem entry={entries[1]} position={2} />
                            <PodiumItem entry={entries[0]} position={1} />
                            <PodiumItem entry={entries[2]} position={3} />
                        </Animated.View>
                    )}

                    {/* Rest of leaderboard */}
                    {entries.slice(3).map((entry, i) => (
                        <Animated.View key={entry.user_id} entering={FadeInDown.delay(300 + i * 40).duration(300)}>
                            <LeaderboardRow entry={entry} />
                        </Animated.View>
                    ))}

                    {entries.length === 0 && (
                        <View style={{ alignItems: 'center', padding: 40 }}>
                            <Feather name="award" size={36} color={T.colors.dim} />
                            <Text style={{ color: T.colors.muted, fontSize: 13, textAlign: 'center', marginTop: 10 }}>
                                {'No players ranked yet.\nBe the first!'}
                            </Text>
                        </View>
                    )}
                </>
            )}
        </View>
    )
}

function PodiumItem({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
    const heights: Record<number, number> = { 1: 90, 2: 65, 3: 50 }
    const medals: Record<number, string> = { 1: '\uD83E\uDD47', 2: '\uD83E\uDD48', 3: '\uD83E\uDD49' }
    const colors: Record<number, string> = { 1: T.colors.gold, 2: '#C0C0C0', 3: '#CD7F32' }

    return (
        <View style={{ alignItems: 'center', marginHorizontal: 6 }}>
            <View style={{
                width: position === 1 ? 58 : 46, height: position === 1 ? 58 : 46,
                backgroundColor: entry.is_me ? T.color.signature.dim : T.color.background.tertiary,
                borderRadius: 30, marginBottom: 6,
                borderWidth: 2, borderColor: colors[position],
                alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ color: T.colors.white, fontWeight: '800', fontFamily: T.fonts.display.black, fontSize: position === 1 ? 18 : 14 }}>
                    {entry.username?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <Text style={{ color: T.colors.white, fontWeight: '700', fontSize: 11, fontFamily: T.fonts.body.bold }} numberOfLines={1}>
                {entry.is_me ? 'You' : entry.username}
            </Text>
            <Text style={{ color: T.colors.accent, fontWeight: '800', fontFamily: T.fonts.display.black, fontSize: 13 }}>{entry.score}</Text>
            <View style={{
                width: 64, height: heights[position], marginTop: 6,
                backgroundColor: colors[position], borderTopLeftRadius: 6, borderTopRightRadius: 6,
                alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, opacity: 0.85,
            }}>
                <Text style={{ fontSize: 20 }}>{medals[position]}</Text>
                <Text style={{ color: T.colors.bg, fontSize: 10, fontWeight: '800', marginTop: 2, fontFamily: T.fonts.display.bold }}>Lv.{entry.level}</Text>
            </View>
        </View>
    )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
    const trendColor = entry.trend === 'up' ? T.colors.green : entry.trend === 'down' ? T.colors.red : T.colors.dim
    const trendIcon: keyof typeof Feather.glyphMap =
        entry.trend === 'up' ? 'trending-up' : entry.trend === 'down' ? 'trending-down' : 'minus'

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            ...(entry.is_me ? T.glass.accent : T.glass.light),
            borderRadius: T.radius.md, padding: 12, marginBottom: 6,
        }}>
            <Text style={{
                color: entry.rank <= 5 ? T.colors.gold : T.colors.dim,
                fontWeight: '800', fontFamily: T.fonts.display.black, fontSize: 14, width: 32, fontVariant: ['tabular-nums'],
            }}>#{entry.rank}</Text>
            <View style={{
                width: 36, height: 36,
                backgroundColor: entry.is_me ? T.color.signature.dim : T.color.background.tertiary,
                borderRadius: 18, marginRight: 10, alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ color: T.colors.white, fontWeight: '700', fontSize: 13 }}>
                    {entry.username?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: T.colors.white, fontWeight: '700', fontSize: 13 }}>
                    {entry.is_me ? 'You' : entry.username}
                </Text>
                <Text style={{ color: T.colors.dim, fontSize: 10 }}>
                    {entry.position || '-'} \u00B7 Lv.{entry.level}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={{ color: T.colors.accent, fontWeight: '800', fontFamily: T.fonts.display.black, fontSize: 14 }}>{entry.score}</Text>
                <Feather name={trendIcon} size={12} color={trendColor} />
            </View>
        </View>
    )
}

function SearchResultRow({ player, onFollow, onUnfollow }: {
    player: SearchResult; onFollow: (id: string) => void; onUnfollow: (id: string) => void
}) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            ...T.glass.light, borderRadius: T.radius.md, padding: 12, marginBottom: 6,
        }}>
            <View style={{
                width: 40, height: 40, backgroundColor: T.color.background.tertiary,
                borderRadius: 20, marginRight: 10, alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ color: T.colors.white, fontWeight: '700', fontSize: 14 }}>
                    {player.username?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: T.colors.white, fontWeight: '700', fontSize: 13 }}>{player.username}</Text>
                <Text style={{ color: T.colors.dim, fontSize: 10 }}>
                    {player.position || '-'} \u00B7 Lv.{player.level} \u00B7 {player.xp} XP
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => player.is_following ? onUnfollow(player.user_id) : onFollow(player.user_id)}
                style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: player.is_following ? T.color.background.tertiary : T.colors.accent,
                }}
            >
                <Text style={{
                    color: player.is_following ? T.colors.muted : '#fff',
                    fontWeight: '700', fontSize: 11,
                }}>
                    {player.is_following ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </View>
    )
}

// 
// FEED TAB
// 

function FeedTab({ items, hasMore, onLoadMore, loading }: {
    items: ActivityItem[]; hasMore: boolean; onLoadMore: () => void; loading: boolean
}) {
    return (
        <View style={{ marginTop: 8 }}>
            {items.map((item, i) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                    <FeedItem item={item} />
                </Animated.View>
            ))}
            {hasMore && (
                <TouchableOpacity
                    onPress={onLoadMore}
                    style={{ ...T.glass.light, padding: 12, borderRadius: T.radius.md, alignItems: 'center', marginTop: 6 }}
                >
                    {loading
                        ? <ActivityIndicator color={T.colors.accent} size="small" />
                        : <Text style={{ color: T.colors.accent, fontWeight: '600', fontSize: 12 }}>Load more</Text>
                    }
                </TouchableOpacity>
            )}
            {items.length === 0 && !loading && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Feather name="rss" size={32} color={T.colors.dim} />
                    <Text style={{ color: T.colors.muted, fontSize: 13, textAlign: 'center', marginTop: 10 }}>
                        {'Nothing in the feed yet.\nFollow players to see their activity!'}
                    </Text>
                </View>
            )}
        </View>
    )
}

function FeedItem({ item }: { item: ActivityItem }) {
    const icon = ACTIVITY_ICONS[item.type] || 'activity'
    return (
        <View style={{
            ...T.glass.light, borderRadius: T.radius.md, padding: 14, marginBottom: 8,
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        }}>
            <View style={{
                width: 36, height: 36, backgroundColor: T.color.background.tertiary,
                borderRadius: 10, alignItems: 'center', justifyContent: 'center',
            }}>
                <Feather name={icon} size={16} color={T.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: T.colors.accent, fontWeight: '700', fontSize: 12 }}>
                        {item.username}
                    </Text>
                    <Text style={{ color: T.colors.dim, fontSize: 10 }}>{formatTimeAgo(item.created_at)}</Text>
                </View>
                <Text style={{ color: T.colors.white, fontSize: 13, marginTop: 2 }}>{item.title}</Text>
                {item.description && (
                    <Text style={{ color: T.colors.muted, fontSize: 11, marginTop: 2 }}>{item.description}</Text>
                )}
            </View>
        </View>
    )
}

// 
// CHALLENGES TAB
// 

function ChallengesTab({ challenges }: { challenges: ChallengeItem[] }) {
    return (
        <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Feather name="target" size={16} color={T.colors.accent} />
                <Text style={{ color: T.colors.white, fontSize: 15, fontWeight: '800', fontFamily: T.fonts.display.black }}>
                    {challenges.length} active challenge{challenges.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {challenges.map((challenge, i) => (
                <Animated.View key={challenge.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                    <ChallengeCard challenge={challenge} />
                </Animated.View>
            ))}

            {challenges.length === 0 && (
                <View style={{ alignItems: 'center', padding: 40 }}>
                    <Feather name="target" size={32} color={T.colors.dim} />
                    <Text style={{ color: T.colors.muted, fontSize: 13, textAlign: 'center', marginTop: 10 }}>
                        {'No active challenges right now.\nCheck back soon!'}
                    </Text>
                </View>
            )}
        </View>
    )
}

function ChallengeCard({ challenge }: { challenge: ChallengeItem }) {
    const isLeader = challenge.my_rank === 1
    const timeLeft = formatTimeLeft(challenge.end_at)
    const isExpiring = new Date(challenge.end_at).getTime() - Date.now() < 1000 * 60 * 60 * 24

    return (
        <Glass style={{
            marginBottom: 12, borderColor: isLeader ? `${T.colors.green}40` : T.colors.border,
            borderWidth: 1,
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: T.colors.white, fontWeight: '800', fontFamily: T.fonts.display.black, fontSize: 15 }}>{challenge.title}</Text>
                    {challenge.description && (
                        <Text style={{ color: T.colors.muted, fontSize: 11, marginTop: 2 }}>{challenge.description}</Text>
                    )}
                </View>
                <View style={{
                    backgroundColor: isExpiring ? T.colors.red : T.color.background.tertiary,
                    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start',
                }}>
                    <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{timeLeft}</Text>
                </View>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                    <Text style={{ color: T.colors.dim, fontSize: 9, fontWeight: '600' }}>Leader</Text>
                    <Text style={{ color: T.colors.gold, fontSize: 12, fontWeight: '700' }}>
                        {challenge.leader_name || '-'} - {challenge.leader_value ?? '-'}
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: T.colors.dim, fontSize: 9, fontWeight: '600' }}>Players</Text>
                    <Text style={{ color: T.colors.white, fontSize: 12, fontWeight: '700' }}>{challenge.participants_count}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: T.colors.dim, fontSize: 9, fontWeight: '600' }}>You #{challenge.my_rank || '-'}</Text>
                    <Text style={{ color: T.colors.accent, fontSize: 12, fontWeight: '700' }}>{challenge.my_value ?? '-'}</Text>
                </View>
            </View>

            {/* Progress bar */}
            {challenge.my_rank != null && challenge.participants_count > 0 && (
                <View style={{ height: 4, backgroundColor: T.color.background.tertiary, borderRadius: 2, marginBottom: 12 }}>
                    <View style={{
                        height: 4, borderRadius: 2,
                        backgroundColor: isLeader ? T.colors.green : T.colors.accent,
                        width: `${Math.max(5, (1 - (challenge.my_rank - 1) / challenge.participants_count) * 100)}%`,
                    }} />
                </View>
            )}

            {challenge.reward && (
                <Text style={{ color: T.colors.muted, fontSize: 10, marginBottom: 10 }}>
                    Reward: {challenge.reward}
                </Text>
            )}

            <TouchableOpacity style={{
                backgroundColor: isLeader ? T.colors.green : T.colors.accent,
                paddingVertical: 10, borderRadius: 8, alignItems: 'center',
            }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontFamily: T.fonts.display.black, fontSize: 13 }}>
                    {isLeader ? 'You\'re leading!' : challenge.my_rank ? 'Improve score' : 'Join challenge'}
                </Text>
            </TouchableOpacity>
        </Glass>
    )
}
