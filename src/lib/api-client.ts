// ─── API Client — typed wrappers for all /api/player endpoints ─────────────
import type { SmartPlan } from "./player/plan-generator";
import type { SkillKey, PlanType } from "./player/iq-engine";

const API = "/api/player";

// ─── Error class ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ─── Generic fetch helper ────────────────────────────────────────────────────
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(
      data?.error || data?.message || "Request failed",
      res.status,
      data
    );
  }
  return data as T;
}

// ─── Types (matching API response shapes) ────────────────────────────────────

export type ApiPlayerProfile = {
  id: string;
  name: string;
  email: string;
  age: number;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  heightCm: number;
  weightKg: number;
  yearsExp: number;
  isOnboarded: boolean;
  shooting: number;
  handling: number;
  finishing: number;
  defense: number;
  iq: number;
  lastActivityDate: string | null;
  currentStreak: number;
  activePlanJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OnboardData = {
  name: string;
  email: string;
  age: number;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  heightCm: number;
  weightKg: number;
  yearsExp: number;
  shooting: number;
  handling: number;
  finishing: number;
  defense: number;
  iq: number;
};

export type WorkoutSet = { reps: number; made?: number };

export type ApiWorkout = {
  id: string;
  playerId: string;
  planId: string | null;
  planType: string;
  planTitle: string;
  date: string;
  durationMin: number;
  drillData: {
    drillId: string;
    completed: boolean;
    sets: WorkoutSet[];
    notes?: string;
  }[];
  xpEarned: number;
  intensity: number;
  skillGains: Record<string, number>;
  createdAt: string;
};

export type ApiMatch = {
  id: string;
  playerId: string;
  date: string;
  opponent: string;
  result: "W" | "L";
  teamScore: number;
  oppScore: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgMade: number;
  fgAttempts: number;
  tpMade: number;
  tpAttempts: number;
  notes: string;
  xpEarned: number;
  createdAt: string;
};

export type ApiChatMessage = {
  id: string;
  role: "user" | "coach";
  content: string;
  timestamp: string;
  createdAt: string;
};

export type ApiStats = {
  totalXP: number;
  level: { level: number; title: { fr: string; en: string }; xp: number; xpToNext: number; progress: number };
  streak: number;
  skillDNA: Record<SkillKey, number>;
  totalWorkouts: number;
  totalMatches: number;
  winRate: number;
  recentActivity: Array<
    | { type: "workout"; id: string; planType: string; planTitle: string; date: string; xpEarned: number; durationMin: number }
    | { type: "match"; id: string; date: string; opponent: string; result: string; points: number; xpEarned: number }
  >;
};

export type ApiAchievement = {
  id: string;
  unlockedAt: string;
};

export type ApiFormAnalysis = {
  id: string;
  playerId: string;
  overallScore: number;
  rating: string;
  elbowScore: number;
  kneeScore: number;
  alignmentScore: number;
  balanceScore: number;
  trunkScore: number;
  feedback: string;
  date: string;
  createdAt: string;
};

export type ApiVideoAnalysis = {
  id: string;
  playerId: string;
  phase: string;
  overallScore: number;
  phaseBreakdown: string;
  aiSummary: string;
  insights: string;
  recommendations: string;
  date: string;
  durationSec: number;
  createdAt: string;
};

export type ApiWeeklyReport = {
  weekStart: string;
  weekEnd: string;
  thisWeek: {
    totalWorkouts: number;
    totalMinutes: number;
    totalXP: number;
    avgIntensity: number;
    totalMatches: number;
    wins: number;
    losses: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    skillGains: { skill: string; gain: number }[];
  };
  prevWeek: {
    totalWorkouts: number;
    totalMinutes: number;
    totalXP: number;
  };
};

export type LogWorkoutData = {
  planId?: string;
  planType: PlanType;
  planTitle: string;
  date: string;
  durationMin: number;
  drillData: {
    drillId: string;
    completed: boolean;
    sets: WorkoutSet[];
    notes?: string;
  }[];
  intensity: 1 | 2 | 3;
};

export type LogMatchData = {
  date: string;
  opponent: string;
  result: "W" | "L";
  teamScore: number;
  oppScore: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgMade: number;
  fgAttempts: number;
  tpMade: number;
  tpAttempts: number;
  notes: string;
};

// ─── API Functions ───────────────────────────────────────────────────────────

export const api = {
  // ── Onboarding ──
  onboard: (data: OnboardData) =>
    fetchJSON<{ player: ApiPlayerProfile }>(`${API}/onboard`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Profile ──
  getProfile: () =>
    fetchJSON<{ player: ApiPlayerProfile | null }>(`${API}/profile`),

  updateProfile: (data: Partial<ApiPlayerProfile>) =>
    fetchJSON<{ player: ApiPlayerProfile }>(`${API}/profile`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // ── Workouts ──
  getWorkouts: (limit?: number) =>
    fetchJSON<{ totalCount: number; workouts: ApiWorkout[] }>(
      `${API}/workouts${limit ? `?limit=${limit}` : ""}`
    ),

  logWorkout: (data: LogWorkoutData) =>
    fetchJSON<{
      workout: ApiWorkout;
      newAchievements: string[];
    }>(`${API}/workouts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Matches ──
  getMatches: (limit?: number) =>
    fetchJSON<{ totalCount: number; matches: ApiMatch[] }>(
      `${API}/matches${limit ? `?limit=${limit}` : ""}`
    ),

  logMatch: (data: LogMatchData) =>
    fetchJSON<{
      match: ApiMatch;
      newAchievements: string[];
    }>(`${API}/matches`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Stats ──
  getStats: () => fetchJSON<ApiStats>(`${API}/stats`),

  // ── Active Plan ──
  getPlan: () =>
    fetchJSON<{ plan: SmartPlan | null }>(`${API}/plan`),

  setPlan: (plan: SmartPlan | null) =>
    fetchJSON<{ success: boolean }>(`${API}/plan`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),

  // ── Achievements ──
  getAchievements: () =>
    fetchJSON<{ achievements: ApiAchievement[] }>(`${API}/achievements`),

  // ── Chat Messages ──
  getChatMessages: () =>
    fetchJSON<{ messages: ApiChatMessage[] }>(`${API}/chat`),

  sendChatMessage: (data: { role: "user" | "coach"; content: string }) =>
    fetchJSON<{ message: ApiChatMessage }>(`${API}/chat`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Form Analysis ──
  getFormAnalyses: (limit?: number) =>
    fetchJSON<{ formAnalyses: ApiFormAnalysis[] }>(
      `${API}/form-analysis${limit ? `?limit=${limit}` : ""}`
    ),

  saveFormAnalysis: (data: {
    overallScore: number;
    rating: string;
    elbowScore: number;
    kneeScore: number;
    alignmentScore: number;
    balanceScore: number;
    trunkScore: number;
    feedback: string;
    date: string;
  }) =>
    fetchJSON<{ formAnalysis: ApiFormAnalysis }>(`${API}/form-analysis`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Video Analysis ──
  getVideoAnalyses: (limit?: number) =>
    fetchJSON<{ videoAnalyses: ApiVideoAnalysis[] }>(
      `${API}/video-analysis${limit ? `?limit=${limit}` : ""}`
    ),

  // ── Weekly Report ──
  getWeeklyReport: () =>
    fetchJSON<ApiWeeklyReport>(`${API}/weekly-report`),

  saveVideoAnalysis: (data: {
    phase: string;
    overallScore: number;
    phaseBreakdown: string;
    aiSummary: string;
    insights: string;
    recommendations: string;
    date: string;
    durationSec: number;
  }) =>
    fetchJSON<{ videoAnalysis: ApiVideoAnalysis }>(`${API}/video-analysis`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};