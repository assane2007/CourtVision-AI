/**
 * useNotifications — Hook React pour les notifications intelligentes.
 *
 * Fournit :
 * - Accès aux préférences de notification
 * - Actions pour programmer les rappels
 * - Intégration post-session automatique
 * - Gestion des milestones
 *
 * Usage :
 *   const notifs = useNotifications()
 *   await notifs.scheduleDailyReminder()
 *   await notifs.onSessionComplete(stats, report)
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { NotificationService, type NotificationPreferences } from '../lib/notificationService'
import type { SessionRealtimeStats } from '../lib/realtimeAIService'
import type { CoachingReport } from '../lib/coachingEngine'

export function useNotifications() {
    const serviceRef = useRef<NotificationService>(NotificationService.getInstance())
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)

    // Initialize on mount
    useEffect(() => {
        const init = async () => {
            await serviceRef.current.initialize()
            setPreferences(serviceRef.current.getPreferences())
            setIsInitialized(true)
        }
        init()
    }, [])

    // Update preferences
    const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
        await serviceRef.current.savePreferences(prefs)
        setPreferences(serviceRef.current.getPreferences())
    }, [])

    // Schedule daily reminder
    const scheduleDailyReminder = useCallback(async () => {
        await serviceRef.current.scheduleDailyReminder()
    }, [])

    // Schedule streak reminder
    const scheduleStreakReminder = useCallback(async (currentStreak: number) => {
        await serviceRef.current.scheduleStreakReminder(currentStreak)
    }, [])

    // Post-session notification + milestones
    const onSessionComplete = useCallback(async (
        stats: SessionRealtimeStats,
        report?: CoachingReport,
        lifetimeStats?: {
            totalSessions: number
            totalShots: number
            currentStreak: number
        },
    ) => {
        // Send post-session notification (delayed recap)
        await serviceRef.current.sendPostSessionNotification(stats, report)

        // Check milestones
        if (lifetimeStats) {
            await serviceRef.current.checkAndSendMilestones(
                lifetimeStats.totalSessions,
                lifetimeStats.totalShots,
                lifetimeStats.currentStreak,
                stats.shootingPct,
                report?.grade ?? 'B',
            )
        }

        // Schedule streak reminder if active
        if (lifetimeStats?.currentStreak && lifetimeStats.currentStreak > 0) {
            await serviceRef.current.scheduleStreakReminder(lifetimeStats.currentStreak)
        }
    }, [])

    // Cancel all notifications
    const cancelAll = useCallback(async () => {
        await serviceRef.current.cancelAll()
    }, [])

    // Request permissions
    const requestPermissions = useCallback(async (): Promise<boolean> => {
        return serviceRef.current.requestPermissions()
    }, [])

    return {
        preferences,
        isInitialized,
        updatePreferences,
        scheduleDailyReminder,
        scheduleStreakReminder,
        onSessionComplete,
        cancelAll,
        requestPermissions,
    }
}
