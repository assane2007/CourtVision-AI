'use client';
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/utils';
import { getCategoryLabel, CATEGORIES_LIST } from '@/lib/constants';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Target,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Drill {
  id: string
  name: string
  nameFr: string
  category: string
  difficulty: string
  description: string
  descriptionFr: string
  instructions: string
  instructionsFr: string
  durationSec: number
  targetReps: number
  icon: string
}

interface PlanDrillEdit {
  drillId: string
  nameFr: string
  icon: string
  category: string
  durationSec: number
  defaultTargetReps: number
  targetReps: number
  targetSets: number
  restSec: number
}

interface PlanDrillExisting {
  id: string
  order: number
  targetReps: number
  targetSets: number
  restSec: number
  drill: {
    id: string
    nameFr: string
    icon: string
    category: string
    difficulty?: string
    durationSec?: number
    targetReps?: number
  }
}

interface PlanForEdit {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  drills: PlanDrillExisting[]
}

interface CreatePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editPlan?: PlanForEdit | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REST_OPTIONS = [10, 15, 30, 60] as const
const SET_OPTIONS = [1, 2, 3, 4, 5] as const

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return sec > 0 ? `${h}h ${m}min ${sec}s` : `${h}h ${m}min`
  }
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CreatePlanDialog({ open, onOpenChange, editPlan }: CreatePlanDialogProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)

  // Step 1 state — initialized from editPlan (component remounts via key)
  const [name, setName] = useState(editPlan?.name ?? '')
  const [description, setDescription] = useState(editPlan?.description ?? '')
  const [isPublic, setIsPublic] = useState(editPlan?.isPublic ?? false)

  // Step 2 state
  const [search, setSearch] = useState('')
  const [selectedDrills, setSelectedDrills] = useState<PlanDrillEdit[]>(() =>
    editPlan
      ? editPlan.drills.map((pd) => ({
          drillId: pd.drill.id,
          nameFr: pd.drill.nameFr,
          icon: pd.drill.icon,
          category: pd.drill.category,
          durationSec: pd.drill.durationSec ?? 30,
          defaultTargetReps: pd.drill.targetReps ?? 10,
          targetReps: pd.targetReps,
          targetSets: pd.targetSets,
          restSec: pd.restSec,
        }))
      : [],
  )
  const [categoryFilter, setCategoryFilter] = useState('all')

  // ── Fetch drills ──────────────────────────────────────────────────────
  const { data: drillsData, isLoading: drillsLoading } = useQuery<{ drills: Drill[] }>({
    queryKey: ['drills'],
    queryFn: () => apiFetch<{ drills: Drill[] }>('/api/drills'),
    enabled: open,
  })

  const allDrills = useMemo(() => drillsData?.drills ?? [], [drillsData])

  // ── Filtered drills for selection ─────────────────────────────────────
  const filteredDrills = useMemo(() => {
    let drills = allDrills
    if (categoryFilter !== 'all') {
      drills = drills.filter((d) => d.category === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      drills = drills.filter(
        (d) =>
          d.nameFr.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      )
    }
    return drills
  }, [allDrills, categoryFilter, search])

  // ── Check if a drill is selected ──────────────────────────────────────
  const isSelected = useCallback(
    (drillId: string) => selectedDrills.some((d) => d.drillId === drillId),
    [selectedDrills],
  )

  // ── Toggle drill selection ────────────────────────────────────────────
  const toggleDrill = useCallback((drill: Drill) => {
    setSelectedDrills((prev) => {
      if (prev.some((d) => d.drillId === drill.id)) {
        return prev.filter((d) => d.drillId !== drill.id)
      }
      return [
        ...prev,
        {
          drillId: drill.id,
          nameFr: drill.nameFr,
          icon: drill.icon,
          category: drill.category,
          durationSec: drill.durationSec,
          defaultTargetReps: drill.targetReps,
          targetReps: drill.targetReps,
          targetSets: 1,
          restSec: 15,
        },
      ]
    })
  }, [])

  // ── Update selected drill settings ────────────────────────────────────
  const updateSelectedDrill = useCallback(
    (drillId: string, field: keyof PlanDrillEdit, value: number) => {
      setSelectedDrills((prev) =>
        prev.map((d) =>
          d.drillId === drillId ? { ...d, [field]: value } : d,
        ),
      )
    },
    [],
  )

  // ── Remove selected drill ─────────────────────────────────────────────
  const removeSelectedDrill = useCallback((drillId: string) => {
    setSelectedDrills((prev) => prev.filter((d) => d.drillId !== drillId))
  }, [])

  // ── Move drill up/down (reorder) ──────────────────────────────────────
  const moveDrill = useCallback((index: number, direction: 'up' | 'down') => {
    setSelectedDrills((prev) => {
      const arr = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= arr.length) return prev
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return arr
    })
  }, [])

  // ── Computed totals ───────────────────────────────────────────────────
  const totals = useMemo(() => {
    let totalReps = 0
    let totalSec = 0
    for (const d of selectedDrills) {
      totalReps += d.targetReps * d.targetSets
      totalSec += d.durationSec * d.targetSets + d.restSec * (d.targetSets - 1)
    }
    return { totalReps, totalSec }
  }, [selectedDrills])

  // ── Create / Update mutation ──────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || undefined,
        isPublic,
        drillIds: selectedDrills.map((d) => d.drillId),
      }
      if (editPlan) {
        return apiFetch<{ plan: unknown }>(`/api/plans/${editPlan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      return apiFetch<{ plan: unknown }>('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success(editPlan ? 'Plan modifié !' : 'Plan créé !', {
        description: editPlan
          ? `"${name}" a été mis à jour.`
          : `"${name}" est prêt à être lancé.`,
      })
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error('Erreur', { description: (err as Error).message })
    },
  })

  // ── Validation ────────────────────────────────────────────────────────
  const canProceed = step === 1 ? name.trim().length >= 2 : true
  const canSave = name.trim().length >= 2 && selectedDrills.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] sm:h-[85vh] rounded-t-2xl flex flex-col p-0">
        {/* ── Step indicator ─────────────────────────────────────────────── */}
        <SheetHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <SheetTitle className="text-base">
              {editPlan ? 'Modifier le plan' : 'Nouveau plan'}
            </SheetTitle>
            {open && (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      s <= step ? 'w-6 bg-orange-500' : 'w-1.5 bg-muted'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* ── Step Content ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ─── Step 1: Basic Info ──────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-5 space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="plan-name" className="text-sm font-medium">
                    Nom du plan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="plan-name"
                    placeholder="Ex: Entraînement du matin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">{name.length}/100</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-desc" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="plan-desc"
                    placeholder="Décrivez votre plan d'entraînement..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label htmlFor="plan-public" className="text-sm font-medium">
                      Plan public
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Les autres joueurs pourront voir ce plan
                    </p>
                  </div>
                  <Switch
                    id="plan-public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
              </motion.div>
            )}

            {/* ─── Step 2: Select Drills ──────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                {/* Search */}
                <div className="px-4 pt-4 pb-2 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un exercice..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 pl-9"
                    />
                  </div>

                  {/* Category filter pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                    {CATEGORIES_LIST.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setCategoryFilter(cat.key)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                          categoryFilter === cat.key
                            ? 'bg-orange-500 text-white' :'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drill grid */}
                <div className="px-4 pb-3">
                  {drillsLoading ? (
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {filteredDrills.map((drill) => {
                        const selected = isSelected(drill.id)
                        return (
                          <motion.button
                            key={drill.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => toggleDrill(drill)}
                            className={`relative flex items-center gap-2 p-2.5 rounded-xl border text-left transition-colors ${
                              selected
                                ? 'border-orange-500 bg-orange-500/10' :'border-border hover:border-orange-500/40 hover:bg-muted/50'
                            }`}
                          >
                            {selected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                            <span className="text-xl">{drill.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{drill.nameFr}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {getCategoryLabel(drill.category)}
                              </p>
                            </div>
                          </motion.button>
                        )
                      })}
                      {filteredDrills.length === 0 && !drillsLoading && (
                        <div className="col-span-2 text-center py-6 text-sm text-muted-foreground">
                          Aucun exercice trouvé
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Selected drills config */}
                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">
                      Exercices sélectionnés ({selectedDrills.length})
                    </p>
                    {selectedDrills.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(totals.totalSec)} · {totals.totalReps} rép.
                      </span>
                    )}
                  </div>

                  {selectedDrills.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Sélectionnez des exercices ci-dessus
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <AnimatePresence mode="popLayout">
                        {selectedDrills.map((sd, idx) => (
                          <motion.div
                            key={sd.drillId}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="border rounded-xl p-2.5 space-y-2"
                          >
                            {/* Drill name + move / remove */}
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-muted-foreground w-5 text-center tabular-nums">
                                {idx + 1}
                              </span>
                              <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                <span className="text-sm">{sd.icon}</span>
                              </div>
                              <p className="text-sm font-medium truncate flex-1">{sd.nameFr}</p>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => moveDrill(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                                  aria-label="Monter"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5 rotate-90" />
                                </button>
                                <button
                                  onClick={() => moveDrill(idx, 'down')}
                                  disabled={idx === selectedDrills.length - 1}
                                  className="p-1 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                                  aria-label="Descendre"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5 -rotate-90" />
                                </button>
                                <button
                                  onClick={() => removeSelectedDrill(sd.drillId)}
                                  className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                  aria-label="Retirer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Settings row */}
                            <div className="flex items-center gap-2 pl-7">
                              {/* Reps */}
                              <div className="flex items-center gap-1 flex-1">
                                <Target className="h-3 w-3 text-muted-foreground shrink-0" />
                                <Input
                                  type="number"
                                  min={1}
                                  max={200}
                                  value={sd.targetReps}
                                  onChange={(e) =>
                                    updateSelectedDrill(
                                      sd.drillId,
                                      'targetReps',
                                      Math.max(1, Math.min(200, parseInt(e.target.value) || 1)),
                                    )
                                  }
                                  className="h-7 w-16 text-xs px-1.5"
                                />
                              </div>
                              {/* Sets */}
                              <Select
                                value={String(sd.targetSets)}
                                onValueChange={(v) =>
                                  updateSelectedDrill(sd.drillId, 'targetSets', parseInt(v))
                                }
                              >
                                <SelectTrigger className="h-7 w-[70px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SET_OPTIONS.map((n) => (
                                    <SelectItem key={n} value={String(n)} className="text-xs">
                                      {n} série{n > 1 ? 's' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {/* Rest */}
                              <Select
                                value={String(sd.restSec)}
                                onValueChange={(v) =>
                                  updateSelectedDrill(sd.drillId, 'restSec', parseInt(v))
                                }
                              >
                                <SelectTrigger className="h-7 w-[70px] text-xs">
                                  <Clock className="h-3 w-3 mr-0.5" />
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {REST_OPTIONS.map((r) => (
                                    <SelectItem key={r} value={String(r)} className="text-xs">
                                      {r}s
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── Step 3: Review & Save ──────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-5 space-y-4"
              >
                {/* Plan name */}
                <div>
                  <h3 className="text-lg font-bold">{name}</h3>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  )}
                  {isPublic && (
                    <Badge variant="outline" className="mt-2 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Public
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{selectedDrills.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      Exercices
                    </p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{totals.totalReps}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      Répétitions
                    </p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{formatDuration(totals.totalSec)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      Durée
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Ordered drill list */}
                <div>
                  <p className="text-sm font-semibold mb-2">Ordre des exercices</p>
                  <div className="space-y-1.5">
                    {selectedDrills.map((sd, idx) => (
                      <div
                        key={sd.drillId}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-xs font-bold text-muted-foreground w-4 text-center tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="text-base">{sd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sd.nameFr}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {sd.targetReps} rép. × {sd.targetSets} série{sd.targetSets > 1 ? 's' : ''}
                            {sd.restSec > 0 && ` · ${sd.restSec}s repos`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {formatDuration(sd.durationSec * sd.targetSets + sd.restSec * (sd.targetSets - 1))}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer / Navigation ─────────────────────────────────────────── */}
        <div className="border-t bg-background px-4 py-3 space-y-2">
          {step < 3 && (
            <>
              {step === 2 && selectedDrills.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {selectedDrills.length} exercice{selectedDrills.length > 1 ? 's' : ''} ·{' '}
                  {totals.totalReps} rép. · {formatDuration(totals.totalSec)}
                </p>
              )}
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep((s) => s - 1)}
                    className="h-11 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Retour
                  </Button>
                )}
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed}
                  className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                >
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </>
          )}
          {step === 3 && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
            >
              {saveMutation.isPending ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {editPlan ? 'Modifier le plan' : 'Créer le plan'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}