'use client'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app'
import { useEffect, Component, type ReactNode, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

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

// ─── Page transition variants ──────────────────────────────────────────────────

const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    scale: 0.98,
    y: direction > 0 ? 12 : -8,
    filter: 'blur(2px)',
  }),
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    opacity: 0,
    scale: 0.97,
    y: direction > 0 ? -8 : 12,
    filter: 'blur(2px)',
  }),
}

// ─── Stagger children wrapper ──────────────────────────────────────────────────

function StaggerChildren({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.04, delayChildren: 0.08 },
        },
      }}
    >
      {typeof children === 'object' && children !== null && 'props' in children
        ? // Wrap each motion child with an opacity+translate animation
          children
        : children}
    </motion.div>
  )
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
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (status === 'unauthenticated' && currentScreen !== 'auth') navigate('auth')
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Chargement...</p>
        </motion.div>
      </div>
    )
  }

  const direction = getDirection()

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-background">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={prefersReducedMotion ? undefined : pageVariants}
            initial={prefersReducedMotion ? { opacity: 1 } : 'enter'}
            animate={prefersReducedMotion ? { opacity: 1 } : 'center'}
            exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
            transition={{
              duration: 0.25,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="min-h-screen"
          >
            <StaggerChildren>
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
              {!session && currentScreen !== 'auth' && <AuthScreen />}
            </StaggerChildren>
          </motion.div>
        </AnimatePresence>
      </main>
    </ErrorBoundary>
  )
}