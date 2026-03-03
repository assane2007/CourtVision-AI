import { Stack } from 'expo-router';
import { colors } from '../../constants/tokens';

export default function SetupLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.base },
                animation: 'fade_from_bottom',
            }}
        >
            <Stack.Screen name="camera" />
        </Stack>
    );
}
