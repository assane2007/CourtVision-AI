import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, Clock, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { drillService } from '@/services/drill.service';
import { CATEGORIES_LIST, CATEGORY_META } from '@/constants';
import { cn } from '@/utils/cn';

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    facile: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    moyen: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    difficile: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };
  const labels: Record<string, string> = { facile: 'Débutant', moyen: 'Intermédiaire', difficile: 'Avancé' };
  return (
    <View className={cn('px-2.5 py-0.5 rounded-full self-start', colors[difficulty] || colors.facile)}>
      <Text className="text-xs font-medium">{labels[difficulty] || difficulty}</Text>
    </View>
  );
}

export default function TrainScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = useAppStore((s) => s.isDark);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: drills, isLoading } = useQuery({
    queryKey: ['drills', selectedCategory],
    queryFn: () => drillService.getDrills(selectedCategory),
  });

  const filteredDrills = drills?.filter((d) =>
    !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.nameFr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-5 pt-14 pb-4">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('nav.training')}</Text>
      </View>

      <View className="px-5 mb-4">
        <View className="flex-row items-center gap-3 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <Search size={18} color="#737373" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('common.search') + '...'}
            placeholderTextColor="#a3a3a3"
            className="flex-1 text-neutral-900 dark:text-white text-base"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-4" contentContainerStyle={{ gap: 8 }}>
        {CATEGORIES_LIST.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCategory(cat.key); }}
            activeOpacity={0.7}
            className={cn(
              'px-4 py-2 rounded-full border items-center',
              selectedCategory === cat.key
                ? 'border-orange-500 bg-orange-500'
                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900'
            )}
          >
            <Text className={cn(
              'text-sm font-medium',
              selectedCategory === cat.key ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
            )}>
              {cat.icon} {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
          {filteredDrills?.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-3">🏀</Text>
              <Text className="text-neutral-500 dark:text-neutral-400">{t('common.noResults')}</Text>
            </View>
          ) : (
            filteredDrills?.map((drill) => {
              const meta = CATEGORY_META[drill.category];
              return (
                <TouchableOpacity
                  key={drill.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/(tabs)/train/drill/${drill.id}`);
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-4 p-4 rounded-2xl mb-3 border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
                >
                  <View className="w-14 h-14 rounded-xl items-center justify-center" style={{ backgroundColor: `${meta?.color}20` }}>
                    <Text className="text-2xl">{meta?.icon || '🏀'}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-neutral-900 dark:text-white text-base">{drill.nameFr}</Text>
                    <View className="flex-row items-center gap-3 mt-1">
                      <View className="flex-row items-center gap-1">
                        <Clock size={12} color="#737373" />
                        <Text className="text-xs text-neutral-500">{drill.duration}s</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Star size={12} color="#737373" />
                        <Text className="text-xs text-neutral-500">{drill.targetReps} {t('training.reps')}</Text>
                      </View>
                    </View>
                    <View className="mt-1.5">
                      <DifficultyBadge difficulty={drill.difficulty} />
                    </View>
                  </View>
                  <ChevronRight size={20} color="#a3a3a3" />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}