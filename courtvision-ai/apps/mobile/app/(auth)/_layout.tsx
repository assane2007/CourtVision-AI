import { Stack } from 'expo-router';
import { colors } from '../../constants/tokens';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
                animation: 'fade_from_bottom',
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    );
}
