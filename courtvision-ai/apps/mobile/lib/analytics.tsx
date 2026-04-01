import { usePostHog, PostHogProvider } from 'posthog-react-native';
import React from 'react';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const isPostHogConfigured = POSTHOG_API_KEY.length > 10 && !POSTHOG_API_KEY.includes('PLACEHOLDER');

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    if (!isPostHogConfigured) {
        return <>{children}</>;
    }

    return (
        <PostHogProvider
            apiKey={POSTHOG_API_KEY}
            options={{
                host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
                enableSessionReplay: true,
                sessionReplayConfig: {
                    maskAllTextInputs: true,
                    maskAllImages: false,
                }
            }}
        >
            {children}
        </PostHogProvider>
    );
}

export const useAnalytics = () => {
    const posthogClient = usePostHog();
    const posthog = isPostHogConfigured ? posthogClient : null;

    const trackEvent = (eventName: string, properties?: Record<string, any>) => {
        posthog?.capture(eventName, properties);
    };

    const identifyUser = (userId: string, properties?: Record<string, any>) => {
        posthog?.identify(userId, properties);
    };

    return { posthog, trackEvent, identifyUser };
};
