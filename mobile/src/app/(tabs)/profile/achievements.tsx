import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Trophy } from 'lucide-react-native';
import { useAppStore } from '@/stores/app';

const MOCK_ACHIEVEMENTS = [
  { id: '1', icon: '🏆', title: 'First Workout', desc: 'Complete your first workout', unlocked: true, unlockedAt: '2025-01-15' },
  { id: '2', icon: '🔥', title: '7-Day Streak', desc: 'Train 7 days in a row', unlocked: true, unlockedAt: '2025-01-22' },
  { id: '3', icon: '🎯', title: 'Sharpshooter', desc: 'Score 95%+ on 10 shooting drills', unlocked: true, unlockedAt: '2025-02-01' },
  { id: '4', icon: '⚡', title: 'Speed Demon', desc: 'Complete 50 speed drills', unlocked: false },
  { id: '5', icon: '🛡️', title: 'Defensive Wall', desc: 'Master all defense drills', unlocked: false },
  { id: '6', icon: '⭐', title: 'Level 10', desc: 'Reach level 10', unlocked: false },
  { id: '7', icon: '🏅', title: '100 Sessions', desc: 'Complete 100 training sessions', unlocked: false },
  { id: '8', icon: '👑', title: 'MVP', desc: 'Reach #1 on the leaderboard', unlocked: false },
];

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useAppStore((s) => s?.isDark);
  const unlockedCount = MOCK_ACHIEVEMENTS?.filter(a => a?.unlocked)?.length;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-950" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router?.back()} className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
          <ChevronLeft size={22} color={isDark ? '#fafafa' : '#171717'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-neutral-900 dark:text-white">{t('profile.achievements')}</Text>
      </View>
      <View className="mx-5 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 mb-6 shadow-lg shadow-orange-500/20">
        <Text className="text-white/80 text-sm font-medium">{unlockedCount} / {MOCK_ACHIEVEMENTS?.length} Unlocked</Text>
        <View className="mt-3 bg-white/20 rounded-full h-3 overflow-hidden">
          <View className="h-full bg-white rounded-full" style={{ width: `${(unlockedCount / MOCK_ACHIEVEMENTS?.length) * 100}%` }} />
        </View>
      </View>
      <View className="px-5">
        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Unlocked</Text>
        {MOCK_ACHIEVEMENTS?.filter(a => a?.unlocked)?.map((ach) => (
          <View key={ach?.id} className="flex-row items-center gap-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
            <View className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 items-center justify-center">
              <Text className="text-2xl">{ach?.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900 dark:text-white">{ach?.title}</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">{ach?.desc}</Text>
            </View>
            <Trophy size={18} color="#f97316" />
          </View>
        ))}

        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-6 mb-3">Locked</Text>
        {MOCK_ACHIEVEMENTS?.filter(a => !a?.unlocked)?.map((ach) => (
          <View key={ach?.id} className="flex-row items-center gap-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 opacity-50">
            <View className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
              <Text className="text-2xl grayscale">{ach?.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-neutral-900 dark:text-white">{ach?.title}</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">{ach?.desc}</Text>
            </View>
            <Lock size={18} color="#a3a3a3" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}