import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { getAuthToken } from '../lib/api'
import { useStore } from '../lib/store'

/**
 * Auth guard: re-directs to onboarding when no token is found,
 * and to the dashboard when a returning user opens the app.
 */
function AuthGuard() {
    const router = useRouter()
    const segments = useSegments()
    const { isAuthenticated, login } = useStore()

    useEffect(() => {
        let cancelled = false

        ;(async () => {
            const token = await getAuthToken()
            if (cancelled) return

            const first = segments[0] as string | undefined
            const inDashboard = first === '(dashboard)'

            if (token && !inDashboard) {
                // Restore session — login will load profile + weekly data
                await login(token)
                router.replace('/(dashboard)')
            } else if (!token && inDashboard) {
                router.replace('/')
            }
        })()

        return () => { cancelled = true }
    }, [])

    return null
}

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D1117' }, animation: 'slide_from_right' }}>
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
    )
}
