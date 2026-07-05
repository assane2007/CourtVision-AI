'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type PlanDrillQueueItem } from '@/stores/app'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BottomNav } from '@/components/shared/bottom-nav'
import { CreatePlanDialog } from '@/components/dialogs/create-plan-dialog'
import { apiFetch } from '@/lib/utils'
import {
  ClipboardList,
  Plus,
  Play,
  Pencil,
  Trash2,
  Clock,
  Target,
  Dumbbell,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanDrill {
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

interface Plan {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  drills: PlanDrill[]
  _count?: { drills: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimateTotalTime(drills: PlanDrill[]): number {
  if (!drills.length) return 0
  let total = 0
  for (const pd of drills) {
    const dur = pd.drill.durationSec ?? 30
    total += dur * pd.targetSets
    total += pd.restSec * (pd.targetSets - 1)
  }
  return total
}

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PlansScreen() {
  const { navigate, selectDrill, startPlanExecution } = useAppStore()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [dialogKey, setDialogKey] = useState(0)

  // ── Fetch plans ───────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ['plans'],
    queryFn: () => apiFetch<{ plans: Plan[] }>('/api/plans'),
  })

  const plans = data?.plans ?? []

  // ── Delete mutation ──────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan supprimé', { description: 'Le plan a été supprimé avec succès.' })
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Erreur', { description: (err as Error).message })
    },
  })

  // ── Play plan ────────────────────────────────────────────────────────
  const handlePlay = useCallback((plan: Plan) => {
    if (!plan.drills.length) {
      toast.error('Plan vide', { description: 'Ce plan ne contient aucun exercice.' })
      return
    }

    const queue: PlanDrillQueueItem[] = plan.drills.map((pd) => ({
      drillId: pd.drill.id,
      nameFr: pd.drill.nameFr,
      icon: pd.drill.icon,
      category: pd.drill.category,
      targetReps: pd.targetReps ?? pd.drill.targetReps ?? 10,
      targetSets: pd.targetSets,
      restSec: pd.restSec,
      durationSec: pd.drill.durationSec ?? 30,
    }))

    startPlanExecution(plan.id, queue)
    selectDrill(queue[0].drillId)
    navigate('camera-workout')
  }, [startPlanExecution, selectDrill, navigate])

  // ── Edit plan ────────────────────────────────────────────────────────
  const handleEdit = useCallback((plan: Plan) => {
    setEditingPlan(plan)
    setDialogKey((k) => k + 1)
    setCreateOpen(true)
  }, [])

  const handleDialogClose = useCallback(() => {
    setCreateOpen(false)
    setEditingPlan(null)
  }, [])

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-orange-500" />
            </div>
            <h1 className="text-lg font-bold">Mes Plans</h1>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {isLoading ? (
          // Skeleton loading
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : plans.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
              <ClipboardList className="h-10 w-10 text-orange-500/60" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Aucun plan</h2>
            <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
              Créez votre premier plan d&apos;entraînement pour combiner plusieurs exercices en une seule session.
            </p>
            <Button
              onClick={() => { setDialogKey((k) => k + 1); setCreateOpen(true) }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un plan
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {plans.map((plan, idx) => {
              const totalTime = estimateTotalTime(plan.drills)
              const totalReps = plan.drills.reduce(
                (sum, pd) => sum + (pd.targetReps ?? 10) * pd.targetSets,
                0,
              )

              return (
                <motion.div
                  key={plan.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                >
                  <Card className="overflow-hidden border-border/60">
                    <CardContent className="p-4">
                      {/* Plan header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base truncate">{plan.name}</h3>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {plan.description}
                            </p>
                          )}
                        </div>
                        {plan.isPublic && (
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Public
                          </Badge>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Dumbbell className="h-3.5 w-3.5" />
                          <span>{plan.drills.length} exercice{plan.drills.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDuration(totalTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Target className="h-3.5 w-3.5" />
                          <span>{totalReps} rép.</span>
                        </div>
                      </div>

                      {/* Drill preview pills */}
                      {plan.drills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {plan.drills.slice(0, 5).map((pd) => (
                            <Badge
                              key={pd.id}
                              variant="secondary"
                              className="text-xs px-2 py-0.5 font-normal"
                            >
                              <span className="mr-1">{pd.drill.icon}</span>
                              {pd.drill.nameFr}
                            </Badge>
                          ))}
                          {plan.drills.length > 5 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                              +{plan.drills.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handlePlay(plan)}
                          className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl"
                          disabled={plan.drills.length === 0}
                        >
                          <Play className="h-4 w-4 mr-1.5" />
                          Lancer
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-xl"
                          onClick={() => handleEdit(plan)}
                          aria-label="Modifier le plan"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                          onClick={() => setDeleteTarget(plan)}
                          aria-label="Supprimer le plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <motion.div
          className="fixed bottom-20 right-4 z-30"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
        >
          <Button
            onClick={() => { setDialogKey((k) => k + 1); setCreateOpen(true) }}
            className="h-14 w-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
            size="icon"
            aria-label="Créer un plan"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </motion.div>
      )}

      {/* ── Create/Edit Dialog ──────────────────────────────────────────── */}
      <CreatePlanDialog
        key={dialogKey}
        open={createOpen}
        onOpenChange={handleDialogClose}
        editPlan={editingPlan}
      />

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce plan ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le plan &quot;{deleteTarget?.name}&quot; sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bottom Nav ──────────────────────────────────────────────────── */}
      <BottomNav />
    </div>
  )
}