import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform, StatusBar, View, Text } from 'react-native';

// Web global error catcher — shows errors on screen instead of blank page
if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const _origErr = console.error;
    (window as any).__WEB_ERRORS = [] as string[];
    window.addEventListener('error', (e) => {
        (window as any).__WEB_ERRORS.push(e.message + '\n' + (e.error?.stack || ''));
        const el = document.getElementById('__web_error_overlay');
        if (el) el.innerText = (window as any).__WEB_ERRORS.join('\n---\n');
        else {
            const d = document.createElement('pre');
            d.id = '__web_error_overlay';
            d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1a0000;color:#ff4444;padding:20px;overflow:auto;font-size:14px;white-space:pre-wrap;';
            d.innerText = (window as any).__WEB_ERRORS.join('\n---\n');
            document.body.appendChild(d);
        }
    });
    window.addEventListener('unhandledrejection', (e) => {
        (window as any).__WEB_ERRORS.push('Unhandled rejection: ' + String(e.reason?.stack || e.reason));
        const el = document.getElementById('__web_error_overlay');
        if (el) el.innerText = (window as any).__WEB_ERRORS.join('\n---\n');
        else {
            const d = document.createElement('pre');
            d.id = '__web_error_overlay';
            d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1a0000;color:#ff4444;padding:20px;overflow:auto;font-size:14px;white-space:pre-wrap;';
            d.innerText = (window as any).__WEB_ERRORS.join('\n---\n');
            document.body.appendChild(d);
        }
    });
}

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
        }),
    });
}

function AuthGuard() {
    const router = useRouter();
    const segments = useSegments();

    const hydrated = useStore(selectHydrated);
    const login = useStore(s => s.login);

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

function WebDebugWrapper() {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handler = (event: ErrorEvent) => {
            setError(event.message + '\n' + (event.error?.stack || ''));
        };
        const rejectionHandler = (event: PromiseRejectionEvent) => {
            setError('Unhandled rejection: ' + String(event.reason));
        };
        window.addEventListener('error', handler);
        window.addEventListener('unhandledrejection', rejectionHandler);
        return () => {
            window.removeEventListener('error', handler);
            window.removeEventListener('unhandledrejection', rejectionHandler);
        };
    }, []);

    if (error) {
        return (
            <View style={{ flex: 1, backgroundColor: '#1a0000', justifyContent: 'center', padding: 20 }}>
                <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Web Error:</Text>
                <Text style={{ color: '#ffaaaa', fontSize: 14 }}>{error}</Text>
            </View>
        );
    }

    return <RootLayout />;
}

export default Platform.OS === 'web' ? WebDebugWrapper : Sentry.wrap(RootLayout);
