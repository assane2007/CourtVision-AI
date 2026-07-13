// Analytics utility — works even without PostHog configured
type AnalyticsEvent = { name: string; properties?: Record<string, unknown> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PostHogLike = any

export function trackEvent({ name, properties }: AnalyticsEvent) {
  if (typeof window === 'undefined') return
  try {
    const ph = (window as unknown as { posthog?: PostHogLike }).posthog
    if (ph && ph.capture) {
      ph.capture(name, properties)
    }
  } catch {
    // Analytics should never break the app
  }
}

export function identifyUser(id: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    const ph = (window as unknown as { posthog?: PostHogLike }).posthog
    if (ph && ph.identify) {
      ph.identify(id, traits)
    }
  } catch {
    // Silent fail
  }
}