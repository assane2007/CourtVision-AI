import { create } from 'zustand';
import type { WorkoutDrillResult } from './app';

interface PlanDrillQueueItem {
  drillId: string;
  nameFr: string;
  icon: string;
  category: string;
  targetReps: number;
  targetSets: number;
  restSec: number;
  durationSec: number;
}

interface WorkoutState {
  // Timer
  elapsedSeconds: number;
  isPaused: boolean;
  currentRep: number;
  currentSet: number;
  
  // Plan execution
  planDrillQueue: PlanDrillQueueItem[];
  planCurrentIndex: number;
  planResults: WorkoutDrillResult[];
  planId: string | null;
  
  // Camera
  cameraPermission: 'granted' | 'denied' | 'undetermined';
  
  // Actions
  startTimer: () => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tick: () => void;
  resetTimer: () => void;
  incrementRep: () => void;
  nextSet: () => void;
  startPlanExecution: (planId: string, drills: PlanDrillQueueItem[]) => void;
  advancePlanDrill: (result: WorkoutDrillResult) => void;
  clearPlanExecution: () => void;
  setCameraPermission: (perm: 'granted' | 'denied' | 'undetermined') => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  elapsedSeconds: 0,
  isPaused: false,
  currentRep: 0,
  currentSet: 1,
  
  planDrillQueue: [],
  planCurrentIndex: 0,
  planResults: [],
  planId: null,
  
  cameraPermission: 'undetermined',
  
  startTimer: () => set({ elapsedSeconds: 0, isPaused: false, currentRep: 0, currentSet: 1 }),
  stopTimer: () => set({ isPaused: true }),
  pauseTimer: () => set({ isPaused: true }),
  resumeTimer: () => set({ isPaused: false }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  resetTimer: () => set({ elapsedSeconds: 0, isPaused: false, currentRep: 0, currentSet: 1 }),
  incrementRep: () => set((s) => ({ currentRep: s.currentRep + 1 })),
  nextSet: () => set((s) => ({ currentSet: s.currentSet + 1, currentRep: 0 })),
  
  startPlanExecution: (planId, drills) => set({
    planId,
    planDrillQueue: drills,
    planCurrentIndex: 0,
    planResults: [],
  }),
  
  advancePlanDrill: (result) => set((state) => ({
    planResults: [...state.planResults, result],
    planCurrentIndex: state.planCurrentIndex + 1,
  })),
  
  clearPlanExecution: () => set({
    planDrillQueue: [],
    planCurrentIndex: 0,
    planResults: [],
    planId: null,
  }),
  
  setCameraPermission: (cameraPermission) => set({ cameraPermission }),
}));