/**
 * App store — backward-compatible barrel that combines navigation + workout stores.
 *
 * Existing code can keep importing `useAppStore` from `@/stores/app`.
 * New code can import `useNavigation` directly from their
 * respective modules for finer-grained reactivity.
 */

import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Screen =
  | 'landing' | 'auth' | 'onboarding' | 'home' | 'plans' | 'train-hub' | 'drill-detail'
  | 'camera-workout' | 'workout-summary' | 'stats' | 'records' | 'profile' | 'achievements'
  | 'settings' | 'scouting' | 'reaction-trainer' | 'ai-coach' | 'leaderboard' | 'pricing'
  | 'friends' | 'teams' | 'team-detail' | 'challenges' | 'challenge-detail'
  | 'feed' | 'post-detail' | 'messages' | 'conversation' | 'profile-other'
  | 'live-workout' | 'notifications'
  | 'video-library' | 'video-player' | 'video-upload' | 'video-compare'
  | 'ai-insights' | 'voice-coach' | 'predictions' | 'ai-workout-gen'
  | 'terms' | 'privacy'

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

export interface XpAwardResult {
  xpGained: number
  leveledUp: boolean
  newLevel?: number
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

// ── Action types (separate from state to avoid unused-param lint on interface) ──

export interface AppActions {
  navigate: (screen: Screen) => void
  goBack: () => void
  selectDrill: (drillId: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setWorkoutResult: (result: WorkoutResult | null) => void
  setXpAwarded: (result: XpAwardResult | null) => void
  clearWorkoutState: () => void
  startPlanExecution: (planId: string, drills: PlanDrillQueueItem[]) => void
  advancePlanDrill: (result: WorkoutDrillResult) => void
  clearPlanExecution: () => void
}

// ── Combined State (backward compatible) ──────────────────────────────────────

interface AppState {
  // Navigation
  currentScreen: Screen
  selectedDrillId: string | null
  screenHistory: Screen[]
  sidebarOpen: boolean

  // Workout
  workoutResult: WorkoutResult | null
  xpAwarded: XpAwardResult | null

  // Plan execution
  planDrillQueue: PlanDrillQueueItem[]
  planCurrentIndex: number
  planResults: WorkoutDrillResult[]
  planId: string | null
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState & AppActions>((set) => ({
  currentScreen: 'landing',
  selectedDrillId: null,
  screenHistory: [],
  sidebarOpen: false,
  workoutResult: null,
  xpAwarded: null,

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
  setXpAwarded: (result) => set({ xpAwarded: result }),
  clearWorkoutState: () => set({ workoutResult: null, xpAwarded: null }),

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

// ── Re-export sub-stores for new code ─────────────────────────────────────────
export { useNavigation } from '@/stores/navigation'
