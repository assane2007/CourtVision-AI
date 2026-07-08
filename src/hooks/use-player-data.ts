// ─── TanStack Query hooks — data layer backed by real API ───────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type OnboardData,
  type LogWorkoutData,
  type LogMatchData,
  type ApiPlayerProfile,
  type ApiWeeklyReport,
} from "@/lib/api-client";
import type { SmartPlan } from "@/lib/player/plan-generator";
import { usePlayerStore } from "@/lib/player/store";

// ─── Profile ────────────────────────────────────────────────────────────────

export function usePlayerProfile() {
  return useQuery({
    queryKey: ["player", "profile"],
    queryFn: api.getProfile,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ApiPlayerProfile>) => api.updateProfile(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["player"] });
      // Sync to store
      const p = data.player;
      usePlayerStore.setState({
        profile: {
          name: p.name,
          age: p.age,
          position: p.position,
          heightCm: p.heightCm,
          weightKg: p.weightKg,
          yearsExperience: p.yearsExp,
          createdAt: p.createdAt,
        },
        dna: {
          shooting: p.shooting,
          handling: p.handling,
          finishing: p.finishing,
          defense: p.defense,
          iq: p.iq,
        },
      });
    },
  });
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

export function useOnboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OnboardData) => api.onboard(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["player"] });
      // Sync to store
      const p = data.player;
      usePlayerStore.setState({
        isOnboarded: true,
        profile: {
          name: p.name,
          age: p.age,
          position: p.position,
          heightCm: p.heightCm,
          weightKg: p.weightKg,
          yearsExperience: p.yearsExp,
          createdAt: p.createdAt,
        },
        dna: {
          shooting: p.shooting,
          handling: p.handling,
          finishing: p.finishing,
          defense: p.defense,
          iq: p.iq,
        },
      });
    },
  });
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export function usePlayerStats() {
  return useQuery({
    queryKey: ["player", "stats"],
    queryFn: api.getStats,
    staleTime: 10_000,
    retry: 1,
  });
}

// ─── Workouts ───────────────────────────────────────────────────────────────

export function useWorkouts(limit?: number) {
  return useQuery({
    queryKey: ["player", "workouts", limit],
    queryFn: () => api.getWorkouts(limit),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useLogWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LogWorkoutData) => api.logWorkout(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player"] });
    },
  });
}

// ─── Matches ────────────────────────────────────────────────────────────────

export function useMatches(limit?: number) {
  return useQuery({
    queryKey: ["player", "matches", limit],
    queryFn: () => api.getMatches(limit),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useLogMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LogMatchData) => api.logMatch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player"] });
    },
  });
}

// ─── Active Plan ────────────────────────────────────────────────────────────

export function useActivePlan() {
  return useQuery({
    queryKey: ["player", "plan"],
    queryFn: api.getPlan,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSetActivePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: SmartPlan | null) => api.setPlan(plan),
    onSuccess: (_data, plan) => {
      qc.invalidateQueries({ queryKey: ["player", "plan"] });
      usePlayerStore.setState({ activePlan: plan });
    },
  });
}

// ─── Achievements ───────────────────────────────────────────────────────────

export function useAchievements() {
  return useQuery({
    queryKey: ["player", "achievements"],
    queryFn: api.getAchievements,
    staleTime: 30_000,
    retry: 1,
  });
}

// ─── Chat Messages ──────────────────────────────────────────────────────────

export function useChatMessages() {
  return useQuery({
    queryKey: ["player", "chat"],
    queryFn: api.getChatMessages,
    staleTime: 5_000,
    retry: 1,
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { role: "user" | "coach"; content: string }) =>
      api.sendChatMessage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player", "chat"] });
    },
  });
}

// ─── Form Analysis ────────────────────────────────────────────────────────

export function useFormAnalyses(limit?: number) {
  return useQuery({
    queryKey: ["player", "form-analyses", limit],
    queryFn: () => api.getFormAnalyses(limit),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useSaveFormAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      overallScore: number;
      rating: string;
      elbowScore: number;
      kneeScore: number;
      alignmentScore: number;
      balanceScore: number;
      trunkScore: number;
      feedback: string;
      date: string;
    }) => api.saveFormAnalysis(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player"] });
    },
  });
}

// ─── Video Analysis ───────────────────────────────────────────────────────

export function useVideoAnalyses(limit?: number) {
  return useQuery({
    queryKey: ["player", "video-analyses", limit],
    queryFn: () => api.getVideoAnalyses(limit),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useSaveVideoAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      phase: string;
      overallScore: number;
      phaseBreakdown: string;
      aiSummary: string;
      insights: string;
      recommendations: string;
      date: string;
      durationSec: number;
    }) => api.saveVideoAnalysis(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player"] });
    },
  });
}

// ─── Weekly Report ─────────────────────────────────────────────────────────

export function useWeeklyReport() {
  return useQuery<ApiWeeklyReport>({
    queryKey: ["player", "weekly-report"],
    queryFn: api.getWeeklyReport,
    staleTime: 60_000,
    retry: 1,
  });
}