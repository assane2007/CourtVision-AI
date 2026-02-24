import { useState, useCallback } from 'react'
import { Share, Platform, Alert } from 'react-native'
import { apiFetch } from '../lib/api'

// ==========================================
// Types
// ==========================================

export type ShareType = 'twin_card' | 'highlight_reel' | 'session_recap' | 'badge' | 'challenge_win'
export type SharePlatform = 'tiktok' | 'instagram' | 'twitter' | 'generic'
export type ShareFormat = 'image' | 'video' | 'link'

export interface TwinCardData {
    username: string
    fullName: string
    avatarUrl: string | null
    position: string | null
    overallRating: number
    playStyle: string
    playStyleLabel: string
    playStyleDescription: string
    nbaArchetype: string
    topCategoryName: string
    topCategoryEmoji: string
    topCategoryScore: number
    nbaCompPlayer: string | null
    nbaCompSimilarity: number
    nbaCompTraits: string[]
    keyAttributes: { name: string; value: number; emoji: string }[]
    mentalResilience: number
    clutchFactor: number
    pressureResponse: string
    strengths: string[]
    weaknesses: string[]
    modelVersion: string
    sessionCount: number
    generatedAt: string
}

export interface ShareResult {
    shareId: string
    shareUrl: string
    caption: string
    cardData: TwinCardData | any
    platform: SharePlatform
    deepLink: string
}

export interface ShareHistoryItem {
    shareId: string
    type: ShareType
    platform: SharePlatform
    caption: string
    viewsCount: number
    createdAt: string
    shareUrl: string
}

// ==========================================
// Hook
// ==========================================

export function useViralShare() {
    const [sharing, setSharing] = useState(false)
    const [lastShare, setLastShare] = useState<ShareResult | null>(null)
    const [shareHistory, setShareHistory] = useState<ShareHistoryItem[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Génère et partage une Twin Card
     */
    const shareTwinCard = useCallback(async (
        platform: SharePlatform = 'generic',
        customMessage?: string
    ) => {
        try {
            setSharing(true)
            setError(null)

            const res = await apiFetch<{ data: ShareResult }>('/api/share/generate', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'twin_card',
                    format: 'link',
                    platform,
                    customMessage,
                }),
            })

            const result = res.data
            setLastShare(result)

            // Utiliser le Share natif
            await nativeShare(result.caption, result.shareUrl)

            return result
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors du partage')
            return null
        } finally {
            setSharing(false)
        }
    }, [])

    /**
     * Partage un recap de session
     */
    const shareSessionRecap = useCallback(async (
        sessionId: string,
        platform: SharePlatform = 'generic',
        customMessage?: string
    ) => {
        try {
            setSharing(true)
            setError(null)

            const res = await apiFetch<{ data: ShareResult }>('/api/share/generate', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'session_recap',
                    format: 'link',
                    platform,
                    sessionId,
                    customMessage,
                }),
            })

            const result = res.data
            setLastShare(result)
            await nativeShare(result.caption, result.shareUrl)
            return result
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors du partage')
            return null
        } finally {
            setSharing(false)
        }
    }, [])

    /**
     * Partage un highlight reel
     */
    const shareHighlightReel = useCallback(async (
        sessionId: string,
        platform: SharePlatform = 'generic',
        customMessage?: string
    ) => {
        try {
            setSharing(true)
            setError(null)

            const res = await apiFetch<{ data: ShareResult }>('/api/share/generate', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'highlight_reel',
                    format: 'link',
                    platform,
                    sessionId,
                    customMessage,
                }),
            })

            const result = res.data
            setLastShare(result)
            await nativeShare(result.caption, result.shareUrl)
            return result
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors du partage')
            return null
        } finally {
            setSharing(false)
        }
    }, [])

    /**
     * Partage un badge gagné
     */
    const shareBadge = useCallback(async (
        badgeSlug: string,
        platform: SharePlatform = 'generic',
        customMessage?: string
    ) => {
        try {
            setSharing(true)
            setError(null)

            const res = await apiFetch<{ data: ShareResult }>('/api/share/generate', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'badge',
                    format: 'link',
                    platform,
                    badgeSlug,
                    customMessage,
                }),
            })

            const result = res.data
            setLastShare(result)
            await nativeShare(result.caption, result.shareUrl)
            return result
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors du partage')
            return null
        } finally {
            setSharing(false)
        }
    }, [])

    /**
     * Charger l'historique des partages
     */
    const fetchShareHistory = useCallback(async () => {
        try {
            setLoadingHistory(true)
            const res = await apiFetch<{ data: ShareHistoryItem[] }>('/api/share/my-shares')
            setShareHistory(res.data ?? [])
        } catch (err: any) {
            setError(err.message ?? 'Erreur lors du chargement de l\'historique')
        } finally {
            setLoadingHistory(false)
        }
    }, [])

    return {
        sharing,
        lastShare,
        shareHistory,
        loadingHistory,
        error,
        shareTwinCard,
        shareSessionRecap,
        shareHighlightReel,
        shareBadge,
        fetchShareHistory,
    }
}

// ==========================================
// Helpers
// ==========================================

async function nativeShare(text: string, url: string): Promise<void> {
    try {
        await Share.share(
            Platform.OS === 'ios'
                ? { message: text, url }
                : { message: `${text}\n\n${url}` }
        )
    } catch (err: any) {
        if (err.message !== 'User did not share') {
            Alert.alert('Erreur', 'Impossible de partager pour le moment.')
        }
    }
}
