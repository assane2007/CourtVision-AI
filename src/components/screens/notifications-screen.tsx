'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Bell, UserPlus, Heart, MessageCircle, Trophy, CheckCheck,
  Loader2, Zap, Users, Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/stores/navigation'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

interface NotificationItem {
  id: string; type: string; title: string; body: string
  data: Record<string, unknown>; isRead: boolean; createdAt: string
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  friend_request: UserPlus, like: Heart, comment: MessageCircle,
  follow: Users, challenge: Target, achievement: Trophy, system: Bell, live_start: Zap,
}

const TYPE_COLORS: Record<string, string> = {
  friend_request: 'text-emerald-500', like: 'text-red-500', comment: 'text-sky-500',
  follow: 'text-violet-500', challenge: 'text-orange-500', achievement: 'text-amber-500', system: 'text-muted-foreground', live_start: 'text-red-500',
}

function formatNotifTime(date: string): string {
  const d = new Date(date)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return "À l'instant"
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function NotificationsScreen() {
  const { t } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<{
    notifications: NotificationItem[]; nextCursor: string | null; unreadCount: number
  }>({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => apiFetch(`/api/notifications?limit=30${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    staleTime: 10_000,
  })

  const allNotifs = data?.pages.flatMap(p => p.notifications) || []
  const unreadCount = data?.pages[0]?.unreadCount || 0

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { rootMargin: '200px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const markAllRead = useMutation({
    mutationFn: () => fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Toutes les notifications marquées comme lues')
    },
  })

  const markRead = useMutation({
    mutationFn: (id: string) => fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Bell className="h-5 w-5 text-orange-500" />
          <h1 className="text-lg font-bold flex-1">Notifications</h1>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" />Tout lire
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border"><Skeleton className="h-9 w-9 rounded-full shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div>
          ))}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('error.loadFailed')}</p>
            <Button variant="outline" onClick={() => refetch()}>{t('action.retry')}</Button>
          </div>
        ) : allNotifs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
            {allNotifs.map(notif => {
              const Icon = TYPE_ICONS[notif.type] || Bell
              const color = TYPE_COLORS[notif.type] || 'text-muted-foreground'
              return (
                <motion.div key={notif.id} variants={itemVariants}>
                  <div
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      notif.isRead ? 'border-border/50 bg-card' : 'border-orange-500/30 bg-orange-500/5'
                    }`}
                    onClick={() => { if (!notif.isRead) markRead.mutate(notif.id) }}
                  >
                    <div className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${notif.isRead ? '' : 'font-medium'}`}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatNotifTime(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />
                    )}
                  </div>
                </motion.div>
              )
            })}
            <div ref={sentinelRef} className="py-4 text-center">
              {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />}
            </div>
          </motion.div>
        )}
      </main>
      <BottomNav />
    </SwipeToGoBack>
  )
}