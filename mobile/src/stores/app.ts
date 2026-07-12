import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Screen =
  | 'landing' | 'auth' | 'onboarding' | 'home' | 'plans' | 'train-hub' | 'drill-detail'
  | 'camera-workout' | 'workout-summary' | 'stats' | 'records' | 'profile' | 'achievements'
  | 'settings' | 'scouting' | 'reaction-trainer' | 'ai-coach' | 'leaderboard' | 'pricing'
  | 'friends' | 'teams' | 'team-detail' | 'challenges' | 'challenge-detail'
  | 'feed' | 'post-detail' | 'messages' | 'conversation' | 'profile-other'
  | 'live-workout' | 'notifications'
  | 'video-library' | 'video-player' | 'video-upload' | 'video-compare'
  | 'ai-insights' | 'voice-coach' | 'predictions' | 'ai-workout-gen' | 'ai-tools'
  | 'terms' | 'privacy' | 'admin' | 'analytics';

export interface WorkoutDrillResult {
  drillId: string;
  drillName: string;
  drillNameFr: string;
  drillCategory: string;
  drillIcon: string;
  reps: number;
  score: number;
  durationSec: number;
  targetReps: number;
  isPersonalBest?: boolean;
}

export interface WorkoutResult {
  drills: WorkoutDrillResult[];
  totalReps: number;
  totalScore: number;
  totalDurationSec: number;
  sessionId?: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string; avatar?: string } | null;
  sessionToken: string | null;
  
  // Navigation
  currentScreen: Screen;
  selectedDrillId: string | null;
  selectedConversationId: string | null;
  screenHistory: Screen[];
  
  // Language
  language: 'fr' | 'en';
  
  // Theme
  isDark: boolean;
  
  // Workout
  workoutResult: WorkoutResult | null;
  isWorkoutActive: boolean;
  
  // Player stats (cached)
  playerStats: {
    level: number;
    xp: number;
    xpToNext: number;
    streakDays: number;
    totalSessions: number;
    totalReps: number;
    avgScore: number;
  } | null;
  
  // Unread notifications
  unreadCount: number;
  
  // Actions
  setAuthenticated: (user: AppState['user'], token: string) => void;
  logout: () => void;
  navigate: (screen: Screen, id?: string) => void;
  goBack: () => void;
  setLanguage: (lang: 'fr' | 'en') => void;
  toggleTheme: () => void;
  setWorkoutResult: (result: WorkoutResult | null) => void;
  setWorkoutActive: (active: boolean) => void;
  setPlayerStats: (stats: AppState['playerStats']) => void;
  setUnreadCount: (count: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      isAuthenticated: false,
      user: null,
      sessionToken: null,
      
      // Navigation
      currentScreen: 'landing',
      selectedDrillId: null,
      selectedConversationId: null,
      screenHistory: [],
      
      // Language
      language: 'fr',
      
      // Theme
      isDark: false,
      
      // Workout
      workoutResult: null,
      isWorkoutActive: false,
      
      // Player stats
      playerStats: null,
      
      // Unread
      unreadCount: 0,
      
      // Actions
      setAuthenticated: (user, token) => set({
        isAuthenticated: true,
        user,
        sessionToken: token,
        currentScreen: get().playerStats?.level ? 'home' : 'onboarding',
      }),
      
      logout: () => set({
        isAuthenticated: false,
        user: null,
        sessionToken: null,
        currentScreen: 'landing',
        screenHistory: [],
        workoutResult: null,
        isWorkoutActive: false,
        playerStats: null,
      }),
      
      navigate: (screen, id) => set((s) => ({
        currentScreen: screen,
        screenHistory: [...s.screenHistory.slice(-20), s.currentScreen],
        ...(screen === 'drill-detail' && id ? { selectedDrillId: id } : {}),
        ...(screen === 'conversation' && id ? { selectedConversationId: id } : {}),
      })),
      
      goBack: () => set((s) => {
        const newHistory = [...s.screenHistory];
        const prevScreen = newHistory.pop() || 'home';
        return { currentScreen: prevScreen, screenHistory: newHistory };
      }),
      
      setLanguage: (language) => set({ language }),
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
      setWorkoutResult: (workoutResult) => set({ workoutResult }),
      setWorkoutActive: (isWorkoutActive) => set({ isWorkoutActive }),
      setPlayerStats: (playerStats) => set({ playerStats }),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
    }),
    {
      name: 'courtvision-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        isDark: state.isDark,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        sessionToken: state.sessionToken,
        playerStats: state.playerStats,
      }),
    }
  )
);