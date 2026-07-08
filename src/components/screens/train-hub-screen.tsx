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
import { apiFetch } from '@/lib/utils'
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
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/components/providers/language-provider'

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

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
}

// ─── Accent normalization for fuzzy search ─────────────────────────────
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrainHubScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const selectDrill = useAppStore((s) => s.selectDrill)
  const { t, tc, td } = useTranslation()

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
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // ── Data Fetching (cursor-based pagination) ─────────────────────────────

  const [allDrills, setAllDrills] = useState<Drill[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [_totalDrills, setTotalDrills] = useState<number>(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery<{
    drills: Drill[]
    favoriteIds: string[]
    nextCursor: string | null
    total?: number
  }>({
    queryKey: ['drills'],
    queryFn: () => apiFetch('/api/drills?limit=20'),
  })

  // Sync first page data into local state
  useMemo(() => {
    if (data) {
      setAllDrills(data.drills)
      setNextCursor(data.nextCursor)
      setTotalDrills(data.total ?? 0)
    }
  }, [data])

  const drills = allDrills
  const favoriteIds = useMemo(() => data?.favoriteIds ?? [] as string[], [data])

  // ── Drill count per category ────────────────────────────────────────────

  const drillCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of drills) {
      counts[d.category] = (counts[d.category] ?? 0) + 1
    }
    return counts
  }, [drills])

  // ── Load More ───────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const res = await apiFetch<{
        drills: Drill[]
        nextCursor: string | null
      }>(`/api/drills?limit=20&cursor=${encodeURIComponent(nextCursor)}`)
      setAllDrills((prev) => [...prev, ...res.drills])
      setNextCursor(res.nextCursor)
    } catch {
      // silently fail — user can retry
    } finally {
      setIsLoadingMore(false)
    }
  }, [nextCursor, isLoadingMore])

  // ── Favorite Mutation ────────────────────────────────────────────────────

  const favoriteMutation = useMutation({
    mutationFn: async (drillId: string) => {
      return apiFetch<{ favorited: boolean }>('/api/drills/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drillId }),
      })
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
      return apiFetch('/api/drills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
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

    if (selectedDifficulty) {
      result = result.filter((d) => d.difficulty === selectedDifficulty)
    }

    if (showFavoritesOnly) {
      result = result.filter((d) => favoriteIds.includes(d.id))
    }

    if (search.trim()) {
      const q = normalize(search.trim())
      const words = q.split(/\s+/)
      result = result.filter((d) => {
        const searchable = [
          d.nameFr,
          d.name,
          getCategoryLabel(d.category),
          d.category,
          d.descriptionFr,
          d.description,
          DIFFICULTY_LABELS[d.difficulty] ?? d.difficulty,
        ]
          .map(normalize)
          .join(' ')
        return words.every((w) => searchable.includes(w))
      })
    }

    return result
  }, [drills, activeCategory, selectedDifficulty, search, showFavoritesOnly, favoriteIds])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCardClick = (drill: Drill) => {
    selectDrill(drill.id)
    navigate('drill-detail')
  }

  const handleToggleFavorite = (e: React.MouseEvent, drillId: string) => {
    e.stopPropagation()
    favoriteMutation.mutate(drillId)
  }

  // Active filter count (excluding search text)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeCategory !== 'all') count++
    if (selectedDifficulty) count++
    if (showFavoritesOnly) count++
    return count
  }, [activeCategory, selectedDifficulty, showFavoritesOnly])

  const clearAllFilters = useCallback(() => {
    setSearch('')
    setActiveCategory('all')
    setSelectedDifficulty('')
    setShowFavoritesOnly(false)
  }, [])

  const isCreateFormValid =
    createForm.nameFr.trim() !== '' &&
    createForm.category !== '' &&
    createForm.difficulty !== ''

  // ── Render ───────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          {t('action.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 pt-4 pb-3">
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
                  <span className="hidden sm:inline">{t('train.createExercise')}</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-foreground flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    {t('train.createExercise')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('train.createDesc')}
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
                    <Label htmlFor="drill-name">{t('train.drillName')}</Label>
                    <Input
                      id="drill-name"
                      placeholder={t('train.drillNamePlaceholder')}
                      value={createForm.nameFr}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, nameFr: e.target.value }))
                      }
                    />
                  </div>

                  {/* Category + Difficulty row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>{t('train.category')}</Label>
                      <Select
                        value={createForm.category}
                        onValueChange={(v) =>
                          setCreateForm((f) => ({ ...f, category: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('train.choose')} />
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
                      <Label>{t('train.difficulty')}</Label>
                      <Select
                        value={createForm.difficulty}
                        onValueChange={(v) =>
                          setCreateForm((f) => ({ ...f, difficulty: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('train.choose')} />
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
                    <Label htmlFor="drill-desc">{t('train.description')}</Label>
                    <Input
                      id="drill-desc"
                      placeholder={t('train.descriptionPlaceholder')}
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
                    <Label htmlFor="drill-instructions">{t('train.instructions')}</Label>
                    <Textarea
                      id="drill-instructions"
                      placeholder={t('train.instructionsPlaceholder')}
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
                      <Label htmlFor="drill-reps">{t('train.targetReps')}</Label>
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
                    <Label htmlFor="drill-icon">{t('train.icon')}</Label>
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
                    {t('action.cancel')}
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
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 pb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('train.searchPlaceholder')}
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
            aria-label={t('train.filterFavorites')}
          >
            <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          </Button>
          {activeFilterCount > 0 && (
            <Badge className="h-6 min-w-[24px] flex items-center justify-center rounded-full bg-orange-500 text-white text-[11px] font-bold px-1.5">
              {activeFilterCount}
            </Badge>
          )}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
              aria-label={t('train.resetFilters')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Difficulty filter buttons */}
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 pb-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1" role="tablist" aria-label={t('train.filterByDifficulty')}>
            <button
              onClick={() => setSelectedDifficulty('')}
              role="tab"
              aria-selected={!selectedDifficulty}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                whitespace-nowrap transition-all duration-200 shrink-0 border
                ${
                  !selectedDifficulty
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                }
              `}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              {tc('all')}
            </button>
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.key}
                role="tab"
                aria-selected={selectedDifficulty === diff.key}
                onClick={() =>
                  setSelectedDifficulty((prev) =>
                    prev === diff.key ? '' : diff.key,
                  )
                }
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                  whitespace-nowrap transition-all duration-200 shrink-0 border
                  ${
                    selectedDifficulty === diff.key
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                  }
                `}
              >
                <span className={`h-2 w-2 rounded-full ${diff.color}`} />
                {td(diff.key)}
              </button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 pb-3">
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
                  <span>{tc(cat.key)}</span>
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
      <main className="flex-1 max-w-4xl lg:max-w-6xl w-full mx-auto px-4 py-4 pb-24">
        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-3">
          {filteredDrills.length} exercice
          {filteredDrills.length !== 1 ? 's' : ''} trouvé
          {filteredDrills.length !== 1 ? 's' : ''}
        </p>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              onClick={clearAllFilters}
            >
              {t('train.resetFilters')}
            </Button>
          </motion.div>
        )}

        {/* Drill grid */}
        {!isLoading && filteredDrills.length > 0 && (
          <motion.div
            key={`${activeCategory}-${selectedDifficulty}-${search}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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
                      role="button"
                      tabIndex={0}
                      aria-label={drill.nameFr}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleCardClick(drill)
                        }
                      }}
                      className="group cursor-pointer relative overflow-hidden rounded-2xl shadow-sm dark:shadow-none dark:border-border/50 hover:shadow-md dark:hover:border-border/80 transition-all duration-200 bg-card bg-gradient-to-br from-card to-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                      onClick={() => handleCardClick(drill)}
                    >
                      {/* Favorite button */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, drill.id)}
                        className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 dark:bg-background/60 backdrop-blur-sm border border-border dark:border-border/50 shadow-sm hover:scale-110 active:scale-95 transition-transform"
                        aria-label={
                          isFav
                            ? t('train.removeFavorite')
                            : t('train.addFavorite')
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
                            {tc(drill.category)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[11px] px-2 py-0 h-5 font-medium border-0 ${diffClass}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${dotColor} mr-1.5 shrink-0`}
                            />
                            {td(drill.difficulty)}
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

        {/* Load More button */}
        {!isLoading && filteredDrills.length > 0 && nextCursor && (
          <div className="flex justify-center pt-6 pb-2">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="rounded-full px-6 gap-2"
            >
              {isLoadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t('action.loadMore')}
            </Button>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ───────────────────────────────────────────── */}
      <BottomNav />
    </div>
  )
}