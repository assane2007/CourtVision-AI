'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { signOut } from 'next-auth/react'
import {
  Pencil,
  X,
  LogOut,
  ChevronRight,
  Calendar,
  Activity,
  Flame,
  TrendingUp,
  Sparkles,
  Trophy,
  User,
  Settings,
  Shield,
  History,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/stores/app'
import { BottomNav } from '@/components/shared/bottom-nav'
import { cn, apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { getLevelInfo, getLevelColor, getLevelBgColor } from '@/lib/xp'
import { toast } from 'sonner'

interface PlayerData {
  id?: string
  name?: string
  email?: string
  position?: string
  level?: string
  goals?: string
  createdAt?: string
  xp?: number
  xpLevel?: number
}

interface StatsData {
  totalSessions?: number
  totalReps?: number
  avgScore?: number
  weekSessions?: number
}

interface XpLogEntry {
  id: string
  amount: number
  source: string
  description: string
  createdAt: string
}

interface XpHistoryResponse {
  xp: number
  level: number
  logs: XpLogEntry[]
}

// ── Source icon mapping ─────────────────────────────────────────────
const SOURCE_ICONS: Record<string, string> = {
  workout: '🎯',
  streak: '🔥',
  achievement: '🏅',
  challenge: '🎯',
  bonus: '⭐',
  rep: '💪',
}

// ── Profile-specific labels (extends shared constants) ──────────────
const positionLabels: Record<string, string> = {
  guard: 'Meneur / Arrière',
  forward: 'Ailier',
  center: 'Pivot',
  all_around: 'Polyvalent',
}

const levelLabels: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  elite: 'Élite',
}

const goalsLabels: Record<string, string> = {
  shooting: 'Tir',
  ball_handling: 'Maniement de Balle',
  defense: 'Défense',
  conditioning: 'Condition Physique',
  general: 'Général',
}

// ── Component ───────────────────────────────────────────────────────
export function ProfileScreen() {
  const { navigate } = useAppStore()
  const queryClient = useQueryClient()
  // ── Fetch player ────────────────────────────────────────────────
  const { data: player, isLoading } = useQuery<PlayerData>({
    queryKey: ['player'],
    queryFn: () => apiFetch<PlayerData>('/api/player'),
  })

  // ── Fetch XP history ────────────────────────────────────────────
  const { data: xpHistory, isLoading: xpHistoryLoading } = useQuery<XpHistoryResponse>({
    queryKey: ['xp-history'],
    queryFn: () => apiFetch<XpHistoryResponse>('/api/xp?limit=5'),
    staleTime: 1000 * 60 * 2,
  })

  // ── Fetch stats for summary ─────────────────────────────────────
  const { data: stats } = useQuery<StatsData>({
    queryKey: ['stats'],
    queryFn: () => apiFetch<StatsData>('/api/stats'),
  })

  // ── Derived XP info ─────────────────────────────────────────────
  const levelInfo = player?.xp != null ? getLevelInfo(player.xp) : null

  // ── Derived initial form data from player ─────────────────────
  const initialFormData = useMemo(
    () => ({
      name: player?.name ?? '',
      position: player?.position ?? 'guard',
      level: player?.level ?? 'beginner',
      goals: player?.goals ?? 'general',
    }),
    [player],
  )

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    level: '',
    goals: '',
  })

  // ── Update mutation ─────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiFetch('/api/player', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player'] })
      setIsEditing(false)
      toast.success('Profil mis à jour', {
        description: 'Vos informations ont été enregistrées.',
      })
    },
    onError: () => {
      toast.error('Erreur', { description: 'Impossible de mettre à jour le profil.' })
    },
  })

  // ── Sign out handler ────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut({ redirect: false })
    navigate('auth')
  }

  // ── Loading skeleton ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-5 w-28" />
          </div>
        </header>
        <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-5 space-y-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <BottomNav />
      </div>
    )
  }

  const initials = (player?.name ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background pb-24">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.header
          variants={itemVariants}
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
        >
          <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2.5">
              <User className="h-5 w-5 text-orange-500" />
              <h1 className="text-base font-semibold">Mon Profil</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false)
                } else {
                  setFormData(initialFormData)
                  setIsEditing(true)
                }
              }}
              className="text-xs gap-1.5 rounded-lg"
            >
              {isEditing ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Annuler
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </>
              )}
            </Button>
          </div>
        </motion.header>

        <div className="px-4 pt-5 space-y-5">
          {/* ── Profile Card ──────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-lg dark:shadow-md overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold truncate">{player?.name}</h2>
                    <p className="text-sm text-muted-foreground truncate">{player?.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {positionLabels[player?.position ?? ''] ?? player?.position}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {levelLabels[player?.level ?? ''] ?? player?.level}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Goal tag */}
                {player?.goals && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">Objectif :</span>
                    <span className="font-medium">
                      {goalsLabels[player.goals] ?? player.goals}
                    </span>
                  </div>
                )}

                {/* Member since */}
                {player?.createdAt && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Membre depuis{' '}
                      {new Date(player.createdAt).toLocaleDateString('fr-FR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Scouting Report Entry ─────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <button
              type="button"
              onClick={() => navigate('scouting')}
              className="w-full text-left"
            >
              <Card className="border-0 dark:border-border/50 shadow-lg dark:shadow-md overflow-hidden hover:shadow-xl transition-shadow group cursor-pointer">
                <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500" />
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/20 flex-shrink-0">
                    <Target className="h-7 w-7 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      Mon ADN de Joueur
                      <Sparkles className="h-4 w-4 text-orange-500" />
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Rapport de scout IA
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                </CardContent>
              </Card>
            </button>
          </motion.div>

          {/* ── XP & Level Section ───────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-lg dark:shadow-md overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500" />
              <CardContent className="p-6">
                {levelInfo ? (
                  <div className="flex flex-col items-center text-center gap-4">
                    {/* Large Level Badge */}
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          'flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-lg',
                          getLevelBgColor(levelInfo.currentLevel),
                        )}
                      >
                        <Shield className={cn('h-8 w-8', getLevelColor(levelInfo.currentLevel))} />
                      </div>
                      <div>
                        <p className={cn('text-2xl font-extrabold', getLevelColor(levelInfo.currentLevel))}>
                          {levelInfo.isMaxLevel ? 'NIVEAU MAX' : `Niveau ${levelInfo.currentLevel}`}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground">
                          {levelInfo.levelTitle}
                        </p>
                      </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="w-full space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">XP</span>
                        {levelInfo.isMaxLevel ? (
                          <span className="font-semibold text-orange-500">NIVEAU MAX ATTEINT</span>
                        ) : (
                          <span className="tabular-nums text-muted-foreground">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {levelInfo.xpInCurrentLevel}
                            </span>
                            {' / '}
                            {levelInfo.xpNeededForNextLevel} XP
                          </span>
                        )}
                      </div>
                      <Progress
                        value={levelInfo.progress * 100}
                        className="h-3 bg-orange-500/20 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-orange-500 [&>[data-slot=progress-indicator]]:to-amber-500"
                      />
                      {!levelInfo.isMaxLevel && (
                        <p className="text-[11px] text-muted-foreground">
                          {levelInfo.xpNeededForNextLevel! - levelInfo.xpInCurrentLevel} XP restant avant le niveau {levelInfo.currentLevel + 1}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Total : {levelInfo.currentXp} XP
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="h-16 w-16 rounded-2xl" />
                    <Skeleton className="h-7 w-36" />
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Edit Form (animated) ──────────────────────────────── */}
          <AnimatePresence mode="wait">
            {isEditing && (
              <motion.div
                key="edit-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' as const }}
                className="overflow-hidden"
              >
                <Card className="border-0 dark:border-border/50 shadow-md">
                  <CardHeader className="pb-3 px-5 pt-5">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-orange-500" />
                      Modifier le Profil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium">
                        Nom complet
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Votre nom"
                        className="h-10"
                      />
                    </div>

                    {/* Position */}
                    <div className="space-y-1.5">
                      <Label htmlFor="position" className="text-xs font-medium">
                        Position
                      </Label>
                      <Select
                        value={formData.position}
                        onValueChange={(v) => setFormData((p) => ({ ...p, position: v }))}
                      >
                        <SelectTrigger id="position" className="h-10">
                          <SelectValue placeholder="Choisir une position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guard">Meneur / Arrière</SelectItem>
                          <SelectItem value="forward">Ailier</SelectItem>
                          <SelectItem value="center">Pivot</SelectItem>
                          <SelectItem value="all_around">Polyvalent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Level */}
                    <div className="space-y-1.5">
                      <Label htmlFor="level" className="text-xs font-medium">
                        Niveau
                      </Label>
                      <Select
                        value={formData.level}
                        onValueChange={(v) => setFormData((p) => ({ ...p, level: v }))}
                      >
                        <SelectTrigger id="level" className="h-10">
                          <SelectValue placeholder="Choisir un niveau" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Débutant</SelectItem>
                          <SelectItem value="intermediate">Intermédiaire</SelectItem>
                          <SelectItem value="advanced">Avancé</SelectItem>
                          <SelectItem value="elite">Élite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Goals */}
                    <div className="space-y-1.5">
                      <Label htmlFor="goals" className="text-xs font-medium">
                        Objectif d&apos;entraînement
                      </Label>
                      <Select
                        value={formData.goals}
                        onValueChange={(v) => setFormData((p) => ({ ...p, goals: v }))}
                      >
                        <SelectTrigger id="goals" className="h-10">
                          <SelectValue placeholder="Choisir un objectif" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Général</SelectItem>
                          <SelectItem value="shooting">Tir</SelectItem>
                          <SelectItem value="ball_handling">Maniement de Balle</SelectItem>
                          <SelectItem value="defense">Défense</SelectItem>
                          <SelectItem value="conditioning">Condition Physique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Save button */}
                    <Button
                      onClick={() => updateMutation.mutate(formData)}
                      disabled={updateMutation.isPending}
                      className="w-full h-11 bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20"
                    >
                      {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── XP History Section ────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md overflow-hidden">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-orange-500" />
                  Historique XP
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {xpHistoryLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-10" />
                      </div>
                    ))}
                  </div>
                ) : xpHistory?.logs && xpHistory.logs.length > 0 ? (
                  <div className="space-y-1">
                    <div className="max-h-96 overflow-y-auto">
                      {xpHistory.logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-sm flex-shrink-0">
                            {SOURCE_ICONS[log.source] ?? '⭐'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{log.description}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(log.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-orange-500 flex-shrink-0">
                            +{log.amount} XP
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate('settings')}
                      className="w-full flex items-center justify-center gap-1.5 pt-2 text-xs text-orange-500 font-medium hover:text-orange-600 transition-colors"
                    >
                      <span>Voir tout</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Aucun gain d&apos;XP pour le moment
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Complétez des exercices pour gagner de l&apos;XP !
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Stats Summary ─────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Résumé Rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-orange-500/10 dark:bg-orange-500/15">
                    <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats?.totalSessions ?? 0}</p>
                    <p className="text-[11px] text-muted-foreground">Séances</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15">
                    <Activity className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats?.totalReps ?? 0}</p>
                    <p className="text-[11px] text-muted-foreground">Répétitions</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-sky-500/10 dark:bg-sky-500/15">
                    <TrendingUp className="h-5 w-5 text-sky-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats?.avgScore ? `${stats.avgScore}` : '—'}</p>
                    <p className="text-[11px] text-muted-foreground">Score Moy.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Mes Succès ───────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => navigate('achievements')}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium group-hover:text-orange-600 transition-colors">
                      Mes Succès
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Voir vos badges et accomplissements
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Settings Link ────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => navigate('settings')}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium group-hover:text-orange-600 transition-colors">
                      Paramètres
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Notifications, son, préférences
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Account Actions ───────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <LogOut className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300">
                      Déconnexion
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Se déconnecter de votre compte
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── App Info ──────────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <div className="text-center py-4 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CV</span>
                </div>
                <span className="text-sm font-semibold">CourtVision AI</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Entraînement Basketball Intelligent
              </p>
              <Badge variant="outline" className="text-[10px] font-normal">
                Version 1.0.0
              </Badge>
            </div>
          </motion.div>

          <div className="h-2" />
        </div>
      </motion.div>

      <BottomNav />
    </div>
  )
}
export default ProfileScreen