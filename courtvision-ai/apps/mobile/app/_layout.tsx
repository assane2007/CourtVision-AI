import { Stack } from 'expo-router'

export default function RootLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D1117' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding2" />
            <Stack.Screen name="onboarding3" />
            <Stack.Screen name="(dashboard)" />
            <Stack.Screen name="analysis/[id]" />
            <Stack.Screen name="highlight/[id]" />
        </Stack>
    )
}
