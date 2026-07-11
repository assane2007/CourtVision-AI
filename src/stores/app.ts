/**
 * App store — backward-compatible barrel that combines navigation + workout stores.
 *
 * Existing code can keep importing `useAppStore` from `@/stores/app`.
 * New code can import `useNavigation` directly from their
 * respective modules for finer-grained reactivity.
 */

import { create } from 'zustand'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// ── Screen-to-Path mapping ────────────────────────────────────────────────────

const SCREEN_TO_PATH: Record<string, string> = {
  'home': '/home',
  'train': '/train',
  'drill-detail': '/train/drill/',
  'camera-workout': '/train/workout',
  'workout-summary': '/train/workout/summary',
  'plans': '/train/plans',
  'ai-coach': '/ai-coach',
  'ai-tools': '/ai-tools',
  'ai-insights': '/ai-insights',
  'predictions': '/ai/predictions',
  'ai-workout': '/ai/workout',
  'voice-coach': '/ai/voice',
  'video-library': '/videos',
  'video-upload': '/videos/upload',
  'video-player': '/videos/',
  'video-compare': '/videos/compare',
  'stats': '/stats',
  'records': '/records',
  'scouting': '/scouting',
  'reaction-trainer': '/reaction',
  'feed': '/feed',
  'post-detail': '/feed/',
  'friends': '/friends',
  'messages': '/messages',
  'conversation': '/messages/',
  'teams': '/teams',
  'team-detail': '/teams/',
  'challenges': '/challenges',
  'challenge-detail': '/challenges/',
  'leaderboard': '/leaderboard',
  'achievements': '/achievements',
  'profile': '/profile',
  'profile-other': '/profile/',
  'settings': '/settings',
  'notifications': '/notifications',
  'pricing': '/pricing',
  'live-workout': '/live',
  'admin': '/admin',
  'train-hub': '/train/hub',
  'ai-workout-gen': '/ai/workout-gen',
  'terms': '/terms',
  'privacy': '/privacy',
  'quests': '/quests',
  'recommendations': '/recommendations',
  'daily-reward': '/daily-reward',
  'referral': '/referral',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Screen =
  | 'landing' | 'auth' | 'onboarding' | 'home' | 'plans' | 'train-hub' | 'drill-detail'
  | 'camera-workout' | 'workout-summary' | 'stats' | 'records' | 'profile' | 'achievements'
  | 'settings' | 'scouting' | 'reaction-trainer' | 'ai-coach' | 'leaderboard' | 'pricing'
  | 'friends' | 'teams' | 'team-detail' | 'challenges' | 'challenge-detail'
  | 'feed' | 'post-detail' | 'messages' | 'conversation' | 'profile-other'
  | 'live-workout' | 'notifications'
  | 'video-library' | 'video-player' | 'video-upload' | 'video-compare'
  | 'ai-insights' | 'voice-coach' | 'predictions' | 'ai-workout-gen' | 'ai-tools'
  | 'terms' | 'privacy' | 'admin'

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
  navigate: (screen: Screen, id?: string) => void
  goBack: () => void
  selectDrill: (drillId: string) => void
  selectConversation: (conversationId: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setWorkoutResult: (result: WorkoutResult | null) => void
  setXpAwarded: (result: XpAwardResult | null) => void
  clearWorkoutState: () => void
  startPlanExecution: (planId: string, drills: PlanDrillQueueItem[]) => void
  advancePlanDrill: (result: WorkoutDrillResult) => void
  clearPlanExecution: () => void
  setRouter: (router: AppRouterInstance) => void
}

// ── Combined State (backward compatible) ──────────────────────────────────────

interface AppState {
  // Navigation
  currentScreen: Screen
  selectedDrillId: string | null
  selectedConversationId: string | null
  screenHistory: Screen[]
  sidebarOpen: boolean
  router: AppRouterInstance | null

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
  selectedConversationId: null,
  screenHistory: [],
  sidebarOpen: false,
  router: null,
  workoutResult: null,
  xpAwarded: null,

  // Plan execution
  planDrillQueue: [],
  planCurrentIndex: 0,
  planResults: [],
  planId: null,

  setRouter: (router) => set({ router }),

  navigate: (screen, id) => {
    const state = useAppStore.getState()
    const basePath = SCREEN_TO_PATH[screen]

    // Use Next.js router when available and a path mapping exists
    if (state.router && basePath) {
      const fullPath = basePath + (id || '')
      state.router.push(fullPath)
      // Also update Zustand state for backward compatibility
      set((s) => ({
        currentScreen: screen,
        screenHistory: [...s.screenHistory.slice(-20), s.currentScreen],
      }))
      return
    }

    // Fallback: Zustand state change only
    set((s) => ({
      currentScreen: screen,
      screenHistory: [...s.screenHistory.slice(-20), s.currentScreen],
    }))
  },

  goBack: () => {
    const state = get()
    if (state.router) {
      state.router.back()
      return
    }
    set((s) => {
      const newHistory = [...s.screenHistory]
      const prevScreen = newHistory.pop() || 'home'
      return { currentScreen: prevScreen, screenHistory: newHistory }
    })
  },

  selectDrill: (drillId) => set({ selectedDrillId: drillId }),

  selectConversation: (conversationId) => set({ selectedConversationId: conversationId }),

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
