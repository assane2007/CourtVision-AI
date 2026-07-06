import { create } from 'zustand'

export type Screen = 'auth' | 'onboarding' | 'home' | 'plans' | 'train-hub' | 'drill-detail' | 'camera-workout' | 'workout-summary' | 'stats' | 'records' | 'profile' | 'achievements'

export interface WorkoutDrillResult {
  drillId: string
  drillName: string
  drillNameFr: string
  drillCategory: string
  drillIcon: string
  reps: number
  score: number
  durationSec: number
  targetReps: number
  isPersonalBest?: boolean
}

export interface WorkoutResult {
  drills: WorkoutDrillResult[]
  totalReps: number
  totalScore: number
  totalDurationSec: number
  sessionId?: string
}

/** A drill in a plan's execution queue */
export interface PlanDrillQueueItem {
  drillId: string
  nameFr: string
  icon: string
  category: string
  targetReps: number
  targetSets: number
  restSec: number
  durationSec: number
}

interface AppState {
  currentScreen: Screen
  selectedDrillId: string | null
  screenHistory: Screen[]
  sidebarOpen: boolean
  workoutResult: WorkoutResult | null

  // Plan execution
  planDrillQueue: PlanDrillQueueItem[]
  planCurrentIndex: number
  planResults: WorkoutDrillResult[]
  planId: string | null

  // Navigation
  navigate: (screen: Screen) => void
  goBack: () => void
  selectDrill: (drillId: string) => void

  // Sidebar
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Workout
  setWorkoutResult: (result: WorkoutResult | null) => void

  // Plan execution
  startPlanExecution: (planId: string, drills: PlanDrillQueueItem[]) => void
  advancePlanDrill: (result: WorkoutDrillResult) => void
  clearPlanExecution: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'auth',
  selectedDrillId: null,
  screenHistory: [],
  sidebarOpen: false,
  workoutResult: null,

  // Plan execution
  planDrillQueue: [],
  planCurrentIndex: 0,
  planResults: [],
  planId: null,

  navigate: (screen) => set((state) => ({
    currentScreen: screen,
    screenHistory: [...state.screenHistory.slice(-20), state.currentScreen],
  })),

  goBack: () => set((state) => {
    const newHistory = [...state.screenHistory]
    const prevScreen = newHistory.pop() || 'home'
    return { currentScreen: prevScreen, screenHistory: newHistory }
  }),

  selectDrill: (drillId) => set({ selectedDrillId: drillId }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setWorkoutResult: (result) => set({ workoutResult: result }),

  // Plan execution
  startPlanExecution: (planId, drills) => set({
    planId,
    planDrillQueue: drills,
    planCurrentIndex: 0,
    planResults: [],
  }),

  advancePlanDrill: (result) => set((state) => {
    const newResults = [...state.planResults, result]
    const nextIndex = state.planCurrentIndex + 1
    return {
      planResults: newResults,
      planCurrentIndex: nextIndex,
    }
  }),

  clearPlanExecution: () => set({
    planDrillQueue: [],
    planCurrentIndex: 0,
    planResults: [],
    planId: null,
  }),
}))