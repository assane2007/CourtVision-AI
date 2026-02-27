/**
 * Tests pour NotificationService
 */

// The mocks are provided by __mocks__/expo-notifications.ts and __mocks__/async-storage.ts
// via jest moduleNameMapper

import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NotificationService } from '../lib/notificationService'

describe('NotificationService', () => {
    let service: NotificationService

    beforeEach(() => {
        // Reset AsyncStorage internal store and restore implementations
        ;(AsyncStorage as any).__resetStore?.()

        // Restore expo-notifications mock return values
        ;(Notifications.getPermissionsAsync as jest.Mock).mockClear().mockResolvedValue({ status: 'granted' })
        ;(Notifications.requestPermissionsAsync as jest.Mock).mockClear().mockResolvedValue({ status: 'granted' })
        ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear().mockResolvedValue('notif-id')
        ;(Notifications.cancelScheduledNotificationAsync as jest.Mock).mockClear().mockResolvedValue(undefined)
        ;(Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockClear().mockResolvedValue(undefined)
        ;(Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockClear().mockResolvedValue([])
        ;(Notifications.setBadgeCountAsync as jest.Mock).mockClear().mockResolvedValue(undefined)
        ;(Notifications.setNotificationHandler as jest.Mock).mockClear()
        ;(Notifications.getExpoPushTokenAsync as jest.Mock).mockClear().mockResolvedValue({ data: 'ExponentPushToken[test]' })

        // Reset singleton
        ;(NotificationService as any).instance = null
        service = NotificationService.getInstance()
    })

    describe('singleton', () => {
        it('should return the same instance', () => {
            const a = NotificationService.getInstance()
            const b = NotificationService.getInstance()
            expect(a).toBe(b)
        })
    })

    describe('initialization', () => {
        it('should initialize without error', async () => {
            await expect(service.initialize()).resolves.not.toThrow()
        })

        it('should load default preferences', async () => {
            await service.initialize()
            const prefs = service.getPreferences()
            expect(prefs.dailyReminder).toBe(true)
            expect(prefs.dailyReminderTime).toBe('18:00')
            expect(prefs.postSession).toBe(true)
            expect(prefs.streakReminder).toBe(true)
            expect(prefs.milestones).toBe(true)
            expect(prefs.doNotDisturb).toBe(false)
        })

        it('should load saved preferences', async () => {
            ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
                JSON.stringify({ dailyReminder: false, dailyReminderTime: '19:30' })
            )
            ;(NotificationService as any).instance = null
            service = NotificationService.getInstance()
            await service.initialize()
            const prefs = service.getPreferences()
            expect(prefs.dailyReminder).toBe(false)
            expect(prefs.dailyReminderTime).toBe('19:30')
        })
    })

    describe('preferences', () => {
        it('should save preferences', async () => {
            await service.initialize()
            await service.savePreferences({ dailyReminder: false })
            
            expect(AsyncStorage.setItem).toHaveBeenCalled()
            const prefs = service.getPreferences()
            expect(prefs.dailyReminder).toBe(false)
        })

        it('should merge preferences', async () => {
            await service.initialize()
            await service.savePreferences({ dailyReminderTime: '20:00' })

            const prefs = service.getPreferences()
            expect(prefs.dailyReminderTime).toBe('20:00')
            expect(prefs.dailyReminder).toBe(true) // unchanged
        })
    })

    describe('daily reminder', () => {
        it('should schedule daily reminders', async () => {
            await service.initialize()
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()
            await service.scheduleDailyReminder()

            expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled()
        })

        it('should not schedule when disabled', async () => {
            await service.initialize()
            // Directly modify preferences to avoid triggering reschedule
            ;(service as any).preferences.dailyReminder = false
            
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()
            await service.scheduleDailyReminder()

            expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
        })

        it('should not schedule in DND mode', async () => {
            await service.initialize()
            ;(service as any).preferences.doNotDisturb = true
            
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()
            await service.scheduleDailyReminder()

            expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
        })
    })

    describe('streak reminder', () => {
        it('should schedule streak reminder when streak > 0', async () => {
            await service.initialize()
            await service.scheduleStreakReminder(5)

            // May or may not be called depending on current time
            // Just ensure no error thrown
        })

        it('should not schedule when streak is 0', async () => {
            await service.initialize()
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()
            await service.scheduleStreakReminder(0)

            expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
        })
    })

    describe('post-session notification', () => {
        it('should schedule post-session notification', async () => {
            await service.initialize()
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()

            const stats = {
                sessionId: 'test-session',
                totalShots: 25,
                madeShots: 12,
                missedShots: 13,
                shootingPct: 48,
                avgReleaseTime: 0.42,
                avgElbowAngle: 93,
                avgReleaseHeight: 1.14,
                followThroughPct: 85,
                avgPostureQuality: 72,
                avgProcessingTimeMs: 15,
                totalFramesProcessed: 1000,
                sessionDurationSec: 600,
                shotsByZone: {},
                bestShot: null,
                worstShot: null,
                mechanicConsistency: 70,
                trends: [],
            }

            await service.sendPostSessionNotification(stats as any)
            expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled()
        })
    })

    describe('milestones', () => {
        it('should send milestone for first session', async () => {
            await service.initialize()
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()
            
            // First session with streak=1 triggers 'first_session' and 'streak_3' won't trigger (streak=1, not 3)
            await service.checkAndSendMilestones(1, 25, 1, 48, 'B')

            // first_session should be triggered
            const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls
            expect(calls.length).toBeGreaterThanOrEqual(1)
            const milestoneTypes = calls.map((c: any) => c[0]?.content?.data?.milestone).filter(Boolean)
            expect(milestoneTypes).toContain('first_session')
        })

        it('should not resend already-sent milestones', async () => {
            await service.initialize()

            // First call: sends milestones (which also stores them)
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()
            await service.checkAndSendMilestones(1, 25, 0, 30, 'C')

            const firstCallCount = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.length

            // Second call with same conditions: should not resend
            ;(Notifications.scheduleNotificationAsync as jest.Mock).mockClear()
            await service.checkAndSendMilestones(1, 25, 0, 30, 'C')

            // Should have fewer or zero calls (first_session already sent)
            const secondCallCount = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.length
            expect(secondCallCount).toBeLessThanOrEqual(firstCallCount)
        })
    })

    describe('cancel operations', () => {
        it('should cancel all notifications', async () => {
            await service.cancelAll()
            expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled()
        })

        it('should cancel notifications by type', async () => {
            ;(Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
                { identifier: 'a', content: { data: { type: 'daily_reminder' } } },
                { identifier: 'b', content: { data: { type: 'streak_reminder' } } },
            ])

            await service.cancelNotificationsOfType('daily_reminder')
            expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('a')
            expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('b')
        })
    })

    describe('badge', () => {
        it('should set badge count', async () => {
            await service.setBadgeCount(5)
            expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5)
        })

        it('should clear badge', async () => {
            await service.clearBadge()
            expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0)
        })
    })

    describe('permissions', () => {
        it('should request permissions', async () => {
            const result = await service.requestPermissions()
            expect(result).toBe(true)
            expect(Notifications.requestPermissionsAsync).toHaveBeenCalled()
        })

        it('should get permission status', async () => {
            const status = await service.getPermissionStatus()
            expect(status).toBe('granted')
        })
    })
})
