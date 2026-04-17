/**
 * useWeeklyQuests — Multi-step weekly quest progression system.
 *
 * Unlike daily challenges (single metric, 24h expiry), quests are:
 * - Multi-step (3-5 objectives per quest)
 * - Week-long (reset every Monday)
 * - Narrative-driven ("Shooting Camp", "Mental Fortitude", etc.)
 * - Higher XP rewards with milestone bonuses
 *
 * Architecture:
 *  1. Try API → /api/quests/active
 *  2. Fallback → local quest pool rotated by ISO week number
 *  3. Progress computed from SessionStorageService (offline-first)
 *  4. State persisted via AsyncStorage (survives app restart within the week)
 */

import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch } from '../lib/api'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { T } from '../lib/theme'
import { SessionStorageService } from '../lib/sessionStorage'
import * as Haptics from 'expo-haptics'

// ── Types ───────────────────────────────────────────────────────

export interface QuestStep {
    id: string
    title: string
    description: string
    metric: 'sessions' | 'shots_made' | 'shooting_pct' | 'mental_score' | 'total_shots' | 'streak_days'
    target: number
    current: number
    completed: boolean
}

export interface WeeklyQuest {
    id: string
    title: string
    subtitle: string
    emoji: string
    tier: 'bronze' | 'silver' | 'gold' | 'diamond'
    steps: QuestStep[]
    xp_reward: number
    bonus_xp: number
    week_number: number
    year: number
    completed: boolean
    claimed: boolean
}

export interface WeeklyQuestState {
    quest: WeeklyQuest | null
    loading: boolean
    activeStepIndex: number
    overallProgress: number
    daysLeft: number
    claimReward: () => Promise<void>
    refresh: () => Promise<void>
}

// ── Constants ───────────────────────────────────────────────────

const STORAGE_KEY = '@courtvision_weekly_quest'

export const TIER_COLORS: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: T.color.semantic.gold,
    diamond: '#B9F2FF',
}

export const TIER_LABELS: Record<string, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    diamond: '💎 Diamond',
}

function normalizeQuestMetric(metric: string): QuestStep['metric'] {
    switch (metric) {
        case 'shots_made':
            return 'shots_made'
        case 'shooting':
        case 'shooting_pct':
            return 'shooting_pct'
        case 'mental':
        case 'mental_score':
            return 'mental_score'
        case 'total_shots':
            return 'total_shots'
        case 'streak':
        case 'streak_days':
            return 'streak_days'
        case 'sessions':
        default:
            return 'sessions'
    }
}

function tierFromDifficulty(difficulty: string): WeeklyQuest['tier'] {
    switch (difficulty) {
        case 'easy':
            return 'bronze'
        case 'hard':
            return 'gold'
        case 'legendary':
            return 'diamond'
        case 'medium':
        default:
            return 'silver'
    }
}

// ── Quest Pool ──────────────────────────────────────────────────

function getISOWeek(date: Date): { week: number; year: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return { week, year: d.getUTCFullYear() }
}

function getDaysLeftInWeek(): number {
    const now = new Date()
    const day = now.getDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    return daysUntilMonday
}

const QUEST_POOL: Omit<WeeklyQuest, 'week_number' | 'year'>[] = [
    {
        id: 'shooting-camp',
        title: 'Shooting Camp',
        subtitle: 'Master your shot mechanics this week',
        emoji: '🏀',
        tier: 'silver',
        xp_reward: 500,
        bonus_xp: 200,
        completed: false,
        claimed: false,
        steps: [
            { id: 'sc-1', title: 'Warm Up', description: 'Complete 3 training sessions', metric: 'sessions', target: 3, current: 0, completed: false },
            { id: 'sc-2', title: 'Volume Shooter', description: 'Attempt 200 total shots', metric: 'total_shots', target: 200, current: 0, completed: false },
            { id: 'sc-3', title: 'Precision', description: 'Hit 50%+ FG in a session', metric: 'shooting_pct', target: 50, current: 0, completed: false },
            { id: 'sc-4', title: 'Sniper Status', description: 'Make 100 shots total', metric: 'shots_made', target: 100, current: 0, completed: false },
        ],
    },
    {
        id: 'mental-fortitude',
        title: 'Mental Fortitude',
        subtitle: 'Strengthen your mental game',
        emoji: '🧠',
        tier: 'gold',
        xp_reward: 750,
        bonus_xp: 300,
        completed: false,
        claimed: false,
        steps: [
            { id: 'mf-1', title: 'Show Up', description: 'Train 4 days this week', metric: 'streak_days', target: 4, current: 0, completed: false },
            { id: 'mf-2', title: 'Focus Zone', description: 'Reach mental score 70+', metric: 'mental_score', target: 70, current: 0, completed: false },
            { id: 'mf-3', title: 'Consistency', description: 'Complete 5 sessions', metric: 'sessions', target: 5, current: 0, completed: false },
            { id: 'mf-4', title: 'Elite Mind', description: 'Reach mental score 85+', metric: 'mental_score', target: 85, current: 0, completed: false },
        ],
    },
    {
        id: 'iron-man',
        title: 'Iron Man Week',
        subtitle: 'Push your limits every day',
        emoji: '💪',
        tier: 'diamond',
        xp_reward: 1000,
        bonus_xp: 500,
        completed: false,
        claimed: false,
        steps: [
            { id: 'im-1', title: 'Kickoff', description: 'Complete 2 sessions', metric: 'sessions', target: 2, current: 0, completed: false },
            { id: 'im-2', title: 'Grind', description: 'Attempt 300 total shots', metric: 'total_shots', target: 300, current: 0, completed: false },
            { id: 'im-3', title: 'Streak Builder', description: 'Train 5 different days', metric: 'streak_days', target: 5, current: 0, completed: false },
            { id: 'im-4', title: 'Make It Rain', description: 'Make 150 shots total', metric: 'shots_made', target: 150, current: 0, completed: false },
            { id: 'im-5', title: 'Peak Performance', description: 'Hit 55%+ FG in a session', metric: 'shooting_pct', target: 55, current: 0, completed: false },
        ],
    },
    {
        id: 'sharpshooter',
        title: 'Sharpshooter Academy',
        subtitle: 'Accuracy over everything',
        emoji: '🎯',
        tier: 'gold',
        xp_reward: 600,
        bonus_xp: 250,
        completed: false,
        claimed: false,
        steps: [
            { id: 'ss-1', title: 'Get Started', description: 'Complete a training session', metric: 'sessions', target: 1, current: 0, completed: false },
            { id: 'ss-2', title: 'Dial In', description: 'Hit 45%+ FG in a session', metric: 'shooting_pct', target: 45, current: 0, completed: false },
            { id: 'ss-3', title: 'Triple Threat', description: 'Complete 3 sessions', metric: 'sessions', target: 3, current: 0, completed: false },
            { id: 'ss-4', title: 'Dead Eye', description: 'Hit 60%+ FG in a session', metric: 'shooting_pct', target: 60, current: 0, completed: false },
        ],
    },
    {
        id: 'consistency-king',
        title: 'Consistency King',
        subtitle: 'Build the habit that builds champions',
        emoji: '👑',
        tier: 'bronze',
        xp_reward: 400,
        bonus_xp: 150,
        completed: false,
        claimed: false,
        steps: [
            { id: 'ck-1', title: 'Day One', description: 'Complete your first session this week', metric: 'sessions', target: 1, current: 0, completed: false },
            { id: 'ck-2', title: 'Building Rhythm', description: 'Train 3 different days', metric: 'streak_days', target: 3, current: 0, completed: false },
            { id: 'ck-3', title: 'Centurion', description: 'Attempt 100 total shots', metric: 'total_shots', target: 100, current: 0, completed: false },
        ],
    },
]

// ── Progress Computation ────────────────────────────────────────

async function computeWeeklyProgress(steps: QuestStep[]): Promise<QuestStep[]> {
    const storage = SessionStorageService.getInstance()
    const history = await storage.getSessionHistory(50)

    // Get Monday of current week
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    const mondayStr = monday.toISOString().slice(0, 10)

    const weekSessions = history.filter(s => s.createdAt.slice(0, 10) >= mondayStr)
    const uniqueDays = new Set(weekSessions.map(s => s.createdAt.slice(0, 10))).size

    return steps.map(step => {
        let current = 0
        switch (step.metric) {
            case 'sessions':
                current = weekSessions.length
                break
            case 'shots_made':
                current = weekSessions.reduce((sum, s) => sum + s.madeShots, 0)
                break
            case 'total_shots':
                current = weekSessions.reduce((sum, s) => sum + s.totalShots, 0)
                break
            case 'shooting_pct':
                current = weekSessions.length > 0
                    ? Math.round(Math.max(...weekSessions.map(s => s.shootingPct)))
                    : 0
                break
            case 'mental_score':
                current = weekSessions.length > 0
                    ? Math.round(Math.max(...weekSessions.map(s => s.avgPostureQuality)))
                    : 0
                break
            case 'streak_days':
                current = uniqueDays
                break
        }
        const completed = current >= step.target
        return { ...step, current, completed }
    })
}

// ── Hook ────────────────────────────────────────────────────────

export function useWeeklyQuests(): WeeklyQuestState {
    const addXP = useStore(s => s.addXP)
    const addActivity = useStore(s => s.addActivity)
    const [quest, setQuest] = useState<WeeklyQuest | null>(null)
    const [loading, setLoading] = useState(true)

    const { week: currentWeek, year: currentYear } = getISOWeek(new Date())
    const daysLeft = getDaysLeftInWeek()

    const completedSteps = quest?.steps.filter(s => s.completed).length ?? 0
    const totalSteps = quest?.steps.length ?? 1
    const overallProgress = Math.round((completedSteps / totalSteps) * 100)
    const activeStepIndex = quest?.steps.findIndex(s => !s.completed) ?? 0

    const loadFromStorage = useCallback(async (): Promise<WeeklyQuest | null> => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY)
            if (!raw) return null
            const saved = JSON.parse(raw) as WeeklyQuest
            if (saved.week_number === currentWeek && saved.year === currentYear) {
                return saved
            }
            return null // expired — different week
        } catch {
            return null
        }
    }, [currentWeek, currentYear])

    const saveToStorage = useCallback(async (q: WeeklyQuest) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(q))
        } catch { /* ignore */ }
    }, [])

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const response = await apiFetch<{ data?: Array<Record<string, unknown>> }>('/api/quests/active')
            const activeQuest = Array.isArray(response.data) ? response.data[0] : null

            if (!activeQuest) {
                throw new Error('No active quest from API')
            }

            const target = Number(activeQuest.target ?? 1)
            const current = Number(activeQuest.progress ?? 0)
            const metric = normalizeQuestMetric(String(activeQuest.metric ?? 'sessions'))

            const serverQuest: WeeklyQuest = {
                id: String(activeQuest.id ?? `quest-${Date.now()}`),
                title: String(activeQuest.title ?? 'Weekly Quest'),
                subtitle: String(activeQuest.description ?? 'Complete your weekly objective'),
                emoji: String(activeQuest.emoji ?? '🏆'),
                tier: tierFromDifficulty(String(activeQuest.difficulty ?? 'medium')),
                xp_reward: Number(activeQuest.xp_reward ?? 0) || 0,
                bonus_xp: 0,
                week_number: currentWeek,
                year: currentYear,
                completed: current >= target,
                claimed: false,
                steps: [
                    {
                        id: `${String(activeQuest.id ?? 'server')}-step-1`,
                        title: String(activeQuest.title ?? 'Quest Step'),
                        description: String(activeQuest.description ?? 'Complete the objective'),
                        metric,
                        target: Number.isFinite(target) && target > 0 ? target : 1,
                        current: Number.isFinite(current) && current >= 0 ? current : 0,
                        completed: (Number.isFinite(current) ? current : 0) >= (Number.isFinite(target) && target > 0 ? target : 1),
                    },
                ],
            }

            setQuest(serverQuest)
            await saveToStorage(serverQuest)
        } catch {
            // Fallback: local quest pool
            const saved = await loadFromStorage()
            if (saved && !saved.claimed) {
                const updated = { ...saved, steps: await computeWeeklyProgress(saved.steps) }
                updated.completed = updated.steps.every(s => s.completed)
                setQuest(updated)
                await saveToStorage(updated)
            } else {
                // Generate new quest for this week
                const questIndex = currentWeek % QUEST_POOL.length
                const template = QUEST_POOL[questIndex]
                const newQuest: WeeklyQuest = {
                    ...template,
                    week_number: currentWeek,
                    year: currentYear,
                    steps: await computeWeeklyProgress(template.steps),
                }
                newQuest.completed = newQuest.steps.every(s => s.completed)
                setQuest(newQuest)
                await saveToStorage(newQuest)
            }
        } finally {
            setLoading(false)
        }
    }, [currentWeek, currentYear, loadFromStorage, saveToStorage])

    const claimReward = useCallback(async () => {
        if (!quest || !quest.completed || quest.claimed) return

        try {
            const primaryStep = quest.steps.find(step => !step.completed) ?? quest.steps[0]
            if (primaryStep && /^[0-9a-fA-F-]{36}$/.test(quest.id)) {
                const remaining = Math.max(primaryStep.target - primaryStep.current, 0)
                await apiFetch('/api/quests/progress', {
                    method: 'POST',
                    body: JSON.stringify({
                        questId: quest.id,
                        metric: primaryStep.metric,
                        value: remaining > 0 ? remaining : primaryStep.target,
                    }),
                })
            }
        } catch { /* offline — grant locally */ }

        const totalXP = quest.xp_reward + quest.bonus_xp
        addXP(totalXP, `Quest: ${quest.title}`)
        addActivity({
            icon: 'award',
            text: `Quest completed: ${quest.title}`,
            time: 'Just now',
            color: TIER_COLORS[quest.tier],
        })
        toast.xp(`+${totalXP} XP`, `Quest "${quest.title}" completed!`, 4000)

        if (process.env.EXPO_OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }

        const claimed = { ...quest, claimed: true }
        setQuest(claimed)
        await saveToStorage(claimed)
    }, [quest, addXP, addActivity, saveToStorage])

    useEffect(() => {
        refresh()
    }, [])

    return { quest, loading, activeStepIndex, overallProgress, daysLeft, claimReward, refresh }
}
