'use client'

import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'

// Use dynamic imports for code splitting
const AuthScreen = dynamic(
  () => import('@/components/screens/auth-screen').then(m => m.default || m.AuthScreen),
  { ssr: false }
)
const OnboardingScreen = dynamic(
  () => import('@/components/screens/onboarding-screen').then(m => m.default || m.OnboardingScreen),
  { ssr: false }
)
const HomeScreen = dynamic(
  () => import('@/components/screens/home-screen').then(m => m.default || m.HomeScreen),
  { ssr: false }
)
const TrainHubScreen = dynamic(
  () => import('@/components/screens/train-hub-screen').then(m => m.default || m.TrainHubScreen),
  { ssr: false }
)
const DrillDetailScreen = dynamic(
  () => import('@/components/screens/drill-detail-screen').then(m => m.default || m.DrillDetailScreen),
  { ssr: false }
)
const CameraWorkoutScreen = dynamic(
  () => import('@/components/screens/camera-workout').then(m => m.default || m.CameraWorkoutScreen),
  { ssr: false }
)
const StatsScreen = dynamic(
  () => import('@/components/screens/stats-screen').then(m => m.default || m.StatsScreen),
  { ssr: false }
)
const ProfileScreen = dynamic(
  () => import('@/components/screens/profile-screen').then(m => m.default || m.ProfileScreen),
  { ssr: false }
)

export default function Home() {
  const { data: session, status } = useSession()
  const { currentScreen, navigate } = useAppStore()

  // Auto-redirect based on auth status
  useEffect(() => {
    if (status === 'unauthenticated' && currentScreen !== 'auth') {
      navigate('auth')
    }
  }, [status, currentScreen, navigate])

  // Show loading while checking session
  if (status === 'loading') {
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
          {currentScreen === 'auth' && <AuthScreen />}
          {currentScreen === 'onboarding' && <OnboardingScreen />}
          {currentScreen === 'home' && session && <HomeScreen />}
          {currentScreen === 'train-hub' && session && <TrainHubScreen />}
          {currentScreen === 'drill-detail' && session && <DrillDetailScreen />}
          {currentScreen === 'camera-workout' && session && <CameraWorkoutScreen />}
          {currentScreen === 'stats' && session && <StatsScreen />}
          {currentScreen === 'profile' && session && <ProfileScreen />}

          {/* Fallback: not authenticated screens redirect to auth */}
          {!session && currentScreen !== 'auth' && <AuthScreen />}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}