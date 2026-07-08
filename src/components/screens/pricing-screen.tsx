'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, X, Crown, Zap, Star, ArrowLeft, Loader2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useAppStore } from '@/stores/app'
import { containerVariants, itemVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import type { TranslationKey } from '@/lib/i18n'

// ── Types ──────────────────────────────────────────────────────────────────

interface PricingTier {
  id: string
  name: string
  price: string
  annualPrice: string
  priceLabel: string
  description: string
  icon: React.ReactNode
  features: { text: string; included: boolean }[]
  cta: string
  ctaVariant: 'default' | 'outline' | 'disabled'
  popular?: boolean
  elite?: boolean
}

// ── Tiers (built inside component for i18n) ──────────────────────────────

function getTiers(t: (key: TranslationKey, params?: Record<string, string>) => string): PricingTier[] {
  return [
    {
      id: 'free',
      name: t('pricing.freeTierName'),
      price: '0',
      annualPrice: '0',
      priceLabel: t('pricing.perMonth'),
      description: t('pricing.freeTierDesc'),
      icon: <Zap className="h-5 w-5" />,
      features: [
        { text: '3 ' + t('common.sessions') + '/' + t('common.weekly'), included: true },
        { text: t('pricing.feature.basicExercises'), included: true },
        { text: t('pricing.feature.simpleStats'), included: true },
        { text: t('pricing.feature.limitedCoach'), included: true },
        { text: t('pricing.feature.fullScouting'), included: false },
        { text: t('pricing.feature.reactionTraining'), included: false },
        { text: t('pricing.feature.dataExport'), included: false },
      ],
      cta: t('pricing.currentPlan'),
      ctaVariant: 'disabled',
    },
    {
      id: 'pro',
      name: t('pricing.pro'),
      price: '9,99',
      annualPrice: '99,90',
      priceLabel: t('pricing.perMonth'),
      description: t('pricing.proTierDesc'),
      icon: <Star className="h-5 w-5" />,
      popular: true,
      features: [
        { text: t('pricing.feature.unlimitedSessions'), included: true },
        { text: t('pricing.feature.allExercises'), included: true },
        { text: t('pricing.feature.fullScouting'), included: true },
        { text: t('pricing.feature.unlimitedCoach'), included: true },
        { text: t('pricing.feature.reactionTraining'), included: true },
        { text: t('pricing.feature.dataExport'), included: true },
        { text: t('pricing.feature.customPlans'), included: false },
      ],
      cta: t('pricing.subscribe'),
      ctaVariant: 'default',
    },
    {
      id: 'elite',
      name: t('pricing.elite'),
      price: '19,99',
      annualPrice: '199,90',
      priceLabel: t('pricing.perMonth'),
      description: t('pricing.eliteTierDesc'),
      icon: <Crown className="h-5 w-5" />,
      elite: true,
      features: [
        { text: t('pricing.feature.allInPro'), included: true },
        { text: t('pricing.feature.customPlans'), included: true },
        { text: t('pricing.feature.advancedVideo'), included: true },
        { text: t('pricing.feature.prioritySupport'), included: true },
        { text: t('pricing.feature.eliteBadge'), included: true },
      ],
      cta: t('pricing.subscribe'),
      ctaVariant: 'outline',
    },
  ]
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const { t } = useTranslation()
  const goBack = useAppStore((s) => s.goBack)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [annualBilling, setAnnualBilling] = useState(false)
  const TIERS = getTiers(t)

  const handleSubscribe = async (tierId: string) => {
    if (tierId === 'free') return

    const interval = annualBilling ? 'annual' : 'monthly'
    const priceId = `${tierId}_${interval}`

    setLoadingPlan(tierId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: t('settings.exportNetworkError') }))
        throw new Error(body.error || t('pricing.sessionError'))
      }

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(t('pricing.paymentError'))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('pricing.paymentError'))
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
          <h1 className="text-lg font-bold">{t('pricing.title')}</h1>
        </div>
      </header>

      <main className="max-w-lg md:max-w-4xl lg:max-w-5xl mx-auto px-4 pt-6 pb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Intro */}
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t('pricing.title')}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              {t('pricing.subtitle')}
            </p>
          </motion.div>

          {/* Billing interval toggle */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-3">
            <span className={cn('text-sm font-medium', !annualBilling && 'text-foreground', annualBilling && 'text-muted-foreground')}>
              Mensuel
            </span>
            <button
              type="button"
              onClick={() => setAnnualBilling((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
                annualBilling ? 'bg-orange-500' : 'bg-muted',
              )}
              role="switch"
              aria-checked={annualBilling}
            >
              <span
                className={cn(
                  'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                  annualBilling ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
            <span className={cn('text-sm font-medium', annualBilling && 'text-foreground', !annualBilling && 'text-muted-foreground')}>
              Annuel
              <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                -17%
              </span>
            </span>
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
                      {t('pricing.popular')}
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
                      {annualBilling && tier.id !== 'free' ? (
                        <>
                          <span className="text-4xl font-bold tracking-tight">{tier.annualPrice}€</span>
                          <span className="text-muted-foreground text-sm ml-1">/an</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            soit {tier.price}€ {t('pricing.perMonth')}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold tracking-tight">{tier.price}€</span>
                          <span className="text-muted-foreground text-sm ml-1">{tier.priceLabel}</span>
                        </>
                      )}
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
              {t('pricing.alreadySubscribed')}{' '}
              <button
                type="button"
                className="text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                onClick={() => toast.info(t('pricing.subscriptionSoon'))}
              >
                {t('pricing.manageSubscription')}
              </button>
            </p>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              {t('pricing.noCommitment')}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              {t('pricing.securePayment')}
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              {t('pricing.noCommitment')}
            </span>
          </motion.div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  )
}