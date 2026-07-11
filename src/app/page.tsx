'use client'

import { Component, type ReactNode, useSyncExternalStore, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslation } from '@/components/providers/language-provider'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { useAppStore } from '@/stores/app'

// ── Core screens (preloaded for fast initial render) ──────────────────────────

const LoadingSpinner = dynamic(
  () => import('@/components/screen-transition').then(m => ({ default: m.LoadingSpinner })),
  { ssr: false },
)
const LandingPage = dynamic(() => import('@/components/landing/landing-page'), { ssr: false })
const AuthScreen = dynamic(() => import('@/components/screens/auth-screen'), { ssr: false })
const OnboardingScreen = dynamic(() => import('@/components/screens/onboarding-screen'), { ssr: false })

// ── Authenticated screens (lazy loaded on demand) ─────────────────────────────

const HomeScreen = dynamic(() => import('@/components/screens/home-screen'), { ssr: false })
const TrainHubScreen = dynamic(() => import('@/components/screens/train-hub-screen'), { ssr: false })
const DrillDetailScreen = dynamic(() => import('@/components/screens/drill-detail-screen'), { ssr: false })
const CameraWorkout = dynamic(() => import('@/components/screens/camera-workout'), { ssr: false })
const WorkoutSummaryScreen = dynamic(() => import('@/components/screens/workout-summary-screen'), { ssr: false })
const PlansScreen = dynamic(() => import('@/components/screens/plans-screen'), { ssr: false })
const AICoachScreen = dynamic(() => import('@/components/screens/ai-coach-screen'), { ssr: false })
const AIToolsScreen = dynamic(() => import('@/components/screens/ai-tools-screen'), { ssr: false })
const AIInsightsScreen = dynamic(() => import('@/components/screens/ai-insights-screen'), { ssr: false })
const PredictionsScreen = dynamic(() => import('@/components/screens/predictions-screen'), { ssr: false })
const AIWorkoutGenScreen = dynamic(() => import('@/components/screens/ai-workout-gen-screen'), { ssr: false })
const VoiceCoachScreen = dynamic(() => import('@/components/screens/voice-coach-screen'), { ssr: false })
const VideoLibraryScreen = dynamic(() => import('@/components/screens/video-library-screen'), { ssr: false })
const VideoUploadScreen = dynamic(() => import('@/components/screens/video-upload-screen'), { ssr: false })
const VideoPlayerScreen = dynamic(() => import('@/components/screens/video-player-screen'), { ssr: false })
const VideoCompareScreen = dynamic(() => import('@/components/screens/video-compare-screen'), { ssr: false })
const StatsScreen = dynamic(() => import('@/components/screens/stats-screen'), { ssr: false })
const RecordsScreen = dynamic(() => import('@/components/screens/records-screen'), { ssr: false })
const ScoutingScreen = dynamic(() => import('@/components/screens/scouting-screen'), { ssr: false })
const ReactionTrainerScreen = dynamic(() => import('@/components/screens/reaction-trainer-screen'), { ssr: false })
const FeedScreen = dynamic(() => import('@/components/screens/feed-screen'), { ssr: false })
const PostDetailScreen = dynamic(() => import('@/components/screens/post-detail-screen'), { ssr: false })
const FriendsScreen = dynamic(() => import('@/components/screens/friends-screen'), { ssr: false })
const MessagesScreen = dynamic(() => import('@/components/screens/messages-screen'), { ssr: false })
const ConversationScreen = dynamic(() => import('@/components/screens/conversation-screen'), { ssr: false })
const TeamsScreen = dynamic(() => import('@/components/screens/teams-screen'), { ssr: false })
const TeamDetailScreen = dynamic(() => import('@/components/screens/team-detail-screen'), { ssr: false })
const ChallengesScreen = dynamic(() => import('@/components/screens/challenges-screen'), { ssr: false })
const ChallengeDetailScreen = dynamic(() => import('@/components/screens/challenge-detail-screen'), { ssr: false })
const LeaderboardScreen = dynamic(() => import('@/components/screens/leaderboard-screen'), { ssr: false })
const AchievementsScreen = dynamic(() => import('@/components/screens/achievements-screen'), { ssr: false })
const ProfileScreen = dynamic(() => import('@/components/screens/profile-screen'), { ssr: false })
const ProfileOtherScreen = dynamic(() => import('@/components/screens/profile-other-screen'), { ssr: false })
const SettingsScreen = dynamic(() => import('@/components/screens/settings-screen'), { ssr: false })
const NotificationsScreen = dynamic(() => import('@/components/screens/notifications-screen'), { ssr: false })
const PricingScreen = dynamic(() => import('@/components/screens/pricing-screen'), { ssr: false })
const LiveWorkoutScreen = dynamic(() => import('@/components/screens/live-workout-screen'), { ssr: false })
const AdminScreen = dynamic(() => import('@/components/screens/admin-screen'), { ssr: false })
const TermsScreen = dynamic(() => import('@/components/screens/terms-screen'), { ssr: false })
const PrivacyScreen = dynamic(() => import('@/components/screens/privacy-screen'), { ssr: false })

// ── Error Boundary ────────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-5xl" aria-hidden="true">😵</div>
            <h1 className="text-xl font-bold">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">Quelque chose s&apos;est mal passé. Veuillez rafraîchir la page.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="min-h-[44px] px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
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

// ── Screen Registry ───────────────────────────────────────────────────────────

const SCREEN_MAP: Record<string, React.ComponentType> = {
  'home': HomeScreen,
  'train-hub': TrainHubScreen,
  'drill-detail': DrillDetailScreen,
  'camera-workout': CameraWorkout,
  'workout-summary': WorkoutSummaryScreen,
  'plans': PlansScreen,
  'ai-coach': AICoachScreen,
  'ai-tools': AIToolsScreen,
  'ai-insights': AIInsightsScreen,
  'predictions': PredictionsScreen,
  'ai-workout-gen': AIWorkoutGenScreen,
  'voice-coach': VoiceCoachScreen,
  'video-library': VideoLibraryScreen,
  'video-upload': VideoUploadScreen,
  'video-player': VideoPlayerScreen,
  'video-compare': VideoCompareScreen,
  'stats': StatsScreen,
  'records': RecordsScreen,
  'scouting': ScoutingScreen,
  'reaction-trainer': ReactionTrainerScreen,
  'feed': FeedScreen,
  'post-detail': PostDetailScreen,
  'friends': FriendsScreen,
  'messages': MessagesScreen,
  'conversation': ConversationScreen,
  'teams': TeamsScreen,
  'team-detail': TeamDetailScreen,
  'challenges': ChallengesScreen,
  'challenge-detail': ChallengeDetailScreen,
  'leaderboard': LeaderboardScreen,
  'achievements': AchievementsScreen,
  'profile': ProfileScreen,
  'profile-other': ProfileOtherScreen,
  'settings': SettingsScreen,
  'notifications': NotificationsScreen,
  'pricing': PricingScreen,
  'live-workout': LiveWorkoutScreen,
  'admin': AdminScreen,
  'terms': TermsScreen,
  'privacy': PrivacyScreen,
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function Home() {
  const { td } = useTranslation()
  const { loading, isAuthenticated } = useAuth()
  const currentScreen = useAppStore(s => s.currentScreen)
  const navigate = useAppStore(s => s.navigate)
  const selectDrill = useAppStore(s => s.selectDrill)
  const router = useRouter()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  // Deep linking: read URL params and handle callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash.replace('#', '')

    // Checkout callbacks
    if (params.get('checkout') === 'success') {
      toast.success(td('Paiement réussi !', 'Payment successful!'))
      window.history.replaceState({}, '', '/')
      return
    }
    if (params.get('checkout') === 'cancelled') {
      toast.error(td('Paiement annulé.', 'Payment cancelled.'))
      window.history.replaceState({}, '', '/')
      return
    }

    if (!isAuthenticated) return

    const verifyEmailParam = params.get('verify_email')
    const deepParam = params.get('deep')
    const drillId = params.get('drill') || (hash.startsWith('drill/') ? hash.replace('drill/', '') : null)

    if (verifyEmailParam) {
      fetch(`/api/email/verify/${encodeURIComponent(verifyEmailParam)}`)
        .then(r => r.json())
        .then(d => d.message && toast.success?.(d.message))
        .catch(() => {})
        .finally(() => window.history.replaceState({}, '', '/'))
    } else if (deepParam) {
      const [type, id] = deepParam.split('/')
      const screenMap: Record<string, string> = {
        drill: 'drill-detail',
        challenge: 'challenge-detail',
        team: 'team-detail',
        profile: 'profile-other',
        video: 'video-player',
      }
      const screen = screenMap[type]
      if (screen) {
        selectDrill(id || '')
        navigate(screen as Screen, id || '')
      }
      window.history.replaceState({}, '', '/')
    } else if (drillId) {
      selectDrill(drillId)
      navigate('drill-detail', drillId)
      window.history.replaceState({}, '', '/')
    }
  }, [isAuthenticated, navigate, selectDrill, router, td])

  // Redirect to home if authenticated but on landing/auth
  useEffect(() => {
    if (!loading && isAuthenticated && (currentScreen === 'landing' || currentScreen === 'auth')) {
      navigate('home')
    }
  }, [loading, isAuthenticated, currentScreen, navigate])

  // Redirect to landing if not authenticated and not on auth
  useEffect(() => {
    if (!loading && !isAuthenticated && currentScreen !== 'auth') {
      navigate('landing')
    }
  }, [loading, isAuthenticated, currentScreen, navigate])

  if (!mounted || loading) return <LoadingSpinner />

  // ── Unauthenticated screens ──
  if (!isAuthenticated) {
    if (currentScreen === 'auth') {
      return <ErrorBoundary><AuthScreen /></ErrorBoundary>
    }
    return <ErrorBoundary><LandingPage onNavigate={navigate} /></ErrorBoundary>
  }

  // ── Onboarding ──
  if (currentScreen === 'onboarding') {
    return <ErrorBoundary><OnboardingScreen /></ErrorBoundary>
  }

  // ── Authenticated screens (SPA) ──
  const ScreenComponent = SCREEN_MAP[currentScreen]

  if (ScreenComponent) {
    return <ErrorBoundary><ScreenComponent /></ErrorBoundary>
  }

  // Fallback: redirect to home if screen not found
  if (currentScreen !== 'home') {
    navigate('home')
  }

  return <ErrorBoundary><HomeScreen /></ErrorBoundary>
}