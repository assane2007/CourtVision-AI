import { Stack } from 'expo-router'

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D1117' }, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding2" />
            <Stack.Screen name="onboarding3" />
            <Stack.Screen name="(dashboard)" />
            <Stack.Screen name="live" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="program" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="analysis/[id]" />
            <Stack.Screen name="highlight/[id]" options={{ animation: 'fade' }} />
        </Stack>
    )
}
