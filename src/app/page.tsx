'use client'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app'
import { useEffect, useState, Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'

const AuthScreen = dynamic(() => import('@/components/screens/auth-screen'), { ssr: false })
const OnboardingScreen = dynamic(() => import('@/components/screens/onboarding-screen'), { ssr: false })
const HomeScreen = dynamic(() => import('@/components/screens/home-screen'), { ssr: false })
const TrainHubScreen = dynamic(() => import('@/components/screens/train-hub-screen'), { ssr: false })
const DrillDetailScreen = dynamic(() => import('@/components/screens/drill-detail-screen'), { ssr: false })
const CameraWorkoutScreen = dynamic(() => import('@/components/screens/camera-workout'), { ssr: false })
const StatsScreen = dynamic(() => import('@/components/screens/stats-screen'), { ssr: false })
const ProfileScreen = dynamic(() => import('@/components/screens/profile-screen'), { ssr: false })
const AchievementsScreen = dynamic(() => import('@/components/screens/achievements-screen'), { ssr: false })

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-5xl">😵</div>
            <h1 className="text-xl font-bold">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">
              Quelque chose s&apos;est mal passé. Veuillez rafraîchir la page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Home() {
  const { data: session, status } = useSession()
  const { currentScreen, navigate } = useAppStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (status === 'unauthenticated' && currentScreen !== 'auth') navigate('auth')
  }, [status, currentScreen, navigate])
  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </motion.div>
      </div>
    )
  }
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-background">
        <AnimatePresence mode="wait">
          <motion.div key={currentScreen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="min-h-screen">
            {currentScreen === 'auth' && <AuthScreen />}
            {currentScreen === 'onboarding' && <OnboardingScreen />}
            {currentScreen === 'home' && session && <HomeScreen />}
            {currentScreen === 'train-hub' && session && <TrainHubScreen />}
            {currentScreen === 'drill-detail' && <DrillDetailScreen />}
            {currentScreen === 'camera-workout' && session && <CameraWorkoutScreen />}
            {currentScreen === 'stats' && session && <StatsScreen />}
            {currentScreen === 'profile' && session && <ProfileScreen />}
            {currentScreen === 'achievements' && session && <AchievementsScreen />}
            {!session && currentScreen !== 'auth' && <AuthScreen />}
          </motion.div>
        </AnimatePresence>
      </main>
    </ErrorBoundary>
  )
}
