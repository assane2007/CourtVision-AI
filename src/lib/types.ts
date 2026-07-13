export interface Drill {
  id: string;
  name: string;
  nameFr: string;
  category: DrillCategory;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: number;
  targetReps: number;
  instructionsFr: string[];
  isCustom?: boolean;
  userId?: string;
}

export type DrillCategory =
  | "pocket_ball" |"shifty" |"ball_handling" |"speed_change" |"defense" |"shooting" |"footwork" |"conditioning" |"finishing";

export interface Plan {
  id: string;
  name: string;
  description: string;
  drills: PlanDrill[];
  createdAt: string;
  userId: string;
}

export interface PlanDrill {
  drillId: string;
  reps: number;
  sets: number;
  restSeconds: number;
}

export interface Session {
  id: string;
  userId: string;
  date: string;
  totalScore: number;
  totalReps: number;
  totalTimeSeconds: number;
  drillResults: DrillResult[];
  aiFormChecks?: AiFormCheck[];
}

export interface DrillResult {
  drillId: string;
  score: number;
  reps: number;
  timeSeconds: number;
  isPersonalBest?: boolean;
}

export interface AiFormCheck {
  drillId: string;
  feedback: string;
  score: number;
  timestamp: string;
}

export interface Player {
  id: string;
  name: string;
  email: string;
  position: string;
  level: string;
  goals: string[];
  isOnboarded: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Recommendation {
  drillId: string;
  reason: string;
  priority: number;
}