import { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response.notification);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('courtvision-workouts', {
        name: 'Workout Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f97316',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' })).data;
      // Send token to backend
      // await apiClient.post('/api/notifications/push/register', { token });
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    return token;
  }

  async function scheduleWorkoutReminder(title: string, body: string, trigger: Notifications.NotificationTriggerInput) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, badge: 1 },
      trigger,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  return {
    expoPushToken,
    notification,
    scheduleWorkoutReminder,
    cancelAllNotifications,
  };
}