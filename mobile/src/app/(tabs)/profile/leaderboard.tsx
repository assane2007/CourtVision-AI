import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronLeft, Crown, Medal, Trophy } from 'lucide-react-native';
import { useAppStore } from '@/stores/app';
import { socialService } from '@/services/social.service';

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Alex MVP', score: 9850, level: 24 },
  { rank: 2, name: 'Jordan23', score: 9420, level: 22 },
  { rank: 3, name: 'KobeFan', score: 9100, level: 21 },
  { rank: 4, name: 'BallIsLife', score: 8750, level: 20 },
  { rank: 5, name: 'DunkMaster', score: 8300, level: 19 },
  { rank: 6, name: 'Shooter99', score: 7950, level: 18 },
  { rank: 7, name: 'You', score: 7200, level: 16, isYou: true },
  { rank: 8, name: 'DefenseKing', score: 7100, level: 16 },
  { rank: 9, name: 'FastBreak', score: 6800, level: 15 },
  { rank: 10, name: 'ThreePoint', score: 6500, level: 14 },
];

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useAppStore((s) => s.isDark);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

  const periods = [
    { key: 'weekly' as const, label: 'Weekly' },
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'allTime' as const, label: 'All Time' },
  ];

  function getRankStyle(rank: number) {
    if (rank === 1) return 'bg-amber-500';
    if (rank === 2) return 'bg-neutral-400';
    if (rank === 3) return 'bg-amber-700';
    return 'bg-neutral-200 dark:bg-neutral-800';
  }

  function getRankIcon(rank: number) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-5 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
          <ChevronLeft size={22} color={isDark ? '#fafafa' : '#171717'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-neutral-900 dark:text-white">{t('profile.leaderboard')}</Text>
      </View>

      {/* Period Tabs */}
      <View className="flex-row mx-5 mb-4 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900">
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            onPress={() => setPeriod(p.key)}
            className={`flex-1 py-2.5 rounded-lg items-center ${period === p.key ? 'bg-white dark:bg-neutral-800 shadow-sm' : ''}`}
          >
            <Text className={`text-sm font-medium ${period === p.key ? 'text-orange-500' : 'text-neutral-500'}`}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top 3 Podium */}
      <View className="flex-row items-end justify-center gap-3 px-5 mb-6">
        {/* 2nd */}
        <View className="items-center flex-1">
          <View className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center mb-1.5">
            <Text className="text-xl">🥈</Text>
          </View>
          <Text className="font-bold text-neutral-900 dark:text-white text-sm">{MOCK_LEADERBOARD[1].name}</Text>
          <Text className="text-xs text-neutral-500">{MOCK_LEADERBOARD[1].score.toLocaleString()}</Text>
        </View>
        {/* 1st */}
        <View className="items-center flex-1">
          <View className="w-6 h-6 rounded-full bg-amber-500 items-center justify-center mb-1.5">
            <Crown size={14} color="white" />
          </View>
          <View className="w-18 h-18 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 items-center justify-center mb-1.5 shadow-lg shadow-amber-500/30" style={{ width: 72, height: 72 }}>
            <Text className="text-3xl">🥇</Text>
          </View>
          <Text className="font-bold text-neutral-900 dark:text-white">{MOCK_LEADERBOARD[0].name}</Text>
          <Text className="text-xs text-orange-500 font-semibold">{MOCK_LEADERBOARD[0].score.toLocaleString()}</Text>
        </View>
        {/* 3rd */}
        <View className="items-center flex-1">
          <View className="w-14 h-14 rounded-full bg-amber-800/20 items-center justify-center mb-1.5">
            <Text className="text-xl">🥉</Text>
          </View>
          <Text className="font-bold text-neutral-900 dark:text-white text-sm">{MOCK_LEADERBOARD[2].name}</Text>
          <Text className="text-xs text-neutral-500">{MOCK_LEADERBOARD[2].score.toLocaleString()}</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {MOCK_LEADERBOARD.slice(3).map((entry) => (
          <View
            key={entry.rank}
            className={`flex-row items-center gap-3 py-3.5 border-b border-neutral-100 dark:border-neutral-800 ${entry.isYou ? 'bg-orange-50 dark:bg-orange-900/10 -mx-5 px-5' : ''}`}
          >
            <Text className={`w-8 text-center font-bold text-neutral-500 dark:text-neutral-400`}>#{entry.rank}</Text>
            <View className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
              <Text className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                {entry.name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className={`font-semibold text-neutral-900 dark:text-white ${entry.isYou ? 'text-orange-500' : ''}`}>
                {entry.name}
              </Text>
              <Text className="text-xs text-neutral-500">Level {entry.level}</Text>
            </View>
            <Text className="font-bold text-neutral-900 dark:text-white">{entry.score.toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}