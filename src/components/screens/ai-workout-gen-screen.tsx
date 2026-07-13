'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Dumbbell, Clock, Zap, Plus, Trash2, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, BookOpen, Timer, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { useNavigation } from '@/stores/navigation';
import { useTranslation } from '@/components/providers/language-provider';
import { apiFetch } from '@/lib/utils';
import { BottomNav } from '@/components/shared/bottom-nav';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkoutDrill {
  drillName: string
  sets: number
  repsPerSet: number
  restSec: number
  reasoning: string
  coachingTip: string
}

interface GeneratedWorkout {
  id: string
  title: string
  description: string
  difficulty: string
  durationMin: number
  focusAreas: string[]
  drillIds: string[]
  drills: WorkoutDrill[]
  warmup: string
  cooldown: string
  expectedOutcome: string
  isUsed: boolean
  createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FOCUS_AREAS = [
  { id: 'shooting', label: 'Tir', icon: '🎯' },
  { id: 'ball_handling', label: 'Dribble', icon: '🏀' },
  { id: 'defense', label: 'Défense', icon: '🛡️' },
  { id: 'footwork', label: 'Pieds', icon: '👟' },
  { id: 'finishing', label: 'Finition', icon: '🪣' },
  { id: 'conditioning', label: 'Condition', icon: '💪' },
  { id: 'agility', label: 'Agilité', icon: '⚡' },
  { id: 'speed_change', label: 'Vitesse', icon: '💨' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'none', label: 'Aucun' },
  { id: 'ball', label: 'Ballon' },
  { id: 'cones', label: 'Cônes' },
  { id: 'chair', label: 'Chaise' },
  { id: 'resistance_band', label: 'Bande élastique' },
  { id: 'ladder', label: 'Échelle' },
]

const INTENSITY_OPTIONS = [
  { id: 'low', label: 'Léger' },
  { id: 'medium', label: 'Modéré' },
  { id: 'high', label: 'Intense' },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function AIWorkoutGenScreen() {
  const { t, td } = useTranslation()

  const FOCUS_EN: Record<string, string> = {
    shooting: 'Shooting', ball_handling: 'Ball Handling', defense: 'Defense',
    footwork: 'Footwork', finishing: 'Finishing', conditioning: 'Conditioning',
    agility: 'Agility', speed_change: 'Speed',
  }
  const EQUIP_EN: Record<string, string> = {
    none: 'None', ball: 'Ball', cones: 'Cones', chair: 'Chair',
    resistance_band: 'Resistance Band', ladder: 'Ladder',
  }
  const INTENSITY_EN: Record<string, string> = { low: 'Light', medium: 'Moderate', high: 'Intense' }
  const { goBack } = useNavigation()
  const [savedWorkouts, setSavedWorkouts] = useState<GeneratedWorkout[]>([])
  const [currentWorkout, setCurrentWorkout] = useState<GeneratedWorkout | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'generator' | 'saved'>('generator')

  // Generator form state
  const [duration, setDuration] = useState([30])
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [equipment, setEquipment] = useState<string[]>([])
  const [intensity, setIntensity] = useState('medium')
  const [expandedDrill, setExpandedDrill] = useState<number | null>(null)

  // ── Fetch saved workouts ──────────────────────────────────────────────
  const fetchSaved = useCallback(async () => {
    try {
      const data = await apiFetch<{ workouts: GeneratedWorkout[]; total: number }>('/api/ai/workout/saved')
      setSavedWorkouts(data.workouts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : td('Erreur de chargement', 'Loading error'))
    } finally {
      setLoading(false)
    }
  }, [td])

  useEffect(() => { fetchSaved() }, [fetchSaved])

  // ── Toggle focus area ─────────────────────────────────────────────────
  const toggleFocusArea = (id: string) => {
    setFocusAreas(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id].slice(0, 3)
    )
  }

  const toggleEquipment = (id: string) => {
    setEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id].slice(0, 3)
    )
  }

  // ── Generate workout ──────────────────────────────────────────────────
  const generateWorkout = async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await apiFetch<GeneratedWorkout>('/api/ai/workout/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMin: duration[0],
          focusAreas,
          equipment,
          intensity,
        }),
      })
      setCurrentWorkout(data)
      await fetchSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : td('Erreur de génération', 'Generation error'))
    } finally {
      setGenerating(false)
    }
  }

  // ── Mark as used ──────────────────────────────────────────────────────
  const markAsUsed = async (id: string) => {
    try {
      await apiFetch('/api/ai/workout/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isUsed: true }),
      })
      setSavedWorkouts(prev => prev.map(w => w.id === id ? { ...w, isUsed: true } : w))
      if (currentWorkout?.id === id) {
        setCurrentWorkout(prev => prev ? { ...prev, isUsed: true } : null)
      }
    } catch { /* silent */ }
  }

  // ── Delete workout ────────────────────────────────────────────────────
  const deleteWorkout = async (id: string) => {
    try {
      await apiFetch(`/api/ai/workout/saved?id=${id}`, { method: 'DELETE' })
      setSavedWorkouts(prev => prev.filter(w => w.id !== id))
      if (currentWorkout?.id === id) setCurrentWorkout(null)
    } catch { /* silent */ }
  }

  // ── Load a saved workout into the viewer ──────────────────────────────
  const viewWorkout = (w: GeneratedWorkout) => {
    setCurrentWorkout(w)
    setView('generator')
  }

  const totalEstTime = currentWorkout
    ? currentWorkout.drills.reduce((acc, d) => acc + (d.sets * d.repsPerSet * 3) + (d.sets * d.restSec), 0)
    : 0

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
                <Dumbbell className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold">{td('Plan IA', 'AI Plan')}</h1>
            </div>
          </div>
          {/* Tab toggle */}
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView('generator')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'generator' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              {td('Créer', 'Create')}
            </button>
            <button
              onClick={() => setView('saved')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'saved' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            >
              {td('Sauvegardés', 'Saved')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {view === 'saved' ? (
          /* ── Saved Workouts View ────────────────────────────────────────── */
          loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : savedWorkouts.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-base font-bold mb-1">{td('Aucun plan sauvegardé', 'No saved plans')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{td('Générez votre premier plan IA', 'Generate your first AI plan')}</p>
              <Button onClick={() => setView('generator')} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" /> {td('Créer un plan', 'Create a plan')}
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {savedWorkouts.map((w) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => viewWorkout(w)}>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold truncate">{w.title}</p>
                            {w.isUsed && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{w.durationMin}min</span>
                            <Badge variant="outline" className="text-[10px] h-4">{w.difficulty}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {w.focusAreas.slice(0, 3).map(fa => (
                              <Badge key={fa} variant="secondary" className="text-[10px]">{fa}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => deleteWorkout(w.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {new Date(w.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* ── Generator View ─────────────────────────────────────────────── */
          <>
            {currentWorkout ? (
              /* ── Generated Workout Display ────────────────────────────────── */
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentWorkout.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Workout header */}
                  <Card>
                    <CardContent className="p-4">
                      <h2 className="text-base font-bold mb-1">{currentWorkout.title}</h2>
                      <p className="text-sm text-muted-foreground mb-3">{currentWorkout.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{currentWorkout.durationMin}min</span>
                        <Badge variant="outline" className="text-[10px] h-4">{currentWorkout.difficulty}</Badge>
                        <span className="flex items-center gap-1"><Timer className="h-3 w-3" />~{Math.ceil(totalEstTime / 60)}{td('min estimé', 'min estimated')}</span>
                      </div>
                      {currentWorkout.focusAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentWorkout.focusAreas.map(fa => (
                            <Badge key={fa} variant="secondary" className="text-[10px]">{fa}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Warmup */}
                  {currentWorkout.warmup && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-4 w-4 text-orange-500" />
                          <p className="text-sm font-semibold">{td('Échauffement', 'Warm-up')}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{currentWorkout.warmup}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Drills */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold px-1">{td('Exercices', 'Exercises')} ({currentWorkout.drills.length})</h3>
                    {currentWorkout.drills.map((drill, i) => (
                      <motion.div
                        key={`${drill.drillName}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className="overflow-hidden">
                          <button
                            className="w-full text-left"
                            onClick={() => setExpandedDrill(expandedDrill === i ? null : i)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-bold text-orange-500">{i + 1}</span>
                                  <div>
                                    <p className="text-sm font-semibold">{drill.drillName}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{drill.sets} × {drill.repsPerSet} reps</span>
                                      <span>•</span>
                                      <span>{td('Repos', 'Rest')} {drill.restSec}s</span>
                                    </div>
                                  </div>
                                </div>
                                {expandedDrill === i ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </CardContent>
                          </button>
                          <AnimatePresence>
                            {expandedDrill === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/50 p-4 space-y-2 bg-muted/20">
                                  <div>
                                    <p className="text-xs font-semibold text-orange-500 mb-0.5">{td('Raison du choix', 'Reason for selection')}</p>
                                    <p className="text-xs text-muted-foreground">{drill.reasoning}</p>
                                  </div>
                                  {drill.coachingTip && (
                                    <div>
                                      <p className="text-xs font-semibold mb-0.5">{td('Conseil coaching', 'Coaching tip')}</p>
                                      <p className="text-xs text-muted-foreground">{drill.coachingTip}</p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Cooldown */}
                  {currentWorkout.cooldown && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-4 w-4 text-orange-500" />
                          <p className="text-sm font-semibold">{td('Retour au calme', 'Cool-down')}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{currentWorkout.cooldown}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Expected outcome */}
                  {currentWorkout.expectedOutcome && (
                    <Card className="border-orange-500/20 bg-orange-500/5">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold text-orange-500 mb-1">{td('Résultat attendu', 'Expected Outcome')}</p>
                        <p className="text-sm">{currentWorkout.expectedOutcome}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pb-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCurrentWorkout(null)}
                    >
                      {td('Nouveau plan', 'New plan')}
                    </Button>
                    <Button
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                      onClick={() => markAsUsed(currentWorkout.id)}
                      disabled={currentWorkout.isUsed}
                    >
                      {currentWorkout.isUsed ? (
                        <><CheckCircle2 className="h-4 w-4 mr-2" /> {td('Complété', 'Completed')}</>
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 mr-2" /> {td('Marquer complété', 'Mark completed')}</>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              /* ── Generator Form ───────────────────────────────────────────── */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Duration */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <p className="text-sm font-semibold">{td('Durée', 'Duration')}</p>
                      </div>
                      <span className="text-lg font-bold text-orange-500">{duration[0]} min</span>
                    </div>
                    <Slider
                      value={duration}
                      onValueChange={setDuration}
                      min={15}
                      max={90}
                      step={15}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>15min</span><span>45min</span><span>90min</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Focus Areas */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold mb-3">{td('Zones de focus (max 3)', 'Focus Areas (max 3)')}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {FOCUS_AREAS.map(area => {
                        const isSelected = focusAreas.includes(area.id)
                        return (
                          <button
                            key={area.id}
                            onClick={() => toggleFocusArea(area.id)}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-colors min-h-[60px] ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500/10' :'border-border hover:border-orange-300 dark:hover:border-orange-700'
                            }`}
                          >
                            <span className="text-xl">{area.icon}</span>
                            <span className="text-[10px] font-medium">{td(area.label, FOCUS_EN[area.id] ?? area.label)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Equipment */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold mb-3">{td('Équipement disponible', 'Available Equipment')}</p>
                    <div className="flex flex-wrap gap-2">
                      {EQUIPMENT_OPTIONS.map(eq => {
                        const isSelected = equipment.includes(eq.id)
                        return (
                          <button
                            key={eq.id}
                            onClick={() => toggleEquipment(eq.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500/10 text-orange-600' :'border-border hover:border-orange-300'
                            }`}
                          >
                            {td(eq.label, EQUIP_EN[eq.id] ?? eq.label)}
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Intensity */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold mb-3">{td('Intensité', 'Intensity')}</p>
                    <div className="flex gap-2">
                      {INTENSITY_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setIntensity(opt.id)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                            intensity === opt.id
                              ? 'border-orange-500 bg-orange-500/10 text-orange-600' :'border-border hover:border-orange-300'
                          }`}
                        >
                          {td(opt.label, INTENSITY_EN[opt.id] ?? opt.label)}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Error */}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <p className="text-xs text-destructive">{error}</p>
                  </motion.div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={generateWorkout}
                  disabled={generating}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-sm font-semibold"
                >
                  {generating ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> {td('Génération en cours...', 'Generating...')}</>
                  ) : (
                    <><Dumbbell className="h-4 w-4 mr-2" /> {td('Générer le plan IA', 'Generate AI Plan')}</>
                  )}
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