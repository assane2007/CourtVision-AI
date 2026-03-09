/**
 * SessionStorage — Service de persistance des sessions d'entraînement.
 *
 * Sauvegarde les sessions localement (AsyncStorage) et les synchronise avec Supabase.
 * Architecture offline-first : les données sont d'abord stockées localement,
 * puis sync vers le cloud quand la connexion est disponible.
 *
 * Usage :
 *   const storage = SessionStorageService.getInstance()
 *   await storage.saveSession(sessionData)
 *   const history = await storage.getSessionHistory()
 *   await storage.syncToCloud()
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { SyncQueueService } from './syncQueue'
import type { SessionRealtimeStats, DetectedShot } from './realtimeAIService'

// ==========================================
// Types
// ==========================================

export interface StoredSession {
    /** ID unique de la session */
    id: string
    /** Date de création (ISO) */
    createdAt: string
    /** Durée en secondes */
    durationSec: number
    /** Stats complètes */
    stats: SessionRealtimeStats
    /** Tirs détaillés (optionnel, peut être élagué pour l'espace) */
    shots: StoredShot[]
    /** Synchronisé avec le cloud ? */
    syncedToCloud: boolean
    /** Metadata */
    metadata: {
        deviceModel?: string
        osVersion?: string
        appVersion?: string
        location?: string
        courtType?: 'indoor' | 'outdoor' | 'gym'
    }
}

export interface StoredShot {
    id: string
    outcome: 'made' | 'missed' | 'blocked' | null
    elbowAngle: number
    releaseHeightRatio: number
    releaseTime: number
    postureQuality: number
    hasFollowThrough: boolean
    detectionConfidence: number
    zone?: string
    timestamp: number
}

export interface SessionHistoryItem {
    id: string
    createdAt: string
    durationSec: number
    totalShots: number
    madeShots: number
    shootingPct: number
    avgPostureQuality: number
    mechanicConsistency: number
    avgElbowAngle: number
    avgReleaseHeight: number
    avgReleaseTime: number
    followThroughPct: number
    overallScore: number
    grade: string
    syncedToCloud: boolean
}

export interface SessionTrend {
    metric: string
    values: Array<{ date: string; value: number }>
    direction: 'improving' | 'declining' | 'stable'
    changePercent: number
}

// ==========================================
// Constants
// ==========================================

const STORAGE_KEY = '@courtvision_sessions'
const MAX_LOCAL_SESSIONS = 100
const MAX_SHOTS_PER_SESSION = 200
const SUPABASE_TABLE = 'shooting_sessions'
const SUPABASE_SHOTS_TABLE = 'session_shots'

// ==========================================
// Helpers
// ==========================================

function computeOverallScore(stats: SessionRealtimeStats): number {
    return Math.round(
        stats.avgPostureQuality * 0.35 +
        stats.mechanicConsistency * 0.25 +
        stats.shootingPct * 0.25 +
        stats.followThroughPct * 0.15
    )
}

function getGrade(score: number): string {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C'
    return 'D'
}

function shotToStoredShot(shot: DetectedShot): StoredShot {
    return {
        id: shot.shotId,
        outcome: shot.outcome,
        elbowAngle: shot.releaseBiomechanics.elbowAngle,
        releaseHeightRatio: shot.releaseBiomechanics.releaseHeightRatio,
        releaseTime: shot.releaseTime,
        postureQuality: shot.releaseBiomechanics.postureQuality,
        hasFollowThrough: shot.hasFollowThrough,
        detectionConfidence: shot.detectionConfidence,
        timestamp: shot.phaseTimestamps.releasePoint,
    }
}

// ==========================================
// Service
// ==========================================

export class SessionStorageService {
    private static instance: SessionStorageService | null = null
    private sessions: StoredSession[] = []
    private isLoaded = false

    static getInstance(): SessionStorageService {
        if (!SessionStorageService.instance) {
            SessionStorageService.instance = new SessionStorageService()
        }
        return SessionStorageService.instance
    }

    private constructor() {}

    // ---- Load / Save ----

    async load(): Promise<void> {
        if (this.isLoaded) return
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY)
            if (raw) {
                this.sessions = JSON.parse(raw) as StoredSession[]
            }
            this.isLoaded = true
        } catch (err) {
            console.warn('[SessionStorage] Failed to load sessions:', err)
            this.sessions = []
            this.isLoaded = true
        }
    }

    private async persist(): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions))
        } catch (err) {
            console.warn('[SessionStorage] Failed to persist sessions:', err)
        }
    }

    // ---- Save Session ----

    async saveSession(
        stats: SessionRealtimeStats,
        shots: DetectedShot[],
        metadata?: StoredSession['metadata'],
    ): Promise<StoredSession> {
        await this.load()

        const session: StoredSession = {
            id: stats.sessionId,
            createdAt: new Date().toISOString(),
            durationSec: stats.sessionDurationSec,
            stats,
            shots: shots.slice(-MAX_SHOTS_PER_SESSION).map(shotToStoredShot),
            syncedToCloud: false,
            metadata: metadata ?? {},
        }

        this.sessions.unshift(session)

        // Limiter le stockage local
        if (this.sessions.length > MAX_LOCAL_SESSIONS) {
            this.sessions = this.sessions.slice(0, MAX_LOCAL_SESSIONS)
        }

        await this.persist()

        // Enqueue for cloud sync (auto-retried on connectivity restore)
        const syncQueue = SyncQueueService.getInstance()
        syncQueue.enqueue(session.id).catch(() => {})

        return session
    }

    // ---- Get History ----

    async getSessionHistory(limit = 50): Promise<SessionHistoryItem[]> {
        await this.load()

        return this.sessions.slice(0, limit).map(s => {
            const score = computeOverallScore(s.stats)
            return {
                id: s.id,
                createdAt: s.createdAt,
                durationSec: s.durationSec,
                totalShots: s.stats.totalShots,
                madeShots: s.stats.madeShots,
                shootingPct: s.stats.shootingPct,
                avgPostureQuality: s.stats.avgPostureQuality,
                mechanicConsistency: s.stats.mechanicConsistency,
                avgElbowAngle: s.stats.avgElbowAngle,
                avgReleaseHeight: s.stats.avgReleaseHeight,
                avgReleaseTime: s.stats.avgReleaseTime,
                followThroughPct: s.stats.followThroughPct,
                overallScore: score,
                grade: getGrade(score),
                syncedToCloud: s.syncedToCloud,
            }
        })
    }

    /** Get aggregated shot zone stats across recent sessions */
    async getZoneStats(limit = 30): Promise<Record<string, { attempts: number; made: number; pct: number }>> {
        await this.load()
        const zones: Record<string, { attempts: number; made: number }> = {}
        for (const session of this.sessions.slice(0, limit)) {
            for (const shot of session.shots) {
                if (!shot.zone) continue
                if (!zones[shot.zone]) zones[shot.zone] = { attempts: 0, made: 0 }
                zones[shot.zone].attempts++
                if (shot.outcome === 'made') zones[shot.zone].made++
            }
        }
        const result: Record<string, { attempts: number; made: number; pct: number }> = {}
        for (const [zone, data] of Object.entries(zones)) {
            result[zone] = { ...data, pct: data.attempts > 0 ? Math.round((data.made / data.attempts) * 100) : 0 }
        }
        return result
    }

    // ---- Get Full Session ----

    async getSession(sessionId: string): Promise<StoredSession | null> {
        await this.load()
        return this.sessions.find(s => s.id === sessionId) ?? null
    }

    // ---- Delete Session ----

    async deleteSession(sessionId: string): Promise<void> {
        await this.load()
        this.sessions = this.sessions.filter(s => s.id !== sessionId)
        await this.persist()
    }

    // ---- Trends ----

    async getProgressTrends(metricCount = 10): Promise<SessionTrend[]> {
        await this.load()

        const recent = this.sessions.slice(0, metricCount).reverse()
        if (recent.length < 2) return []

        const trends: SessionTrend[] = []

        // Shooting %
        const shootingValues = recent.map(s => ({
            date: s.createdAt,
            value: s.stats.shootingPct,
        }))
        trends.push(computeTrend('shooting_pct', shootingValues))

        // Posture Quality
        const postureValues = recent.map(s => ({
            date: s.createdAt,
            value: s.stats.avgPostureQuality,
        }))
        trends.push(computeTrend('posture_quality', postureValues))

        // Elbow Angle Consistency
        const elbowValues = recent.map(s => ({
            date: s.createdAt,
            value: s.stats.mechanicConsistency,
        }))
        trends.push(computeTrend('mechanic_consistency', elbowValues))

        // Release Time
        const releaseTimeValues = recent.map(s => ({
            date: s.createdAt,
            value: s.stats.avgReleaseTime * 1000, // en ms
        }))
        trends.push(computeTrend('release_time', releaseTimeValues))

        // Follow Through %
        const ftValues = recent.map(s => ({
            date: s.createdAt,
            value: s.stats.followThroughPct,
        }))
        trends.push(computeTrend('follow_through', ftValues))

        return trends
    }

    // ---- Lifetime Stats ----

    async getLifetimeStats(): Promise<{
        totalSessions: number
        totalShots: number
        totalMade: number
        overallFgPct: number
        avgScore: number
        bestScore: number
        totalMinutes: number
        currentStreak: number
        longestStreak: number
    }> {
        await this.load()

        if (this.sessions.length === 0) {
            return {
                totalSessions: 0, totalShots: 0, totalMade: 0,
                overallFgPct: 0, avgScore: 0, bestScore: 0,
                totalMinutes: 0, currentStreak: 0, longestStreak: 0,
            }
        }

        let totalShots = 0
        let totalMade = 0
        let totalDuration = 0
        let totalScore = 0
        let bestScore = 0

        for (const s of this.sessions) {
            totalShots += s.stats.totalShots
            totalMade += s.stats.madeShots
            totalDuration += s.durationSec
            const score = computeOverallScore(s.stats)
            totalScore += score
            if (score > bestScore) bestScore = score
        }

        // Streak: nombre de jours consécutifs avec une session
        const { currentStreak, longestStreak } = this.computeStreak()

        return {
            totalSessions: this.sessions.length,
            totalShots,
            totalMade,
            overallFgPct: totalShots > 0 ? Math.round((totalMade / totalShots) * 1000) / 10 : 0,
            avgScore: Math.round(totalScore / this.sessions.length),
            bestScore,
            totalMinutes: Math.round(totalDuration / 60),
            currentStreak,
            longestStreak,
        }
    }

    private computeStreak(): { currentStreak: number; longestStreak: number } {
        if (this.sessions.length === 0) return { currentStreak: 0, longestStreak: 0 }

        // Jours uniques avec sessions (triés desc)
        const days = [...new Set(
            this.sessions.map(s => s.createdAt.split('T')[0])
        )].sort().reverse()

        if (days.length === 0) return { currentStreak: 0, longestStreak: 0 }

        let currentStreak = 1
        let longestStreak = 1
        let streak = 1

        // Vérifier si aujourd'hui ou hier a une session (pour le current streak)
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const hasRecent = days[0] === today || days[0] === yesterday

        for (let i = 1; i < days.length; i++) {
            const diff = new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()
            if (diff === 86400000) { // 1 jour exact
                streak++
                longestStreak = Math.max(longestStreak, streak)
            } else {
                if (i === 1 || (i > 1 && hasRecent)) {
                    currentStreak = streak
                }
                streak = 1
            }
        }

        if (hasRecent) currentStreak = streak
        longestStreak = Math.max(longestStreak, streak)

        return { currentStreak: hasRecent ? currentStreak : 0, longestStreak }
    }

    // ---- Cloud Sync ----

    /** Initialize sync queue — call once at app startup */
    initSyncQueue(): void {
        const syncQueue = SyncQueueService.getInstance()
        syncQueue.start(async (sessionId: string) => {
            const session = await this.getSession(sessionId)
            if (!session) return
            await this.syncSessionToCloud(session)
        })
    }

    /** Sync a single session by ID (used by SyncQueue) */
    async syncSessionById(sessionId: string): Promise<void> {
        const session = await this.getSession(sessionId)
        if (!session) return
        await this.syncSessionToCloud(session)
    }

    async syncToCloud(): Promise<{ synced: number; failed: number }> {
        await this.load()

        const unsynced = this.sessions.filter(s => !s.syncedToCloud)
        let synced = 0
        let failed = 0

        for (const session of unsynced) {
            let success = false
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await this.syncSessionToCloud(session)
                    success = true
                    break
                } catch {
                    if (attempt < 2) {
                        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
                    }
                }
            }
            if (success) synced++
            else failed++
        }

        if (synced > 0) await this.persist()

        return { synced, failed }
    }

    private async syncSessionToCloud(session: StoredSession): Promise<void> {
        try {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return // Pas connecté → skip

            const userId = userData.user.id

            // Insert session
            const { error: sessionError } = await supabase
                .from(SUPABASE_TABLE)
                .upsert({
                    id: session.id,
                    user_id: userId,
                    created_at: session.createdAt,
                    duration_sec: session.durationSec,
                    total_shots: session.stats.totalShots,
                    made_shots: session.stats.madeShots,
                    shooting_pct: session.stats.shootingPct,
                    avg_elbow_angle: session.stats.avgElbowAngle,
                    avg_release_height: session.stats.avgReleaseHeight,
                    avg_release_time: session.stats.avgReleaseTime,
                    avg_posture_quality: session.stats.avgPostureQuality,
                    mechanic_consistency: session.stats.mechanicConsistency,
                    follow_through_pct: session.stats.followThroughPct,
                    total_frames: session.stats.totalFramesProcessed,
                    avg_processing_ms: session.stats.avgProcessingTimeMs,
                })

            if (sessionError) throw sessionError

            // Insert shots (batch)
            if (session.shots.length > 0) {
                const shotRows = session.shots.map(shot => ({
                    id: shot.id,
                    session_id: session.id,
                    user_id: userId,
                    outcome: shot.outcome,
                    elbow_angle: shot.elbowAngle,
                    release_height_ratio: shot.releaseHeightRatio,
                    release_time: shot.releaseTime,
                    posture_quality: shot.postureQuality,
                    has_follow_through: shot.hasFollowThrough,
                    detection_confidence: shot.detectionConfidence,
                    zone: shot.zone ?? null,
                    shot_timestamp: shot.timestamp,
                }))

                const { error: shotsError } = await supabase
                    .from(SUPABASE_SHOTS_TABLE)
                    .upsert(shotRows)

                if (shotsError) {
                    console.warn('[SessionStorage] Failed to sync shots:', shotsError)
                }
            }

            // Marquer comme synchronisé
            session.syncedToCloud = true
        } catch (err) {
            console.warn('[SessionStorage] Cloud sync failed for session', session.id, err)
            throw err
        }
    }

    // ---- Utilities ----

    getSessionCount(): number {
        return this.sessions.length
    }

    async clearAll(): Promise<void> {
        this.sessions = []
        await AsyncStorage.removeItem(STORAGE_KEY)
    }
}

// ==========================================
// Trend Computation Helper
// ==========================================

function computeTrend(
    metric: string,
    values: Array<{ date: string; value: number }>,
): SessionTrend {
    if (values.length < 2) {
        return { metric, values, direction: 'stable', changePercent: 0 }
    }

    // Comparer la première moitié à la seconde
    const mid = Math.floor(values.length / 2)
    const firstHalf = values.slice(0, mid)
    const secondHalf = values.slice(mid)

    const avgFirst = firstHalf.reduce((s, v) => s + v.value, 0) / firstHalf.length
    const avgSecond = secondHalf.reduce((s, v) => s + v.value, 0) / secondHalf.length

    const changePercent = avgFirst > 0
        ? Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
        : 0

    let direction: 'improving' | 'declining' | 'stable' = 'stable'

    // Pour release_time, baisser = improving
    if (metric === 'release_time') {
        if (changePercent < -3) direction = 'improving'
        else if (changePercent > 3) direction = 'declining'
    } else {
        if (changePercent > 3) direction = 'improving'
        else if (changePercent < -3) direction = 'declining'
    }

    return { metric, values, direction, changePercent }
}
