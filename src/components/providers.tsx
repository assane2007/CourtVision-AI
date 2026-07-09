"use client"

import { ThemeProvider } from 'next-themes'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { CookieConsent } from '@/components/cookie-consent'
import { LanguageProvider } from '@/components/providers/language-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  }))

  // Suppress noisy next-auth CLIENT_FETCH_ERROR console warnings during cold start
  useEffect(() => {
    const origWarn = console.warn
    const origError = console.error
    const filter = (args: unknown[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : ''
      return !msg.includes('CLIENT_FETCH_ERROR')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.warn = (...args: any[]) => { if (filter(args)) origWarn(...args) }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => { if (filter(args)) origError(...args) }
    return () => {
      console.warn = origWarn
      console.error = origError
    }
  }, [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      <NextAuthSessionProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
              position="top-center"
              richColors
              toastOptions={{
                duration: 3500,
              }}
            />
            <PWAInstallPrompt />
            <CookieConsent />
          </QueryClientProvider>
        </LanguageProvider>
      </NextAuthSessionProvider>
    </ThemeProvider>
  )
}