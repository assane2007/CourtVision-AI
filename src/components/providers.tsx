"use client"

import { ThemeProvider } from 'next-themes'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

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
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <NextAuthSessionProvider>
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
        </QueryClientProvider>
      </NextAuthSessionProvider>
    </ThemeProvider>
  )
}