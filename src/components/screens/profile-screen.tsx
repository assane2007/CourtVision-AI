'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/supabase-auth-provider'
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
  Trash2,
  Loader2,
  Camera,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/stores/app'
import { BottomNav } from '@/components/shared/bottom-nav'
import { cn, apiFetch, formatLocaleDate } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { containerVariants, itemVariants } from '@/lib/animations'
import { getLevelInfo, getLevelColor, getLevelBgColor } from '@/lib/xp'
import { toast } from 'sonner'
import { useTranslation } from '@/components/providers/language-provider'
import type { TranslationKey } from '@/lib/i18n'

interface PlayerData {
  id?: string
  name?: string
  email?: string
  avatar?: string | null
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
  guard: 'profile.positionGuard',
  forward: 'profile.positionForward',
  center: 'profile.positionCenter',
  all_around: 'profile.positionAllAround',
}

const levelLabels: Record<string, string> = {
  beginner: 'profile.levelBeginner',
  intermediate: 'profile.levelIntermediate',
  advanced: 'profile.levelAdvanced',
  elite: 'profile.levelElite',
}

const goalsLabels: Record<string, string> = {
  shooting: 'profile.goalShooting',
  ball_handling: 'profile.goalBallHandling',
  defense: 'profile.goalDefense',
  conditioning: 'profile.goalConditioning',
  general: 'profile.goalGeneral',
}

// ── Component ───────────────────────────────────────────────────────
export function ProfileScreen() {
  const { t, td, language } = useTranslation()
  const navigate = useAppStore(s => s.navigate)
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
      toast.success(t('profile.profileUpdated'), {
        description: t('profile.profileUpdatedDesc'),
      })
    },
    onError: () => {
      toast.error(t('profile.updateError'))
    },
  })

  // ── Delete account state ────────────────────────────────────────
  // ── Avatar upload ─────────────────────────────────────────────
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: td('Erreur serveur', 'Server error') }))
        throw new Error(err.error || `Erreur ${res.status}`)
      }
      return res.json() as Promise<{ url: string; path: string }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player'] })
      toast.success(td('Photo de profil mise à jour !', 'Profile photo updated!'))
    },
    onError: (err: Error) => {
      toast.error(td('Erreur avatar', 'Avatar error'), { description: err.message })
    },
    onSettled: () => {
      setIsUploadingAvatar(false)
    },
  })

  const handleAvatarClick = useCallback(() => {
    avatarInputRef.current?.click()
  }, [])

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      toast.error(td('Format non supporté. Utilisez JPEG, PNG, GIF ou WebP.', 'Unsupported format. Use JPEG, PNG, GIF, or WebP.'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(td('Image trop volumineuse (max 5 Mo)', 'Image too large (max 5 MB)'))
      return
    }

    setIsUploadingAvatar(true)
    uploadAvatarMutation.mutate(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [uploadAvatarMutation, td])

  // ── Delete account state ────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // ── Delete account mutation ─────────────────────────────────────
  const deleteAccount = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: t('settings.exportNetworkError') }))
        throw new Error(body.error || t('settings.deleteAccountError'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('profile.accountDeleted'), {
        description: t('profile.accountDeletedDesc'),
      })
      setDeleteDialogOpen(false)
      signOut().then(() => navigate('auth'))
    },
    onError: (err: Error) => {
      toast.error(td('Erreur', 'Error'), { description: err.message })
    },
  })

  const handleDeleteAccount = (e: React.MouseEvent) => {
    e.preventDefault()
    deleteAccount.mutate()
  }

  const { signOut } = useAuth()

  // ── Sign out handler ────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut()
    navigate('auth')
  }

  // ── Loading skeleton ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center h-14 px-4">
            <Skeleton className="h-5 w-28" />
          </div>
        </header>
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-5 space-y-4">
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
        className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.header
          variants={itemVariants}
          className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
        >
          <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2.5">
              <User className="h-5 w-5 text-orange-500" />
              <h1 className="text-base font-semibold">{t('nav.profile')}</h1>
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
                  {t('action.cancel')}
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  {td('Modifier', 'Edit')}
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
                  {/* Avatar — clickable to upload */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                    aria-label={td('Changer la photo de profil', 'Change profile photo')}
                  />
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-md flex-shrink-0 overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-70 transition-opacity"
                    aria-label={td('Changer la photo de profil', 'Change profile photo')}
                  >
                    {player?.avatar ? (
                      <Avatar className="h-full w-full rounded-full">
                        <AvatarImage src={player.avatar} alt={player.name} />
                        <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <span>{initials}</span>
                    )}
                    {/* Camera overlay */}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                      {isUploadingAvatar ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </button>

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
                    <span className="text-muted-foreground">{t('profile.goal')}</span>
                    <span className="font-medium">
                      {t(goalsLabels[player.goals] as TranslationKey ?? player.goals)}
                    </span>
                  </div>
                )}

                {/* Member since */}
                {player?.createdAt && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Membre depuis{' '}
                      {formatLocaleDate(player.createdAt, language, {
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
                      {td('Modifier le Profil', 'Edit Profile')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium">
                        {t('profile.fullName')}
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        placeholder={t('profile.namePlaceholder')}
                        className="h-10"
                      />
                    </div>

                    {/* Position */}
                    <div className="space-y-1.5">
                      <Label htmlFor="position" className="text-xs font-medium">
                        {t('profile.position')}
                      </Label>
                      <Select
                        value={formData.position}
                        onValueChange={(v) => setFormData((p) => ({ ...p, position: v }))}
                      >
                        <SelectTrigger id="position" className="h-10">
                          <SelectValue placeholder={t('profile.choosePosition')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guard">{t('profile.positionGuard')}</SelectItem>
                          <SelectItem value="forward">{t('profile.positionForward')}</SelectItem>
                          <SelectItem value="center">{t('profile.positionCenter')}</SelectItem>
                          <SelectItem value="all_around">{t('profile.positionAllAround')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Level */}
                    <div className="space-y-1.5">
                      <Label htmlFor="level" className="text-xs font-medium">
                        {t('profile.level')}
                      </Label>
                      <Select
                        value={formData.level}
                        onValueChange={(v) => setFormData((p) => ({ ...p, level: v }))}
                      >
                        <SelectTrigger id="level" className="h-10">
                          <SelectValue placeholder={t('profile.chooseLevel')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">{t('profile.levelBeginner')}</SelectItem>
                          <SelectItem value="intermediate">{t('profile.levelIntermediate')}</SelectItem>
                          <SelectItem value="advanced">{t('profile.levelAdvanced')}</SelectItem>
                          <SelectItem value="elite">{t('profile.levelElite')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Goals */}
                    <div className="space-y-1.5">
                      <Label htmlFor="goals" className="text-xs font-medium">
                        {t('profile.trainingGoal')}
                      </Label>
                      <Select
                        value={formData.goals}
                        onValueChange={(v) => setFormData((p) => ({ ...p, goals: v }))}
                      >
                        <SelectTrigger id="goals" className="h-10">
                          <SelectValue placeholder={t('profile.chooseGoal')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">{t('profile.goalGeneral')}</SelectItem>
                          <SelectItem value="shooting">{t('profile.goalShooting')}</SelectItem>
                          <SelectItem value="ball_handling">{t('profile.goalBallHandling')}</SelectItem>
                          <SelectItem value="defense">{t('profile.goalDefense')}</SelectItem>
                          <SelectItem value="conditioning">{t('profile.goalConditioning')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Save button */}
                    <Button
                      onClick={() => updateMutation.mutate(formData)}
                      disabled={updateMutation.isPending}
                      className="w-full h-11 bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20"
                    >
                      {updateMutation.isPending ? t('action.save') + '...' : t('action.save')}
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
                  {t('profile.xpHistory')}
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
                              {formatLocaleDate(log.createdAt, language, {
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
                      <span>{t('profile.viewAll')}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {t('profile.noXpYet')}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {t('profile.completeDrillsForXp')}
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
                  {t('profile.quickSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-orange-500/10 dark:bg-orange-500/15">
                    <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats?.totalSessions ?? 0}</p>
                    <p className="text-[11px] text-muted-foreground">{t('stats.sessionsLabel')}</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15">
                    <Activity className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats?.totalReps ?? 0}</p>
                    <p className="text-[11px] text-muted-foreground">{t('stats.repetitions')}</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-sky-500/10 dark:bg-sky-500/15">
                    <TrendingUp className="h-5 w-5 text-sky-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats?.avgScore ? `${stats.avgScore}` : '—'}</p>
                    <p className="text-[11px] text-muted-foreground">{t('stats.averageScore')}</p>
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
                      {t('screen.achievements')}
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
                      {t('screen.settings')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {td('Notifications, son, préférences', 'Notifications, sound, preferences')}
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
                      {td('Déconnexion', 'Sign out')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {td('Se déconnecter de votre compte', 'Sign out of your account')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Delete Account ─────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 dark:border-border/50 shadow-md overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteAccount.isPending}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/5 transition-colors text-left group disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    {deleteAccount.isPending ? (
                      <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300">
                      Supprimer mon compte
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Suppression d&eacute;finitive de toutes vos donn&eacute;es
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600 dark:text-red-400">
                  {t('profile.deleteTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      {t('profile.deleteDataDesc')}
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>{t('profile.deleteDataItem1')}</li>
                      <li>{t('profile.deleteDataItem2')}</li>
                      <li>{t('profile.deleteDataItem3')}</li>
                      <li>{t('profile.deleteDataItem4')}</li>
                      <li>{t('profile.deleteDataItem5')}</li>
                      <li>{t('profile.deleteDataItem6')}</li>
                      <li>{t('profile.deleteDataItem7')}</li>
                    </ul>
                    <p className="font-medium">
                      {t('profile.deleteAutoLogout')}
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteAccount.isPending}>
                  {t('action.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteAccount.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                >
                  {deleteAccount.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('action.delete')}…
                    </span>
                  ) : (
                    t('action.delete')
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                {t('auth.subtitle')}
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