'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Search, Send, Loader2, X, Pencil, MessageCircle,
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

function formatMessageTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function MessagesScreen() {
  const { t } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [recipientId, setRecipientId] = useState('')

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
      body: JSON.stringify({ recipientId }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (d) => {
      setShowNew(false)
      setRecipientId('')
      useAppStore.getState().selectDrill(d.conversationId)
      navigate('conversation')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const totalUnread = (data?.conversations || []).reduce((sum, c) => sum + c.unreadCount, 0)

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
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNew(!showNew)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {showNew && (
          <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
            <Input
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              placeholder="ID du joueur..."
              className="flex-1"
            />
            <Button size="sm" onClick={() => createConvo.mutate()} disabled={createConvo.isPending || !recipientId.trim()}>
              {createConvo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}><X className="h-4 w-4" /></Button>
          </div>
        )}
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
            <p className="text-muted-foreground">Aucun message</p>
            <p className="text-xs text-muted-foreground">Démarrez une nouvelle conversation</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
            {data.conversations.map(conv => (
              <motion.div key={conv.id} variants={itemVariants}>
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => { useAppStore.getState().selectDrill(conv.id); navigate('conversation') }}
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
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatMessageTime(conv.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage.isOwn ? 'Vous: ' : ''}{conv.lastMessage.type === 'workout' ? '🏀 Séance partagée' : conv.lastMessage.content}
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