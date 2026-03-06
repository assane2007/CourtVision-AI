import { usePostHog, PostHogProvider } from 'posthog-react-native';
import React, { useEffect } from 'react';

// You will need to replace this with your actual Posthog Project API Key
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || 'phc_PLACEHOLDER_KEY';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    return (
        <PostHogProvider
            apiKey={POSTHOG_API_KEY}
            options={{
                host: 'https://app.posthog.com', // Replace with 'https://eu.posthog.com' if your project is in EU
                enableSessionReplay: true,
                sessionReplayConfig: {
                    // Record full user sessions natively
                    maskAllTextInputs: true,
                    maskAllImages: false,
                }
            }}
        >
            {children}
        </PostHogProvider>
    );
}

// A hook to easily use Posthog in any component
export const useAnalytics = () => {
    const posthog = usePostHog();

    const trackEvent = (eventName: string, properties?: Record<string, any>) => {
        if (posthog) {
            posthog.capture(eventName, properties);
        }
    };

    const identifyUser = (userId: string, properties?: Record<string, any>) => {
        if (posthog) {
            posthog.identify(userId, properties);
        }
    };

    return { posthog, trackEvent, identifyUser };
};
