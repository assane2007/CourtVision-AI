'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Trophy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { staggerContainer, slideInLeft, cardHover } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'
import type { TranslationKey } from '@/lib/i18n'
import { getLevelColor, getLevelBgColor } from '@/lib/xp'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'month' | 'week' | 'friends'

interface LeaderboardEntry {
  rank: number
  name: string
  xp: number
  xpLevel: number
  totalSessions: number
  avgScore: number
  position: string
  isCurrentUser: boolean
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  friends: LeaderboardEntry[]
  playerRank: number | null
  totalPlayers: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PERIOD_TABS: { value: Tab; labelKey: TranslationKey; icon?: typeof Users }[] = [
  { value: 'all', labelKey: 'leaderboard.global' },
  { value: 'month', labelKey: 'leaderboard.thisMonth' },
  { value: 'week', labelKey: 'leaderboard.thisWeek' },
  { value: 'friends', labelKey: 'leaderboard.friends', icon: Users },
]

function getPodiumStyle(rank: number) {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950'
    case 2:
      return 'bg-gradient-to-b from-gray-300 to-gray-500 text-gray-900'
    case 3:
      return 'bg-gradient-to-b from-orange-400 to-orange-700 text-orange-950'
    default:
      return ''
  }
}

function getPodiumHeight(rank: number) {
  switch (rank) {
    case 1: return 'h-40'
    case 2: return 'h-32'
    case 3: return 'h-28'
    default: return ''
  }
}

function getPodiumEmoji(rank: number) {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return ''
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function LeaderboardScreen() {
  const goBack = useAppStore((s) => s.goBack)
  const { t, td } = useTranslation()
  const [tab, setTab] = useState<Tab>('all')

  const { data, isLoading, isError, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', tab],
    queryFn: () => {
      if (tab === 'friends') return apiFetch<LeaderboardResponse>('/api/leaderboard?period=all')
      return apiFetch<LeaderboardResponse>(`/api/leaderboard?period=${tab}`)
    },
    staleTime: 60_000,
  })

  const isFriendsTab = tab === 'friends'
  const displayList = isFriendsTab ? (data?.friends ?? []) : (data?.leaderboard ?? [])
  const top3 = displayList.slice(0, 3)
  const rest = displayList.slice(3)

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0"
            aria-label={t('action.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="h-5 w-5 text-orange-500" />
            <h1 className="text-lg font-bold">{t('screen.leaderboard')}</h1>
          </div>
          {data && (
            <span className="text-xs text-muted-foreground">
              {data.totalPlayers} {td('joueur', 'player')}{data.totalPlayers > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Period Tabs */}
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pb-3">
          <div className="flex gap-1 bg-muted rounded-xl p-1" role="tablist" aria-label={t('leaderboard.periodLabel')}>
            {PERIOD_TABS.map((tabItem) => (
              <button
                key={tabItem.value}
                role="tab"
                aria-selected={tab === tabItem.value}
                tabIndex={tab === tabItem.value ? 0 : -1}
                onClick={() => setTab(tabItem.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                  tab === tabItem.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tabItem.icon && <tabItem.icon className="h-3.5 w-3.5" />}
                {tabItem.labelKey && t(tabItem.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="text-4xl" aria-hidden="true">:(</div>
            <p className="text-muted-foreground">{t('error.loadFailed')}</p>
            <Button variant="outline" onClick={() => refetch()}>
              {t('action.retry')}
            </Button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* ─── Podium for Top 3 ─── */}
            {top3.length > 0 && (
              <motion.div variants={slideInLeft} className="relative">
                {/* Podium display: 2nd | 1st | 3rd */}
                <div className="flex items-end justify-center gap-3 pt-4 pb-6">
                  {/* 2nd place */}
                  {top3[1] && (
                    <div className="flex flex-col items-center w-28">
                      <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2 ${getPodiumStyle(2)}`}>
                        {top3[1].name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold truncate w-full text-center">
                        {top3[1].name}
                      </span>
                      <span className={`text-xs font-medium ${getLevelColor(top3[1].xpLevel)}`}>
                        {td('Niv.', 'Lv.')} {top3[1].xpLevel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {top3[1].xp.toLocaleString()} XP
                      </span>
                      <div className={`w-full mt-3 rounded-t-xl ${getPodiumStyle(2)} ${getPodiumHeight(2)} flex flex-col items-center justify-start pt-3`}>
                        <span className="text-3xl font-black">{getPodiumEmoji(2)}</span>
                        <span className="text-2xl font-black mt-1">2</span>
                      </div>
                    </div>
                  )}

                  {/* 1st place */}
                  {top3[0] && (
                    <div className="flex flex-col items-center w-32">
                      <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-2 ring-4 ring-amber-400/50 shadow-lg shadow-amber-500/30">
                        <div className={`w-full h-full rounded-full flex items-center justify-center ${getPodiumStyle(0)}`}>
                          {top3[0].name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className="text-base font-bold truncate w-full text-center">
                        {top3[0].name}
                        {top3[0].isCurrentUser && (
                          <Badge className="ml-1.5 bg-orange-500 text-white text-[10px] px-1.5 py-0">
                            {t('leaderboard.you')}
                          </Badge>
                        )}
                      </span>
                      <span className={`text-xs font-medium ${getLevelColor(top3[0].xpLevel)}`}>
                        {td('Niv.', 'Lv.')} {top3[0].xpLevel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {top3[0].xp.toLocaleString()} XP
                      </span>
                      <div className={`w-full mt-3 rounded-t-xl ${getPodiumStyle(1)} ${getPodiumHeight(1)} flex flex-col items-center justify-start pt-3 shadow-lg`}>
                        <span className="text-4xl font-black">{getPodiumEmoji(1)}</span>
                        <span className="text-3xl font-black mt-1">1</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd place */}
                  {top3[2] && (
                    <div className="flex flex-col items-center w-28">
                      <div className={`relative w-14 h-14 rounded-full flex items-center justify-center text-xl mb-2 ${getPodiumStyle(3)}`}>
                        {top3[2].name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold truncate w-full text-center">
                        {top3[2].name}
                      </span>
                      <span className={`text-xs font-medium ${getLevelColor(top3[2].xpLevel)}`}>
                        {td('Niv.', 'Lv.')} {top3[2].xpLevel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {top3[2].xp.toLocaleString()} XP
                      </span>
                      <div className={`w-full mt-3 rounded-t-xl ${getPodiumStyle(3)} ${getPodiumHeight(3)} flex flex-col items-center justify-start pt-3`}>
                        <span className="text-2xl font-black">{getPodiumEmoji(3)}</span>
                        <span className="text-xl font-black mt-1">3</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── Current player rank card ─── */}
            {data?.playerRank && data.playerRank > 3 && (
              <motion.div variants={slideInLeft}>
                <div className="rounded-xl border-2 border-orange-500/40 bg-orange-500/5 p-4 flex items-center gap-3">
                  <div className="text-2xl font-black text-orange-500 w-10 text-center">
                    #{data.playerRank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{t('leaderboard.yourPosition')}</span>
                      <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">
                        {t('leaderboard.you')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('leaderboard.keepTraining')}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Scrollable list for ranks 4-20 ─── */}
            {rest.length > 0 && (
              <motion.div variants={slideInLeft} className="space-y-2">
                {rest.map((entry) => (
                  <motion.div
                    key={entry.rank}
                    {...cardHover}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      entry.isCurrentUser
                        ? 'border-orange-500/40 bg-orange-500/5'
                        : 'border-border/50 bg-card'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      <span className="text-sm font-bold text-muted-foreground">
                        {entry.rank}
                      </span>
                    </div>

                    {/* Avatar initial */}
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {entry.name}
                        </span>
                        {entry.isCurrentUser && (
                          <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 shrink-0">
                            {t('leaderboard.you')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getLevelBgColor(entry.xpLevel)} ${getLevelColor(entry.xpLevel)}`}
                        >
                          {t('leaderboard.level')} {entry.xpLevel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.position === 'guard' ? t('position.guard') : entry.position === 'forward' ? t('position.forward') : entry.position === 'center' ? t('position.center') : entry.position}
                        </span>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold tabular-nums">
                        {entry.xp.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">XP</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Empty state */}
            {data && displayList.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {t('empty.noLeaderboard')}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>
      <BottomNav />
    </SwipeToGoBack>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Podium skeleton */}
      <div className="flex items-end justify-center gap-3 pt-4 pb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className={`w-24 rounded-t-xl ${i === 0 ? 'h-40' : i === 1 ? 'h-32' : 'h-28'}`} />
          </div>
        ))}
      </div>

      {/* List skeleton */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
          <Skeleton className="w-8 h-5" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

export default LeaderboardScreen