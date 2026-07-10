'use client'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { useAppStore, type Screen } from '@/stores/app'
import { useEffect, Component, type ReactNode, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { FeatureGate } from '@/components/feature-gate'
import { toast } from 'sonner'
import { useTranslation } from '@/components/providers/language-provider'

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
const AIToolsScreen = dynamic(() => import('@/components/screens/ai-tools-screen'), { ssr: false })
const TermsScreen = dynamic(() => import('@/components/screens/terms-screen'), { ssr: false })
const PrivacyScreen = dynamic(() => import('@/components/screens/privacy-screen'), { ssr: false })

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-5xl" aria-hidden="true">😵</div>
            {/* i18n-FR: hardcoded French — TODO: use i18n */}
            <h1 className="text-xl font-bold">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">
              Quelque chose s&apos;est mal passé. Veuillez rafraîchir la page.
            </p>
            <button
              onClick={() => window.location.reload()}
              aria-label="Rafraîchir la page"
              className="min-h-[44px] px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  const { td } = useTranslation()
  const { loading, isAuthenticated } = useAuth()
  const currentScreen = useAppStore(s => s.currentScreen)
  const navigate = useAppStore(s => s.navigate)
  const selectDrill = useAppStore(s => s.selectDrill)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!loading && !isAuthenticated && currentScreen !== 'auth' && currentScreen !== 'landing') navigate('landing')
  }, [loading, isAuthenticated, currentScreen, navigate])

  // ── Stripe Checkout Feedback ───────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      toast.success(td('Paiement réussi ! Votre abonnement est maintenant actif.', 'Payment successful! Your subscription is now active.'))
      window.history.replaceState({}, '', '/')
    }
    if (params.get('checkout') === 'cancelled') {
      toast.error(td('Paiement annulé. Vous pouvez réessayer à tout moment.', 'Payment cancelled. You can try again at any time.'))
      window.history.replaceState({}, '', '/')
    }
  }, [td])

  // ── Deep Linking ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

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
  }, [isAuthenticated, navigate, selectDrill])

  // Simple direction heuristic: tab screens go right (1), detail screens go left (-1)
  const getDirection = () => {
    const history = useAppStore.getState().screenHistory
    const previousScreen = history[history.length - 1]
    const tabScreens = ['home', 'plans', 'train-hub', 'stats', 'profile', 'feed', 'messages']
    // Tab to tab = no slide
    if (tabScreens.includes(currentScreen) && tabScreens.includes(previousScreen)) return 0
    // Going "deeper" = slide left
    return 1
  }

  if (!mounted || loading) {
    return <LoadingSpinner />
  }

  // Landing page: render outside the ScreenTransition wrapper (full-width marketing page)
  if (!isAuthenticated && currentScreen === 'landing') {
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
        <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-announcer" />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">{td('Aller au contenu', 'Skip to content')}</a>
        <ScreenTransition screenKey={currentScreen} direction={direction}>
          {currentScreen === 'auth' && <AuthScreen />}
          {currentScreen === 'onboarding' && <OnboardingScreen />}
          {currentScreen === 'home' && isAuthenticated && <HomeScreen />}
          {currentScreen === 'plans' && isAuthenticated && <PlansScreen />}
          {currentScreen === 'train-hub' && isAuthenticated && <TrainHubScreen />}
          {currentScreen === 'drill-detail' && <DrillDetailScreen />}
          {currentScreen === 'camera-workout' && isAuthenticated && <CameraWorkoutScreen />}
          {currentScreen === 'workout-summary' && isAuthenticated && <WorkoutSummaryScreen />}
          {currentScreen === 'stats' && isAuthenticated && <StatsScreen />}
          {currentScreen === 'profile' && isAuthenticated && <ProfileScreen />}
          {currentScreen === 'achievements' && isAuthenticated && <AchievementsScreen />}
          {currentScreen === 'settings' && isAuthenticated && <SettingsScreen />}
          {currentScreen === 'scouting' && isAuthenticated && (
            <FeatureGate flag="scouting"><ScoutingScreen /></FeatureGate>
          )}
          {currentScreen === 'ai-coach' && isAuthenticated && (
            <FeatureGate flag="ai_coach"><AICoachScreen /></FeatureGate>
          )}
          {currentScreen === 'reaction-trainer' && isAuthenticated && (
            <FeatureGate flag="reaction_trainer"><ReactionTrainerScreen /></FeatureGate>
          )}
          {currentScreen === 'pricing' && isAuthenticated && <PricingScreen />}
          {currentScreen === 'leaderboard' && isAuthenticated && <LeaderboardScreen />}
          {currentScreen === 'records' && isAuthenticated && <RecordsScreen />}
          {currentScreen === 'friends' && isAuthenticated && <FriendsScreen />}
          {currentScreen === 'teams' && isAuthenticated && <TeamsScreen />}
          {currentScreen === 'team-detail' && isAuthenticated && <TeamDetailScreen />}
          {currentScreen === 'challenges' && isAuthenticated && <ChallengesScreen />}
          {currentScreen === 'challenge-detail' && isAuthenticated && <ChallengeDetailScreen />}
          {currentScreen === 'feed' && isAuthenticated && <FeedScreen />}
          {currentScreen === 'post-detail' && isAuthenticated && <PostDetailScreen />}
          {currentScreen === 'messages' && isAuthenticated && <MessagesScreen />}
          {currentScreen === 'conversation' && isAuthenticated && <ConversationScreen />}
          {currentScreen === 'profile-other' && isAuthenticated && <ProfileOtherScreen />}
          {currentScreen === 'live-workout' && isAuthenticated && <LiveWorkoutScreen />}
          {currentScreen === 'notifications' && isAuthenticated && <NotificationsScreen />}
          {currentScreen === 'video-library' && isAuthenticated && <VideoLibraryScreen />}
          {currentScreen === 'video-player' && isAuthenticated && <VideoPlayerScreen />}
          {currentScreen === 'video-upload' && isAuthenticated && <VideoUploadScreen />}
          {currentScreen === 'video-compare' && isAuthenticated && <VideoCompareScreen />}
          {currentScreen === 'ai-insights' && isAuthenticated && <AIInsightsScreen />}
          {currentScreen === 'voice-coach' && isAuthenticated && <VoiceCoachScreen />}
          {currentScreen === 'predictions' && isAuthenticated && <PredictionsScreen />}
          {currentScreen === 'ai-workout-gen' && isAuthenticated && <AIWorkoutGenScreen />}
          {currentScreen === 'ai-tools' && isAuthenticated && <AIToolsScreen />}
          {currentScreen === 'terms' && <TermsScreen />}
          {currentScreen === 'privacy' && <PrivacyScreen />}
          {!isAuthenticated && currentScreen !== 'auth' && currentScreen !== 'landing' && currentScreen !== 'terms' && currentScreen !== 'privacy' && <AuthScreen />}
        </ScreenTransition>
      </main>
    </ErrorBoundary>
  )
}