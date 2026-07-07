'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, ArrowLeft, Lock, Medal, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores/app'
import { BottomNav } from '@/components/shared/bottom-nav'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch, cn } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { useTranslation } from '@/components/providers/language-provider'

interface Achievement {
  type: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt: string | null
}

export function AchievementsScreen() {
  const { navigate } = useAppStore()
  const { t, language } = useTranslation()

  const { data, isLoading, isError, refetch } = useQuery<{
    achievements: Achievement[]
    newUnlocks: string[]
    totalUnlocked: number
    totalAchievements: number
  }>({
    queryKey: ['achievements'],
    queryFn: () => apiFetch('/api/achievements'),
    staleTime: 30_000,
  })

  const achievements = data?.achievements || []
  const totalUnlocked = data?.totalUnlocked || 0
  const totalAchievements = data?.totalAchievements || 0
  const progress = totalAchievements > 0 ? (totalUnlocked / totalAchievements) * 100 : 0

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
        <p className="text-sm text-muted-foreground">Impossible de charger les données</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <SwipeToGoBack className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('profile')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="h-5 w-5 text-orange-500" />
            <h1 className="text-lg font-bold">{t('screen.achievements')}</h1>
          </div>
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            {totalUnlocked}/{totalAchievements}
          </Badge>
        </div>
      </header>

      <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-4 space-y-6">
        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-sm">Progression</span>
            </div>
            <span className="text-2xl font-bold text-orange-500 dark:text-orange-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-3 bg-foreground/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' as const, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {totalUnlocked === totalAchievements
              ? '🎉 Tous les succès déverrouillés !'
              : `${totalAchievements - totalUnlocked} succès restants`}
          </p>
        </motion.div>

        {/* New Unlocks Notification */}
        {data?.newUnlocks && data.newUnlocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3"
          >
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-green-400 text-sm">Nouveau(x) succès !</p>
              <p className="text-xs text-muted-foreground">
                {data.newUnlocks.length} succès viennent d'être déverrouillés
              </p>
            </div>
          </motion.div>
        )}

        {/* Achievements Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.type}
                variants={itemVariants}
                className={cn(
                  'relative rounded-2xl border p-4 flex flex-col items-center text-center gap-2 transition-all',
                  achievement.unlocked
                    ? 'bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/30 dark:border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.08)]'
                    : 'bg-muted/30 dark:bg-muted/20 border-border/50 opacity-60 dark:opacity-40'
                )}
              >
                {/* Glow effect for unlocked */}
                {achievement.unlocked && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
                )}

                <div
                  className={cn(
                    'text-3xl relative z-10',
                    achievement.unlocked && 'animate-pulse'
                  )}
                  style={
                    achievement.unlocked
                      ? { animationDuration: '3s', animationIterationCount: '1' }
                      : undefined
                  }
                >
                  {achievement.icon}
                </div>

                <h3 className={cn(
                  'font-semibold text-xs leading-tight relative z-10',
                  achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {achievement.title}
                </h3>

                <p className="text-[10px] text-muted-foreground leading-tight relative z-10">
                  {achievement.description}
                </p>

                {achievement.unlocked ? (
                  <Badge variant="secondary" className="text-[9px] bg-orange-500/15 text-orange-400 border-orange-500/20 relative z-10">
                    {new Date(achievement.unlockedAt ?? '').toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground/50 relative z-10">
                    <Lock className="h-3 w-3" />
                    <span className="text-[9px]">Verrouillé</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </SwipeToGoBack>
  )
}

export default AchievementsScreen