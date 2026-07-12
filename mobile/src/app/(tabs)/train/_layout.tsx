import { Stack } from 'expo-router';

export default function TrainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="drill/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}