// Mock for expo-notifications
export const setNotificationHandler = jest.fn()
export const setBadgeCountAsync = jest.fn().mockResolvedValue(undefined)
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' })
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' })
export const getExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' })
export const addNotificationReceivedListener = jest.fn(() => ({ remove: jest.fn() }))
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }))
export const scheduleNotificationAsync = jest.fn().mockResolvedValue('notif-id')
export const cancelScheduledNotificationAsync = jest.fn().mockResolvedValue(undefined)
export const cancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined)
export const getAllScheduledNotificationsAsync = jest.fn().mockResolvedValue([])
export const SchedulableTriggerInputTypes = {
    WEEKLY: 'weekly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    CALENDAR: 'calendar',
}
