'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Brain, TrendingUp, TrendingDown, Minus, Target,
  AlertTriangle, CheckCircle2, Lightbulb, Activity, RefreshCw,
  Trophy, ChevronRight, Mic, Dumbbell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigation } from '@/stores/navigation';
import { useTranslation } from '@/components/providers/language-provider';
import { apiFetch } from '@/lib/utils';
import { BottomNav } from '@/components/shared/bottom-nav';

// ── Types ──────────────────────────────────────────────────────────────────────

interface InsightItem {
  category: string
  title: string
  description: string
  confidence: number
  createdAt?: string
}

interface CategoryPerf {
  category: string
  avgScore: number
  totalReps: number
  trend: number
}

interface InsightsData {
  player: {
    name: string; position: string; level: string; goals: string
    xpLevel: number; xpProgress: number; xp: number
  }
  performance: {
    avgScore: number; recentAvg: number; scoreTrend: number
    totalSessions: number; weekSessions: number; weeklyGoalSessions: number
    weekGoalMet: boolean; shotRate: number; shotTotal: number
  }
  categories: CategoryPerf[]
  form: { overallScore: number; categories: Record<string, number>; date: string } | null
  insights: InsightItem[]
  recentAchievements: Array<{ name: string; icon: string; unlockedAt: string }>
  ragStatus: { documentCount: number; lastSync: string | null }
  generatedAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  shooting: '🎯', ball_handling: '🏀', defense: '🛡️', footwork: '👟',
  finishing: '🪣', conditioning: '💪', agility: '⚡', speed_change: '💨',
  pocket_ball: '✊', shifty: '↔️',
}

const INSIGHT_ICONS: Record<string, typeof TrendingUp> = {
  strength: CheckCircle2,
  weakness: AlertTriangle,
  trend: TrendingUp,
  recommendation: Lightbulb,
}

const INSIGHT_COLORS: Record<string, string> = {
  strength: 'text-green-500',
  weakness: 'text-red-500',
  trend: 'text-orange-500',
  recommendation: 'text-yellow-500',
}

const INSIGHT_BG: Record<string, string> = {
  strength: 'bg-green-500/10',
  weakness: 'bg-red-500/10',
  trend: 'bg-orange-500/10',
  recommendation: 'bg-yellow-500/10',
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AIInsightsScreen() {
  const { t, td } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/ai/insights?refresh=true' : '/api/ai/insights'
      const result = await apiFetch<InsightsData>(url)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : td('Erreur de chargement', 'Loading error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [td])

  useEffect(() => { fetchInsights() }, [fetchInsights])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchInsights(true)
  }

  const handleNavigateTo = (screen: 'voice-coach' | 'predictions' | 'ai-workout-gen') => {
    navigate(screen)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1 rounded-full" onClick={goBack} aria-label={t('action.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold">{td('Insights IA', 'AI Insights')}</h1>
            </div>
          </div>
          <Button
            variant="ghost" size="icon" className="h-9 w-9 rounded-full"
            onClick={handleRefresh} disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <InsightsSkeleton />
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" /> {t('action.retry')}
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { screen: 'voice-coach' as const, icon: '🎙️', label: td('Coach Vocal', 'Voice Coach') },
                  { screen: 'predictions' as const, icon: '📊', label: td('Prédictions', 'Predictions') },
                  { screen: 'ai-workout-gen' as const, icon: '🏋️', label: td('Plan IA', 'AI Plan') },
                ]).map((item) => (
                  <motion.button
                    key={item.screen}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigateTo(item.screen)}
                    className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl hover:border-orange-300 dark:hover:border-orange-700 transition-colors min-h-[80px]"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Performance Overview */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">{td('Performance globale', 'Overall Performance')}</h2>
                    <Badge variant={data.performance.weekGoalMet ? 'default' : 'secondary'} className={data.performance.weekGoalMet ? 'bg-green-500 text-white' : ''}>
                      {data.performance.weekGoalMet ? td('Objectif atteint', 'Goal met') : `${data.performance.weekSessions}/${data.performance.weeklyGoalSessions}`}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{data.performance.avgScore}</p>
                      <p className="text-xs text-muted-foreground">{td('Score moy.', 'Avg. score')}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        {data.performance.scoreTrend > 5 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : data.performance.scoreTrend < -5 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-yellow-500" />
                        )}
                        <p className="text-2xl font-bold">{Math.abs(data.performance.scoreTrend)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{td('Tendance', 'Trend')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.performance.shotRate}%</p>
                      <p className="text-xs text-muted-foreground">{td('Tir réussi', 'Shot made')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* XP Progress */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold">{td('Niveau', 'Level')} {data.player.xpLevel}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{data.player.xpProgress}%</span>
                  </div>
                  <Progress value={data.player.xpProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {data.player.xp} XP — {td('prochain niveau', 'next level')}
                  </p>
                </CardContent>
              </Card>

              {/* Category Performance */}
              {data.categories.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-semibold mb-3">{td('Performance par catégorie', 'Performance by Category')}</h2>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {data.categories.slice(0, 6).map((cat) => (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="text-lg w-7 text-center">{CATEGORY_ICONS[cat.category] || '🏀'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium capitalize truncate">{cat.category.replace('_', ' ')}</span>
                              <div className="flex items-center gap-1">
                                {cat.trend > 3 ? (
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : cat.trend < -3 ? (
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                ) : null}
                                <span className="text-xs font-semibold">{cat.avgScore}</span>
                              </div>
                            </div>
                            <Progress value={cat.avgScore} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Form Analysis */}
              {data.form && (
                <Card>
                  <CardContent className="p-4">
                    <h2 className="text-sm font-semibold mb-3">{td('Dernière analyse de forme', 'Latest form analysis')}</h2>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-16 w-16 rounded-full border-4 border-orange-500 flex items-center justify-center">
                        <span className="text-lg font-bold">{data.form.overallScore}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {Object.entries(data.form.categories).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                            <p className="text-sm font-semibold">{value as number}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Insights */}
              {data.insights.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-4 w-4 text-orange-500" />
                      <h2 className="text-sm font-semibold">{td('Insights IA', 'AI Insights')}</h2>
                    </div>
                    <div className="space-y-2">
                      {data.insights.map((insight, i) => {
                        const Icon = INSIGHT_ICONS[insight.category] || Lightbulb
                        return (
                          <motion.div
                            key={`${insight.title}-${i}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex items-start gap-3 p-3 rounded-xl ${INSIGHT_BG[insight.category] || 'bg-muted'}`}
                          >
                            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${INSIGHT_COLORS[insight.category] || 'text-muted-foreground'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{insight.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] flex-shrink-0">
                              {Math.round(insight.confidence * 100)}%
                            </Badge>
                          </motion.div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Achievements */}
              {data.recentAchievements.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-orange-500" />
                        <h2 className="text-sm font-semibold">{td('Achievements récents', 'Recent achievements')}</h2>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {data.recentAchievements.map((ach, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <span className="text-xl">{ach.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ach.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Actions */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h2 className="text-sm font-semibold mb-2">{td('Actions IA', 'AI Actions')}</h2>
                  {[
                    { label: td("Générer un plan d'entraînement", 'Generate a training plan'), screen: 'ai-workout-gen' as const, icon: Dumbbell },
                    { label: td('Prédictions de progression', 'Progression predictions'), screen: 'predictions' as const, icon: Target },
                    { label: td('Coach vocal en direct', 'Live Voice Coach'), screen: 'voice-coach' as const, icon: Mic },
                  ].map((action) => (
                    <button
                      key={action.screen}
                      onClick={() => handleNavigateTo(action.screen)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <action.icon className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
      <BottomNav />
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}