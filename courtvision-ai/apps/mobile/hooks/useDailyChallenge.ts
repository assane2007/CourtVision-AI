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
    easy:       '#00C853',
    medium:     '#00D4FF',
    hard:       '#FF9800',
    legendary:  '#FFD700',
}

export const DIFFICULTY_LABELS: Record<string, string> = {
    easy:       'Facile',
    medium:     'Moyen',
    hard:       'Difficile',
    legendary:  '✨ Légendaire',
}

// ── Défis locaux (fallback sans serveur) ─────────────────────────

function getLocalDailyChallenge(): DailyChallenge {
    const today = new Date()
    const dayOfWeek = today.getDay()

    const DAILY_CHALLENGES: DailyChallenge[] = [
        {
            id: `local-0`,
            title: '50 Tirs de 3-pts',
            description: 'Réalise 50 tentatives de 3-points lors de ta prochaine session.',
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
            description: 'Maintiens un mental score au-dessus de 80 pendant toute une session.',
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
            title: 'Session rapide',
            description: 'Complète une session Coach Live de 20+ minutes.',
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
            title: 'Sniper du jour',
            description: 'Réalise 60%+ de tirs réussis sur au moins 20 tentatives.',
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
            title: 'Streak maintenu',
            description: 'Assure-toi de rester connecté et actif aujourd\'hui.',
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
            title: 'Session double',
            description: 'Fais 2 sessions dans la journée.',
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
            title: 'Analyse complète',
            description: 'Analyse une vidéo de match complet (4 quarts).',
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
    const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState<string | null>(null)
    const [timeLeft, setTimeLeft]   = useState('00:00:00')
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
            // Fallback local
            setChallenge(getLocalDailyChallenge())
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
        toast.xp(`+${totalXP} XP`, `Défi "${challenge.title}" réclamé !`, 4000)

        setChallenge(prev => prev ? { ...prev, claimed: true } : prev)
    }, [challenge, addXP])

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
            toast.warning('⏰ Défi expire dans 1h !', challenge.title)
        }
    }, [timeLeft])

    useEffect(() => {
        refresh()
    }, [])

    return { challenge, loading, error, timeLeft, progressPct, claimReward, refresh }
}
