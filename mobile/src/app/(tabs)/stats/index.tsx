import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Flame, TrendingUp, Award, Target, ChevronRight, BarChart3, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { playerService } from '@/services';

export default function StatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useAppStore((s) => s?.isDark);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['playerStats'],
    queryFn: playerService?.getStats,
  });

  const statCards = [
    { icon: Calendar, label: t('stats.totalSessions'), value: stats?.totalSessions || 0, color: '#f97316' },
    { icon: Target, label: t('stats.repetitions'), value: stats?.totalReps || 0, color: '#22c55e' },
    { icon: TrendingUp, label: t('stats.averageScore'), value: stats?.avgScore ? `${Math.round(stats?.avgScore * 100)}%` : '—', color: '#a855f7' },
    { icon: Flame, label: t('stats.streakDays'), value: stats?.streakDays || 0, color: '#ef4444' },
  ];

  // Mock weekly data for chart
  const weeklyData = [
    { day: 'Lun', value: 3 },
    { day: 'Mar', value: 5 },
    { day: 'Mer', value: 2 },
    { day: 'Jeu', value: 0 },
    { day: 'Ven', value: 4 },
    { day: 'Sam', value: 6 },
    { day: 'Dim', value: 1 },
  ];
  const maxWeekly = Math.max(...weeklyData?.map(d => d?.value), 1);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="px-5 pt-14 pb-4">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('stats.title')}</Text>
      </View>
      {/* Stat Cards Grid */}
      <View className="grid grid-cols-2 gap-3 px-5">
        {statCards?.map((card) => (
          <View key={card?.label} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: `${card?.color}15` }}>
              <card.icon size={20} color={card?.color} />
            </View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{card?.value}</Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{card?.label}</Text>
          </View>
        ))}
      </View>
      {/* Weekly Activity Chart */}
      <View className="mx-5 mt-6 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="font-semibold text-neutral-900 dark:text-white">{t('stats.weeklyActivity')}</Text>
          <BarChart3 size={18} color="#737373" />
        </View>
        <View className="flex-row items-end justify-between gap-2 h-32">
          {weeklyData?.map((day) => (
            <View key={day?.day} className="flex-1 items-center gap-1.5">
              <Text className="text-xs font-medium text-neutral-500">{day?.value}</Text>
              <View
                className="w-full rounded-lg bg-orange-500"
                style={{ height: `${Math.max((day?.value / maxWeekly) * 100, 4)}%` }}
              />
              <Text className="text-xs text-neutral-400">{day?.day}</Text>
            </View>
          ))}
        </View>
      </View>
      {/* Quick Links */}
      <View className="mx-5 mt-6">
        <TouchableOpacity
          onPress={() => { Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light); router?.push('/(tabs)/profile/achievements'); }}
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-4 rounded-2xl mb-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
        >
          <View className="flex-row items-center gap-3">
            <Award size={20} color="#f97316" />
            <Text className="font-medium text-neutral-900 dark:text-white">{t('profile.achievements')}</Text>
          </View>
          <ChevronRight size={20} color="#a3a3a3" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light); router?.push('/(tabs)/profile/leaderboard'); }}
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
        >
          <View className="flex-row items-center gap-3">
            <TrendingUp size={20} color="#f97316" />
            <Text className="font-medium text-neutral-900 dark:text-white">{t('profile.leaderboard')}</Text>
          </View>
          <ChevronRight size={20} color="#a3a3a3" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}