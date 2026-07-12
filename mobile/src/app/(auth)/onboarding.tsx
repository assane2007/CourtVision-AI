import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Check, Camera, BarChart3, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app';
import { authService } from '@/services';

const SCREEN_WIDTH = Dimensions.get('window').width;

const POSITIONS = ['pg', 'sg', 'sf', 'pf', 'c'] as const;
const GOALS = ['shooting', 'ballHandling', 'defense', 'speed', 'overall'] as const;
const EXPERIENCES = ['beginner', 'intermediate', 'advanced'] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const isDark = useAppStore((s) => s.isDark);

  const [step, setStep] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  const totalSteps = 4;

  async function handleNext() {
    if (step < totalSteps - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step + 1);
    } else {
      // Submit onboarding
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await authService.onboard({
          position: selectedPosition || 'pg',
          goals: selectedGoals.length > 0 ? selectedGoals : ['overall'],
          experience: selectedExperience || 'beginner',
        });
        router.replace('/(tabs)');
      } catch (err) {
        router.replace('/(tabs)');
      }
    }
  }

  function toggleGoal(goal: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  // Welcome slides
  if (step === 0) {
    return (
      <View className="flex-1 bg-white dark:bg-neutral-950">
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 items-center justify-center mb-8 shadow-xl shadow-orange-500/30">
            <Text className="text-5xl">🏀</Text>
          </View>
          <Text className="text-3xl font-bold text-neutral-900 dark:text-white text-center">
            {t('onboarding.welcome')}
          </Text>
          <Text className="text-neutral-500 dark:text-neutral-400 text-center mt-3 text-lg">
            {t('onboarding.subtitle')}
          </Text>
        </View>

        <View className="px-6 pb-12">
          <View className="flex-row justify-center gap-2 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-8 bg-orange-500' : 'w-2 bg-neutral-300 dark:bg-neutral-700'
                }`}
              />
            ))}
          </View>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 items-center justify-center shadow-lg shadow-orange-500/25"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-semibold text-base">{t('onboarding.getStarted')}</Text>
              <ChevronRight size={20} color="white" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="items-center mt-4">
            <Text className="text-neutral-400 text-sm">{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Position selection
  if (step === 1) {
    return (
      <View className="flex-1 bg-white dark:bg-neutral-950">
        <View className="px-6 pt-16">
          <TouchableOpacity onPress={() => setStep(step - 1)} className="mb-6">
            <ChevronLeft size={24} color={isDark ? '#fafafa' : '#171717'} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t('onboarding.position')}
          </Text>
        </View>
        <ScrollView className="flex-1 px-6 mt-6" showsVerticalScrollIndicator={false}>
          {POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPosition(pos); }}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border ${
                selectedPosition === pos
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900'
              }`}
            >
              <Text className="text-base font-medium text-neutral-900 dark:text-white">
                {t(`onboarding.positions.${pos}`)}
              </Text>
              {selectedPosition === pos && <Check size={20} color="#f97316" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View className="px-6 pb-12">
          <View className="flex-row justify-center gap-2 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <View key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-orange-500' : 'w-2 bg-neutral-300 dark:bg-neutral-700'}`} />
            ))}
          </View>
          <TouchableOpacity
            onPress={handleNext}
            disabled={!selectedPosition}
            activeOpacity={0.8}
            className={`w-full py-4 rounded-xl items-center justify-center shadow-lg disabled:opacity-40 ${
              selectedPosition
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/25'
                : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-semibold text-base">{t('common.next')}</Text>
              <ChevronRight size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Goals selection
  if (step === 2) {
    return (
      <View className="flex-1 bg-white dark:bg-neutral-950">
        <View className="px-6 pt-16">
          <TouchableOpacity onPress={() => setStep(step - 1)} className="mb-6">
            <ChevronLeft size={24} color={isDark ? '#fafafa' : '#171717'} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('onboarding.goal')}</Text>
          <Text className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">You can select multiple</Text>
        </View>
        <ScrollView className="flex-1 px-6 mt-6" showsVerticalScrollIndicator={false}>
          {GOALS.map((goal) => (
            <TouchableOpacity
              key={goal}
              onPress={() => toggleGoal(goal)}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border ${
                selectedGoals.includes(goal)
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900'
              }`}
            >
              <Text className="text-base font-medium text-neutral-900 dark:text-white">
                {t(`onboarding.goals.${goal}`)}
              </Text>
              {selectedGoals.includes(goal) && <Check size={20} color="#f97316" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View className="px-6 pb-12">
          <View className="flex-row justify-center gap-2 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <View key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-orange-500' : 'w-2 bg-neutral-300 dark:bg-neutral-700'}`} />
            ))}
          </View>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 items-center justify-center shadow-lg shadow-orange-500/25"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-semibold text-base">{t('common.next')}</Text>
              <ChevronRight size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Experience level
  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-6 pt-16">
        <TouchableOpacity onPress={() => setStep(step - 1)} className="mb-6">
          <ChevronLeft size={24} color={isDark ? '#fafafa' : '#171717'} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('onboarding.experience')}</Text>
      </View>
      <ScrollView className="flex-1 px-6 mt-6" showsVerticalScrollIndicator={false}>
        {EXPERIENCES.map((exp) => (
          <TouchableOpacity
            key={exp}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedExperience(exp); }}
            activeOpacity={0.7}
            className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border ${
              selectedExperience === exp
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900'
            }`}
          >
            <Text className="text-base font-medium text-neutral-900 dark:text-white flex-1">
              {t(`onboarding.experienceLevels.${exp}`)}
            </Text>
            {selectedExperience === exp && <Check size={20} color="#f97316" />}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View className="px-6 pb-12">
        <View className="flex-row justify-center gap-2 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-orange-500' : 'w-2 bg-neutral-300 dark:bg-neutral-700'}`} />
          ))}
        </View>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!selectedExperience}
          activeOpacity={0.8}
          className={`w-full py-4 rounded-xl items-center justify-center shadow-lg disabled:opacity-40 ${
            selectedExperience
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/25'
              : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-semibold text-base">{t('onboarding.getStarted')}</Text>
            <ChevronRight size={20} color="white" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}