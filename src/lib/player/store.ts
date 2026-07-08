"use client";

import { create } from "zustand";
import { SkillDNA, SkillKey, levelFromXP, type PlanType } from "./iq-engine";
import { SmartPlan, generatePlan } from "./plan-generator";
import { api } from "@/lib/api-client";

// ─── Exported types (kept for backward-compat — screens import these) ───────

export type PlayerProfile = {
  name: string;
  age: number;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  heightCm: number;
  weightKg: number;
  yearsExperience: number;
  createdAt: string;
};

export type WorkoutSet = { reps: number; made?: number };

export type WorkoutLog = {
  id: string;
  planId: string;
  planType: PlanType;
  planTitle: string;
  date: string;
  durationMin: number;
  drillCompletions: { drillId: string; completed: boolean; sets: WorkoutSet[]; notes?: string }[];
  xpEarned: number;
  intensity: 1 | 2 | 3;
  skillGains: Partial<Record<SkillKey, number>>;
};

export type MatchLog = {
  id: string;
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
};

export type ChatMessage = {
  id: string;
  role: "user" | "coach";
  content: string;
  timestamp: string;
};

// ─── Notification preferences ──────────────────────────────────────────────
export type NotificationPreferences = {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
  days: boolean[]; // Mon=0 ... Sun=6
  lastFiredDate: string | null; // ISO date string for dedup
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: false,
  hour: 9,
  minute: 0,
  days: [true, true, true, true, true, false, false], // Mon-Fri
  lastFiredDate: null,
};

// ─── Store type ─────────────────────────────────────────────────────────────
// Data arrays (workouts, matches, chat, achievements) are now fetched via
// TanStack Query hooks.  The store holds only UI-state / bridge fields.

type PlayerState = {
  // UI gate
  isOnboarded: boolean;
  profile: PlayerProfile | null;
  dna: SkillDNA;

  // Active plan (also persisted server-side via /api/player/plan)
  activePlan: SmartPlan | null;

  // Streak (synced from API profile)
  lastActivityDate: string | null;
  currentStreak: number;

  // Notification preferences
  notificationPrefs: NotificationPreferences;

  // ── Deprecated arrays — kept as empty defaults for backward-compat ──
  // Real data is now fetched via TanStack Query hooks (use-player-data.ts)
  /** @deprecated Use useWorkouts() from @/hooks/use-player-data */
  workouts: WorkoutLog[];
  /** @deprecated Use useMatches() from @/hooks/use-player-data */
  matches: MatchLog[];
  /** @deprecated Use useChatMessages() from @/hooks/use-player-data */
  chatHistory: ChatMessage[];
  /** @deprecated Use useAchievements() from @/hooks/use-player-data */
  unlockedAchievements: string[];

  // ── Actions (bridge — delegate to API) ──────────────────────────
  onboard: (profile: PlayerProfile, initialDNA: SkillDNA) => Promise<void>;
  updateProfile: (updates: Partial<PlayerProfile>) => Promise<void>;
  resetProfile: () => void;
  updateDNA: (dna: Partial<SkillDNA>) => void;
  setActivePlan: (plan: SmartPlan) => Promise<void>;
  deactivatePlan: () => Promise<void>;
  logWorkout: (log: Omit<WorkoutLog, "id" | "xpEarned" | "skillGains">) => Promise<{ xpEarned: number; skillGains: Partial<Record<SkillKey, number>> }>;
  logMatch: (match: Omit<MatchLog, "id" | "xpEarned">) => Promise<{ xpEarned: number }>;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearChat: () => void;
  setNotificationPrefs: (prefs: Partial<NotificationPreferences>) => void;

  // ── Legacy helpers (return 0 / no-op — real data from TanStack Query) ──
  totalXP: () => number;
  level: () => ReturnType<typeof levelFromXP>;
  unlockedNewAchievements: () => string[];
};

export const usePlayerStore = create<PlayerState>()((set, _get) => ({
  isOnboarded: false,
  profile: null,
  dna: { shooting: 50, handling: 50, finishing: 50, defense: 50, iq: 50 },
  activePlan: null,
  lastActivityDate: null,
  currentStreak: 0,
  notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
  // Deprecated arrays (empty — real data from TanStack Query)
  workouts: [],
  matches: [],
  chatHistory: [],
  unlockedAchievements: [],

  // ── Onboard (calls API) ─────────────────────────────────────────
  onboard: async (profile, initialDNA) => {
    const email = `${profile.name.toLowerCase().replace(/\s+/g, ".")}@courtvision.ai`;
    const result = await api.onboard({
      name: profile.name,
      email,
      age: profile.age,
      position: profile.position,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      yearsExp: profile.yearsExperience,
      ...initialDNA,
    });
    const p = result.player;
    set({
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

  // ── Update profile (calls API) ──────────────────────────────────
  updateProfile: async (updates) => {
    const result = await api.updateProfile(updates);
    const p = result.player;
    set({
      profile: {
        name: p.name,
        age: p.age,
        position: p.position,
        heightCm: p.heightCm,
        weightKg: p.weightKg,
        yearsExperience: p.yearsExp,
        createdAt: p.createdAt,
      },
    });
  },

  resetProfile: () =>
    set({
      isOnboarded: false,
      profile: null,
      dna: { shooting: 50, handling: 50, finishing: 50, defense: 50, iq: 50 },
      activePlan: null,
      lastActivityDate: null,
      currentStreak: 0,
      workouts: [],
      matches: [],
      chatHistory: [],
      unlockedAchievements: [],
    }),

  updateDNA: (partial) =>
    set((state) => ({ dna: { ...state.dna, ...partial } as SkillDNA })),

  // ── Active plan (calls API) ─────────────────────────────────────
  setActivePlan: async (plan) => {
    await api.setPlan(plan);
    set({ activePlan: plan });
  },

  deactivatePlan: async () => {
    await api.setPlan(null);
    set({ activePlan: null });
  },

  // ── Log workout (calls API) ─────────────────────────────────────
  logWorkout: async (logData) => {
    const result = await api.logWorkout({
      planId: logData.planId,
      planType: logData.planType,
      planTitle: logData.planTitle,
      date: logData.date,
      durationMin: logData.durationMin,
      drillData: logData.drillCompletions.map((d) => ({
        drillId: d.drillId,
        completed: d.completed,
        sets: d.sets,
        notes: d.notes,
      })),
      intensity: logData.intensity,
    });
    const w = result.workout;
    const skillGains: Partial<Record<SkillKey, number>> = {};
    for (const [k, v] of Object.entries(w.skillGains)) {
      if (typeof v === "number") skillGains[k as SkillKey] = v;
    }
    // Sync DNA from API
    try {
      const profileRes = await api.getProfile();
      if (profileRes.player) {
        const p = profileRes.player;
        set({
          dna: {
            shooting: p.shooting,
            handling: p.handling,
            finishing: p.finishing,
            defense: p.defense,
            iq: p.iq,
          },
          currentStreak: p.currentStreak,
        });
      }
    } catch {
      // non-critical
    }
    return { xpEarned: w.xpEarned, skillGains };
  },

  // ── Log match (calls API) ───────────────────────────────────────
  logMatch: async (matchData) => {
    const result = await api.logMatch({
      date: matchData.date,
      opponent: matchData.opponent,
      result: matchData.result,
      teamScore: matchData.teamScore,
      oppScore: matchData.oppScore,
      minutes: matchData.minutes,
      points: matchData.points,
      rebounds: matchData.rebounds,
      assists: matchData.assists,
      steals: matchData.steals,
      blocks: matchData.blocks,
      turnovers: matchData.turnovers,
      fgMade: matchData.fgMade,
      fgAttempts: matchData.fgAttempts,
      tpMade: matchData.tpMade,
      tpAttempts: matchData.tpAttempts,
      notes: matchData.notes,
    });
    const m = result.match;
    // Sync DNA from API
    try {
      const profileRes = await api.getProfile();
      if (profileRes.player) {
        const p = profileRes.player;
        set({
          dna: {
            shooting: p.shooting,
            handling: p.handling,
            finishing: p.finishing,
            defense: p.defense,
            iq: p.iq,
          },
          currentStreak: p.currentStreak,
        });
      }
    } catch {
      // non-critical
    }
    return { xpEarned: m.xpEarned };
  },

  // ── Chat actions (no-op — chat now persisted via API) ─────────────
  addChatMessage: () => {},
  clearChat: () => {},

  // ── Notification preferences ────────────────────────────────────
  setNotificationPrefs: (partial) =>
    set((state) => ({
      notificationPrefs: { ...state.notificationPrefs, ...partial },
    })),

  // ── Legacy helpers ──────────────────────────────────────────────
  // These return static/zero values — real data comes from TanStack Query.
  totalXP: () => 0,
  level: () => levelFromXP(0),
  unlockedNewAchievements: () => [],
}));

// ─── Utility: next recommended plan (kept for backward-compat) ──────────────
export function nextRecommendedPlan(dna: SkillDNA): { type: PlanType; level: "beginner" | "intermediate" | "advanced"; skill: SkillKey } | null {
  const skillKeys: SkillKey[] = ["shooting", "handling", "finishing", "defense", "iq"];
  let lowestSkill: SkillKey | null = null;
  let lowestValue = 100;
  for (const k of skillKeys) {
    if (dna[k] < lowestValue) {
      lowestValue = dna[k];
      lowestSkill = k;
    }
  }
  if (!lowestSkill) return null;
  const planType: PlanType =
    lowestSkill === "shooting" ? "shooting" :
    lowestSkill === "handling" ? "handling" :
    lowestSkill === "finishing" ? "finishing" :
    lowestSkill === "defense" ? "defense" : "footwork";
  const level: "beginner" | "intermediate" | "advanced" =
    lowestValue < 40 ? "beginner" : lowestValue < 70 ? "intermediate" : "advanced";
  return { type: planType, level, skill: lowestSkill };
}

export { generatePlan };