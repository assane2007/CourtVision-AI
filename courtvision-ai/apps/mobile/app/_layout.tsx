import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { getAuthToken } from '../lib/api'
import { useStore } from '../lib/store'
import { ToastContainer } from '../components/Toast'
import { usePushNotifications } from '../hooks/usePushNotifications'

// Configurer le comportement des notifications en foreground (une seule fois, au niveau module)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
})

/**
 * Auth guard: re-directs to onboarding when no token is found,
 * and to the dashboard when a returning user opens the app.
 * Also resets the notification badge when the app comes to foreground.
 */
function AuthGuard() {
    const router   = useRouter()
    const segments = useSegments()
    const { isAuthenticated, hydrated, login } = useStore()
    const { registerForPushNotifications } = usePushNotifications()

    // Remettre le badge à 0 quand l'app passe au premier plan
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                Notifications.setBadgeCountAsync(0).catch(() => {})
            }
        })
        // Aussi au premier lancement
        Notifications.setBadgeCountAsync(0).catch(() => {})
        return () => subscription.remove()
    }, [])

    useEffect(() => {
        if (!hydrated) return   // attendre que le store soit réhydraté avant de router

        let cancelled = false

        ;(async () => {
            const token = await getAuthToken()
            if (cancelled) return

            const first       = segments[0] as string | undefined
            const inDashboard = first === '(dashboard)'

            if (token && !inDashboard) {
                // Restore session — login will load profile + weekly data
                await login(token)
                if (!cancelled) {
                    await registerForPushNotifications()
                    router.replace('/(dashboard)')
                }
            } else if (!token && inDashboard) {
                if (!cancelled) router.replace('/')
            } else if (token && inDashboard) {
                // Enregistrer les push notifications au lancement
                registerForPushNotifications()
            }
        })()

        return () => { cancelled = true }
    }, [hydrated])

    return null
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthGuard />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0D1117' },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding2" />
                <Stack.Screen name="onboarding-camera" />
                <Stack.Screen name="onboarding3" />
                <Stack.Screen name="(dashboard)" />
                <Stack.Screen name="live" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
                <Stack.Screen name="program" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="analysis/[id]" />
                <Stack.Screen name="highlight/[id]" options={{ animation: 'fade' }} />
            </Stack>
            {/* Toast notifications — visible above everything */}
            <ToastContainer />
        </SafeAreaProvider>
    )
}
