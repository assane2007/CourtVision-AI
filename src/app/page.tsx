'use client'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app'
import { useEffect, Component, type ReactNode, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { FeatureGate } from '@/components/feature-gate'

// Lazy-load the animation wrapper so framer-motion is not in the main bundle.
// All screen components are already dynamically imported with ssr: false.
const ScreenTransition = dynamic(
  () => import('@/components/screen-transition').then(m => ({ default: m.ScreenTransition })),
  { ssr: false },
)
const LoadingSpinner = dynamic(
  () => import('@/components/screen-transition').then(m => ({ default: m.LoadingSpinner })),
  { ssr: false },
)

const LandingPage = dynamic(() => import('@/components/landing/landing-page'), { ssr: false })
const AuthScreen = dynamic(() => import('@/components/screens/auth-screen'), { ssr: false })
const OnboardingScreen = dynamic(() => import('@/components/screens/onboarding-screen'), { ssr: false })
const HomeScreen = dynamic(() => import('@/components/screens/home-screen'), { ssr: false })
const PlansScreen = dynamic(() => import('@/components/screens/plans-screen'), { ssr: false })
const TrainHubScreen = dynamic(() => import('@/components/screens/train-hub-screen'), { ssr: false })
const DrillDetailScreen = dynamic(() => import('@/components/screens/drill-detail-screen'), { ssr: false })
const CameraWorkoutScreen = dynamic(() => import('@/components/screens/camera-workout'), { ssr: false })
const WorkoutSummaryScreen = dynamic(() => import('@/components/screens/workout-summary-screen'), { ssr: false })
const StatsScreen = dynamic(() => import('@/components/screens/stats-screen'), { ssr: false })
const ProfileScreen = dynamic(() => import('@/components/screens/profile-screen'), { ssr: false })
const AchievementsScreen = dynamic(() => import('@/components/screens/achievements-screen'), { ssr: false })
const SettingsScreen = dynamic(() => import('@/components/screens/settings-screen'), { ssr: false })
const ScoutingScreen = dynamic(() => import('@/components/screens/scouting-screen'), { ssr: false })
const AICoachScreen = dynamic(() => import('@/components/screens/ai-coach-screen'), { ssr: false })
const ReactionTrainerScreen = dynamic(() => import('@/components/screens/reaction-trainer-screen'), { ssr: false })
const PricingScreen = dynamic(() => import('@/components/screens/pricing-screen'), { ssr: false })
const LeaderboardScreen = dynamic(() => import('@/components/screens/leaderboard-screen'), { ssr: false })
const RecordsScreen = dynamic(() => import('@/components/screens/records-screen'), { ssr: false })

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

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session, status } = useSession()
  const { currentScreen, navigate } = useAppStore()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    if (status === 'unauthenticated' && currentScreen !== 'auth' && currentScreen !== 'landing') navigate('landing')
  }, [status, currentScreen, navigate])

  // Simple direction heuristic: tab screens go right (1), detail screens go left (-1)
  const getDirection = () => {
    const tabScreens = ['home', 'plans', 'train-hub', 'stats', 'profile']
    const previousScreen = useAppStore.getState().screenHistory.slice(-1)[0]
    if (tabScreens.includes(currentScreen) && tabScreens.includes(previousScreen)) return 0
    if (previousScreen === 'drill-detail' || previousScreen === 'achievements') return -1
    return 0
  }

  if (!mounted || status === 'loading') {
    return <LoadingSpinner />
  }

  // Landing page: render outside the ScreenTransition wrapper (full-width marketing page)
  if (!session && currentScreen === 'landing') {
    return (
      <ErrorBoundary>
        <LandingPage onNavigate={navigate} />
      </ErrorBoundary>
    )
  }

  const direction = getDirection()

  return (
    <ErrorBoundary>
      <main id="main-content" className="min-h-screen bg-background">
        <ScreenTransition screenKey={currentScreen} direction={direction}>
          {currentScreen === 'auth' && <AuthScreen />}
          {currentScreen === 'onboarding' && <OnboardingScreen />}
          {currentScreen === 'home' && session && <HomeScreen />}
          {currentScreen === 'plans' && session && <PlansScreen />}
          {currentScreen === 'train-hub' && session && <TrainHubScreen />}
          {currentScreen === 'drill-detail' && <DrillDetailScreen />}
          {currentScreen === 'camera-workout' && session && <CameraWorkoutScreen />}
          {currentScreen === 'workout-summary' && session && <WorkoutSummaryScreen />}
          {currentScreen === 'stats' && session && <StatsScreen />}
          {currentScreen === 'profile' && session && <ProfileScreen />}
          {currentScreen === 'achievements' && session && <AchievementsScreen />}
          {currentScreen === 'settings' && session && <SettingsScreen />}
          {currentScreen === 'scouting' && session && (
            <FeatureGate flag="scouting"><ScoutingScreen /></FeatureGate>
          )}
          {currentScreen === 'ai-coach' && session && (
            <FeatureGate flag="ai_coach"><AICoachScreen /></FeatureGate>
          )}
          {currentScreen === 'reaction-trainer' && session && (
            <FeatureGate flag="reaction_trainer"><ReactionTrainerScreen /></FeatureGate>
          )}
          {currentScreen === 'pricing' && session && <PricingScreen />}
          {currentScreen === 'leaderboard' && session && <LeaderboardScreen />}
          {currentScreen === 'records' && session && <RecordsScreen />}
          {!session && currentScreen !== 'auth' && currentScreen !== 'landing' && <AuthScreen />}
        </ScreenTransition>
      </main>
    </ErrorBoundary>
  )
}