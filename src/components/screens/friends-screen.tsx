'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Search, UserPlus, UserCheck, UserX, ShieldBan, Loader2,
  Users, X, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/stores/navigation'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FriendItem {
  id: string
  playerId: string
  name: string
  avatar: string | null
  xpLevel: number
  position: string
  status: string
  isRequester: boolean
  createdAt: string
}

interface FriendCounts {
  friends: number
  pending: number
  blocked: number
}

type Tab = 'all' | 'friends' | 'sent' | 'received' | 'blocked'

const TABS: { value: Tab; label: string; icon: typeof Users }[] = [
  { value: 'all', label: 'Tous', icon: Users },
  { value: 'friends', label: 'Amis', icon: UserCheck },
  { value: 'sent', label: 'Envoyées', icon: Send },
  { value: 'received', label: 'Reçues', icon: UserPlus },
  { value: 'blocked', label: 'Bloqués', icon: ShieldBan },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const { t, td } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, isError, refetch } = useQuery<{
    friends: FriendItem[]
    counts: FriendCounts
  }>({
    queryKey: ['friends', tab],
    queryFn: () => apiFetch(`/api/friends?tab=${tab}`),
    staleTime: 30_000,
  })

  const { data: searchData, isLoading: isSearching } = useQuery<{
    players: Array<{
      id: string; name: string; avatar: string | null; xpLevel: number; position: string; friendshipStatus: string | null
    }>
  }>({
    queryKey: ['friends-search', searchQuery],
    queryFn: () => apiFetch(`/api/friends?search=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.length > 0,
    staleTime: 10_000,
  })

  const sendRequest = useMutation({
    mutationFn: (recipientId: string) =>
      fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-search'] })
      toast.success(td('Demande envoyée', 'Request sent'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleAction = useCallback(async (friendshipId: string, action: 'accept' | 'decline' | 'block') => {
    try {
      await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast.success(action === 'accept' ? td('Ami ajouté', 'Friend added') : action === 'block' ? td('Joueur bloqué', 'Player blocked') : td('Demande refusée', 'Request declined'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : td('Erreur', 'Error'))
    }
  }, [queryClient, td])

  const removeFriend = useCallback(async (friendshipId: string) => {
    try {
      await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast.success(td('Ami retiré', 'Friend removed'))
    } catch {
      toast.error(td('Erreur', 'Error'))
    }
  }, [queryClient, td])

  const doSearch = useCallback(() => {
    if (search.trim()) setSearchQuery(search.trim())
  }, [search])

  const displayItems = searchQuery ? (searchData?.players || []) : (data?.friends || [])

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Amis</h1>
          {data?.counts && data.counts.friends > 0 && (
            <Badge variant="secondary" className="text-xs">{data.counts.friends}</Badge>
          )}
        </div>

        {/* Search bar */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="Rechercher un joueur..."
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!searchQuery && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    tab === t.value ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.value === 'friends' && data?.counts && (
                    <span className="ml-0.5">{data.counts.friends}</span>
                  )}
                  {t.value === 'received' && data?.counts && data.counts.pending > 0 && (
                    <span className="ml-0.5 bg-red-500 text-white rounded-full h-4 min-w-4 flex items-center justify-center text-[10px]">
                      {data.counts.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading || isSearching ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Erreur de chargement</p>
            <Button variant="outline" onClick={() => refetch()}>{t('action.retry')}</Button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Aucun résultat' : tab === 'friends' ? 'Aucun ami' : 'Aucune demande'}
            </p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
            {displayItems.map((item: Record<string, unknown>) => {
              const isSearchResult = searchQuery && !('status' in item && (item.status === 'pending' || item.status === 'accepted'))
              return (
                <motion.div key={item.id as string} variants={itemVariants}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card"
                    onClick={() => isSearchResult && navigate('profile-other')}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {item.avatar ? (
                        <img src={item.avatar as string} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (item.name as string)?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{item.name as string}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Niv.{item.xpLevel as number}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{item.position as string}</p>
                    </div>

                    {isSearchResult && !item.friendshipStatus && (
                      <Button size="sm" className="h-8 text-xs" onClick={e => { e.stopPropagation(); sendRequest.mutate(item.id as string) }} disabled={sendRequest.isPending}>
                        {sendRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                        Ajouter
                      </Button>
                    )}

                    {!isSearchResult && item.status === 'pending' && !item.isRequester && (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleAction(item.id as string, 'accept')}>
                          <UserCheck className="h-3.5 w-3.5 mr-1" />Accepter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => handleAction(item.id as string, 'decline')}>
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {!isSearchResult && item.status === 'pending' && item.isRequester && (
                      <Badge variant="secondary" className="text-xs">En attente</Badge>
                    )}

                    {!isSearchResult && item.status === 'accepted' && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => removeFriend(item.id as string)}>
                        Retirer
                      </Button>
                    )}

                    {!isSearchResult && item.status === 'blocked' && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => removeFriend(item.id as string)}>
                        Débloquer
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </main>
      <BottomNav />
    </SwipeToGoBack>
  )
}