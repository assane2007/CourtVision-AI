'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNavigation } from '@/stores/navigation'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { apiFetch } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import { toast } from 'sonner'

interface MessageItem {
  id: string; content: string; type: string; metadata: Record<string, unknown>
  isRead: boolean; createdAt: string; isOwn: boolean
  sender: { id: string; name: string; avatar: string | null }
}

export default function ConversationScreen() {
  const { t, td, language } = useTranslation()
  const { goBack } = useNavigation()
  const selectedDrillId = useAppStore(s => s.selectedDrillId)
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const { data: convData } = useQuery<{
    conversation: { id: string; type: string; name: string | null; avatar: string | null; otherPlayer: { id: string; name: string; avatar: string | null } | null }
  }>({
    queryKey: ['conversation', selectedDrillId],
    queryFn: () => apiFetch(`/api/messages/conversations/${selectedDrillId}`),
    enabled: !!selectedDrillId,
  })

  const { data: msgsData, fetchNextPage: _fetchNextPage, hasNextPage: _hasNextPage, isFetchingNextPage } = useInfiniteQuery<{
    messages: MessageItem[]; nextCursor: string | null
  }>({
    queryKey: ['messages', selectedDrillId],
    queryFn: ({ pageParam }) => apiFetch(`/api/messages/conversations/${selectedDrillId}/messages?limit=40${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: !!selectedDrillId,
  })

  const allMessages = msgsData?.pages.flatMap(p => p.messages) || []

  // Mark as read
  useEffect(() => {
    if (selectedDrillId) {
      fetch(`/api/messages/conversations/${selectedDrillId}`, { method: 'PATCH' }).catch(() => {})
    }
  }, [selectedDrillId])

  // Poll for new messages
  useEffect(() => {
    pollRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedDrillId] })
    }, 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedDrillId, queryClient])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  const sendMessage = useMutation({
    mutationFn: () => fetch(`/api/messages/conversations/${selectedDrillId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedDrillId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setText('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const conv = convData?.conversation
  const otherPlayer = conv?.otherPlayer

  if (!selectedDrillId) return <div className="min-h-screen bg-background" />

  return (
    <SwipeToGoBack className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label={t('action.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={conv?.avatar || otherPlayer?.avatar || undefined} />
            <AvatarFallback className="text-xs font-bold">{otherPlayer?.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{otherPlayer?.name || conv?.name || 'Conversation'}</p>
            <p className="text-xs text-muted-foreground">{td('En ligne', 'Online')}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 pb-20">
        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <p className="text-sm text-muted-foreground">{td('Début de la conversation', 'Start of conversation')}</p>
            <p className="text-xs text-muted-foreground mt-1">{td('Envoyez le premier message', 'Send the first message')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allMessages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
                  msg.isOwn
                    ? 'bg-orange-500 text-white rounded-br-md'
                    : 'bg-card border border-border/50 rounded-bl-md'
                }`}>
                  {msg.type === 'workout' && msg.metadata?.workout ? (
                    <div className="text-center">
                      <p className="text-xs font-medium mb-1">🏀 {td('Séance partagée', 'Shared workout')}</p>
                      <p className="text-[10px] opacity-80">Score: {String((msg.metadata.workout as Record<string, unknown>)?.score ?? '')}</p>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <p className={`text-[9px] mt-1 ${msg.isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
            {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Message input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t pb-safe z-40">
        <div className="max-w-lg mx-auto flex items-center gap-2 px-4 py-3">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={td('Écrire un message...', 'Write a message...')}
            className="min-h-[40px] max-h-24 resize-none text-sm flex-1"
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (text.trim()) sendMessage.mutate()
              }
            }}
          />
          <Button size="icon" className="shrink-0 h-9 w-9" onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || !text.trim()}>
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </SwipeToGoBack>
  )
}