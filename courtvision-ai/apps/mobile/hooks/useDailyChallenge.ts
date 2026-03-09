/**
 * useDailyChallenge — Hook pour les défis quotidiens.
 * 
 * La feature #1 de rétention : un défi unique chaque jour,
 * avec compte à rebours, récompense XP, et streak.
 * 
 * Conçu pour répondre à : "Will users come back tomorrow?"
 * → OUI, s'il y a un défi frais + une récompense qui expire à minuit.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../lib/api'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { T } from '../lib/theme'
import { SessionStorageService } from '../lib/sessionStorage'
import * as Haptics from 'expo-haptics'

export interface DailyChallenge {
    id: string
    title: string
    description: string
    metric: 'shooting_pct' | 'mental_score' | 'sessions' | 'shots_made' | 'streak'
    target: number
    current: number
    xp_reward: number
    bonus_xp?: number        // XP bonus si terminé avant 18h
    emoji: string
    difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
    expires_at: string       // ISO string — minuit ce soir
    completed: boolean
    claimed: boolean
}

export interface DailyChallengeState {
    challenge: DailyChallenge | null
    loading: boolean
    error: string | null
    timeLeft: string         // "HH:MM:SS"
    progressPct: number
    claimReward: () => Promise<void>
    refresh: () => Promise<void>
}

// ── Couleurs par difficulté ─────────────────────────────────────

export const DIFFICULTY_COLORS: Record<string, string> = {
    easy: T.color.semantic.success,
    medium: T.color.semantic.info,
    hard: T.color.signature.primary,
    legendary: T.color.semantic.gold,
}

export const DIFFICULTY_LABELS: Record<string, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    legendary: '✨ Legendary',
}

// ── Défis locaux (fallback sans serveur) ─────────────────────────

async function computeTodayProgress(metric: DailyChallenge['metric']): Promise<number> {
    const storage = SessionStorageService.getInstance()
    const history = await storage.getSessionHistory(50)
    const todayStr = new Date().toISOString().slice(0, 10)
    const todaySessions = history.filter(s => s.createdAt.slice(0, 10) === todayStr)

    switch (metric) {
        case 'shots_made':
            return todaySessions.reduce((sum, s) => sum + s.madeShots, 0)
        case 'mental_score':
            if (todaySessions.length === 0) return 0
            return Math.round(
                todaySessions.reduce((sum, s) => sum + s.avgPostureQuality, 0) / todaySessions.length
            )
        case 'sessions':
            return todaySessions.length
        case 'shooting_pct':
            if (todaySessions.length === 0) return 0
            return Math.round(
                todaySessions.reduce((sum, s) => sum + s.shootingPct, 0) / todaySessions.length
            )
        case 'streak':
            return todaySessions.length > 0 ? 1 : 0
        default:
            return 0
    }
}

function getLocalDailyChallenge(): DailyChallenge {
    const today = new Date()
    const dayOfWeek = today.getDay()

    const DAILY_CHALLENGES: DailyChallenge[] = [
        {
            id: `local-0`,
            title: '50 Three-Pointers',
            description: 'Attempt 50 three-point shots in your next session.',
            metric: 'shots_made',
            target: 50, current: 0,
            xp_reward: 75, bonus_xp: 25,
            emoji: '🎯',
            difficulty: 'medium',
            expires_at: getExpiresAt(),
            completed: false, claimed: false,
        },
        {
            id: `local-1`,
            title: 'Mental Score 80+',
            description: 'Keep your mental score above 80 throughout an entire session.',
            metric: 'mental_score',
            target: 80, current: 0,
            xp_reward: 100, bonus_xp: 40,
            emoji: '🧠',
            difficulty: 'hard',
            expires_at: getExpiresAt(),
            completed: false, claimed: false,
        },
        {
            id: `local-2`,
            title: 'Quick Session',
            description: 'Complete a 20+ minute Live Coach session.',
            metric: 'sessions',
            target: 1, current: 0,
            xp_reward: 50,
            emoji: '⚡',
            difficulty: 'easy',
            expires_at: getExpiresAt(),
            completed: false, claimed: false,
        },
        {
            id: `local-3`,
            title: 'Sharpshooter of the Day',
            description: 'Hit 60%+ on at least 20 shot attempts.',
            metric: 'shooting_pct',
            target: 60, current: 0,
            xp_reward: 120, bonus_xp: 50,
            emoji: '🔥',
            difficulty: 'hard',
            expires_at: getExpiresAt(),
            completed: false, claimed: false,
        },
        {
            id: `local-4`,
            title: 'Streak Maintained',
            description: 'Stay connected and active today.',
            metric: 'streak',
            target: 1, current: 0,
            xp_reward: 30,
            emoji: '🔥',
            difficulty: 'easy',
            expires_at: getExpiresAt(),
            completed: false, claimed: false,
        },
        {
            id: `local-5`,
            title: 'Double Session',
            description: 'Complete 2 sessions in a single day.',
            metric: 'sessions',
            target: 2, current: 0,
            xp_reward: 150, bonus_xp: 75,
            emoji: '💥',
            difficulty: 'legendary',
            expires_at: getExpiresAt(),
            completed: false, claimed: false,
        },
        {
            id: `local-6`,
            title: 'Full Analysis',
            description: 'Analyze a full-game video (4 quarters).',
            metric: 'sessions',
            target: 1, current: 0,
            xp_reward: 80,
            emoji: '📊',
            difficulty: 'medium',
            expires_at: getExpiresAt(),
            completed: false, claimed: false,
        },
    ]

    return DAILY_CHALLENGES[dayOfWeek % DAILY_CHALLENGES.length]
}

function getExpiresAt(): string {
    const tomorrow = new Date()
    tomorrow.setHours(23, 59, 59, 999)
    return tomorrow.toISOString()
}

function formatTimeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return '00:00:00'
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Hook ────────────────────────────────────────────────────────

export function useDailyChallenge(): DailyChallengeState {
    const addXP = useStore(s => s.addXP)
    const addActivity = useStore(s => s.addActivity)
    const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState('00:00:00')
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const progressPct = challenge
        ? Math.min((challenge.current / challenge.target) * 100, 100)
        : 0

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiFetch<DailyChallenge>('/api/community/challenges/daily')
            setChallenge(data)
        } catch {
            // Fallback local — compute current from today's sessions
            const local = getLocalDailyChallenge()
            const current = await computeTodayProgress(local.metric)
            local.current = current
            local.completed = current >= local.target
            setChallenge(local)
        } finally {
            setLoading(false)
        }
    }, [])

    const claimReward = useCallback(async () => {
        if (!challenge || !challenge.completed || challenge.claimed) return

        try {
            await apiFetch(`/api/community/challenges/${challenge.id}/claim`, { method: 'POST' })
        } catch {
            // Si offline, on accorde quand même localement
        }

        const totalXP = challenge.xp_reward + (challenge.bonus_xp ?? 0)
        addXP(totalXP, challenge.title)
        addActivity({
            icon: 'check-circle',
            text: `Challenge claimed: ${challenge.title}`,
            time: 'Just now',
            color: T.color.semantic.success
        })
        toast.xp(`+${totalXP} XP`, `Challenge "${challenge.title}" claimed!`, 4000)

        // Satisfying haptic when claiming xp
        if (process.env.EXPO_OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }

        setChallenge(prev => prev ? { ...prev, claimed: true } : prev)
    }, [challenge, addXP, addActivity])

    // Countdown timer
    useEffect(() => {
        if (!challenge) return

        const update = () => setTimeLeft(formatTimeLeft(challenge.expires_at))
        update()
        timerRef.current = setInterval(update, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [challenge?.expires_at])

    // Alerte 1h avant expiration
    useEffect(() => {
        if (!challenge || challenge.completed) return
        const diff = new Date(challenge.expires_at).getTime() - Date.now()
        const ONE_HOUR = 3_600_000

        if (diff > ONE_HOUR && diff < ONE_HOUR + 5000) {
            toast.warning('⏰ Challenge expires in 1h!', challenge.title)
        }
    }, [timeLeft])

    useEffect(() => {
        refresh()
    }, [])

    return { challenge, loading, error, timeLeft, progressPct, claimReward, refresh }
}
