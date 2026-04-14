import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import type { AppStateStatus} from 'react-native';
import { AppState, Platform, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { getAuthToken, setAuthToken, setRefreshToken, clearTokens } from '../lib/api';
import { supabase, isDemoMode } from '../lib/supabase';
import { useStore, selectHydrated } from '../lib/store';
import { ToastContainer } from '../components/Toast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { colors } from '../constants/tokens';

import * as Sentry from '@sentry/react-native';

import { T } from '../lib/theme';
import { AnalyticsProvider } from '../lib/analytics';
import { RevenueCatProvider } from '../lib/revenuecat';
import { ErrorBoundary } from '../components/ErrorBoundary';

import {
    useFonts,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold_Italic
} from '@expo-google-fonts/barlow-condensed';

import {
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold
} from '@expo-google-fonts/dm-sans';

import {
    JetBrainsMono_400Regular
} from '@expo-google-fonts/jetbrains-mono';

import {
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
} from '@expo-google-fonts/sora';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

function AuthGuard() {
    const router = useRouter();
    const segments = useSegments();

    const hydrated = useStore(selectHydrated);
    const login = useStore(s => s.login);
    const onboardingSyncPending = useStore(s => s.onboardingSyncPending);
    const syncOnboardingDraft = useStore(s => s.syncOnboardingDraft);
    const onboardingCalibrationSyncPending = useStore(s => s.onboardingCalibrationSyncPending);
    const syncOnboardingCalibrationDraft = useStore(s => s.syncOnboardingCalibrationDraft);

    const { registerForPushNotifications } = usePushNotifications();

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                Notifications.setBadgeCountAsync(0).catch(() => { });
            }
        });
        Notifications.setBadgeCountAsync(0).catch(() => { });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (isDemoMode) return;
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                await setAuthToken(session.access_token);
                await setRefreshToken(session.refresh_token);
            }
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session) {
                    await setAuthToken(session.access_token);
                    await setRefreshToken(session.refresh_token);
                } else if (event === 'SIGNED_OUT') {
                    await clearTokens();
                }
            },
        );
        return () => subscription.unsubscribe();
    }, []);

    // Navigation guard
    useEffect(() => {
        if (!hydrated) return;

        let cancelled = false;
        (async () => {
            const token = await getAuthToken();
            if (cancelled) return;

            // Simple segment check depending on where we are
            // segments[0] could be '(app)', '(auth)', '(setup)'
            const inApp = segments[0] === '(app)' || segments[0] === '(dashboard)';

            if (token && !inApp) {
                await login(token);
                if (!cancelled) {
                    await registerForPushNotifications();
                    router.replace('/(dashboard)');
                }
            } else if (!token && inApp) {
                if (!cancelled) router.replace('/(auth)');
            } else if (token && inApp) {
                registerForPushNotifications();
            }
        })();

        return () => { cancelled = true };
    }, [hydrated, segments]);

    useEffect(() => {
        if (!hydrated || (!onboardingSyncPending && !onboardingCalibrationSyncPending)) return;

        let disposed = false;
        const trySync = async () => {
            const token = await getAuthToken();
            if (disposed || !token) return;
            await syncOnboardingDraft().catch(() => { });
            await syncOnboardingCalibrationDraft().catch(() => { });
        };

        void trySync();
        const timer = setInterval(() => {
            void trySync();
        }, 30_000);

        return () => {
            disposed = true;
            clearInterval(timer);
        };
    }, [hydrated, onboardingSyncPending, syncOnboardingDraft, onboardingCalibrationSyncPending, syncOnboardingCalibrationDraft]);

    return null;
}

// Initialize Sentry for React Native (C-2)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn && !sentryDsn.includes('example.com') && Platform.OS !== 'web') {
    Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: 1.0,
    });
}

function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        BarlowCondensed_700Bold,
        BarlowCondensed_800ExtraBold_Italic,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_600SemiBold,
        DMSans_700Bold,
        JetBrainsMono_400Regular,
        Sora_400Regular,
        Sora_500Medium,
        Sora_600SemiBold,
        Sora_700Bold,
        Sora_800ExtraBold,
    });

    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
        return <View style={{ flex: 1, backgroundColor: colors.void }} />;
    }

    return (
        <ErrorBoundary>
        <SafeAreaProvider>
            <AnalyticsProvider>
                <RevenueCatProvider>
                    <StatusBar barStyle="light-content" backgroundColor={colors.void} />
                    <AuthGuard />
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: colors.void },
                            animation: 'fade', // Simple cross-fade transitions by default
                        }}
                    >
                        {/* Auth stack */}
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

                        {/* V5 primary dashboard */}
                        <Stack.Screen name="(dashboard)" options={{ headerShown: false, animation: 'slide_from_right' }} />

                        {/* Legacy app UI (fallback) */}
                        <Stack.Screen name="(app)" options={{ headerShown: false, animation: 'slide_from_right' }} />

                        {/* Global modals */}
                        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                    </Stack>
                    <ToastContainer />
                </RevenueCatProvider>
            </AnalyticsProvider>
        </SafeAreaProvider>
        </ErrorBoundary>
    );
}

export default Platform.OS === 'web' ? RootLayout : Sentry.wrap(RootLayout);
