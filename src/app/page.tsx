'use client'
import { useSession } from 'next-auth/react'
import { useAppStore, type Screen } from '@/stores/app'
import { useEffect, Component, type ReactNode, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { FeatureGate } from '@/components/feature-gate'
import { toast } from 'sonner'

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
const FriendsScreen = dynamic(() => import('@/components/screens/friends-screen'), { ssr: false })
const TeamsScreen = dynamic(() => import('@/components/screens/teams-screen'), { ssr: false })
const TeamDetailScreen = dynamic(() => import('@/components/screens/team-detail-screen'), { ssr: false })
const ChallengesScreen = dynamic(() => import('@/components/screens/challenges-screen'), { ssr: false })
const ChallengeDetailScreen = dynamic(() => import('@/components/screens/challenge-detail-screen'), { ssr: false })
const FeedScreen = dynamic(() => import('@/components/screens/feed-screen'), { ssr: false })
const PostDetailScreen = dynamic(() => import('@/components/screens/post-detail-screen'), { ssr: false })
const MessagesScreen = dynamic(() => import('@/components/screens/messages-screen'), { ssr: false })
const ConversationScreen = dynamic(() => import('@/components/screens/conversation-screen'), { ssr: false })
const ProfileOtherScreen = dynamic(() => import('@/components/screens/profile-other-screen'), { ssr: false })
const LiveWorkoutScreen = dynamic(() => import('@/components/screens/live-workout-screen'), { ssr: false })
const NotificationsScreen = dynamic(() => import('@/components/screens/notifications-screen'), { ssr: false })
const VideoLibraryScreen = dynamic(() => import('@/components/screens/video-library-screen'), { ssr: false })
const VideoPlayerScreen = dynamic(() => import('@/components/screens/video-player-screen'), { ssr: false })
const VideoUploadScreen = dynamic(() => import('@/components/screens/video-upload-screen'), { ssr: false })
const VideoCompareScreen = dynamic(() => import('@/components/screens/video-compare-screen'), { ssr: false })
const AIInsightsScreen = dynamic(() => import('@/components/screens/ai-insights-screen'), { ssr: false })
const VoiceCoachScreen = dynamic(() => import('@/components/screens/voice-coach-screen'), { ssr: false })
const PredictionsScreen = dynamic(() => import('@/components/screens/predictions-screen'), { ssr: false })
const AIWorkoutGenScreen = dynamic(() => import('@/components/screens/ai-workout-gen-screen'), { ssr: false })
const TermsScreen = dynamic(() => import('@/components/screens/terms-screen'), { ssr: false })
const PrivacyScreen = dynamic(() => import('@/components/screens/privacy-screen'), { ssr: false })

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
  const { currentScreen, navigate, selectDrill } = useAppStore()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    if (status === 'unauthenticated' && currentScreen !== 'auth' && currentScreen !== 'landing') navigate('landing')
  }, [status, currentScreen, navigate])

  // ── Deep Linking ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') return

    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash.replace('#', '')
    const deepParam = params.get('deep')
    const verifyEmailParam = params.get('verify_email')
    const drillId = params.get('drill') || hash.startsWith('drill/') ? hash.replace('drill/', '') : null

    // Priority: verify_email > deep link > drill param
    if (verifyEmailParam) {
      // Auto-verify email token via API, then navigate
      fetch(`/api/email/verify/${encodeURIComponent(verifyEmailParam)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.message) {
            toast.success?.(data.message)
          }
        })
        .catch(() => {})
        .finally(() => {
          // Clean URL
          window.history.replaceState({}, '', '/')
        })
    } else if (deepParam) {
      const [type, id] = deepParam.split('/')
      const screenMap: Record<string, Screen> = {
        drill: 'drill-detail',
        challenge: 'challenge-detail',
        team: 'team-detail',
        profile: 'profile-other',
        video: 'video-player',
      }
      const targetScreen = screenMap[type]
      if (targetScreen && id) {
        if (type === 'drill') {
          navigate('drill-detail')
          selectDrill(id)
        } else if (targetScreen) {
          navigate(targetScreen)
        }
      }
      window.history.replaceState({}, '', '/')
    } else if (drillId) {
      selectDrill(drillId)
      navigate('drill-detail')
      window.history.replaceState({}, '', '/')
    }
  }, [status, navigate, selectDrill])

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
          {currentScreen === 'friends' && session && <FriendsScreen />}
          {currentScreen === 'teams' && session && <TeamsScreen />}
          {currentScreen === 'team-detail' && session && <TeamDetailScreen />}
          {currentScreen === 'challenges' && session && <ChallengesScreen />}
          {currentScreen === 'challenge-detail' && session && <ChallengeDetailScreen />}
          {currentScreen === 'feed' && session && <FeedScreen />}
          {currentScreen === 'post-detail' && session && <PostDetailScreen />}
          {currentScreen === 'messages' && session && <MessagesScreen />}
          {currentScreen === 'conversation' && session && <ConversationScreen />}
          {currentScreen === 'profile-other' && session && <ProfileOtherScreen />}
          {currentScreen === 'live-workout' && session && <LiveWorkoutScreen />}
          {currentScreen === 'notifications' && session && <NotificationsScreen />}
          {currentScreen === 'video-library' && session && <VideoLibraryScreen />}
          {currentScreen === 'video-player' && session && <VideoPlayerScreen />}
          {currentScreen === 'video-upload' && session && <VideoUploadScreen />}
          {currentScreen === 'video-compare' && session && <VideoCompareScreen />}
          {currentScreen === 'ai-insights' && session && <AIInsightsScreen />}
          {currentScreen === 'voice-coach' && session && <VoiceCoachScreen />}
          {currentScreen === 'predictions' && session && <PredictionsScreen />}
          {currentScreen === 'ai-workout-gen' && session && <AIWorkoutGenScreen />}
          {currentScreen === 'terms' && <TermsScreen />}
          {currentScreen === 'privacy' && <PrivacyScreen />}
          {!session && currentScreen !== 'auth' && currentScreen !== 'landing' && currentScreen !== 'terms' && currentScreen !== 'privacy' && <AuthScreen />}
        </ScreenTransition>
      </main>
    </ErrorBoundary>
  )
}