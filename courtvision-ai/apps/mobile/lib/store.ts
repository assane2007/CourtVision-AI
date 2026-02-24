/**
 * CourtVision Global Store — Zustand
 * Single source of truth for auth state, weekly stats,
 * recent sessions, and community feed.
 */

import { create } from 'zustand'
import { api, clearTokens, setAuthToken, setRefreshToken } from './api'

// ─── Types ────────────────────────────────────────────────────

export interface UserProfile {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    position: string
    level: string
    streak: number
    mental_score: number
    shooting_grade: string
    shooting_fg_pct: number
}

export interface WeekDay {
    day: string
    mental: number
    shooting: number
    hasSession: boolean
}

export interface HighlightClip {
    id: string
    label: string
    pts: string
    daysAgo: number
    thumbnail_url?: string
}

export interface Session {
    id: string
    created_at: string
    mental_score: number
    shooting_grade: string
    highlight_count: number
}

// ─── State & actions ──────────────────────────────────────────

interface CourtVisionState {
    // Auth
    isAuthenticated: boolean
    authLoading: boolean

    // Profile
    user: UserProfile | null
    userLoading: boolean
    userError: string | null

    // Weekly progress
    weeklyData: WeekDay[]
    weeklyLoading: boolean

    // Highlight clips
    highlights: HighlightClip[]
    highlightsLoading: boolean

    // Recent sessions
    sessions: Session[]
    sessionsLoading: boolean

    // Actions
    login: (token: string, refreshToken?: string) => Promise<void>
    logout: () => Promise<void>
    loadProfile: () => Promise<void>
    loadWeeklyData: () => Promise<void>
    loadHighlights: () => Promise<void>
    loadSessions: () => Promise<void>
}

// ─── Default mock data (shown while loading or on error) ──────

const DEFAULT_WEEKLY: WeekDay[] = [
    { day: 'L', mental: 72, shooting: 58, hasSession: true },
    { day: 'M', mental: 80, shooting: 64, hasSession: true },
    { day: 'M', mental: 0,  shooting: 0,  hasSession: false },
    { day: 'J', mental: 85, shooting: 70, hasSession: true },
    { day: 'V', mental: 78, shooting: 62, hasSession: true },
    { day: 'S', mental: 0,  shooting: 0,  hasSession: false },
    { day: 'D', mental: 91, shooting: 75, hasSession: true },
]

// ─── Store ─────────────────────────────────────────────────────

export const useStore = create<CourtVisionState>((set, get) => ({
    // Auth
    isAuthenticated: false,
    authLoading: false,

    // Profile
    user: null,
    userLoading: false,
    userError: null,

    // Weekly
    weeklyData: DEFAULT_WEEKLY,
    weeklyLoading: false,

    // Highlights
    highlights: [],
    highlightsLoading: false,

    // Sessions
    sessions: [],
    sessionsLoading: false,

    // ── Auth actions ──
    async login(token, refreshToken) {
        set({ authLoading: true })
        await setAuthToken(token)
        if (refreshToken) await setRefreshToken(refreshToken)
        set({ isAuthenticated: true, authLoading: false })
        // Load initial data after login
        await Promise.all([get().loadProfile(), get().loadWeeklyData(), get().loadHighlights()])
    },

    async logout() {
        await clearTokens()
        set({
            isAuthenticated: false,
            user: null,
            weeklyData: DEFAULT_WEEKLY,
            highlights: [],
            sessions: [],
        })
    },

    // ── Data actions ──
    async loadProfile() {
        set({ userLoading: true, userError: null })
        try {
            const profile = await api.get<UserProfile>('/auth/me')
            set({ user: profile, userLoading: false })
        } catch (err) {
            set({ userError: (err as Error).message, userLoading: false })
        }
    },

    async loadWeeklyData() {
        set({ weeklyLoading: true })
        try {
            const data = await api.get<WeekDay[]>('/sessions/weekly')
            set({ weeklyData: data, weeklyLoading: false })
        } catch {
            // Keep default/last known data on error
            set({ weeklyLoading: false })
        }
    },

    async loadHighlights() {
        set({ highlightsLoading: true })
        try {
            const data = await api.get<HighlightClip[]>('/sessions/highlights/recent')
            set({ highlights: data, highlightsLoading: false })
        } catch {
            set({ highlightsLoading: false })
        }
    },

    async loadSessions() {
        set({ sessionsLoading: true })
        try {
            const data = await api.get<Session[]>('/sessions')
            set({ sessions: data, sessionsLoading: false })
        } catch {
            set({ sessionsLoading: false })
        }
    },
}))

// ─── Selectors ─────────────────────────────────────────────────
export const selectUser      = (s: CourtVisionState) => s.user
export const selectWeekly    = (s: CourtVisionState) => s.weeklyData
export const selectHighlights = (s: CourtVisionState) => s.highlights
export const selectStreak    = (s: CourtVisionState) => s.user?.streak ?? 0
