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
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, clearTokens, setAuthToken, setRefreshToken } from './api'
import { supabase, isDemoMode } from './supabase'
import { T } from './theme'

// ─── Types ────────────────────────────────────────────────────

export interface UserProfile {
    id: string
    username: string
    email?: string
    full_name: string
    avatar_url?: string
    position: string
    level: string
    plan?: string
    streak: number
    mental_score: number
    shooting_grade: string
    shooting_fg_pct: number
    xp: number
    xp_level: number
    total_sessions: number
    badges_count: number
}

type OnboardingPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'
type OnboardingExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite'

export interface OnboardingDraft {
    position: OnboardingPosition | null
    experienceLevel: OnboardingExperienceLevel | null
}

export interface OnboardingCalibrationShot {
    elbowAngle: number
    kneeAngle: number
    postureScore: number
    confidence: number
}

export interface OnboardingCalibrationDraft {
    shots: OnboardingCalibrationShot[]
    averageElbowAngle: number
    averageKneeAngle: number
    averagePostureScore: number
    averageConfidence: number
    capturedAt: string
    source: 'onboarding-camera-v2'
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
    shooting_fg_pct?: number
    shooting_accuracy?: number
    highlight_count: number
}

export interface XPEvent {
    id: string
    label: string
    amount: number
    timestamp: number
}

export interface Badge {
    id: string
    emoji: string
    name: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    xp: number
    desc: string
    earnedAt?: string
}

export interface ActivityEvent {
    id: string
    icon: string
    text: string
    time: string
    color: string
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

    // Gamification
    badges: Badge[]
    recentActivity: ActivityEvent[]

    // Onboarding
    onboardingDraft: OnboardingDraft
    onboardingSyncPending: boolean
    onboardingLastError: string | null
    onboardingCalibrationDraft: OnboardingCalibrationDraft | null
    onboardingCalibrationSyncPending: boolean
    onboardingCalibrationLastError: string | null

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
    initDashboard: () => Promise<void>
    loadSessions: () => Promise<void>
    addXP: (amount: number, label: string) => void
    clearXPEvents: () => void
    addActivity: (activity: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
    evaluateBadges: () => void
    completeSession: (sessionData: Partial<Session>) => void
    setHydrated: () => void
    updateUser: (partial: Partial<UserProfile>) => void
    setOnboardingDraft: (partial: Partial<OnboardingDraft>) => void
    clearOnboardingDraft: () => void
    syncOnboardingDraft: () => Promise<boolean>
    setOnboardingCalibrationDraft: (draft: OnboardingCalibrationDraft) => void
    clearOnboardingCalibrationDraft: () => void
    syncOnboardingCalibrationDraft: () => Promise<boolean>
}

// ─── Default Gamification Data (used only in demo mode) ──────
const DEMO_BADGES: Badge[] = [
    { id: 'b1', emoji: '🎯', name: 'Sniper', rarity: 'epic', xp: 500, desc: 'FG% > 60% over 5 sessions', earnedAt: new Date().toISOString() },
    { id: 'b2', emoji: '🔥', name: '7-Day Streak', rarity: 'rare', xp: 200, desc: '7 consecutive days', earnedAt: new Date().toISOString() },
    { id: 'b3', emoji: '🧠', name: 'Mental Pro', rarity: 'legendary', xp: 1000, desc: 'Mental score > 90', earnedAt: new Date().toISOString() },
    { id: 'b4', emoji: '⚡', name: 'Quick Release', rarity: 'rare', xp: 300, desc: 'Release speed top 5%', earnedAt: new Date().toISOString() },
    { id: 'b5', emoji: '🛡️', name: 'Lock Down', rarity: 'common', xp: 100, desc: 'Defender of the week', earnedAt: new Date().toISOString() },
    { id: 'b6', emoji: '🏆', name: 'First Win', rarity: 'common', xp: 50, desc: 'First challenge won', earnedAt: new Date().toISOString() },
    { id: 'b7', emoji: '💎', name: 'Elite', rarity: 'legendary', xp: 2000, desc: 'Reach 90+ overall', earnedAt: new Date().toISOString() },
]

const DEMO_ACTIVITY: ActivityEvent[] = [
    { id: 'a1', icon: 'film', text: 'Session analyzed · Mental 91', time: '2h ago', color: T.color.signature.primary, timestamp: Date.now() - 7200000 },
    { id: 'a2', icon: 'zap', text: '7-day streak reached!', time: 'Yesterday', color: T.color.semantic.warning, timestamp: Date.now() - 86400000 },
    { id: 'a3', icon: 'arrow-up', text: 'Level 8 unlocked · +200 XP', time: 'Yesterday', color: T.color.semantic.success, timestamp: Date.now() - 86400000 },
    { id: 'a4', icon: 'target', text: 'Sniper Badge earned', time: '3d ago', color: T.color.gamification.purple, timestamp: Date.now() - 86400000 * 3 },
    { id: 'a5', icon: 'award', text: 'Top 10 weekly leaderboard', time: '5d ago', color: T.color.gamification.gold, timestamp: Date.now() - 86400000 * 5 },
]

// ─── Default empty state (shown while loading) ────────────────

const EMPTY_WEEKLY: WeekDay[] = [
    { day: 'M', mental: 0, shooting: 0, hasSession: false },
    { day: 'T', mental: 0, shooting: 0, hasSession: false },
    { day: 'W', mental: 0, shooting: 0, hasSession: false },
    { day: 'T', mental: 0, shooting: 0, hasSession: false },
    { day: 'F', mental: 0, shooting: 0, hasSession: false },
    { day: 'S', mental: 0, shooting: 0, hasSession: false },
    { day: 'S', mental: 0, shooting: 0, hasSession: false },
]

// ─── Demo user profile ───────────────────────────────────────
const DEMO_USER: UserProfile = {
    id: 'demo-user-001',
    username: 'demo_player',
    full_name: 'Demo Player',
    avatar_url: undefined,
    position: 'PG',
    level: 'Intermediate',
    plan: 'free',
    streak: 5,
    mental_score: 82,
    shooting_grade: 'B+',
    shooting_fg_pct: 64.2,
    xp: 1250,
    xp_level: 4,
    total_sessions: 23,
    badges_count: 7,
}

const EXPERIENCE_LABELS: Record<OnboardingExperienceLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    elite: 'Elite',
}

// ─── Store ─────────────────────────────────────────────────────

// M-10: subscribeWithSelector enables targeted subscriptions (e.g., only re-render when XP changes)
export const useStore = create<CourtVisionState>()(
    subscribeWithSelector(
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
                weeklyData: EMPTY_WEEKLY,
                weeklyLoading: false,

                // Highlights
                highlights: [],
                highlightsLoading: false,

                // Sessions
                sessions: [],
                sessionsLoading: false,

                // XP
                xpEvents: [],

                // Notifications & gamification — start empty, load from API
                badges: [],
                recentActivity: [],

                // Onboarding
                onboardingDraft: {
                    position: null,
                    experienceLevel: null,
                },
                onboardingSyncPending: false,
                onboardingLastError: null,
                onboardingCalibrationDraft: null,
                onboardingCalibrationSyncPending: false,
                onboardingCalibrationLastError: null,

                // ── Hydration ──
                setHydrated: () => set({ hydrated: true }),

                // ── Auth actions ──
                async login(token, refreshToken) {
                    set({ authLoading: true })
                    await setAuthToken(token)
                    if (refreshToken) await setRefreshToken(refreshToken)
                    set({ isAuthenticated: true, authLoading: false })
                    await get().initDashboard()
                    await get().syncOnboardingDraft().catch((err) => {
                        console.warn('[Store] syncOnboardingDraft skipped:', (err as Error)?.message ?? err)
                    })
                    await get().syncOnboardingCalibrationDraft().catch((err) => {
                        console.warn('[Store] syncOnboardingCalibrationDraft skipped:', (err as Error)?.message ?? err)
                    })
                },

                async loginWithEmail(email: string, password: string) {
                    set({ authLoading: true })
                    try {
                        // ── Demo mode: bypass Supabase ──
                        if (isDemoMode) {
                            console.log('[CourtVision] 🎮 Demo login with:', email)
                            const demoToken = 'demo-token-' + Date.now()
                            await setAuthToken(demoToken)
                            const draft = get().onboardingDraft
                            const resolvedPosition = draft.position ?? 'PG'
                            const resolvedLevel = draft.experienceLevel ? EXPERIENCE_LABELS[draft.experienceLevel] : 'Intermediate'
                            set({
                                isAuthenticated: true,
                                authLoading: false,
                                user: {
                                    ...DEMO_USER,
                                    username: email.split('@')[0],
                                    full_name: email.split('@')[0],
                                    position: resolvedPosition,
                                    level: resolvedLevel,
                                },
                            })
                            get().clearOnboardingDraft()
                            get().clearOnboardingCalibrationDraft()
                            return
                        }

                        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
                        if (error) throw error
                        if (data.session) {
                            await setAuthToken(data.session.access_token)
                            await setRefreshToken(data.session.refresh_token)
                            set({ isAuthenticated: true, authLoading: false })
                            await get().initDashboard()
                            await get().syncOnboardingDraft().catch((err) => {
                                console.warn('[Store] syncOnboardingDraft skipped:', (err as Error)?.message ?? err)
                            })
                            await get().syncOnboardingCalibrationDraft().catch((err) => {
                                console.warn('[Store] syncOnboardingCalibrationDraft skipped:', (err as Error)?.message ?? err)
                            })
                        }
                    } catch (err) {
                        set({ authLoading: false })
                        throw err
                    }
                },

                async signUpWithEmail(email: string, password: string, username: string) {
                    set({ authLoading: true })
                    try {
                        // ── Demo mode: bypass Supabase ──
                        if (isDemoMode) {
                            console.log('[CourtVision] 🎮 Demo sign up:', username)
                            const demoToken = 'demo-token-' + Date.now()
                            await setAuthToken(demoToken)
                            const draft = get().onboardingDraft
                            const resolvedPosition = draft.position ?? 'PG'
                            const resolvedLevel = draft.experienceLevel ? EXPERIENCE_LABELS[draft.experienceLevel] : 'Beginner'
                            set({
                                isAuthenticated: true,
                                authLoading: false,
                                user: {
                                    ...DEMO_USER,
                                    username,
                                    full_name: username,
                                    position: resolvedPosition,
                                    level: resolvedLevel,
                                },
                            })
                            get().clearOnboardingDraft()
                            get().clearOnboardingCalibrationDraft()
                            return
                        }

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
                            await get().initDashboard()
                            await get().syncOnboardingDraft().catch((err) => {
                                console.warn('[Store] syncOnboardingDraft skipped:', (err as Error)?.message ?? err)
                            })
                            await get().syncOnboardingCalibrationDraft().catch((err) => {
                                console.warn('[Store] syncOnboardingCalibrationDraft skipped:', (err as Error)?.message ?? err)
                            })
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
                        // ── Demo mode: bypass Supabase ──
                        if (isDemoMode) {
                            console.log('[CourtVision] 🎮 Demo OAuth login:', provider)
                            const demoToken = 'demo-token-' + Date.now()
                            await setAuthToken(demoToken)
                            set({
                                isAuthenticated: true,
                                authLoading: false,
                                user: { ...DEMO_USER, username: `${provider}_user`, full_name: `${provider} User` },
                            })
                            get().clearOnboardingDraft()
                            get().clearOnboardingCalibrationDraft()
                            return
                        }

                        const { error } = await supabase.auth.signInWithOAuth({ provider })
                        if (error) throw error
                        // Session will be handled by onAuthStateChange in _layout.tsx
                    } catch (err) {
                        set({ authLoading: false })
                        throw err
                    }
                },

                async logout() {
                    await supabase.auth.signOut().catch(() => { })
                    await clearTokens()
                    set({
                        isAuthenticated: false,
                        user: null,
                        weeklyData: EMPTY_WEEKLY,
                        highlights: [],
                        sessions: [],
                        xpEvents: [],
                        badges: [],
                        recentActivity: [],
                        onboardingDraft: {
                            position: null,
                            experienceLevel: null,
                        },
                        onboardingSyncPending: false,
                        onboardingLastError: null,
                        onboardingCalibrationDraft: null,
                        onboardingCalibrationSyncPending: false,
                        onboardingCalibrationLastError: null,
                    })
                },

                // ── Data actions ──
                async loadProfile() {
                    if (isDemoMode) {
                        set({
                            user: get().user ?? DEMO_USER,
                            userLoading: false,
                            badges: DEMO_BADGES,
                            recentActivity: DEMO_ACTIVITY,
                        })
                        return
                    }
                    set({ userLoading: true, userError: null })
                    try {
                        const profileResponse = await api.get<{ data?: UserProfile } | UserProfile>('/api/auth/me')
                        const profile = (profileResponse as { data?: UserProfile }).data ?? (profileResponse as UserProfile)
                        set({ user: profile, userLoading: false })
                    } catch (err) {
                        const msg = (err as Error).message ?? 'Erreur de chargement du profil'
                        console.warn('[Store] loadProfile error:', msg)
                        set({ userError: msg, userLoading: false })
                    }
                },

                async initDashboard() {
                    if (isDemoMode) {
                        return Promise.all([get().loadProfile(), get().loadWeeklyData(), get().loadHighlights()]).then(() => { })
                    }

                    set({ userLoading: true, weeklyLoading: true, highlightsLoading: true })
                    try {
                        const res = await api.get<{ data: { profile: UserProfile, weeklyData: WeekDay[], highlights: HighlightClip[] } }>('/api/dashboard/init')

                        // Default Fallbacks handles SWR/Cache values if NetworkError occurred inside API client.
                        if (res?.data) {
                            set({
                                user: res.data.profile,
                                weeklyData: res.data.weeklyData,
                                highlights: res.data.highlights,
                                userLoading: false,
                                weeklyLoading: false,
                                highlightsLoading: false
                            })
                        }
                    } catch (err) {
                        console.warn('[Store] initDashboard error:', err)
                        // Fallback individually on error if batch fails
                        await Promise.all([get().loadProfile(), get().loadWeeklyData(), get().loadHighlights()])
                    }
                },

                async refreshProfile() {
                    if (isDemoMode) return
                    // Silently refresh without loading state (for background refresh)
                    try {
                        const profileResponse = await api.get<{ data?: UserProfile } | UserProfile>('/api/auth/me')
                        const profile = (profileResponse as { data?: UserProfile }).data ?? (profileResponse as UserProfile)
                        set({ user: profile })
                    } catch {
                        // Silent — keep existing data
                    }
                },

                async loadWeeklyData() {
                    if (isDemoMode) {
                        set({
                            weeklyData: [
                                { day: 'M', mental: 72, shooting: 58, hasSession: true },
                                { day: 'T', mental: 80, shooting: 64, hasSession: true },
                                { day: 'W', mental: 0, shooting: 0, hasSession: false },
                                { day: 'T', mental: 85, shooting: 70, hasSession: true },
                                { day: 'F', mental: 78, shooting: 62, hasSession: true },
                                { day: 'S', mental: 0, shooting: 0, hasSession: false },
                                { day: 'S', mental: 91, shooting: 75, hasSession: true },
                            ],
                            weeklyLoading: false,
                        })
                        return
                    }
                    set({ weeklyLoading: true })
                    try {
                        const data = await api.get<WeekDay[]>('/api/sessions/weekly')
                        set({ weeklyData: data, weeklyLoading: false })
                    } catch {
                        set({ weeklyLoading: false })
                    }
                },

                async loadHighlights() {
                    if (isDemoMode) {
                        set({
                            highlights: [
                                { id: 'demo-1', label: '3-Point Swish', pts: '+12 XP', daysAgo: 1 },
                                { id: 'demo-2', label: 'Fast Break Assist', pts: '+8 XP', daysAgo: 2 },
                                { id: 'demo-3', label: 'Clutch Free Throw', pts: '+10 XP', daysAgo: 3 },
                            ],
                            highlightsLoading: false,
                        })
                        return
                    }
                    set({ highlightsLoading: true })
                    try {
                        const data = await api.get<HighlightClip[]>('/api/sessions/highlights/recent')
                        set({ highlights: data, highlightsLoading: false })
                    } catch {
                        set({ highlightsLoading: false })
                    }
                },

                async loadSessions() {
                    if (isDemoMode) {
                        set({
                            sessions: [
                                { id: 'demo-s1', created_at: new Date().toISOString(), mental_score: 85, shooting_grade: 'A-', highlight_count: 3 },
                                { id: 'demo-s2', created_at: new Date(Date.now() - 86400000).toISOString(), mental_score: 78, shooting_grade: 'B+', highlight_count: 2 },
                            ],
                            sessionsLoading: false,
                        })
                        return
                    }
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

                addActivity(activity) {
                    const newActivity: ActivityEvent = {
                        ...activity,
                        id: `act-${Date.now()}-${Math.random()}`,
                        timestamp: Date.now()
                    }
                    set(s => ({
                        recentActivity: [newActivity, ...s.recentActivity].slice(0, 20)
                    }))
                },

                evaluateBadges() {
                    // Example evaluation logic
                    const store = get()
                    if (!store.user) return

                    // Example rule: Elite overall rating
                    if (store.user.level === 'Elite' && !store.badges.find(b => b.name === 'Elite')) {
                        const newBadge = { id: `b-new-${Date.now()}`, emoji: '💎', name: 'Elite', rarity: 'legendary' as const, xp: 2000, desc: 'Reach 90+ overall', earnedAt: new Date().toISOString() }
                        set(s => ({ badges: [newBadge, ...s.badges] }))
                        get().addXP(2000, 'Unlocked Elite Badge!')
                        get().addActivity({ icon: 'award', text: 'New Badge: Elite', time: 'Just now', color: T.color.gamification.gold })
                    }
                },

                completeSession(sessionData) {
                    // A simulation of what happens when a session concludes
                    const store = get()
                    get().addXP(150, 'Session Completed')
                    get().addActivity({
                        icon: 'film',
                        text: `Session analyzed · Mental ${sessionData.mental_score ?? 80}`,
                        time: 'Just now',
                        color: T.color.signature.primary
                    })
                    get().evaluateBadges()

                    // If the user leveled up from this logic, addXP technically covers it (it computes level implicitly via selectXPLevel)
                    const currentXp = store.user?.xp ?? 0
                    const curLevel = xpToLevel(currentXp)
                    const nextLevel = xpToLevel(currentXp + 150)
                    if (nextLevel > curLevel) {
                        get().addActivity({
                            icon: 'arrow-up',
                            text: `Level ${nextLevel} unlocked!`,
                            time: 'Just now',
                            color: T.color.semantic.success
                        })
                    }
                },

                updateUser(partial: Partial<UserProfile>) {
                    set(s => ({ user: s.user ? { ...s.user, ...partial } : s.user }))
                },

                setOnboardingDraft(partial: Partial<OnboardingDraft>) {
                    set(s => ({
                        onboardingDraft: {
                            ...s.onboardingDraft,
                            ...partial,
                        },
                        onboardingSyncPending: Boolean(
                            (partial.position ?? s.onboardingDraft.position)
                            && (partial.experienceLevel ?? s.onboardingDraft.experienceLevel)
                        ),
                        onboardingLastError: null,
                    }))
                },

                clearOnboardingDraft() {
                    set({
                        onboardingDraft: {
                            position: null,
                            experienceLevel: null,
                        },
                        onboardingSyncPending: false,
                        onboardingLastError: null,
                    })
                },

                setOnboardingCalibrationDraft(draft: OnboardingCalibrationDraft) {
                    set({
                        onboardingCalibrationDraft: draft,
                        onboardingCalibrationSyncPending: draft.shots.length > 0,
                        onboardingCalibrationLastError: null,
                    })
                },

                clearOnboardingCalibrationDraft() {
                    set({
                        onboardingCalibrationDraft: null,
                        onboardingCalibrationSyncPending: false,
                        onboardingCalibrationLastError: null,
                    })
                },

                async syncOnboardingDraft() {
                    const draft = get().onboardingDraft
                    if (!draft.position || !draft.experienceLevel) return false

                    const position = draft.position
                    const experienceLevel = draft.experienceLevel

                    if (isDemoMode) {
                        set(s => ({
                            user: s.user
                                ? {
                                    ...s.user,
                                    position,
                                    level: EXPERIENCE_LABELS[experienceLevel],
                                }
                                : s.user,
                        }))
                        get().clearOnboardingDraft()
                        return true
                    }

                    try {
                        await api.put('/api/auth/onboarding/profile', {
                            position,
                            experienceLevel,
                        }, {
                            timeoutMs: 45_000,
                        })

                        set(s => ({
                            user: s.user
                                ? {
                                    ...s.user,
                                    position,
                                    level: EXPERIENCE_LABELS[experienceLevel],
                                }
                                : s.user,
                            onboardingLastError: null,
                        }))
                        get().clearOnboardingDraft()
                        return true
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Unable to sync onboarding profile'
                        set({
                            onboardingSyncPending: true,
                            onboardingLastError: message,
                        })
                        throw error
                    }
                },

                async syncOnboardingCalibrationDraft() {
                    const draft = get().onboardingCalibrationDraft
                    if (!draft || draft.shots.length === 0) return false

                    if (isDemoMode) {
                        get().clearOnboardingCalibrationDraft()
                        return true
                    }

                    try {
                        await api.put('/api/auth/onboarding/calibration', draft, {
                            timeoutMs: 45_000,
                        })

                        set({ onboardingCalibrationLastError: null })
                        get().clearOnboardingCalibrationDraft()
                        return true
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Unable to sync onboarding calibration'
                        set({
                            onboardingCalibrationSyncPending: true,
                            onboardingCalibrationLastError: message,
                        })
                        throw error
                    }
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
                    badges: s.badges,
                    recentActivity: s.recentActivity,
                    onboardingDraft: s.onboardingDraft,
                    onboardingSyncPending: s.onboardingSyncPending,
                    onboardingLastError: s.onboardingLastError,
                    onboardingCalibrationDraft: s.onboardingCalibrationDraft,
                    onboardingCalibrationSyncPending: s.onboardingCalibrationSyncPending,
                    onboardingCalibrationLastError: s.onboardingCalibrationLastError,
                }),
                onRehydrateStorage: () => (state) => {
                    state?.setHydrated()
                },
            }
        )
    ) // close subscribeWithSelector
)

// ─── Selectors ─────────────────────────────────────────────────
export const selectUser = (s: CourtVisionState) => s.user
export const selectWeekly = (s: CourtVisionState) => s.weeklyData
export const selectHighlights = (s: CourtVisionState) => s.highlights
export const selectStreak = (s: CourtVisionState) => s.user?.streak ?? 0
export const selectXP = (s: CourtVisionState) => s.user?.xp ?? 0
export const selectXPLevel = (s: CourtVisionState) => s.user?.xp_level ?? 1
export const selectXPEvents = (s: CourtVisionState) => s.xpEvents
export const selectIsAuthenticated = (s: CourtVisionState) => s.isAuthenticated
export const selectHydrated = (s: CourtVisionState) => s.hydrated
export const selectIsDemoMode = () => isDemoMode

// ─── M-12: Shallow equality hooks (prevent unnecessary re-renders) ──
// Use these instead of `useStore(s => ({ a: s.a, b: s.b }))` in components
export const useProfile = () => useStore(useShallow(s => ({
    user: s.user,
    userLoading: s.userLoading,
    userError: s.userError,
})))

export const useAuth = () => useStore(useShallow(s => ({
    isAuthenticated: s.isAuthenticated,
    authLoading: s.authLoading,
    hydrated: s.hydrated,
    login: s.login,
    loginWithEmail: s.loginWithEmail,
    signUpWithEmail: s.signUpWithEmail,
    loginWithOAuth: s.loginWithOAuth,
    logout: s.logout,
})))

export const useDashboard = () => useStore(useShallow(s => ({
    weeklyData: s.weeklyData,
    weeklyLoading: s.weeklyLoading,
    highlights: s.highlights,
    highlightsLoading: s.highlightsLoading,
    sessions: s.sessions,
    sessionsLoading: s.sessionsLoading,
})))

export const useGamification = () => useStore(useShallow(s => ({
    xpEvents: s.xpEvents,
    badges: s.badges,
    recentActivity: s.recentActivity,
    xp: s.user?.xp ?? 0,
    level: s.user?.xp_level ?? 1,
})))
