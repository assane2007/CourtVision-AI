import { useRef, useState, useCallback, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/stores/workout-store';

export function useCameraWorkout() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { tick, elapsedSeconds, isPaused, pauseTimer, resumeTimer } = useWorkoutStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(tick, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused, tick]);

  async function requestCameraPermission(): Promise<boolean> {
    if (permission?.granted) return true;
    const result = await requestPermission();
    return result.granted;
  }

  async function startWorkout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(true);
  }

  function pauseWorkout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pauseTimer();
  }

  function resumeWorkout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resumeTimer();
  }

  async function stopWorkout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsRecording(false);
    if (cameraRef.current) {
      // Stop camera if needed
    }
  }

  async function captureFrame(): Promise<string | null> {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return photo?.uri || null;
    } catch {
      return null;
    }
  }

  return {
    cameraRef,
    permission,
    isRecording,
    elapsedSeconds,
    isPaused,
    requestCameraPermission,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    stopWorkout,
    captureFrame,
  };
}