import { View, ScrollView, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Flame, Trophy, TrendingUp, ChevronRight, Zap, Calendar, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { playerService } from '@/services';
import { formatXp } from '@/utils/formatters';
import { cn } from '@/utils/cn';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const isDark = useAppStore((s) => s.isDark);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['playerStats'],
    queryFn: playerService.getStats,
  });

  const xpProgress = stats ? (stats.xp / stats.xpToNext) * 100 : 0;

  const quickActions = [
    { icon: '🏀', label: 'Quick Workout', screen: '/(tabs)/train' as const, color: 'from-orange-500 to-red-500' },
    { icon: '🤖', label: 'AI Coach', screen: '/(tabs)/ai-coach' as const, color: 'from-purple-500 to-violet-500' },
    { icon: '📊', label: 'Stats', screen: '/(tabs)/stats' as const, color: 'from-emerald-500 to-teal-500' },
    { icon: '🏆', label: 'Leaderboard', screen: '/(tabs)/profile/leaderboard' as const, color: 'from-amber-500 to-yellow-500' },
  ];

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refetch(); }}
          tintColor="#f97316"
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View className="px-5 pt-14 pb-4">
        <Text className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
          {t('home.welcome')} 👋
        </Text>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white mt-0.5">
          {user?.name || 'Player'}
        </Text>
      </View>

      {/* XP / Level Card */}
      <View className="mx-5 p-5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/20">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-orange-100 text-sm font-medium">Level {stats?.level || 1}</Text>
            <Text className="text-white text-3xl font-bold mt-0.5">
              {formatXp(stats?.xp || 0)} XP
            </Text>
          </View>
          <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
            <TrendingUp size={28} color="white" strokeWidth={2.5} />
          </View>
        </View>
        <View className="mt-4 bg-white/20 rounded-full h-2.5 overflow-hidden">
          <View
            className="h-full bg-white rounded-full"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          />
        </View>
        <Text className="text-orange-100 text-xs mt-1.5">
          {stats?.xp || 0} / {stats?.xpToNext || 100} XP to next level
        </Text>
      </View>

      {/* Streak + Sessions Row */}
      <View className="flex-row gap-3 mx-5 mt-4">
        <View className="flex-1 p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900">
          <View className="flex-row items-center gap-2">
            <Flame size={18} color="#f97316" />
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{t('home.streak')}</Text>
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            {stats?.streakDays || 0}
            <Text className="text-sm font-normal text-neutral-500"> {t('home.days')}</Text>
          </Text>
        </View>
        <View className="flex-1 p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900">
          <View className="flex-row items-center gap-2">
            <Calendar size={18} color="#f97316" />
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{t('stats.totalSessions')}</Text>
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            {stats?.totalSessions || 0}
          </Text>
        </View>
        <View className="flex-1 p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900">
          <View className="flex-row items-center gap-2">
            <Star size={18} color="#f97316" />
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{t('stats.averageScore')}</Text>
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            {stats?.avgScore ? `${Math.round(stats.avgScore * 100)}%` : '—'}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="mt-6 px-5">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
          {t('home.quickStart')}
        </Text>
        <View className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.screen);
              }}
              activeOpacity={0.7}
              className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            >
              <Text className="text-3xl mb-2">{action.icon}</Text>
              <Text className="text-sm font-semibold text-neutral-900 dark:text-white">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Weekly Challenge */}
      <View className="mx-5 mt-6 p-5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-purple-100 text-xs font-medium uppercase tracking-wider">
              {t('home.weeklyChallenge')}
            </Text>
            <Text className="text-white text-lg font-bold mt-1">
              50 Shooting Drills
            </Text>
            <Text className="text-purple-200 text-sm mt-1">
              12/50 completed
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(tabs)/train');
            }}
            className="bg-white/20 px-4 py-2.5 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">{t('training.start')}</Text>
          </TouchableOpacity>
        </View>
        <View className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
          <View className="h-full bg-white rounded-full" style={{ width: '24%' }} />
        </View>
      </View>
    </ScrollView>
  );
}