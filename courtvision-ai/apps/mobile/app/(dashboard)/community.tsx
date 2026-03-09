/**
 * CourtVision AI — Community V4 REDESIGN
 * "Squad" tab — Strava × NBA Standings × Apple HIG
 *
 * Design rules: T.* tokens, typePresets, glass V4, 4pt grid, 44px touch targets
 */

import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState, useCallback } from 'react'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown, FadeInRight, withSpring, useSharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { useCommunity, LeaderboardEntry, ChallengeItem, ActivityItem, SearchResult } from '../../hooks/useCommunity'
import { PrimaryButton } from '../../components/PrimaryButton'
import { T, typePresets } from '../../lib/theme'

const type = typePresets
const glass = T.glass

// ─── Constants ──────────────────────────────────────────────

const TABS = [
    { key: 'rankings', label: 'Rankings', icon: 'award' as const },
    { key: 'feed', label: 'Feed', icon: 'rss' as const },
    { key: 'challenges', label: 'Challenges', icon: 'target' as const },
] as const
type TabKey = (typeof TABS)[number]['key']

const METRICS = [
    { key: 'overall', label: 'Overall', emoji: 'award' as const },
    { key: 'shooting', label: 'Shooting', emoji: 'crosshair' as const },
    { key: 'mental', label: 'Mental', emoji: 'activity' as const },
    { key: 'sessions', label: 'Sessions', emoji: 'bar-chart-2' as const },
]

const SCOPES = [
    { key: 'global', label: 'Global' },
    { key: 'friends', label: 'Friends' },
]

const ACTIVITY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
    session_complete: 'play-circle', badge_earned: 'award', challenge_won: 'award',
    challenge_joined: 'target', follow: 'user-plus', highlight_shared: 'film',
    level_up: 'trending-up', new_record: 'zap',
}

const BADGE_RARITY_COLORS: Record<string, string> = {
    common: T.color.text.secondary, rare: T.color.semantic.info,
    epic: T.color.gamification.purple, legendary: T.color.signature.primary,
}

// ─── Helpers ────────────────────────────────────────────────

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

// ─── Glass helper ───────────────────────────────────────────

function Glass({ children, style, accent = false }: any) {
    return (
        <View style={[{
            borderRadius: T.borderRadius.xl,
            padding: T.spacing[4],
            ...(accent ? glass.accent : glass.regular ?? T.glass.thin),
        }, style]}>
            {children}
        </View>
    )
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════

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
        <SafeAreaView style={{ flex: 1, backgroundColor: T.color.background.primary }}>
            {/* Header */}
            <View style={{ paddingHorizontal: T.spacing[4], paddingTop: T.spacing[2], paddingBottom: T.spacing[1] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Animated.Text entering={FadeInDown.duration(400)} style={{ ...type.screenTitle, color: T.color.text.primary }}>
                            Community
                        </Animated.Text>
                        <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[1] }}>
                            This Week
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={{
                            position: 'relative', width: 44, height: 44,
                            borderRadius: T.borderRadius.md,
                            ...glass.regular ?? T.glass.thin,
                            justifyContent: 'center', alignItems: 'center',
                        }}
                        onPress={() => { }}
                        accessibilityLabel="Notifications"
                        accessibilityRole="button"
                    >
                        <Feather name="bell" size={18} color={T.color.text.primary} />
                        {unreadCount > 0 && (
                            <View style={{
                                position: 'absolute', top: -3, right: -3,
                                backgroundColor: T.color.semantic.error, borderRadius: 8,
                                minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Text style={{ color: '#FFF', fontSize: 9, fontFamily: T.fonts.display.bold }}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Badges preview */}
                {myBadges.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: T.spacing[3] }}>
                        {myBadges.slice(0, 6).map(badge => (
                            <View key={badge.id} style={{
                                ...(glass.regular ?? T.glass.thin),
                                borderRadius: T.borderRadius.sm,
                                paddingHorizontal: T.spacing[2], paddingVertical: T.spacing[1],
                                marginRight: T.spacing[2],
                                borderWidth: 1, borderColor: `${BADGE_RARITY_COLORS[badge.rarity] || T.color.text.secondary}30`,
                                flexDirection: 'row', alignItems: 'center', gap: T.spacing[1],
                            }}>
                                <Text style={{ fontSize: 12 }}>{badge.emoji}</Text>
                                <Text style={{
                                    ...type.overline,
                                    color: BADGE_RARITY_COLORS[badge.rarity] || T.color.text.secondary,
                                    fontSize: 10,
                                }}>{badge.name}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Tab Pills */}
            <View style={{
                flexDirection: 'row', marginHorizontal: T.spacing[4], marginVertical: T.spacing[3],
                ...(glass.regular ?? T.glass.thin), borderRadius: T.borderRadius.md, padding: 3,
            }}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, paddingVertical: T.spacing[3], borderRadius: T.borderRadius.sm,
                            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: T.spacing[1],
                            backgroundColor: activeTab === tab.key ? T.color.signature.primary : 'transparent',
                        }}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                    >
                        <Feather name={tab.icon} size={13} color={activeTab === tab.key ? '#fff' : T.color.text.tertiary} />
                        <Text style={{
                            ...type.overline,
                            color: activeTab === tab.key ? '#fff' : T.color.text.tertiary,
                            fontSize: 11,
                        }}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: T.spacing[4], paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.color.signature.primary} />}
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
                    <Glass style={{ borderColor: `${T.color.semantic.error}30`, marginTop: T.spacing[3] }}>
                        <Text style={{ ...type.caption, color: T.color.semantic.error }}>Error: {error}</Text>
                    </Glass>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// ═════════════════════════════════════════════════════════════
// RANKINGS TAB
// ═════════════════════════════════════════════════════════════

function RankingsTab({ entries, metric, scope, myRank, onChangeMetric, onChangeScope,
    searchQuery, onSearchChange, searchResults, onFollow, onUnfollow }: {
        entries: LeaderboardEntry[]; metric: string; scope: string; myRank?: number;
        onChangeMetric: (m: string) => void; onChangeScope: (s: string) => void;
        searchQuery: string; onSearchChange: (q: string) => void;
        searchResults: SearchResult[]; onFollow: (id: string) => void; onUnfollow: (id: string) => void;
    }) {
    return (
        <View style={{ marginTop: T.spacing[2] }}>
            {/* Search */}
            <View style={{
                flexDirection: 'row', alignItems: 'center',
                ...(glass.regular ?? T.glass.thin),
                borderRadius: T.borderRadius.md, paddingHorizontal: T.spacing[3], marginBottom: T.spacing[3],
            }}>
                <Feather name="search" size={16} color={T.color.text.tertiary} />
                <TextInput
                    style={{ flex: 1, color: T.color.text.primary, fontSize: 13, paddingVertical: T.spacing[3], marginLeft: T.spacing[2], fontFamily: T.fonts.body.regular }}
                    placeholder="Search players..." placeholderTextColor={T.color.text.tertiary}
                    value={searchQuery} onChangeText={onSearchChange}
                    autoCapitalize="none" autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="x-circle" size={16} color={T.color.text.tertiary} />
                    </TouchableOpacity>
                )}
            </View>

            {searchQuery.length > 0 ? (
                <View>
                    {searchResults.map(player => (
                        <SearchResultRow key={player.user_id} player={player} onFollow={onFollow} onUnfollow={onUnfollow} />
                    ))}
                    {searchResults.length === 0 && (
                        <View style={{ alignItems: 'center', padding: T.spacing[8] }}>
                            <Feather name="search" size={28} color={T.color.text.tertiary} />
                            <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: T.spacing[2] }}>
                                No players found for "{searchQuery}"
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <>
                    {/* Scope + Metric */}
                    <View style={{ flexDirection: 'row', marginBottom: T.spacing[3], gap: T.spacing[2] }}>
                        {SCOPES.map(s => (
                            <TouchableOpacity key={s.key} onPress={() => onChangeScope(s.key)} style={{
                                paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[2],
                                borderRadius: T.borderRadius.sm,
                                backgroundColor: scope === s.key ? T.color.signature.primary : 'transparent',
                                ...(scope !== s.key ? (glass.regular ?? T.glass.thin) : {}),
                                minHeight: 44, justifyContent: 'center',
                            }} accessibilityRole="button">
                                <Text style={{ ...type.overline, color: scope === s.key ? '#fff' : T.color.text.secondary, fontSize: 11 }}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: T.spacing[4] }}>
                        {METRICS.map(m => (
                            <TouchableOpacity key={m.key} onPress={() => onChangeMetric(m.key)} style={{
                                paddingHorizontal: T.spacing[3], paddingVertical: T.spacing[2],
                                borderRadius: T.borderRadius.sm, marginRight: T.spacing[2],
                                backgroundColor: metric === m.key ? T.color.signature.muted : 'transparent',
                                ...(metric !== m.key ? (glass.regular ?? T.glass.thin) : {}),
                                borderWidth: metric === m.key ? 1 : 0,
                                borderColor: `${T.color.signature.primary}30`,
                                minHeight: 44, justifyContent: 'center',
                            }} accessibilityRole="button">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[1] }}>
                                    <Feather name={m.emoji} size={12} color={metric === m.key ? T.color.signature.primary : T.color.text.tertiary} />
                                    <Text style={{ ...type.overline, color: metric === m.key ? T.color.signature.primary : T.color.text.secondary, fontSize: 10 }}>{m.label}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* My Rank */}
                    {myRank != null && (
                        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                            <Glass accent style={{ marginBottom: T.spacing[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ ...type.overline, color: T.color.text.secondary }}>YOUR RANK</Text>
                                    <Text style={{ ...type.statLarge, color: T.color.signature.primary }}>#{myRank}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ ...type.caption, color: T.color.text.tertiary }}>of {entries.length} players</Text>
                                    <Text style={{ ...type.overline, color: T.color.signature.primary, marginTop: T.spacing[1] }}>
                                        {METRICS.find(m => m.key === metric)?.label}
                                    </Text>
                                </View>
                            </Glass>
                        </Animated.View>
                    )}

                    {/* Podium */}
                    {entries.length >= 3 && (
                        <Animated.View entering={FadeInDown.delay(200).duration(500)}
                            style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: T.spacing[5] }}>
                            <PodiumItem entry={entries[1]} position={2} />
                            <PodiumItem entry={entries[0]} position={1} />
                            <PodiumItem entry={entries[2]} position={3} />
                        </Animated.View>
                    )}

                    {/* Leaderboard */}
                    {entries.slice(3).map((entry, i) => (
                        <Animated.View key={entry.user_id} entering={FadeInDown.delay(300 + i * 40).duration(300)}>
                            <LeaderboardRow entry={entry} />
                        </Animated.View>
                    ))}

                    {entries.length === 0 && (
                        <View style={{ alignItems: 'center', padding: T.spacing[10] }}>
                            <Feather name="award" size={36} color={T.color.text.tertiary} />
                            <Text style={{ ...type.caption, color: T.color.text.secondary, textAlign: 'center', marginTop: T.spacing[3] }}>
                                {'No players ranked yet.\nBe the first!'}
                            </Text>
                        </View>
                    )}
                </>
            )}
        </View>
    )
}

// ─── Podium ─────────────────────────────────────────────────

function PodiumItem({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
    const heights: Record<number, number> = { 1: 88, 2: 64, 3: 48 }
    const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
    const podiumColors: Record<number, string> = { 1: T.color.gamification.gold, 2: '#C0C0C0', 3: '#CD7F32' }

    return (
        <View style={{ alignItems: 'center', marginHorizontal: T.spacing[2] }}>
            <View style={{
                width: position === 1 ? 56 : 44, height: position === 1 ? 56 : 44,
                backgroundColor: entry.is_me ? T.color.signature.muted : T.color.background.tertiary,
                borderRadius: 28, marginBottom: T.spacing[2],
                borderWidth: 2, borderColor: podiumColors[position],
                alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: position === 1 ? 18 : 14 }}>
                    {entry.username?.charAt(0).toUpperCase()}
                </Text>
            </View>
            <Text style={{ ...type.overline, color: T.color.text.primary, fontSize: 11 }} numberOfLines={1}>
                {entry.is_me ? 'You' : entry.username}
            </Text>
            <Text style={{ ...type.mediumStat, color: T.color.signature.primary, fontSize: 14 }}>{entry.score}</Text>
            <View style={{
                width: 64, height: heights[position], marginTop: T.spacing[2],
                backgroundColor: podiumColors[position], borderTopLeftRadius: T.borderRadius.sm, borderTopRightRadius: T.borderRadius.sm,
                alignItems: 'center', justifyContent: 'flex-start', paddingTop: T.spacing[2], opacity: 0.85,
            }}>
                <Text style={{ fontSize: 20 }}>{medals[position]}</Text>
                <Text style={{ ...type.overline, color: T.color.background.primary, fontSize: 9, marginTop: 2 }}>Lv.{entry.level}</Text>
            </View>
        </View>
    )
}

// ─── Leaderboard Row ────────────────────────────────────────

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
    const trendColor = entry.trend === 'up' ? T.color.semantic.success : entry.trend === 'down' ? T.color.semantic.error : T.color.text.tertiary
    const trendIcon: keyof typeof Feather.glyphMap = entry.trend === 'up' ? 'trending-up' : entry.trend === 'down' ? 'trending-down' : 'minus'

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            ...(entry.is_me ? glass.accent : (glass.regular ?? T.glass.thin)),
            borderRadius: T.borderRadius.lg, padding: T.spacing[3], marginBottom: T.spacing[2],
        }}>
            <Text style={{ ...type.mediumStat, color: entry.rank <= 5 ? T.color.gamification.gold : T.color.text.tertiary, fontSize: 14, width: 32, fontVariant: ['tabular-nums'] }}>#{entry.rank}</Text>
            <View style={{
                width: 36, height: 36,
                backgroundColor: entry.is_me ? T.color.signature.muted : T.color.background.tertiary,
                borderRadius: 18, marginRight: T.spacing[3], alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13 }}>{entry.username?.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13 }}>{entry.is_me ? 'You' : entry.username}</Text>
                <Text style={{ ...type.caption, color: T.color.text.tertiary, fontSize: 10 }}>{entry.position || '-'} · Lv.{entry.level}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={{ ...type.cardTitle, color: T.color.signature.primary, fontSize: 14 }}>{entry.score}</Text>
                <Feather name={trendIcon} size={12} color={trendColor} />
            </View>
        </View>
    )
}

// ─── Search Result Row ──────────────────────────────────────

function SearchResultRow({ player, onFollow, onUnfollow }: {
    player: SearchResult; onFollow: (id: string) => void; onUnfollow: (id: string) => void
}) {
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center',
            ...(glass.regular ?? T.glass.thin),
            borderRadius: T.borderRadius.lg, padding: T.spacing[3], marginBottom: T.spacing[2],
        }}>
            <View style={{
                width: 40, height: 40, backgroundColor: T.color.background.tertiary,
                borderRadius: 20, marginRight: T.spacing[3], alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 14 }}>{player.username?.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 13 }}>{player.username}</Text>
                <Text style={{ ...type.caption, color: T.color.text.tertiary, fontSize: 10 }}>{player.position || '-'} · Lv.{player.level} · {player.xp} XP</Text>
            </View>
            <TouchableOpacity
                onPress={() => player.is_following ? onUnfollow(player.user_id) : onFollow(player.user_id)}
                style={{
                    paddingHorizontal: T.spacing[4], paddingVertical: T.spacing[2],
                    borderRadius: T.borderRadius.sm, minHeight: 44, justifyContent: 'center',
                    backgroundColor: player.is_following ? T.color.background.tertiary : T.color.signature.primary,
                }}
                accessibilityRole="button"
            >
                <Text style={{ ...type.overline, color: player.is_following ? T.color.text.secondary : '#fff', fontSize: 11 }}>
                    {player.is_following ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </View>
    )
}

// ═════════════════════════════════════════════════════════════
// FEED TAB
// ═════════════════════════════════════════════════════════════

function FeedTab({ items, hasMore, onLoadMore, loading }: {
    items: ActivityItem[]; hasMore: boolean; onLoadMore: () => void; loading: boolean
}) {
    return (
        <View style={{ marginTop: T.spacing[2] }}>
            {items.map((item, i) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                    <FeedItem item={item} />
                </Animated.View>
            ))}
            {hasMore && (
                <TouchableOpacity
                    onPress={onLoadMore}
                    style={{ ...(glass.regular ?? T.glass.thin), padding: T.spacing[3], borderRadius: T.borderRadius.lg, alignItems: 'center', marginTop: T.spacing[2], minHeight: 44, justifyContent: 'center' }}
                    accessibilityRole="button"
                >
                    {loading
                        ? <ActivityIndicator color={T.color.signature.primary} size="small" />
                        : <Text style={{ ...type.cardTitle, color: T.color.signature.primary, fontSize: 12 }}>Load more</Text>
                    }
                </TouchableOpacity>
            )}
            {items.length === 0 && !loading && (
                <View style={{ alignItems: 'center', padding: T.spacing[10] }}>
                    <Feather name="rss" size={32} color={T.color.text.tertiary} />
                    <Text style={{ ...type.caption, color: T.color.text.secondary, textAlign: 'center', marginTop: T.spacing[3], marginBottom: T.spacing[5] }}>
                        {'Nothing in the feed yet.\nFollow players to see their activity!'}
                    </Text>
                    <PrimaryButton
                        label="Find Friends"
                        variant="primary"
                        icon="search"
                        size="sm"
                        fullWidth={false}
                        onPress={() => {
                            /* Implementation would jump focus to player search or invite flow */
                        }}
                    />
                </View>
            )}
        </View>
    )
}

function FeedItem({ item }: { item: ActivityItem }) {
    const icon = ACTIVITY_ICONS[item.type] || 'activity'
    return (
        <View style={{
            ...(glass.regular ?? T.glass.thin), borderRadius: T.borderRadius.lg,
            padding: T.spacing[4], marginBottom: T.spacing[2],
            flexDirection: 'row', alignItems: 'flex-start', gap: T.spacing[3],
        }}>
            <View style={{
                width: 36, height: 36, backgroundColor: T.color.background.tertiary,
                borderRadius: T.borderRadius.md, alignItems: 'center', justifyContent: 'center',
            }}>
                <Feather name={icon} size={16} color={T.color.signature.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2] }}>
                    <Text style={{ ...type.cardTitle, color: T.color.signature.primary, fontSize: 12 }}>{item.username}</Text>
                    <Text style={{ ...type.caption, color: T.color.text.tertiary, fontSize: 10 }}>{formatTimeAgo(item.created_at)}</Text>
                </View>
                <Text style={{ ...type.body, color: T.color.text.primary, fontSize: 13, marginTop: 2 }}>{item.title}</Text>
                {item.description && (
                    <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: 2 }}>{item.description}</Text>
                )}
            </View>
        </View>
    )
}

// ═════════════════════════════════════════════════════════════
// CHALLENGES TAB
// ═════════════════════════════════════════════════════════════

function ChallengesTab({ challenges }: { challenges: ChallengeItem[] }) {
    return (
        <View style={{ marginTop: T.spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: T.spacing[2], marginBottom: T.spacing[4] }}>
                <Feather name="target" size={16} color={T.color.signature.primary} />
                <Text style={{ ...type.sectionTitle, color: T.color.text.primary, fontSize: 16 }}>
                    {challenges.length} active challenge{challenges.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {challenges.map((challenge, i) => (
                <Animated.View key={challenge.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                    <ChallengeCard challenge={challenge} />
                </Animated.View>
            ))}

            {challenges.length === 0 && (
                <View style={{ alignItems: 'center', padding: T.spacing[10] }}>
                    <Feather name="target" size={32} color={T.color.text.tertiary} />
                    <Text style={{ ...type.caption, color: T.color.text.secondary, textAlign: 'center', marginTop: T.spacing[3], marginBottom: T.spacing[5] }}>
                        {'No active challenges right now.\nCheck back soon!'}
                    </Text>
                    <PrimaryButton
                        label="Create Challenge"
                        variant="secondary"
                        icon="plus"
                        size="sm"
                        fullWidth={false}
                    />
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
            marginBottom: T.spacing[3],
            borderColor: isLeader ? `${T.color.semantic.success}40` : T.color.border.base,
            borderWidth: 1,
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.spacing[3] }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ ...type.cardTitle, color: T.color.text.primary }}>{challenge.title}</Text>
                    {challenge.description && (
                        <Text style={{ ...type.caption, color: T.color.text.secondary, marginTop: 2 }}>{challenge.description}</Text>
                    )}
                </View>
                <View style={{
                    backgroundColor: isExpiring ? T.color.semantic.error : T.color.background.tertiary,
                    paddingHorizontal: T.spacing[2], paddingVertical: T.spacing[1],
                    borderRadius: T.borderRadius.sm, alignSelf: 'flex-start',
                }}>
                    <Text style={{ ...type.overline, color: '#FFF', fontSize: 10 }}>{timeLeft}</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.spacing[3] }}>
                <View>
                    <Text style={{ ...type.overline, color: T.color.text.tertiary, fontSize: 9 }}>Leader</Text>
                    <Text style={{ ...type.cardTitle, color: T.color.gamification.gold, fontSize: 12 }}>
                        {challenge.leader_name || '-'} - {challenge.leader_value ?? '-'}
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...type.overline, color: T.color.text.tertiary, fontSize: 9 }}>Players</Text>
                    <Text style={{ ...type.cardTitle, color: T.color.text.primary, fontSize: 12 }}>{challenge.participants_count}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ ...type.overline, color: T.color.text.tertiary, fontSize: 9 }}>You #{challenge.my_rank || '-'}</Text>
                    <Text style={{ ...type.cardTitle, color: T.color.signature.primary, fontSize: 12 }}>{challenge.my_value ?? '-'}</Text>
                </View>
            </View>

            {/* Progress */}
            {challenge.my_rank != null && challenge.participants_count > 0 && (
                <View style={{ height: 4, backgroundColor: T.color.background.tertiary, borderRadius: 2, marginBottom: T.spacing[3] }}>
                    <View style={{
                        height: 4, borderRadius: 2,
                        backgroundColor: isLeader ? T.color.semantic.success : T.color.signature.primary,
                        width: `${Math.max(5, (1 - (challenge.my_rank - 1) / challenge.participants_count) * 100)}%`,
                    }} />
                </View>
            )}

            {challenge.reward && (
                <Text style={{ ...type.caption, color: T.color.text.secondary, marginBottom: T.spacing[3] }}>
                    🏆 Reward: {challenge.reward}
                </Text>
            )}

            <TouchableOpacity style={{
                backgroundColor: isLeader ? T.color.semantic.success : T.color.signature.primary,
                paddingVertical: T.spacing[3], borderRadius: T.borderRadius.sm,
                alignItems: 'center', minHeight: 44, justifyContent: 'center',
            }} accessibilityRole="button">
                <Text style={{ ...type.overline, color: '#fff', fontSize: 12, letterSpacing: 0.5 }}>
                    {isLeader ? 'You\'re leading!' : challenge.my_rank ? 'Improve score' : 'Join challenge'}
                </Text>
            </TouchableOpacity>
        </Glass>
    )
}
