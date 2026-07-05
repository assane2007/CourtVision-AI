'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/stores/app'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Heart,
  Clock,
  Target,
  Filter,
  Home,
  BarChart3,
  User,
  Dumbbell,
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

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all', label: 'Tous', icon: '🏀' },
  { key: 'pocket_ball', label: 'Balle de Poche', icon: '👝' },
  { key: 'shifty', label: 'Démarquage', icon: '↔️' },
  { key: 'ball_handling', label: 'Maniement', icon: '🤹' },
  { key: 'speed_change', label: 'Changement de Vitesse', icon: '⚡' },
  { key: 'defense', label: 'Défense', icon: '🛡️' },
  { key: 'shooting', label: 'Tir', icon: '🎯' },
  { key: 'footwork', label: 'Placement', icon: '🦶' },
  { key: 'finishing', label: 'Finition', icon: '🏅' },
  { key: 'conditioning', label: 'Condition', icon: '💪' },
] as const

const DIFFICULTIES = [
  { key: 'beginner', label: 'Débutant', color: 'bg-green-500' },
  { key: 'intermediate', label: 'Intermédiaire', color: 'bg-orange-500' },
  { key: 'advanced', label: 'Avancé', color: 'bg-red-500' },
] as const

const DIFFICULTY_BADGE_MAP: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  intermediate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
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
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrainHubScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const selectDrill = useAppStore((s) => s.selectDrill)

  const queryClient = useQueryClient()

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

      // Optimistic update
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

  // ── Category label lookup ────────────────────────────────────────────────

  const getCategoryLabel = (key: string): string => {
    return CATEGORIES.find((c) => c.key === key)?.label ?? key
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Centre d&apos;Entraînement
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Explorez et maîtrisez chaque exercice
          </p>
        </div>

        {/* Search + Filter row */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un exercice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 h-10 rounded-full border-gray-200 bg-gray-50 focus:bg-white transition-colors"
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
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }
                      `}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${diff.color} ${
                          isActive ? 'ring-2 ring-white/40' : ''
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
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key
              const count = cat.key === 'all' ? drills.length : drillCountsByCategory[cat.key] ?? 0
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
          {filteredDrills.length} exercice{filteredDrills.length !== 1 ? 's' : ''} trouvé
          {filteredDrills.length !== 1 ? 's' : ''}
        </p>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-gray-200" />
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-gray-200" />
                    <div className="h-5 w-20 rounded-full bg-gray-200" />
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
            <h3 className="text-lg font-semibold text-gray-900">
              Aucun exercice trouvé
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Essayez de modifier vos filtres ou votre recherche
            </p>
            <Button
              variant="outline"
              className="mt-4"
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
                const diffClass =
                  DIFFICULTY_BADGE_MAP[drill.difficulty] ?? ''

                return (
                  <motion.div
                    key={drill.id}
                    variants={cardVariants}
                    layout
                    exit="exit"
                  >
                    <Card
                      className="group cursor-pointer relative overflow-hidden rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
                      onClick={() => handleCardClick(drill)}
                    >
                      {/* Favorite button */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, drill.id)}
                        className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm hover:scale-110 active:scale-95 transition-transform"
                        aria-label={
                          isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'
                        }
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors duration-200 ${
                            isFav
                              ? 'fill-orange-500 text-orange-500'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>

                      <CardContent className="p-4 pb-5">
                        {/* Icon */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          className="h-14 w-14 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-3xl mb-3"
                        >
                          {drill.icon}
                        </motion.div>

                        {/* Name */}
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug pr-8 line-clamp-2">
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center justify-around h-16 px-2">
          <BottomTab
            icon={<Home className="h-5 w-5" />}
            label="Accueil"
            active={false}
            onClick={() => navigate('home')}
          />
          <BottomTab
            icon={<Dumbbell className="h-5 w-5" />}
            label="Entraînement"
            active
            onClick={() => navigate('train-hub')}
          />
          <BottomTab
            icon={<BarChart3 className="h-5 w-5" />}
            label="Stats"
            active={false}
            onClick={() => navigate('stats')}
          />
          <BottomTab
            icon={<User className="h-5 w-5" />}
            label="Profil"
            active={false}
            onClick={() => navigate('profile')}
          />
        </div>
      </nav>
    </div>
  )
}

// ─── Bottom Tab Sub-component ────────────────────────────────────────────────

function BottomTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-0.5 flex-1 h-full
        transition-colors duration-200 rounded-lg
        ${active ? 'text-orange-500' : 'text-muted-foreground hover:text-foreground'}
      `}
      aria-current={active ? 'page' : undefined}
    >
      <div className="relative">
        {icon}
        {active && (
          <motion.div
            layoutId="bottomTabIndicator"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-5 rounded-full bg-orange-500"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </div>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  )
}