"use client"

import { ThemeProvider } from 'next-themes'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
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