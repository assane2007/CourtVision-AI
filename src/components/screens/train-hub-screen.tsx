'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAppStore } from '@/stores/app'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { BottomNav } from '@/components/shared/bottom-nav'
import {
  CATEGORIES_LIST,
  DIFFICULTIES,
  DIFFICULTY_BADGE_MAP,
  getCategoryLabel,
} from '@/lib/constants'
import {
  Search,
  Heart,
  Clock,
  Target,
  Filter,
  Plus,
  Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
}

const difficultyDotColor: Record<string, string> = {
  beginner: 'bg-emerald-500',
  intermediate: 'bg-orange-500',
  advanced: 'bg-red-500',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrainHubScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const selectDrill = useAppStore((s) => s.selectDrill)

  const queryClient = useQueryClient()

  // ── Create Dialog State ─────────────────────────────────────────────────

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    nameFr: '',
    category: '',
    difficulty: '',
    descriptionFr: '',
    instructionsFr: '',
    durationSec: 30,
    targetReps: 10,
    icon: '🏀',
  })
  const [createError, setCreateError] = useState('')

  // ── Local Filters ────────────────────────────────────────────────────────

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const [showDifficultyFilter, setShowDifficultyFilter] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // ── Data Fetching ────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<{
    drills: Drill[]
    favoriteIds: string[]
  }>({
    queryKey: ['drills'],
    queryFn: () => fetch('/api/drills').then((r) => r.json()),
  })

  const drills: Drill[] = data?.drills ?? []
  const favoriteIds: string[] = data?.favoriteIds ?? []

  // ── Drill count per category ────────────────────────────────────────────

  const drillCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of drills) {
      counts[d.category] = (counts[d.category] ?? 0) + 1
    }
    return counts
  }, [drills])

  // ── Favorite Mutation ────────────────────────────────────────────────────

  const favoriteMutation = useMutation({
    mutationFn: async (drillId: string) => {
      const res = await fetch('/api/drills/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drillId }),
      })
      if (!res.ok) throw new Error('Failed to toggle favorite')
      return res.json() as Promise<{ favorited: boolean }>
    },
    onMutate: async (drillId) => {
      await queryClient.cancelQueries({ queryKey: ['drills'] })
      const previous = queryClient.getQueryData<{ drills: Drill[]; favoriteIds: string[] }>(['drills'])

      const isFav = favoriteIds.includes(drillId)
      queryClient.setQueryData(['drills'], {
        ...previous,
        favoriteIds: isFav
          ? favoriteIds.filter((id) => id !== drillId)
          : [...favoriteIds, drillId],
      })

      return { previous }
    },
    onError: (_err, _drillId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['drills'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['drills'] })
    },
  })

  // ── Create Drill Mutation ───────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/drills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur lors de la création')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drills'] })
      setCreateOpen(false)
      resetCreateForm()
    },
    onError: (err) => {
      setCreateError(err.message)
    },
  })

  const resetCreateForm = useCallback(() => {
    setCreateForm({
      nameFr: '',
      category: '',
      difficulty: '',
      descriptionFr: '',
      instructionsFr: '',
      durationSec: 30,
      targetReps: 10,
      icon: '🏀',
    })
    setCreateError('')
  }, [])

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open)
      if (!open) {
        resetCreateForm()
      }
    },
    [resetCreateForm],
  )

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredDrills = useMemo(() => {
    let result = drills

    if (activeCategory !== 'all') {
      result = result.filter((d) => d.category === activeCategory)
    }

    if (selectedDifficulties.length > 0) {
      result = result.filter((d) => selectedDifficulties.includes(d.difficulty))
    }

    if (showFavoritesOnly) {
      result = result.filter((d) => favoriteIds.includes(d.id))
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (d) =>
          d.nameFr.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q),
      )
    }

    return result
  }, [drills, activeCategory, selectedDifficulties, search, showFavoritesOnly, favoriteIds])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCardClick = (drill: Drill) => {
    selectDrill(drill.id)
    navigate('drill-detail')
  }

  const handleToggleFavorite = (e: React.MouseEvent, drillId: string) => {
    e.stopPropagation()
    favoriteMutation.mutate(drillId)
  }

  const toggleDifficulty = (key: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key],
    )
  }

  const isCreateFormValid =
    createForm.nameFr.trim() !== '' &&
    createForm.category !== '' &&
    createForm.difficulty !== ''

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                Centre d&apos;Entraînement
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Explorez et maîtrisez chaque exercice
              </p>
            </div>

            {/* Create drill button */}
            <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="shrink-0 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Créer un exercice</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-foreground flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    Créer un exercice
                  </DialogTitle>
                  <DialogDescription>
                    Ajoutez un exercice personnalisé à votre bibliothèque d&apos;entraînement.
                  </DialogDescription>
                </DialogHeader>

                <Separator className="my-1" />

                {createError && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {createError}
                  </p>
                )}

                <div className="grid gap-4 py-2">
                  {/* Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="drill-name">Nom de l&apos;exercice *</Label>
                    <Input
                      id="drill-name"
                      placeholder="Ex: Crossover latéral rapide"
                      value={createForm.nameFr}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, nameFr: e.target.value }))
                      }
                    />
                  </div>

                  {/* Category + Difficulty row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Catégorie *</Label>
                      <Select
                        value={createForm.category}
                        onValueChange={(v) =>
                          setCreateForm((f) => ({ ...f, category: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES_LIST.filter((c) => c.key !== 'all').map(
                            (cat) => (
                              <SelectItem key={cat.key} value={cat.key}>
                                <span className="flex items-center gap-2">
                                  <span>{cat.icon}</span>
                                  {cat.label}
                                </span>
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Difficulté *</Label>
                      <Select
                        value={createForm.difficulty}
                        onValueChange={(v) =>
                          setCreateForm((f) => ({ ...f, difficulty: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTIES.map((d) => (
                            <SelectItem key={d.key} value={d.key}>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${d.color}`}
                                />
                                {d.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid gap-2">
                    <Label htmlFor="drill-desc">Description</Label>
                    <Input
                      id="drill-desc"
                      placeholder="Brève description de l'exercice"
                      value={createForm.descriptionFr}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          descriptionFr: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Instructions */}
                  <div className="grid gap-2">
                    <Label htmlFor="drill-instructions">Instructions</Label>
                    <Textarea
                      id="drill-instructions"
                      placeholder="Étape par étape, décrivez comment réaliser l'exercice..."
                      value={createForm.instructionsFr}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          instructionsFr: e.target.value,
                        }))
                      }
                      rows={4}
                    />
                  </div>

                  {/* Duration + Reps row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="drill-duration">
                        Durée (secondes)
                      </Label>
                      <Input
                        id="drill-duration"
                        type="number"
                        min={10}
                        max={300}
                        value={createForm.durationSec}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            durationSec: Number(e.target.value) || 30,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="drill-reps">Répétitions cible</Label>
                      <Input
                        id="drill-reps"
                        type="number"
                        min={1}
                        max={100}
                        value={createForm.targetReps}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            targetReps: Number(e.target.value) || 10,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Icon picker */}
                  <div className="grid gap-2">
                    <Label htmlFor="drill-icon">Icône (emoji)</Label>
                    <Input
                      id="drill-icon"
                      placeholder="🏀"
                      value={createForm.icon}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, icon: e.target.value }))
                      }
                      className="w-20 text-center text-2xl"
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Collez un emoji pour représenter l&apos;exercice
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    className="rounded-full"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!isCreateFormValid || createMutation.isPending}
                    className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25 gap-2"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Créer l&apos;exercice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search + Filter row */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un exercice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 h-10 rounded-full bg-muted/50 border-border/60 focus:bg-card transition-colors"
            />
          </div>
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="icon"
            className={`h-10 w-10 rounded-full shrink-0 transition-colors ${
              showFavoritesOnly
                ? 'bg-orange-500 hover:bg-orange-600 border-orange-500 text-white'
                : ''
            }`}
            onClick={() => setShowFavoritesOnly((v) => !v)}
            aria-label="Filtrer les favoris"
          >
            <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant={showDifficultyFilter ? 'default' : 'outline'}
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={() => setShowDifficultyFilter((v) => !v)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Difficulty filter (collapsible) */}
        <AnimatePresence>
          {showDifficultyFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-2">
                {DIFFICULTIES.map((diff) => {
                  const isActive = selectedDifficulties.includes(diff.key)
                  return (
                    <button
                      key={diff.key}
                      onClick={() => toggleDifficulty(diff.key)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                        transition-colors border
                        ${
                          isActive
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                        }
                      `}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${diff.color} ${
                          isActive ? 'ring-2 ring-background/40' : ''
                        }`}
                      />
                      {diff.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category pills */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            {CATEGORIES_LIST.map((cat) => {
              const isActive = activeCategory === cat.key
              const count =
                cat.key === 'all'
                  ? drills.length
                  : drillCountsByCategory[cat.key] ?? 0
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    whitespace-nowrap transition-all duration-200 shrink-0 border
                    ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/25'
                        : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                    }
                  `}
                >
                  <span className="text-base leading-none">{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`
                      ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1
                      ${isActive ? 'bg-white/25 text-white' : 'bg-background/70 text-muted-foreground'}
                    `}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 pb-24">
        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-3">
          {filteredDrills.length} exercice
          {filteredDrills.length !== 1 ? 's' : ''} trouvé
          {filteredDrills.length !== 1 ? 's' : ''}
        </p>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-muted" />
                    <div className="h-5 w-20 rounded-full bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredDrills.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <span className="text-5xl mb-4">🔍</span>
            <h3 className="text-lg font-semibold text-foreground">
              Aucun exercice trouvé
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Essayez de modifier vos filtres ou votre recherche
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => {
                setSearch('')
                setActiveCategory('all')
                setSelectedDifficulties([])
              }}
            >
              Réinitialiser les filtres
            </Button>
          </motion.div>
        )}

        {/* Drill grid */}
        {!isLoading && filteredDrills.length > 0 && (
          <motion.div
            key={`${activeCategory}-${selectedDifficulties.join()}-${search}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredDrills.map((drill) => {
                const isFav = favoriteIds.includes(drill.id)
                const diffClass = DIFFICULTY_BADGE_MAP[drill.difficulty] ?? ''
                const dotColor =
                  difficultyDotColor[drill.difficulty] ?? 'bg-muted-foreground'

                return (
                  <motion.div
                    key={drill.id}
                    variants={cardVariants}
                    layout
                    exit="exit"
                  >
                    <Card
                      className="group cursor-pointer relative overflow-hidden rounded-2xl shadow-sm dark:shadow-none dark:border-border/50 hover:shadow-md dark:hover:border-border/80 transition-all duration-200 bg-card bg-gradient-to-br from-card to-card/50"
                      onClick={() => handleCardClick(drill)}
                    >
                      {/* Favorite button */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, drill.id)}
                        className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 dark:bg-background/60 backdrop-blur-sm border border-border dark:border-border/50 shadow-sm hover:scale-110 active:scale-95 transition-transform"
                        aria-label={
                          isFav
                            ? 'Retirer des favoris'
                            : 'Ajouter aux favoris'
                        }
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors duration-200 ${
                            isFav
                              ? 'fill-orange-500 text-orange-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>

                      <CardContent className="p-4 pb-5">
                        {/* Icon */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 17,
                          }}
                          className="h-14 w-14 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 flex items-center justify-center text-3xl mb-3"
                        >
                          {drill.icon}
                        </motion.div>

                        {/* Name */}
                        <h3 className="font-semibold text-foreground text-sm leading-snug pr-8 line-clamp-2">
                          {drill.nameFr}
                        </h3>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-[11px] px-2 py-0 h-5 font-medium"
                          >
                            {getCategoryLabel(drill.category)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[11px] px-2 py-0 h-5 font-medium border-0 ${diffClass}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${dotColor} mr-1.5 shrink-0`}
                            />
                            {drill.difficulty === 'beginner'
                              ? 'Débutant'
                              : drill.difficulty === 'intermediate'
                                ? 'Intermédiaire'
                                : 'Avancé'}
                          </Badge>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {drill.durationSec}s
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {drill.targetReps} reps
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ── Bottom Navigation ───────────────────────────────────────────── */}
      <BottomNav />
    </div>
  )
}