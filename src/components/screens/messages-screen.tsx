'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Loader2, X, Pencil, MessageCircle, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/stores/navigation'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

interface ConversationItem {
  id: string; type: string; name: string; avatar: string | null
  otherPlayer: { id: string; name: string; avatar: string | null } | null
  lastMessage: { id: string; content: string; type: string; senderId: string; createdAt: string; isOwn: boolean } | null
  lastMessageAt: string; unreadCount: number
}

interface PlayerResult {
  id: string
  name: string
  avatar: string | null
  xpLevel: number | null
  position: string | null
  friendshipStatus: string | null
}

function formatMessageTime(date: string, lang: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const locale = lang === 'en' ? 'en-US' : 'fr-FR'
  if (diff < 86400000) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
}

export default function MessagesScreen() {
  const { t, td, language } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const [showNew, setShowNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Search friends API
  const { data: searchData, isLoading: searchLoading } = useQuery<{ players: PlayerResult[] }>({
    queryKey: ['friend-search', debouncedQuery],
    queryFn: () => apiFetch(`/api/friends?search=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5000,
  })

  const { data, isLoading, isError, refetch } = useQuery<{ conversations: ConversationItem[] }>({
    queryKey: ['conversations'],
    queryFn: () => apiFetch('/api/messages/conversations'),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })

  const createConvo = useMutation({
    mutationFn: () => fetch('/api/messages/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: selectedPlayerId }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (d) => {
      setShowNew(false)
      setSearchQuery('')
      setDebouncedQuery('')
      setSelectedPlayerId('')
      useAppStore.getState().selectConversation(d.conversationId)
      navigate('conversation')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const selectAndCreate = (playerId: string) => {
    setSelectedPlayerId(playerId)
    // Use a tiny timeout so selectedPlayerId is set before mutation fires
    setTimeout(() => {
      createConvo.mutate()
    }, 0)
  }

  const totalUnread = (data?.conversations || []).reduce((sum, c) => sum + c.unreadCount, 0)
  const searchResults = searchData?.players || []

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Messages</h1>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
              {totalUnread}
            </span>
          )}
          <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={() => setShowNew(!showNew)} aria-label={td('Nouveau message', 'New message')}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence>
          {showNew && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="max-w-lg mx-auto px-4 pb-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder={t('paywall.messages.searchPlayer')}
                    className="flex-1 pl-9"
                    aria-label={td('Rechercher un joueur', 'Search for a player')}
                    autoFocus
                  />
                  {searchQuery && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => { handleSearchChange(''); }}
                      aria-label={td('Effacer', 'Clear')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Search results dropdown */}
                {debouncedQuery.length >= 2 && (
                  <div className="border rounded-xl bg-card max-h-60 overflow-y-auto custom-scrollbar">
                    {searchLoading ? (
                      <div className="p-3 space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        ))}
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t('paywall.messages.noResults')}
                      </div>
                    ) : (
                      <ul className="py-1">
                        {searchResults.map(player => (
                          <li key={player.id}>
                            <button
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left min-h-[44px]"
                              onClick={() => selectAndCreate(player.id)}
                              disabled={createConvo.isPending}
                            >
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={player.avatar || undefined} />
                                <AvatarFallback className="text-xs font-bold">
                                  {player.name?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{player.name}</p>
                                {player.position && (
                                  <p className="text-[10px] text-muted-foreground">{player.position}</p>
                                )}
                              </div>
                              {createConvo.isPending && selectedPlayerId === player.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <span className="text-xs text-orange-500 font-medium">{t('paywall.messages.selectPlayer')}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div></div>
          ))}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('error.loadFailed')}</p>
            <Button variant="outline" onClick={() => refetch()}>{t('action.retry')}</Button>
          </div>
        ) : !data?.conversations.length ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{td('Aucun message', 'No messages')}</p>
            <p className="text-xs text-muted-foreground">{td('Démarrez une nouvelle conversation', 'Start a new conversation')}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
            {data.conversations.map(conv => (
              <motion.div key={conv.id} variants={itemVariants}>
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => { useAppStore.getState().selectConversation(conv.id); navigate('conversation') }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); useAppStore.getState().selectConversation(conv.id); navigate('conversation') } }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.avatar || conv.otherPlayer?.avatar || undefined} />
                      <AvatarFallback className="text-sm font-bold">
                        {conv.otherPlayer?.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{conv.otherPlayer?.name || conv.name}</span>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatMessageTime(conv.lastMessage.createdAt, language)}</span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage.isOwn ? td('Vous: ', 'You: ') : ''}{conv.lastMessage.type === 'workout' ? td('🏀 Séance partagée', '🏀 Shared workout') : conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      <BottomNav />
    </SwipeToGoBack>
  )
}