import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Trophy, Flame, Users, Zap } from 'lucide-react-native';

import { useAppStore } from '@/stores/app';

const MOCK_NOTIFICATIONS = [
  { id: '1', icon: Trophy, title: 'Achievement Unlocked!', message: 'You completed your first workout. Keep it up!', time: '2m ago', read: false, color: '#f97316' },
  { id: '2', icon: Flame, title: 'Streak Alert', message: 'You have a 5-day streak! Don\'t break it tomorrow.', time: '1h ago', read: false, color: '#ef4444' },
  { id: '3', icon: Users, title: 'New Friend Request', message: 'Jordan23 wants to be your friend.', time: '3h ago', read: true, color: '#22c55e' },
  { id: '4', icon: Zap, title: 'AI Insight', message: 'Your shooting accuracy improved 12% this week!', time: '1d ago', read: true, color: '#a855f7' },
  { id: '5', icon: Bell, title: 'Workout Reminder', message: 'Time for your daily shooting session!', time: '2d ago', read: true, color: '#06b6d4' },
];

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useAppStore((s) => s?.isDark);

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-950" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router?.back()} className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
          <ChevronLeft size={22} color={isDark ? '#fafafa' : '#171717'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-neutral-900 dark:text-white">{t('common.notifications')}</Text>
      </View>
      <View className="px-5">
        {MOCK_NOTIFICATIONS?.map((notif) => (
          <TouchableOpacity
            key={notif?.id}
            activeOpacity={0.7}
            className={`flex-row gap-3 py-4 border-b border-neutral-100 dark:border-neutral-800 ${!notif?.read ? 'bg-orange-50/50 dark:bg-orange-900/10 -mx-5 px-5' : ''}`}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center flex-shrink-0" style={{ backgroundColor: `${notif?.color}15` }}>
              <notif.icon size={18} color={notif?.color} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className={`font-semibold text-sm ${!notif?.read ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                  {notif?.title}
                </Text>
                <Text className="text-xs text-neutral-400">{notif?.time}</Text>
              </View>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{notif?.message}</Text>
            </View>
            {!notif?.read && <View className="w-2 h-2 rounded-full bg-orange-500 mt-2" />}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}