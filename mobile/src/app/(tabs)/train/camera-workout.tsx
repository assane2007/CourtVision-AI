import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Play, Pause, Square, RotateCcw, Zap, Clock, Target } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/app';
import { useWorkoutStore } from '@/stores/workout-store';
import { formatDuration } from '@/utils/formatters';
import { cn } from '@/utils/cn';

export default function CameraWorkoutScreen() {
  const router = useRouter();
  const { id: drillId } = useLocalSearchParams<{ id?: string }>();
  const isDark = useAppStore((s) => s.isDark);
  const { setWorkoutResult } = useAppStore((s) => s);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reps, setReps] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [targetReps] = useState(10);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording, isPaused]);

  async function handleStart() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission required', 'Camera access is needed for workout analysis.');
        return;
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(true);
    setIsPaused(false);
  }

  function handlePause() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(true);
  }

  function handleResume() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(false);
  }

  function handleRep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newReps = reps + 1;
    setReps(newReps);
    // Simulated scoring
    const score = Math.min(100, 70 + Math.random() * 30);
    setCurrentScore(Math.round(score));
    if (newReps >= targetReps) {
      handleFinish();
    }
  }

  function handleFinish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setWorkoutResult({
      drills: [{
        drillId: drillId || 'custom',
        drillName: 'Custom Workout',
        drillNameFr: 'Entraînement',
        drillCategory: 'shooting',
        drillIcon: '🎯',
        reps,
        score: currentScore,
        durationSec: elapsed,
        targetReps,
        isPersonalBest: currentScore >= 95,
      }],
      totalReps: reps,
      totalScore: currentScore,
      totalDurationSec: elapsed,
    });

    router.replace('/(tabs)/home');
  }

  const progress = (reps / targetReps) * 100;

  return (
    <View className="flex-1 bg-black">
      {/* Camera */}
      <View className="flex-1 relative">
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
            mode="video"
            active={isRecording && !isPaused}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-neutral-950">
            <Text className="text-4xl mb-4">📷</Text>
            <Text className="text-neutral-400 text-center px-8 mb-6">
              Camera access required to analyze your form
            </Text>
            <TouchableOpacity
              onPress={handleStart}
              className="px-8 py-3.5 rounded-xl bg-orange-500"
            >
              <Text className="text-white font-semibold">Enable Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Top Bar */}
        <View className="absolute top-0 left-0 right-0 px-5 pt-14 pb-4 bg-gradient-to-b from-black/60 to-transparent">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
            >
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <View className="px-4 py-1.5 rounded-full bg-black/40">
              <Text className="text-white text-sm font-medium">{formatDuration(elapsed)}</Text>
            </View>
            <View className="w-10" />
          </View>
        </View>

        {/* Score Overlay */}
        {isRecording && (
          <View className="absolute top-24 left-5 right-5 flex-row gap-3">
            <View className="flex-1 p-3 rounded-xl bg-black/50 backdrop-blur-sm">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Target size={14} color="#f97316" />
                <Text className="text-orange-400 text-xs font-medium">Reps</Text>
              </View>
              <Text className="text-white text-2xl font-bold">{reps}<Text className="text-neutral-400 text-sm">/{targetReps}</Text></Text>
            </View>
            <View className="flex-1 p-3 rounded-xl bg-black/50 backdrop-blur-sm">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Zap size={14} color="#22c55e" />
                <Text className="text-green-400 text-xs font-medium">Score</Text>
              </View>
              <Text className="text-white text-2xl font-bold">{currentScore}<Text className="text-neutral-400 text-sm">%</Text></Text>
            </View>
          </View>
        )}

        {/* Rep Progress */}
        {isRecording && (
          <View className="absolute bottom-40 left-5 right-5">
            <View className="bg-black/50 backdrop-blur-sm rounded-xl p-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-white text-sm font-medium">Progress</Text>
                <Text className="text-orange-400 text-sm font-bold">{Math.round(progress)}%</Text>
              </View>
              <View className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <View
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Pause Overlay */}
        {isPaused && (
          <View className="absolute inset-0 bg-black/70 items-center justify-center">
            <View className="items-center">
              <Pause size={48} color="white" />
              <Text className="text-white text-xl font-bold mt-4">PAUSED</Text>
              <Text className="text-neutral-400 mt-1">Tap resume to continue</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      <View className="px-5 pb-12 pt-4 bg-black">
        {!isRecording ? (
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.8}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 items-center justify-center shadow-lg shadow-orange-500/30"
          >
            <View className="flex-row items-center gap-2">
              <Play size={22} color="white" fill="white" />
              <Text className="text-white font-semibold text-lg">Start Workout</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={isPaused ? handleResume : handlePause}
              activeOpacity={0.8}
              className="flex-1 py-4 rounded-xl bg-neutral-800 items-center justify-center"
            >
              <View className="flex-row items-center gap-2">
                {isPaused ? <Play size={20} color="white" fill="white" /> : <Pause size={20} color="white" />}
                <Text className="text-white font-semibold">{isPaused ? 'Resume' : 'Pause'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRep}
              activeOpacity={0.7}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 items-center justify-center shadow-lg shadow-orange-500/25"
            >
              <View className="flex-row items-center gap-2">
                <Target size={20} color="white" />
                <Text className="text-white font-semibold">Count Rep +1</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {isRecording && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Finish Workout', 'Are you sure you want to end this session?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Finish', style: 'destructive', onPress: handleFinish },
              ]);
            }}
            className="flex-row items-center justify-center gap-2 mt-3"
          >
            <Square size={16} color="#ef4444" fill="#ef4444" />
            <Text className="text-red-400 font-medium text-sm">End Workout</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}