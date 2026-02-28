/**
 * useSessionHistory — Hook React pour accéder à l'historique des sessions.
 *
 * Fournit :
 * - Liste paginée des sessions
 * - Chargement / rafraîchissement
 * - Statistiques agrégées (tendances)
 * - Tri et filtrage
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SessionStorageService, type SessionHistoryItem } from '../lib/sessionStorage'

// ==========================================
// Types
// ==========================================

export interface AggregatedStats {
    totalSessions: number
    totalShots: number
    totalMade: number
    overallFgPct: number
    avgPostureQuality: number
    avgConsistency: number
    avgElbowAngle: number
    avgReleaseTime: number
    bestFgPct: number
    bestSession: SessionHistoryItem | null
    trend: 'improving' | 'declining' | 'stable' | 'insufficient'
}

export type SortBy = 'date' | 'fgPct' | 'shots' | 'score'
export type SortOrder = 'asc' | 'desc'

export interface UseSessionHistoryReturn {
    /** Sessions chargées */
    sessions: SessionHistoryItem[]
    /** Chargement en cours */
    loading: boolean
    /** Erreur éventuelle */
    error: string | null
    /** Stats agrégées */
    aggregated: AggregatedStats
    /** Tri actuel */
    sortBy: SortBy
    sortOrder: SortOrder
    /** Actions */
    refresh: () => Promise<void>
    setSortBy: (s: SortBy) => void
    setSortOrder: (o: SortOrder) => void
    deleteSession: (id: string) => Promise<void>
}

// ==========================================
// Hook
// ==========================================

export function useSessionHistory(): UseSessionHistoryReturn {
    const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<SortBy>('date')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    const storage = SessionStorageService.getInstance()

    const loadSessions = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const loaded = await storage.getSessionHistory()
            setSessions(loaded)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement')
        } finally {
            setLoading(false)
        }
    }, [storage])

    useEffect(() => {
        loadSessions()
    }, [loadSessions])

    const refresh = useCallback(async () => {
        await loadSessions()
    }, [loadSessions])

    const deleteSession = useCallback(async (id: string) => {
        try {
            await storage.deleteSession(id)
            setSessions(prev => prev.filter(s => s.id !== id))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de suppression')
        }
    }, [storage])

    // Sort sessions
    const sortedSessions = useMemo(() => {
        const sorted = [...sessions].sort((a, b) => {
            let cmp = 0
            switch (sortBy) {
                case 'date':
                    cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
                case 'fgPct':
                    cmp = a.shootingPct - b.shootingPct
                    break
                case 'shots':
                    cmp = a.totalShots - b.totalShots
                    break
                case 'score':
                    cmp = a.avgPostureQuality - b.avgPostureQuality
                    break
            }
            return sortOrder === 'desc' ? -cmp : cmp
        })
        return sorted
    }, [sessions, sortBy, sortOrder])

    // Aggregate stats
    const aggregated = useMemo((): AggregatedStats => {
        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                totalShots: 0,
                totalMade: 0,
                overallFgPct: 0,
                avgPostureQuality: 0,
                avgConsistency: 0,
                avgElbowAngle: 0,
                avgReleaseTime: 0,
                bestFgPct: 0,
                bestSession: null,
                trend: 'insufficient',
            }
        }

        const totalShots = sessions.reduce((sum, s) => sum + s.totalShots, 0)
        const totalMade = sessions.reduce((sum, s) => sum + s.madeShots, 0)
        const overallFgPct = totalShots > 0 ? Math.round((totalMade / totalShots) * 1000) / 10 : 0
        const avgPostureQuality = sessions.reduce((sum, s) => sum + s.avgPostureQuality, 0) / sessions.length
        const avgConsistency = sessions.reduce((sum, s) => sum + s.mechanicConsistency, 0) / sessions.length
        const avgElbowAngle = sessions.reduce((sum, s) => sum + s.avgElbowAngle, 0) / sessions.length
        const avgReleaseTime = sessions.reduce((sum, s) => sum + s.avgReleaseTime, 0) / sessions.length
        const bestFgPct = Math.max(...sessions.map(s => s.shootingPct))

        // Best session by score
        const bestSession = sessions.reduce((best, s) => {
            const sScore = s.avgPostureQuality * 0.4 + s.shootingPct * 0.4 + s.mechanicConsistency * 0.2
            const bScore = best ? best.avgPostureQuality * 0.4 + best.shootingPct * 0.4 + best.mechanicConsistency * 0.2 : 0
            return sScore > bScore ? s : best
        }, sessions[0] as SessionHistoryItem | null)

        // Trend: compare last 3 sessions vs previous 3
        let trend: AggregatedStats['trend'] = 'insufficient'
        if (sessions.length >= 4) {
            const byDate = [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            const recent = byDate.slice(0, 3)
            const earlier = byDate.slice(3, 6)
            if (earlier.length >= 2) {
                const recentAvg = recent.reduce((s, r) => s + r.shootingPct, 0) / recent.length
                const earlierAvg = earlier.reduce((s, r) => s + r.shootingPct, 0) / earlier.length
                if (recentAvg > earlierAvg + 3) trend = 'improving'
                else if (recentAvg < earlierAvg - 3) trend = 'declining'
                else trend = 'stable'
            }
        }

        return {
            totalSessions: sessions.length,
            totalShots,
            totalMade,
            overallFgPct,
            avgPostureQuality: Math.round(avgPostureQuality * 10) / 10,
            avgConsistency: Math.round(avgConsistency * 10) / 10,
            avgElbowAngle: Math.round(avgElbowAngle * 10) / 10,
            avgReleaseTime: Math.round(avgReleaseTime * 1000) / 1000,
            bestFgPct,
            bestSession,
            trend,
        }
    }, [sessions])

    return {
        sessions: sortedSessions,
        loading,
        error,
        aggregated,
        sortBy,
        sortOrder,
        refresh,
        setSortBy,
        setSortOrder,
        deleteSession,
    }
}
