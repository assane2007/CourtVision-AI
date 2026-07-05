'use client'

import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Lazy load screens — only load when needed
import { lazy, Suspense } from 'react'

const AuthScreen = lazy(() => import('@/components/screens/auth-screen'))
const OnboardingScreen = lazy(() => import('@/components/screens/onboarding-screen'))
const HomeScreen = lazy(() => import('@/components/screens/home-screen'))
const TrainHubScreen = lazy(() => import('@/components/screens/train-hub-screen'))
const DrillDetailScreen = lazy(() => import('@/components/screens/drill-detail-screen'))
const CameraWorkoutScreen = lazy(() => import('@/components/screens/camera-workout'))
const StatsScreen = lazy(() => import('@/components/screens/stats-screen'))
const ProfileScreen = lazy(() => import('@/components/screens/profile-screen'))
const AchievementsScreen = lazy(() => import('@/components/screens/achievements-screen'))

function ScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )
}

function ScreenSwitch({ session, currentScreen }: { session: any; currentScreen: string }) {
  if (currentScreen === 'auth') return <AuthScreen />
  if (currentScreen === 'onboarding') return <OnboardingScreen />
  if (!session) return <AuthScreen />
  if (currentScreen === 'home') return <HomeScreen />
  if (currentScreen === 'train-hub') return <TrainHubScreen />
  if (currentScreen === 'drill-detail') return <DrillDetailScreen />
  if (currentScreen === 'camera-workout') return <CameraWorkoutScreen />
  if (currentScreen === 'stats') return <StatsScreen />
  if (currentScreen === 'profile') return <ProfileScreen />
  if (currentScreen === 'achievements') return <AchievementsScreen />
  return <AuthScreen />
}

export default function Home() {
  const { data: session, status } = useSession()
  const { currentScreen, navigate } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (status === 'unauthenticated' && currentScreen !== 'auth') {
      navigate('auth')
    }
  }, [status, currentScreen, navigate])

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="min-h-screen"
        >
          <Suspense fallback={<ScreenLoader />}>
            <ScreenSwitch session={session} currentScreen={currentScreen} />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </main>
  )
}