import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Star, Play, Heart, Share2, Trophy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { drillService } from '../../../../services/drill.service';
import { CATEGORY_META } from '../../../../../../src/lib/constants';

export default function DrillDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useAppStore((s) => s.isDark);

  const { data: drill, isLoading } = useQuery({
    queryKey: ['drill', id],
    queryFn: () => drillService.getDrill(id!),
    enabled: !!id,
  });

  const meta = CATEGORY_META[drill?.category || ''];

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!drill) return null;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-950" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="px-5 pt-14 pb-2 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
          <ChevronLeft size={22} color={isDark ? '#fafafa' : '#171717'} />
        </TouchableOpacity>
        <View className="flex-row gap-2">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
            <Heart size={20} color="#737373" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 items-center justify-center">
            <Share2 size={20} color="#737373" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Drill Icon + Title */}
      <View className="items-center mt-4 mb-6">
        <View className="w-20 h-20 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: `${meta?.color}20` }}>
          <Text className="text-4xl">{meta?.icon || '🏀'}</Text>
        </View>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white text-center px-4">{drill.nameFr}</Text>
        <Text className="text-neutral-500 dark:text-neutral-400 mt-1">{drill.category.replace('_', ' ')}</Text>
      </View>

      {/* Stats Row */}
      <View className="flex-row gap-3 mx-5 mb-6">
        <View className="flex-1 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 items-center">
          <Clock size={16} color="#f97316" />
          <Text className="text-lg font-bold text-neutral-900 dark:text-white mt-1">{drill.duration}s</Text>
          <Text className="text-xs text-neutral-500">{t('training.duration')}</Text>
        </View>
        <View className="flex-1 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 items-center">
          <Star size={16} color="#f97316" />
          <Text className="text-lg font-bold text-neutral-900 dark:text-white mt-1">{drill.targetReps}</Text>
          <Text className="text-xs text-neutral-500">{t('training.reps')}</Text>
        </View>
        <View className="flex-1 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 items-center">
          <Trophy size={16} color="#f97316" />
          <Text className="text-lg font-bold text-neutral-900 dark:text-white mt-1">—</Text>
          <Text className="text-xs text-neutral-500">{t('training.score')}</Text>
        </View>
      </View>

      {/* Instructions */}
      <View className="mx-5 mb-6">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">Instructions</Text>
        {drill.instructionsFr.map((instruction, i) => (
          <View key={i} className="flex-row gap-3 mb-3">
            <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center mt-0.5">
              <Text className="text-white text-xs font-bold">{i + 1}</Text>
            </View>
            <Text className="flex-1 text-neutral-700 dark:text-neutral-300 text-sm leading-5">{instruction}</Text>
          </View>
        ))}
      </View>

      {/* Start Button */}
      <View className="px-5 pb-12">
        <TouchableOpacity
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Navigate to camera workout (native camera)
          }}
          activeOpacity={0.8}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 items-center justify-center shadow-lg shadow-orange-500/25"
        >
          <View className="flex-row items-center gap-2">
            <Play size={20} color="white" fill="white" />
            <Text className="text-white font-semibold text-lg">{t('training.startWorkout')}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}