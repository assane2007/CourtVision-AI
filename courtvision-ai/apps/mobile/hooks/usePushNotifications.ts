/**
 * usePushNotifications
 * Gère l'enregistrement des push notifications Expo et les rappels daily challenge.
 * En production: intègre expo-notifications + backend.
 * En dev: simule les notifications avec des reminders locaux.
 */

import { useEffect, useCallback, useRef } from 'react'
import { Platform, Alert } from 'react-native'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'

// ── Types ─────────────────────────────────────────────────────
interface PushNotificationConfig {
    dailyChallengeReminder: boolean
    streakReminder: boolean
    weeklyReport: boolean
    communityActivity: boolean
}

const DEFAULT_CONFIG: PushNotificationConfig = {
    dailyChallengeReminder: true,
    streakReminder: true,
    weeklyReport: true,
    communityActivity: false,
}

// ── Simulated notification messages ──────────────────────────
const STREAK_MESSAGES = [
    (n: number) => `🔥 Ne perds pas ton streak de ${n} jours ! Lance une session aujourd'hui.`,
    (n: number) => `⚡ ${n} jours de suite ! Tu es en feu. Continue sur ta lancée.`,
    (n: number) => `🏀 Streak x${n} en danger ! Analyse une session pour maintenir ta série.`,
]

const CHALLENGE_MESSAGES = [
    () => '🎯 Ton défi quotidien t\'attend ! 5 tirs pour gagner des XP.',
    () => '⚡ Nouveau défi disponible ! Tu as 24h pour le compléter.',
    () => '🏆 Défi du jour actif ! Rejoins les autres joueurs et grimpe au classement.',
]

// ── Hook ──────────────────────────────────────────────────────
export function usePushNotifications() {
    const user = useStore(s => s.user)
    const isAuthenticated = useStore(s => s.isAuthenticated)
    const hasShownReminder = useRef(false)

    // Enregistre le token push (à appeler au lancement)
    const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
        try {
            // En production, utiliser expo-notifications:
            // const { status } = await Notifications.requestPermissionsAsync()
            // if (status !== 'granted') return null
            // const token = await Notifications.getExpoPushTokenAsync()
            // return token.data

            // Pour le dev: simuler un token
            const mockToken = `ExponentPushToken[mock-${Date.now()}]`
            console.log('[PushNotifications] Token simulé:', mockToken)
            return mockToken
        } catch (err) {
            console.warn('[PushNotifications] Erreur enregistrement:', err)
            return null
        }
    }, [])

    // Programme un rappel local streak (simulé)
    const scheduleStreakReminder = useCallback((streak: number) => {
        const msg = STREAK_MESSAGES[streak % STREAK_MESSAGES.length]?.(streak)
        console.log('[PushNotifications] Streak reminder scheduled:', msg)
        // En production: Notifications.scheduleNotificationAsync(...)
    }, [])

    // Programme un rappel daily challenge
    const scheduleDailyChallengeReminder = useCallback(() => {
        const msg = CHALLENGE_MESSAGES[Math.floor(Math.random() * CHALLENGE_MESSAGES.length)]?.()
        console.log('[PushNotifications] Challenge reminder scheduled:', msg)
        // En production: Notifications.scheduleNotificationAsync(...)
    }, [])

    // Affiche une notification in-app si streak en danger
    const checkStreakHealth = useCallback(() => {
        if (!isAuthenticated || !user) return
        const streak = user.streak ?? 0
        if (streak > 0 && !hasShownReminder.current) {
            hasShownReminder.current = true
            // Vérifier si dernière session = hier (pour alerter si pas encore joué aujourd'hui)
            // Simplifié: on montre juste une fois par session
        }
    }, [isAuthenticated, user])

    // Initialisation
    useEffect(() => {
        if (!isAuthenticated) return
        registerForPushNotifications().then(token => {
            if (token && user) {
                // TODO: envoyer le token au backend
                // apiFetch('/api/auth/push-token', { method: 'POST', body: JSON.stringify({ token }) })
            }
        })
        scheduleDailyChallengeReminder()
        if (user?.streak) scheduleStreakReminder(user.streak)
    }, [isAuthenticated, user?.id])

    return {
        registerForPushNotifications,
        scheduleStreakReminder,
        scheduleDailyChallengeReminder,
        checkStreakHealth,
    }
}
