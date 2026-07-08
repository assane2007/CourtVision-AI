import { create } from 'zustand'
import type { WorkoutDrillResult, WorkoutResult, PlanDrillQueueItem } from '@/stores/app'

// ── Workout Store ─────────────────────────────────────────────────────────────

interface WorkoutActions {
  setWorkoutResult: (result: WorkoutResult | null) => void
  startPlanExecution: (planId: string, drills: PlanDrillQueueItem[]) => void
  advancePlanDrill: (result: WorkoutDrillResult) => void
  clearPlanExecution: () => void
}

interface WorkoutState {
  workoutResult: WorkoutResult | null

  // Plan execution
  planDrillQueue: PlanDrillQueueItem[]
  planCurrentIndex: number
  planResults: WorkoutDrillResult[]
  planId: string | null
}

export const useWorkout = create<WorkoutState & WorkoutActions>((set) => ({
  workoutResult: null,

  // Plan execution
  planDrillQueue: [],
  planCurrentIndex: 0,
  planResults: [],
  planId: null,

  setWorkoutResult: (result) => set({ workoutResult: result }),

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