import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AppState, AppStateStatus, StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { getAuthToken, setAuthToken, setRefreshToken, clearTokens } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import { ToastContainer } from '../components/Toast'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { T } from '../lib/theme'

// Configurer le comportement des notifications en foreground (une seule fois, au niveau module)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
})

/**
 * Auth guard: syncs Supabase session with SecureStore tokens,
 * redirects to onboarding when no session, and to dashboard
 * when a returning user opens the app.
 * Resets notification badge on foreground.
 */
function AuthGuard() {
    const router   = useRouter()
    const segments = useSegments()
    const { isAuthenticated, hydrated, login, logout } = useStore()
    const { registerForPushNotifications } = usePushNotifications()

    // Reset badge on foreground
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                Notifications.setBadgeCountAsync(0).catch(() => {})
            }
        })
        Notifications.setBadgeCountAsync(0).catch(() => {})
        return () => subscription.remove()
    }, [])

    // Supabase auth state listener — keeps SecureStore in sync
    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                await setAuthToken(session.access_token)
                await setRefreshToken(session.refresh_token)
            }
        })

        // Listen for changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session) {
                    await setAuthToken(session.access_token)
                    await setRefreshToken(session.refresh_token)
                } else if (event === 'SIGNED_OUT') {
                    await clearTokens()
                }
            },
        )

        return () => subscription.unsubscribe()
    }, [])

    // Navigation guard — redirect based on auth state
    useEffect(() => {
        if (!hydrated) return

        let cancelled = false

        ;(async () => {
            const token = await getAuthToken()
            if (cancelled) return

            const first       = segments[0] as string | undefined
            const inDashboard = first === '(dashboard)'

            if (token && !inDashboard) {
                await login(token)
                if (!cancelled) {
                    await registerForPushNotifications()
                    router.replace('/(dashboard)')
                }
            } else if (!token && inDashboard) {
                if (!cancelled) router.replace('/')
            } else if (token && inDashboard) {
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
            <StatusBar barStyle="light-content" backgroundColor={T.color.background.primary} />
            <AuthGuard />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: T.color.background.primary },
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
            <ToastContainer />
        </SafeAreaProvider>
    )
}
