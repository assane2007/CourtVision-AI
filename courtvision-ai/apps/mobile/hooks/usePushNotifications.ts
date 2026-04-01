/**
 * usePushNotifications
 * Intégration complète expo-notifications (SDK 51).
 *
 * Fonctionnalités :
 * - Demande de permission (iOS + Android)
 * - Récupération du token Expo Push Token réel
 * - Envoi du token au backend
 * - Notifications locales planifiées : streak danger + daily challenge
 * - Annulation des notifications obsolètes
 * - Listener en foreground (affichage toast in-app)
 * - Handler de tap (deep link vers l'écran concerné)
 * - Canal Android prioritaire
 */

import { useEffect, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { useRouter } from 'expo-router'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { T } from '../lib/theme'
import Constants from 'expo-constants'

// ── Configuration globale des notifications ───────────────────
// À placer AVANT le premier rendu de l'app (dans _layout.tsx idéalement,
// mais on le met aussi ici pour garantir l'initialisation).
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
})

// ── Identifiants des notifications planifiées ─────────────────
const NOTIF_ID_STREAK  = 'cv-streak-reminder'
const NOTIF_ID_CHALLENGE = 'cv-challenge-reminder'

// ── Contenu des notifications ─────────────────────────────────
const streakContent = (streak: number): Notifications.NotificationContentInput => ({
    title: '🔥 Streak at risk!',
    body: `You have a ${streak}-day streak — start a session to keep it alive.`,
    data: { screen: '/(dashboard)/upload', type: 'streak' },
    sound: true,
    badge: 1,
})

const challengeContent = (): Notifications.NotificationContentInput => ({
    title: '🎯 Daily challenge available!',
    body: 'New daily challenge — make 5 shots to earn XP and climb the leaderboard.',
    data: { screen: '/(dashboard)', type: 'challenge' },
    sound: true,
    badge: 1,
})

// ── Créer le canal Android (priorité haute, son + vibration) ──
async function ensureAndroidChannel() {
    if (Platform.OS !== 'android') return
    await Notifications.setNotificationChannelAsync('courtvision', {
        name: 'CourtVision AI',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: T.color.signature.primary,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
    })
}

// ── Helpers web-safe (expo-notifications n'existe pas sur web) ──
const isWeb = Platform.OS === 'web'

// ── Hook principal ─────────────────────────────────────────────
export function usePushNotifications() {
    const router          = useRouter()
    const user            = useStore(s => s.user)
    const isAuthenticated = useStore(s => s.isAuthenticated)

    // Référence aux listeners pour les démonter proprement
    const foregroundSub = useRef<Notifications.Subscription | null>(null)
    const tapSub        = useRef<Notifications.Subscription | null>(null)

    // ── 1. Demande de permission + récupération du token ──────
    const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
        if (isWeb) return null
        try {
            await ensureAndroidChannel()

            // Les tokens push ne fonctionnent que sur un vrai appareil
            if (!Device.isDevice) {
                console.log('[PushNotifications] Simulator detected — push token unavailable.')
                return null
            }

            // Vérifier / demander la permission
            const { status: existing } = await Notifications.getPermissionsAsync()
            let finalStatus = existing

            if (existing !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync()
                finalStatus = status
            }

            if (finalStatus !== 'granted') {
                console.warn('[PushNotifications] Permission denied.')
                toast.info('Enable notifications to receive training reminders 🔔')
                return null
            }

            // Récupérer le vrai Expo Push Token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? '',
            })
            const token = tokenData.data
            console.log('[PushNotifications] Token Expo:', token)

            // Envoyer le token au backend pour les push distants
            try {
                await api.post('/api/auth/push-token', { token, platform: Platform.OS })
            } catch (apiErr) {
                // Non-bloquant : le push local fonctionne sans ça
                console.warn('[PushNotifications] Failed to send token to backend:', apiErr)
            }

            return token
        } catch (err) {
            console.warn('[PushNotifications] Registration error:', err)
            return null
        }
    }, [])

    // ── 2. Planifier le rappel streak (chaque soir à 20h) ─────
    const scheduleStreakReminder = useCallback(async (streak: number) => {
        if (isWeb) return
        // Annuler l'ancien rappel streak avant d'en replanifier un
        await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_STREAK).catch(() => {})

        await Notifications.scheduleNotificationAsync({
            identifier: NOTIF_ID_STREAK,
            content: streakContent(streak),
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 0,
                repeats: true,
                channelId: 'courtvision',
            } as Notifications.DailyTriggerInput,
        })
        console.log(`[PushNotifications] Streak reminder planifié (streak=${streak}, 20h00 chaque jour)`)
    }, [])

    // ── 3. Planifier le rappel daily challenge (chaque matin à 9h) ─
    const scheduleDailyChallengeReminder = useCallback(async () => {
        if (isWeb) return
        await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_CHALLENGE).catch(() => {})

        await Notifications.scheduleNotificationAsync({
            identifier: NOTIF_ID_CHALLENGE,
            content: challengeContent(),
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 9,
                minute: 0,
                repeats: true,
                channelId: 'courtvision',
            } as Notifications.DailyTriggerInput,
        })
        console.log('[PushNotifications] Daily challenge reminder planifié (9h00 chaque jour)')
    }, [])

    // ── 4. Annuler toutes les notifications planifiées ────────
    const cancelAllReminders = useCallback(async () => {
        if (isWeb) return
        await Notifications.cancelAllScheduledNotificationsAsync()
        console.log('[PushNotifications] Toutes les notifications annulées')
    }, [])

    // ── 5. Envoyer une notification locale immédiate (ex: badge XP) ─
    const sendLocalNotification = useCallback(async (
        title: string,
        body: string,
        data?: Record<string, unknown>
    ) => {
        if (isWeb) return
        await Notifications.scheduleNotificationAsync({
            content: { title, body, data, sound: true },
            trigger: null, // immédiate
        })
    }, [])

    // ── 6. Listeners ─────────────────────────────────────────
    useEffect(() => {
        if (isWeb) return

        // Foreground : afficher un toast in-app au lieu du bandeau système
        foregroundSub.current = Notifications.addNotificationReceivedListener(notification => {
            const { title, body, data } = notification.request.content
            const type = (data as any)?.type ?? 'info'

            if (type === 'streak') {
                toast.warning(body ?? title ?? '🔥 Streak at risk!')
            } else if (type === 'challenge') {
                toast.success(body ?? title ?? '🎯 New challenge!')
            } else if (type === 'xp') {
                toast.xp(body ?? title ?? '⚡ XP earned!')
            } else {
                toast.info(body ?? title ?? '🔔 Notification')
            }
        })

        // Tap : naviguer vers l'écran associé à la notification
        tapSub.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as any
            const screen = data?.screen
            if (screen) {
                router.push(screen)
            }
        })

        // Gérer les notifications reçues pendant que l'app était fermée (cold start)
        Notifications.getLastNotificationResponseAsync().then(response => {
            if (!response) return
            const data = response.notification.request.content.data as any
            const screen = data?.screen
            if (screen) router.push(screen)
        })

        return () => {
            foregroundSub.current?.remove()
            tapSub.current?.remove()
        }
    }, [router])

    // ── 7. Initialisation au login ────────────────────────────
    useEffect(() => {
        if (!isAuthenticated || !user) return

        registerForPushNotifications().then(token => {
            if (!token) return
            // Planifier les rappels si l'utilisateur a un streak actif
            if ((user.streak ?? 0) > 0) {
                scheduleStreakReminder(user.streak ?? 0)
            }
            scheduleDailyChallengeReminder()
        })
    }, [isAuthenticated, user?.id])  // re-run uniquement si l'utilisateur change

    return {
        registerForPushNotifications,
        scheduleStreakReminder,
        scheduleDailyChallengeReminder,
        cancelAllReminders,
        sendLocalNotification,
    }
}
