/**
 * useCommunity — Hook React pour la fonctionnalité Communauté
 * Gère leaderboard, défis, feed, profils, follow, badges, notifications, recherche
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../lib/api'

// ─── Types ──────────────────────────────────────────
export interface LeaderboardEntry {
    rank: number
    user_id: string
    username: string
    full_name?: string
    avatar_url?: string
    position?: string
    score: number
    trend: 'up' | 'down' | 'stable'
    level: number
    is_me: boolean
}

export interface ChallengeItem {
    id: string
    title: string
    description?: string
    metric: string
    reward?: string
    end_at: string
    participants_count: number
    my_rank?: number
    my_value?: number
    leader_name?: string
    leader_value?: number
}

export interface ActivityItem {
    id: string
    user_id: string
    username: string
    avatar_url?: string
    type: string
    title: string
    description?: string
    metadata: Record<string, any>
    created_at: string
}

export interface BadgeItem {
    id: string
    slug: string
    name: string
    description: string
    emoji: string
    category: string
    rarity: string
    xp_reward: number
    earned_at?: string
}

export interface PublicProfileData {
    user_id: string
    username: string
    full_name?: string
    avatar_url?: string
    position?: string
    bio: string
    location: string
    team: string
    xp: number
    level: number
    total_sessions: number
    total_shots: number
    avg_shooting_pct: number
    avg_mental_score: number
    best_mental_score: number
    best_shooting_pct: number
    win_streak: number
    challenges_won: number
    followers_count: number
    following_count: number
    is_public: boolean
    badges: BadgeItem[]
    is_following?: boolean
}

export interface NotificationItem {
    id: string
    type: string
    title: string
    body?: string
    metadata: Record<string, any>
    read: boolean
    created_at: string
}

export interface SearchResult {
    user_id: string
    username: string
    full_name?: string
    avatar_url?: string
    position?: string
    level: number
    xp: number
    is_following: boolean
}

// ─── Hook ───────────────────────────────────────────

export function useCommunity() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [leaderboardMetric, setLeaderboardMetric] = useState<string>('overall')
    const [leaderboardScope, setLeaderboardScope] = useState<string>('global')
    const [myRank, setMyRank] = useState<number | undefined>()

    const [challenges, setChallenges] = useState<ChallengeItem[]>([])
    const [feed, setFeed] = useState<ActivityItem[]>([])
    const [feedHasMore, setFeedHasMore] = useState(false)
    const feedCursorRef = useRef<string | undefined>()

    const [myBadges, setMyBadges] = useState<BadgeItem[]>([])
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [profileData, setProfileData] = useState<PublicProfileData | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ─── Leaderboard ─────────────────────────────────

    const fetchLeaderboard = useCallback(async (metric?: string, scope?: string) => {
        const m = metric || leaderboardMetric
        const s = scope || leaderboardScope
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch<any>(`/api/community/leaderboard?metric=${m}&scope=${s}`)
            setLeaderboard(res.entries || [])
            setMyRank(res.myRank)
            if (metric) setLeaderboardMetric(metric)
            if (scope) setLeaderboardScope(scope)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [leaderboardMetric, leaderboardScope])

    // ─── Challenges ──────────────────────────────────

    const fetchChallenges = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch<any>('/api/community/challenges')
            setChallenges(res.data || [])
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const submitChallenge = useCallback(async (challengeId: string, value: number, metric: string) => {
        try {
            await apiFetch(`/api/community/challenges/${challengeId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ value, metric })
            })
            await fetchChallenges()
        } catch (e: any) {
            setError(e.message)
        }
    }, [fetchChallenges])

    // ─── Feed ────────────────────────────────────────

    const fetchFeed = useCallback(async (reset = true) => {
        setLoading(true)
        setError(null)
        try {
            const cursor = reset ? '' : (feedCursorRef.current ? `&cursor=${feedCursorRef.current}` : '')
            const res = await apiFetch<any>(`/api/community/feed?limit=20${cursor}`)
            const items = res.items || []
            if (reset) {
                setFeed(items)
            } else {
                setFeed(prev => [...prev, ...items])
            }
            setFeedHasMore(res.hasMore)
            feedCursorRef.current = res.nextCursor
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const loadMoreFeed = useCallback(() => {
        if (feedHasMore) fetchFeed(false)
    }, [feedHasMore, fetchFeed])

    // ─── Profile ─────────────────────────────────────

    const fetchProfile = useCallback(async (userId: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiFetch<PublicProfileData>(`/api/community/profile/${userId}`)
            setProfileData(res)
            return res
        } catch (e: any) {
            setError(e.message)
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    // ─── Follow / Unfollow ───────────────────────────

    const followUser = useCallback(async (userId: string) => {
        try {
            await apiFetch(`/api/community/follow/${userId}`, { method: 'POST' })
            // Refresh profile if viewing
            if (profileData && profileData.user_id === userId) {
                setProfileData(prev => prev ? { ...prev, is_following: true, followers_count: prev.followers_count + 1 } : prev)
            }
            // Update search results
            setSearchResults(prev => prev.map(u => u.user_id === userId ? { ...u, is_following: true } : u))
        } catch (e: any) {
            setError(e.message)
        }
    }, [profileData])

    const unfollowUser = useCallback(async (userId: string) => {
        try {
            await apiFetch(`/api/community/follow/${userId}`, { method: 'DELETE' })
            if (profileData && profileData.user_id === userId) {
                setProfileData(prev => prev ? { ...prev, is_following: false, followers_count: Math.max(0, prev.followers_count - 1) } : prev)
            }
            setSearchResults(prev => prev.map(u => u.user_id === userId ? { ...u, is_following: false } : u))
        } catch (e: any) {
            setError(e.message)
        }
    }, [profileData])

    // ─── Badges ──────────────────────────────────────

    const fetchMyBadges = useCallback(async () => {
        try {
            const res = await apiFetch<any>('/api/community/badges/me')
            setMyBadges(res.data || [])
        } catch (e: any) {
            setError(e.message)
        }
    }, [])

    // ─── Notifications ───────────────────────────────

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await apiFetch<any>('/api/community/notifications')
            setNotifications(res.data || [])
            setUnreadCount(res.unreadCount || 0)
        } catch (e: any) {
            setError(e.message)
        }
    }, [])

    const markNotificationsRead = useCallback(async (ids?: string[]) => {
        try {
            await apiFetch('/api/community/notifications/read', {
                method: 'POST',
                body: JSON.stringify({ ids })
            })
            if (ids) {
                setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))
                setUnreadCount(prev => Math.max(0, prev - ids.length))
            } else {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                setUnreadCount(0)
            }
        } catch (e: any) {
            setError(e.message)
        }
    }, [])

    // ─── Search ──────────────────────────────────────

    const searchPlayers = useCallback(async (query: string) => {
        if (!query || query.length < 1) {
            setSearchResults([])
            return
        }
        try {
            const res = await apiFetch<any>(`/api/community/search?q=${encodeURIComponent(query)}`)
            setSearchResults(res.data || [])
        } catch (e: any) {
            setError(e.message)
        }
    }, [])

    // ─── Refresh stats ──────────────────────────────

    const refreshMyStats = useCallback(async () => {
        try {
            await apiFetch('/api/community/refresh-stats', { method: 'POST' })
        } catch (e: any) {
            setError(e.message)
        }
    }, [])

    // ─── Initial load ────────────────────────────────

    useEffect(() => {
        fetchLeaderboard()
        fetchChallenges()
        fetchFeed()
        fetchMyBadges()
        fetchNotifications()
    }, [])

    return {
        // Leaderboard
        leaderboard, leaderboardMetric, leaderboardScope, myRank,
        fetchLeaderboard,
        // Challenges
        challenges, fetchChallenges, submitChallenge,
        // Feed
        feed, feedHasMore, fetchFeed, loadMoreFeed,
        // Profile
        profileData, fetchProfile,
        // Follow
        followUser, unfollowUser,
        // Badges
        myBadges, fetchMyBadges,
        // Notifications
        notifications, unreadCount, fetchNotifications, markNotificationsRead,
        // Search
        searchResults, searchPlayers,
        // Utils
        refreshMyStats,
        loading, error,
    }
}
