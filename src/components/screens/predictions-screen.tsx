'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Target, TrendingUp, ShieldAlert, Activity,
  RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/stores/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch } from '@/lib/utils'
import { BottomNav } from '@/components/shared/bottom-nav'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PredictionItem {
  id: string
  type: string
  predictedAt: string | null
  predictedValue: number | null
  confidence: number
  factors: string[]
  recommendation: string
  createdAt: string
}

interface PredictionsData {
  predictions: PredictionItem[]
  byType: Record<string, Array<{ id: string; predictedAt: string | null; predictedValue: number | null; confidence: number; createdAt: string }>>
  total: number
}

// ── Config ─────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Target; color: string; bgColor: string }> = {
  next_level: { label: 'Prochain Niveau', icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  injury_risk: { label: 'Risque Blessure', icon: ShieldAlert, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  performance: { label: 'Performance', icon: Activity, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  plateau: { label: 'Plateau', icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PredictionsScreen() {
  const { t } = useTranslation()
  const { goBack } = useNavigation()
  const [data, setData] = useState<PredictionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchPredictions = useCallback(async () => {
    try {
      const result = await apiFetch<PredictionsData>('/api/ai/predictions/history')
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPredictions() }, [fetchPredictions])

  const generatePredictions = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      await apiFetch('/api/ai/predictions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      })
      await fetchPredictions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération')
    } finally {
      setGenerating(false)
    }
  }, [fetchPredictions])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const getLatestByType = (type: string): PredictionItem | null => {
    return data?.predictions.find(p => p.type === type) || null
  }

  const getHistoryByType = (type: string): PredictionItem[] => {
    return data?.predictions.filter(p => p.type === type) || []
  }

  const formatConfidence = (c: number) => {
    const pct = Math.round(c * 100)
    if (pct >= 80) return { label: 'Élevée', color: 'text-green-500' }
    if (pct >= 50) return { label: 'Moyenne', color: 'text-yellow-500' }
    return { label: 'Faible', color: 'text-red-500' }
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
                <Target className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold">Prédictions IA</h1>
            </div>
          </div>
          <Button
            size="sm"
            onClick={generatePredictions}
            disabled={generating}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Générer
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : error && !data ? (
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPredictions}>
                <RefreshCw className="h-4 w-4 mr-2" /> {t('action.retry')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Info Banner */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
            >
              <Info className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Les prédictions sont basées sur vos données d&apos;entraînement et mises à jour par IA. Cliquez sur &quot;Générer&quot; pour créer de nouvelles prédictions.
              </p>
            </motion.div>

            {/* Prediction Cards by Type */}
            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              const latest = getLatestByType(type)
              const history = getHistoryByType(type)
              const isExpanded = expandedId === type
              const conf = latest ? formatConfidence(latest.confidence) : null

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Object.keys(TYPE_CONFIG).indexOf(type) * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <button
                      className="w-full text-left"
                      onClick={() => toggleExpand(type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                              <config.icon className={`h-5 w-5 ${config.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{config.label}</p>
                              {latest ? (
                                <p className="text-xs text-muted-foreground">
                                  {latest.predictedValue !== null ? `Valeur: ${latest.predictedValue}` : 'En attente'}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">Non généré</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {conf && (
                              <Badge variant="outline" className={`text-[10px] ${conf.color}`}>
                                {conf.label}
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Confidence bar */}
                        {latest && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-muted-foreground">Confiance</span>
                              <span className="text-[10px] font-medium">{Math.round(latest.confidence * 100)}%</span>
                            </div>
                            <Progress value={latest.confidence * 100} className="h-1.5" />
                          </div>
                        )}
                      </CardContent>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/50 p-4 space-y-3 bg-muted/20">
                            {latest ? (
                              <>
                                {/* Recommendation */}
                                <div>
                                  <p className="text-xs font-semibold mb-1">Recommandation</p>
                                  <p className="text-sm text-muted-foreground">{latest.recommendation}</p>
                                </div>

                                {/* Factors */}
                                {latest.factors.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold mb-1.5">Facteurs</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {latest.factors.map((f, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px]">
                                          {f}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Predicted date */}
                                {latest.predictedAt && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Prédit: {new Date(latest.predictedAt).toLocaleDateString('fr-FR')}
                                  </p>
                                )}

                                {/* History chart (simple sparkline) */}
                                {history.length >= 2 && (
                                  <div>
                                    <p className="text-xs font-semibold mb-2">Historique des valeurs</p>
                                    <div className="h-12 flex items-end gap-1">
                                      {history.slice(0, 10).reverse().map((h, i) => (
                                        <div key={h.id} className="flex-1 flex flex-col items-center gap-0.5">
                                          <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max(4, (h.predictedValue ?? 50))}%` }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`w-full rounded-sm ${config.bgColor.replace('/10', '/30')}`}
                                            style={{ minHeight: 4 }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Cliquez sur &quot;Générer&quot; pour créer cette prédiction
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })}

            {/* Error after generate */}
            {error && data && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
                <p className="text-xs text-destructive">{error}</p>
              </motion.div>
            )}

            {/* Empty State */}
            {data && data.total === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-base font-bold mb-1">Aucune prédiction</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Générez vos premières prédictions pour voir votre progression
                </p>
                <Button onClick={generatePredictions} disabled={generating} className="bg-orange-500 hover:bg-orange-600">
                  <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                  Générer les prédictions
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}