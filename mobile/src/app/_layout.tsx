import '~/global.css';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAppStore } from '@/stores/app';
import { i18n } from '../../../src/lib/i18n';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const isDark = useAppStore((s) => s.isDark);
  return (
    <View className={`flex-1 ${isDark ? 'bg-neutral-950' : 'bg-white'}`}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    async function prepare() {
      try {
        await i18n.changeLanguage(language);
      } catch (e) {
        console.warn('App prepare error:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, [language]);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeWrapper>
            <Slot />
            <StatusBar style="auto" />
          </ThemeWrapper>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}