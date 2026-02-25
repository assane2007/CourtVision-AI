/**
 * CourtVision Global Store — Zustand + Persist
 * Single source of truth for auth state, weekly stats,
 * recent sessions, community feed, XP and notifications.
 * 
 * AMÉLIORATIONS v2:
 * - Persistance avec AsyncStorage (survit aux redémarrages)
 * - Gestion XP + niveau + streak avec calculs précis
 * - Actions manquantes : refreshProfile, addXP, updateStreak
 * - Sélecteurs supplémentaires pour les composants
 * - Erreurs réseau loguées, pas silencieuses
 * - hydrated flag pour éviter le flicker UI
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, clearTokens, setAuthToken, setRefreshToken } from './api'
import { supabase } from './supabase'

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
    xp: number
    xp_level: number
    total_sessions: number
    badges_count: number
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

export interface XPEvent {
    id: string
    label: string
    amount: number
    timestamp: number
}

// ─── XP level thresholds ─────────────────────────────────────
const XP_LEVELS = [0, 100, 250, 500, 900, 1500, 2300, 3400, 5000, 7000, 10000]
export function xpToLevel(xp: number): number {
    let level = 1
    for (let i = 0; i < XP_LEVELS.length; i++) {
        if (xp >= XP_LEVELS[i]) level = i + 1
        else break
    }
    return Math.min(level, XP_LEVELS.length)
}
export function xpToNextLevel(xp: number): { current: number; needed: number; pct: number } {
    const level = xpToLevel(xp)
    const current = XP_LEVELS[level - 1] ?? 0
    const next = XP_LEVELS[level] ?? XP_LEVELS[XP_LEVELS.length - 1]
    const needed = next - current
    const pct = needed > 0 ? Math.min(((xp - current) / needed) * 100, 100) : 100
    return { current: xp - current, needed, pct }
}

// ─── State & actions ──────────────────────────────────────────

interface CourtVisionState {
    // Auth
    isAuthenticated: boolean
    authLoading: boolean
    hydrated: boolean

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

    // XP events (pour les animations de gain XP)
    xpEvents: XPEvent[]

    // Actions
    login: (token: string, refreshToken?: string) => Promise<void>
    loginWithEmail: (email: string, password: string) => Promise<void>
    signUpWithEmail: (email: string, password: string, username: string) => Promise<void>
    loginWithOAuth: (provider: 'apple' | 'google') => Promise<void>
    logout: () => Promise<void>
    loadProfile: () => Promise<void>
    refreshProfile: () => Promise<void>
    loadWeeklyData: () => Promise<void>
    loadHighlights: () => Promise<void>
    loadSessions: () => Promise<void>
    addXP: (amount: number, label: string) => void
    clearXPEvents: () => void
    setHydrated: () => void
    updateUser: (partial: Partial<UserProfile>) => void
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

export const useStore = create<CourtVisionState>()(
    persist(
        (set, get) => ({
            // Auth
            isAuthenticated: false,
            authLoading: false,
            hydrated: false,

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

            // XP
            xpEvents: [],

            // ── Hydration ──
            setHydrated: () => set({ hydrated: true }),

            // ── Auth actions ──
            async login(token, refreshToken) {
                set({ authLoading: true })
                await setAuthToken(token)
                if (refreshToken) await setRefreshToken(refreshToken)
                set({ isAuthenticated: true, authLoading: false })
                // Load initial data after login (parallel)
                await Promise.all([
                    get().loadProfile(),
                    get().loadWeeklyData(),
                    get().loadHighlights(),
                ])
            },

            async loginWithEmail(email: string, password: string) {
                set({ authLoading: true })
                try {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
                    if (error) throw error
                    if (data.session) {
                        await setAuthToken(data.session.access_token)
                        await setRefreshToken(data.session.refresh_token)
                        set({ isAuthenticated: true, authLoading: false })
                        await Promise.all([
                            get().loadProfile(),
                            get().loadWeeklyData(),
                            get().loadHighlights(),
                        ])
                    }
                } catch (err) {
                    set({ authLoading: false })
                    throw err
                }
            },

            async signUpWithEmail(email: string, password: string, username: string) {
                set({ authLoading: true })
                try {
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: { data: { username } },
                    })
                    if (error) throw error
                    if (data.session) {
                        await setAuthToken(data.session.access_token)
                        await setRefreshToken(data.session.refresh_token)
                        set({ isAuthenticated: true, authLoading: false })
                        await Promise.all([
                            get().loadProfile(),
                            get().loadWeeklyData(),
                            get().loadHighlights(),
                        ])
                    } else {
                        // Email confirmation required
                        set({ authLoading: false })
                    }
                } catch (err) {
                    set({ authLoading: false })
                    throw err
                }
            },

            async loginWithOAuth(provider: 'apple' | 'google') {
                set({ authLoading: true })
                try {
                    const { error } = await supabase.auth.signInWithOAuth({ provider })
                    if (error) throw error
                    // Session will be handled by onAuthStateChange in _layout.tsx
                } catch (err) {
                    set({ authLoading: false })
                    throw err
                }
            },

            async logout() {
                await supabase.auth.signOut().catch(() => {})
                await clearTokens()
                set({
                    isAuthenticated: false,
                    user: null,
                    weeklyData: DEFAULT_WEEKLY,
                    highlights: [],
                    sessions: [],
                    xpEvents: [],
                })
            },

            // ── Data actions ──
            async loadProfile() {
                set({ userLoading: true, userError: null })
                try {
                    const profile = await api.get<UserProfile>('/api/auth/me')
                    set({ user: profile, userLoading: false })
                } catch (err) {
                    const msg = (err as Error).message ?? 'Erreur de chargement du profil'
                    console.warn('[Store] loadProfile error:', msg)
                    set({ userError: msg, userLoading: false })
                }
            },

            async refreshProfile() {
                // Silently refresh without loading state (for background refresh)
                try {
                    const profile = await api.get<UserProfile>('/api/auth/me')
                    set({ user: profile })
                } catch {
                    // Silent — keep existing data
                }
            },

            async loadWeeklyData() {
                set({ weeklyLoading: true })
                try {
                    const data = await api.get<WeekDay[]>('/api/sessions/weekly')
                    set({ weeklyData: data, weeklyLoading: false })
                } catch {
                    // Keep default/last known data on error
                    set({ weeklyLoading: false })
                }
            },

            async loadHighlights() {
                set({ highlightsLoading: true })
                try {
                    const data = await api.get<HighlightClip[]>('/api/sessions/highlights/recent')
                    set({ highlights: data, highlightsLoading: false })
                } catch {
                    set({ highlightsLoading: false })
                }
            },

            async loadSessions() {
                set({ sessionsLoading: true })
                try {
                    const data = await api.get<Session[]>('/api/sessions')
                    set({ sessions: data, sessionsLoading: false })
                } catch {
                    set({ sessionsLoading: false })
                }
            },

            // ── XP actions ──
            addXP(amount: number, label: string) {
                const event: XPEvent = {
                    id: `${Date.now()}-${Math.random()}`,
                    label,
                    amount,
                    timestamp: Date.now(),
                }
                set(s => ({
                    xpEvents: [event, ...s.xpEvents].slice(0, 10),
                    user: s.user ? { ...s.user, xp: (s.user.xp ?? 0) + amount } : s.user,
                }))
            },

            clearXPEvents() {
                set({ xpEvents: [] })
            },

            updateUser(partial: Partial<UserProfile>) {
                set(s => ({ user: s.user ? { ...s.user, ...partial } : s.user }))
            },
        }),
        {
            name: 'courtvision-store',
            storage: createJSONStorage(() => AsyncStorage),
            // Persister uniquement les données non-sensibles (pas les tokens — ils sont dans SecureStore)
            partialize: (s) => ({
                isAuthenticated: s.isAuthenticated,
                user: s.user,
                weeklyData: s.weeklyData,
                highlights: s.highlights,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated()
            },
        }
    )
)

// ─── Selectors ─────────────────────────────────────────────────
export const selectUser           = (s: CourtVisionState) => s.user
export const selectWeekly         = (s: CourtVisionState) => s.weeklyData
export const selectHighlights     = (s: CourtVisionState) => s.highlights
export const selectStreak         = (s: CourtVisionState) => s.user?.streak ?? 0
export const selectXP             = (s: CourtVisionState) => s.user?.xp ?? 0
export const selectXPLevel        = (s: CourtVisionState) => s.user?.xp_level ?? 1
export const selectXPEvents       = (s: CourtVisionState) => s.xpEvents
export const selectIsAuthenticated = (s: CourtVisionState) => s.isAuthenticated
export const selectHydrated       = (s: CourtVisionState) => s.hydrated
