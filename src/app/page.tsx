'use client'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { useAppStore } from '@/stores/app'
import { useEffect, Component, type ReactNode, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslation } from '@/components/providers/language-provider'

const LoadingSpinner = dynamic(() => import('@/components/screen-transition').then(m => ({ default: m.LoadingSpinner })), { ssr: false })
const LandingPage = dynamic(() => import('@/components/landing/landing-page'), { ssr: false })
const AuthScreen = dynamic(() => import('@/components/screens/auth-screen'), { ssr: false })
const OnboardingScreen = dynamic(() => import('@/components/screens/onboarding-screen'), { ssr: false })

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
            <button onClick={() => window.location.reload()} className="min-h-[44px] px-6 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors">Rafraîchir</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Home() {
  const { td } = useTranslation()
  const { loading, isAuthenticated } = useAuth()
  const currentScreen = useAppStore(s => s.currentScreen)
  const navigate = useAppStore(s => s.navigate)
  const selectDrill = useAppStore(s => s.selectDrill)
  const router = useRouter()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  // Authenticated users get redirected to /home
  useEffect(() => {
    if (!loading && isAuthenticated && currentScreen !== 'auth' && currentScreen !== 'onboarding') {
      router.push('/home')
    }
  }, [loading, isAuthenticated, currentScreen, router])

  // Unauthenticated users not on landing/auth get sent to landing
  useEffect(() => {
    if (!loading && !isAuthenticated && currentScreen !== 'auth' && currentScreen !== 'landing') {
      navigate('landing')
    }
  }, [loading, isAuthenticated, currentScreen, navigate])

  // Deep linking: read URL params and redirect
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
      const pathMap: Record<string, string> = {
        drill: `/train/drill/${id || ''}`,
        challenge: `/challenges/${id || ''}`,
        team: `/teams/${id || ''}`,
        profile: `/profile/${id || ''}`,
        video: `/videos/${id || ''}`,
      }
      const path = pathMap[type]
      if (path) router.push(path)
      if (type === 'drill' && id) selectDrill(id)
      window.history.replaceState({}, '', '/')
    } else if (drillId) {
      selectDrill(drillId)
      router.push(`/train/drill/${drillId}`)
      window.history.replaceState({}, '', '/')
    }
  }, [isAuthenticated, navigate, selectDrill, router, td])

  if (!mounted || loading) return <LoadingSpinner />

  // Landing page for unauthenticated users
  if (!isAuthenticated && currentScreen === 'landing') {
    return <ErrorBoundary><LandingPage onNavigate={navigate} /></ErrorBoundary>
  }

  // Auth screen
  if (!isAuthenticated && currentScreen === 'auth') {
    return <ErrorBoundary><AuthScreen /></ErrorBoundary>
  }

  // Onboarding screen
  if (isAuthenticated && currentScreen === 'onboarding') {
    return <ErrorBoundary><OnboardingScreen /></ErrorBoundary>
  }

  // Fallback: loading state while redirect happens
  return <LoadingSpinner />
}