/**
 * NotificationService — Smart notifications and training reminders.
 *
 * Features:
 * - Configurable daily training reminders
 * - Post-session notifications (summary, coaching)
 * - Streak reminders
 * - Milestone notifications (records, levels)
 * - Badge management
 *
 * Architecture:
 * - Uses expo-notifications for local scheduling
 * - Integrates with SessionStorageService for triggers
 * - Respects user preferences
 */

import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SessionRealtimeStats } from './realtimeAIService'
import type { CoachingReport } from './coachingEngine'

// ==========================================
// Types
// ==========================================

export interface NotificationPreferences {
    /** Daily reminders enabled */
    dailyReminder: boolean
    /** Daily reminder time ("HH:MM" format) */
    dailyReminderTime: string
    /** Post-session notifications */
    postSession: boolean
    /** Streak reminders */
    streakReminder: boolean
    /** Milestone notifications */
    milestones: boolean
    /** Do not disturb (silent) */
    doNotDisturb: boolean
    /** Reminder days (0=Sun, 6=Sat) */
    reminderDays: number[]
}

export interface ScheduledNotification {
    id: string
    type: 'daily_reminder' | 'streak_reminder' | 'post_session' | 'milestone'
    title: string
    body: string
    scheduledAt: string
    data?: Record<string, unknown>
}

// ==========================================
// Constants
// ==========================================

const PREFS_KEY = '@courtvision_notification_prefs'
const SCHEDULED_KEY = '@courtvision_scheduled_notifications'

const DEFAULT_PREFERENCES: NotificationPreferences = {
    dailyReminder: true,
    dailyReminderTime: '18:00',
    postSession: true,
    streakReminder: true,
    milestones: true,
    doNotDisturb: false,
    reminderDays: [1, 2, 3, 4, 5], // Mon-Fri
}

// ==========================================
// Motivational Messages
// ==========================================

const DAILY_MESSAGES = [
    { title: '🏀 It\'s time!', body: 'The court is waiting. 15 minutes is all you need to improve.' },
    { title: '🔥 Keep the momentum', body: 'Every session counts. Ready for today?' },
    { title: '🎯 Goal of the day', body: 'One step closer to your best mechanics.' },
    { title: '⚡ Quick session?', body: '50 shots, 10 minutes. AI analyzes you in real time.' },
    { title: '💪 Let\'s go!', body: 'The best shooters train every single day.' },
    { title: '🏆 Daily challenge', body: 'Beat your FG% record from yesterday. You can do it!' },
    { title: '📈 Progress', body: 'Every AI-analyzed shot brings you closer to elite.' },
]

const STREAK_MESSAGES = [
    { title: '🔥 Your streak is at risk!', body: 'You haven\'t shot today. Quick session?' },
    { title: '⚠️ Don\'t lose your streak!', body: 'A few hours left to keep it going.' },
    { title: '📉 Streak alert', body: 'Your progress is at stake. 10 minutes is enough!' },
]

const MILESTONE_MESSAGES: Record<string, { title: string; body: string }> = {
    first_session: { title: '🎉 First session!', body: 'Welcome to CourtVision AI. Your journey begins!' },
    streak_3: { title: '🔥 3 days in a row!', body: 'Consistency pays off. Keep it up!' },
    streak_7: { title: '🏆 7-day streak!', body: 'A full week! You\'re a true shooter.' },
    streak_30: { title: '👑 30-day streak!', body: 'A month of daily training. Legend!' },
    shots_100: { title: '💯 100 shots analyzed!', body: 'The AI now has a solid read on your mechanics.' },
    shots_500: { title: '🎯 500 shots!', body: 'You\'re becoming an expert. Your Shot DNA is well defined.' },
    shots_1000: { title: '⭐ 1000 shots!', body: 'You\'re in the top 1% of CourtVision AI users.' },
    fg_50: { title: '🎯 50% FG!', body: 'You\'re shooting 50% today. NBA level!' },
    fg_60: { title: '🔥 60% FG!', body: 'Outstanding performance! Keep going!' },
    grade_A: { title: '🏅 Grade A!', body: 'Your session is rated A. Excellent mechanics.' },
}

// ==========================================
// Service
// ==========================================

export class NotificationService {
    private static instance: NotificationService | null = null
    private preferences: NotificationPreferences = { ...DEFAULT_PREFERENCES, reminderDays: [...DEFAULT_PREFERENCES.reminderDays] }
    private isLoaded = false

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService()
        }
        return NotificationService.instance
    }

    private constructor() {}

    // ---- Initialization ----

    async initialize(): Promise<void> {
        if (this.isLoaded) return
        await this.loadPreferences()
        this.isLoaded = true
    }

    // ---- Preferences ----

    async loadPreferences(): Promise<NotificationPreferences> {
        try {
            const raw = await AsyncStorage.getItem(PREFS_KEY)
            if (raw) {
                this.preferences = { ...DEFAULT_PREFERENCES, reminderDays: [...DEFAULT_PREFERENCES.reminderDays], ...JSON.parse(raw) }
            } else {
                this.preferences = { ...DEFAULT_PREFERENCES, reminderDays: [...DEFAULT_PREFERENCES.reminderDays] }
            }
        } catch {
            this.preferences = { ...DEFAULT_PREFERENCES, reminderDays: [...DEFAULT_PREFERENCES.reminderDays] }
        }
        return this.preferences
    }

    async savePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
        this.preferences = { ...this.preferences, ...prefs }
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(this.preferences))

        // Reschedule notifications
        await this.rescheduleAll()
    }

    getPreferences(): NotificationPreferences {
        return { ...this.preferences }
    }

    // ---- Daily Reminder ----

    async scheduleDailyReminder(): Promise<void> {
        if (!this.preferences.dailyReminder || this.preferences.doNotDisturb) return

        // Cancel existing daily reminders
        await this.cancelNotificationsOfType('daily_reminder')

        const [hours, minutes] = this.preferences.dailyReminderTime.split(':').map(Number)
        const message = DAILY_MESSAGES[Math.floor(Math.random() * DAILY_MESSAGES.length)]

        // Schedule for each active day
        for (const day of this.preferences.reminderDays) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'daily_reminder', screen: '/workout-setup' },
                    sound: true,
                },
                trigger: {
                    weekday: day === 0 ? 1 : day + 1, // expo uses 1=Sunday
                    hour: hours,
                    minute: minutes,
                    repeats: true,
                } as any,
            })
        }
    }

    // ---- Streak Reminder ----

    async scheduleStreakReminder(currentStreak: number): Promise<void> {
        if (!this.preferences.streakReminder || this.preferences.doNotDisturb) return
        if (currentStreak < 1) return

        // Cancel existing streak reminders
        await this.cancelNotificationsOfType('streak_reminder')

        const message = STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)]

        // Schedule for 20:00 tonight
        const now = new Date()
        const trigger = new Date()
        trigger.setHours(20, 0, 0, 0)

        // If past 20:00, skip (user probably already trained or won't)
        if (now.getTime() > trigger.getTime()) return

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${message.title} (${currentStreak} jours)`,
                body: message.body,
                data: { type: 'streak_reminder', screen: '/workout-setup', streak: currentStreak },
                sound: true,
            },
            trigger: {
                date: trigger,
            } as any,
        })
    }

    // ---- Post-Session Notification ----

    async sendPostSessionNotification(
        stats: SessionRealtimeStats,
        report?: CoachingReport,
    ): Promise<void> {
        if (!this.preferences.postSession || this.preferences.doNotDisturb) return

        const grade = report?.grade ?? 'B'
        const headline = report?.headline ?? `${stats.totalShots} tirs, ${stats.shootingPct}% FG`

        // Schedule for 2 hours after session (delayed recap)
        const trigger = new Date(Date.now() + 2 * 60 * 60 * 1000)

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `📊 Résumé : Grade ${grade}`,
                body: headline,
                data: {
                    type: 'post_session',
                    screen: `/session/${stats.sessionId}`,
                    sessionId: stats.sessionId,
                },
                sound: true,
            },
            trigger: {
                date: trigger,
            } as any,
        })
    }

    // ---- Milestone Notifications ----

    async checkAndSendMilestones(
        totalSessions: number,
        totalShots: number,
        currentStreak: number,
        sessionFgPct: number,
        sessionGrade: string,
    ): Promise<void> {
        if (!this.preferences.milestones || this.preferences.doNotDisturb) return

        const milestonesToCheck: Array<{ key: string; condition: boolean }> = [
            { key: 'first_session', condition: totalSessions === 1 },
            { key: 'streak_3', condition: currentStreak === 3 },
            { key: 'streak_7', condition: currentStreak === 7 },
            { key: 'streak_30', condition: currentStreak === 30 },
            { key: 'shots_100', condition: totalShots >= 100 && totalShots < 110 },
            { key: 'shots_500', condition: totalShots >= 500 && totalShots < 510 },
            { key: 'shots_1000', condition: totalShots >= 1000 && totalShots < 1010 },
            { key: 'fg_50', condition: sessionFgPct >= 50 },
            { key: 'fg_60', condition: sessionFgPct >= 60 },
            { key: 'grade_A', condition: sessionGrade === 'A+' || sessionGrade === 'A' },
        ]

        // Check which milestones have already been sent
        const sentKey = '@courtvision_milestones_sent'
        let sent: string[] = []
        try {
            const raw = await AsyncStorage.getItem(sentKey)
            if (raw) sent = JSON.parse(raw)
        } catch { /* ignore */ }

        for (const { key, condition } of milestonesToCheck) {
            if (!condition || sent.includes(key)) continue

            const message = MILESTONE_MESSAGES[key]
            if (!message) continue

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: message.title,
                    body: message.body,
                    data: { type: 'milestone', milestone: key },
                    sound: true,
                },
                trigger: null, // Immediate
            })

            sent.push(key)
        }

        await AsyncStorage.setItem(sentKey, JSON.stringify(sent))
    }

    // ---- Cancel / Reschedule ----

    async cancelNotificationsOfType(type: string): Promise<void> {
        const all = await Notifications.getAllScheduledNotificationsAsync()
        for (const notif of all) {
            if ((notif.content.data as any)?.type === type) {
                await Notifications.cancelScheduledNotificationAsync(notif.identifier)
            }
        }
    }

    async cancelAll(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync()
    }

    async rescheduleAll(): Promise<void> {
        await this.cancelAll()
        await this.scheduleDailyReminder()
    }

    // ---- Badge ----

    async setBadgeCount(count: number): Promise<void> {
        await Notifications.setBadgeCountAsync(count)
    }

    async clearBadge(): Promise<void> {
        await Notifications.setBadgeCountAsync(0)
    }

    // ---- Permissions ----

    async requestPermissions(): Promise<boolean> {
        const { status } = await Notifications.requestPermissionsAsync()
        return status === 'granted'
    }

    async getPermissionStatus(): Promise<string> {
        const { status } = await Notifications.getPermissionsAsync()
        return status
    }
}
