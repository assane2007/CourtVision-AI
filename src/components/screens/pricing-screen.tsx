'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, X, Crown, Zap, Star, ArrowLeft, Loader2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/stores/app'
import { containerVariants, itemVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface PricingTier {
  id: string
  name: string
  price: string
  priceLabel: string
  description: string
  icon: React.ReactNode
  features: { text: string; included: boolean }[]
  cta: string
  ctaVariant: 'default' | 'outline' | 'disabled'
  popular?: boolean
  elite?: boolean
}

// ── Tiers ──────────────────────────────────────────────────────────────────

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0',
    priceLabel: '/mois',
    description: 'Pour découvrir CourtVision AI',
    icon: <Zap className="h-5 w-5" />,
    features: [
      { text: '3 séances/semaine', included: true },
      { text: 'Exercices de base', included: true },
      { text: 'Statistiques simples', included: true },
      { text: 'Coach IA (limité)', included: true },
      { text: 'Scouting complet', included: false },
      { text: 'Entraînement de réaction', included: false },
      { text: 'Export de données', included: false },
    ],
    cta: "C'est ton plan actuel",
    ctaVariant: 'disabled',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9,99',
    priceLabel: '/mois',
    description: 'Pour les joueurs sérieux',
    icon: <Star className="h-5 w-5" />,
    popular: true,
    features: [
      { text: 'Séances illimitées', included: true },
      { text: 'Tous les exercices', included: true },
      { text: 'Scouting complet', included: true },
      { text: 'Coach IA illimité', included: true },
      { text: 'Entraînement de réaction', included: true },
      { text: 'Export de données', included: true },
      { text: 'Plans personnalisés IA', included: false },
    ],
    cta: "S'abonner",
    ctaVariant: 'default',
  },
  {
    id: 'elite',
    name: 'Élite',
    price: '19,99',
    priceLabel: '/mois',
    description: 'L\'expérience ultime',
    icon: <Crown className="h-5 w-5" />,
    elite: true,
    features: [
      { text: 'Tout dans Pro', included: true },
      { text: 'Plans d\'entraînement personnalisés IA', included: true },
      { text: 'Analyse vidéo avancée', included: true },
      { text: 'Support prioritaire', included: true },
      { text: 'Badge "Élite" sur le classement', included: true },
    ],
    cta: "S'abonner",
    ctaVariant: 'outline',
  },
]

// ── Component ──────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const goBack = useAppStore((s) => s.goBack)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return

    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erreur réseau' }))
        throw new Error(body.error || 'Erreur lors de la création de la session')
      }

      const data = await res.json()

      // In production, this would redirect to Stripe Checkout
      // For now, show success toast
      toast.success(`Redirection vers le paiement ${planId === 'pro' ? 'Pro' : 'Élite'}…`)

      // Mock: simulate redirect to success
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du paiement')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg md:max-w-4xl lg:max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Choisis ton plan</h1>
        </div>
      </header>

      <main className="max-w-lg md:max-w-4xl lg:max-w-5xl mx-auto px-4 pt-6 pb-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Intro */}
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Débloque tout ton potentiel
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              Passe au niveau supérieur avec des outils professionnels
              pour améliorer ton jeu.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
          >
            {TIERS.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <Card
                  className={cn(
                    'relative flex flex-col h-full',
                    tier.popular && 'border-orange-500 border-2 shadow-lg shadow-orange-500/10 md:-translate-y-2',
                    tier.elite && 'border-border',
                    !tier.popular && !tier.elite && 'border-border',
                  )}
                >
                  {/* Popular Badge */}
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white border-orange-500 px-3 py-0.5 text-xs font-bold">
                      POPULAIRE
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-2">
                    <div
                      className={cn(
                        'mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl',
                        tier.popular && 'bg-orange-500/15 text-orange-500',
                        tier.elite && 'bg-amber-500/15 text-amber-500',
                        !tier.popular && !tier.elite && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {tier.icon}
                    </div>
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 text-center">
                    <div className="mb-6">
                      <span className="text-4xl font-bold tracking-tight">{tier.price}€</span>
                      <span className="text-muted-foreground text-sm ml-1">{tier.priceLabel}</span>
                    </div>

                    <div className="space-y-3 text-left">
                      {tier.features.map((feature) => (
                        <div key={feature.text} className="flex items-start gap-2.5">
                          {feature.included ? (
                            <Check className={cn(
                              'h-4 w-4 shrink-0 mt-0.5',
                              tier.popular ? 'text-orange-500' : 'text-emerald-500',
                            )} />
                          ) : (
                            <X className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/40" />
                          )}
                          <span className={cn(
                            'text-sm',
                            feature.included ? 'text-foreground' : 'text-muted-foreground/60',
                          )}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4">
                    {tier.ctaVariant === 'disabled' ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        {tier.cta}
                      </Button>
                    ) : tier.ctaVariant === 'default' ? (
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={loadingPlan !== null}
                      >
                        {loadingPlan === tier.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        {tier.cta}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10 font-semibold"
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={loadingPlan !== null}
                      >
                        {loadingPlan === tier.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        {tier.cta}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Cancel link for already subscribed users */}
          <motion.div variants={itemVariants} className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Déjà abonné ?{' '}
              <button
                type="button"
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                onClick={() => toast.info('La gestion de l\'abonnement sera bientôt disponible.')}
              >
                Annuler ou gérer mon abonnement
              </button>
            </p>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              Annulation à tout moment
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              Paiement sécurisé
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              Sans engagement
            </span>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}