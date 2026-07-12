import { Redirect } from 'expo-router';
import { useAppStore } from '@/stores/app';

export default function Index() {
  const isAuthenticated = useAppStore((s) => s?.isAuthenticated);
  const user = useAppStore((s) => s?.user);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user && !user?.name) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}