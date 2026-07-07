'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowUp, Trash2, Bot, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/app'
import { apiFetch } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'
import { BottomNav } from '@/components/shared/bottom-nav'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatMessage {
  role: string
  content: string
  createdAt: string
}

const SUGGESTED_ACTIONS = [
  'Créer un programme',
  'Conseil tir',
  'Améliorer mon dribble',
  'Comment me défendre?',
  'Mon point faible',
  'Motivation',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AICoachScreen() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const userName = session?.user?.name || 'Joueur'
  const goBack = useAppStore((s) => s.goBack)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const cancelledRef = useRef(false)

  // ── Load chat history ──────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryError(false)
    try {
      const data = await apiFetch<{ messages: ChatMessage[] }>('/api/ai-coach')
      if (!cancelledRef.current) {
        setMessages(data.messages)
        setInitialLoading(false)
      }
    } catch {
      if (!cancelledRef.current) {
        setHistoryError(true)
        setInitialLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    loadHistory()
    return () => {
      cancelledRef.current = true
    }
  }, [loadHistory])

  // ── Auto-scroll to bottom ────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ── Focus input on mount ─────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  // ── Send message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      // Optimistically add user message
      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsLoading(true)

      try {
        const data = await apiFetch<{ reply: string }>('/api/ai-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        })

        const aiMsg: ChatMessage = {
          role: 'assistant',
          content: data.reply,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
      } catch {
        const errMsg: ChatMessage = {
          role: 'assistant',
          content: 'Oups, une erreur est survenue 😕 Réessaie dans un instant.',
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setIsLoading(false)
        inputRef.current?.focus()
      }
    },
    [isLoading],
  )

  // ── Handle submit ────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      sendMessage(input)
    },
    [input, sendMessage],
  )

  // ── Handle key down ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    },
    [input, sendMessage],
  )

  // ── Handle suggested action ──────────────────────────────────────────
  const handleSuggestedAction = useCallback(
    (action: string) => {
      sendMessage(action)
    },
    [sendMessage],
  )

  // ── Handle clear chat ────────────────────────────────────────────────
  const handleClearChat = useCallback(async () => {
    try {
      await apiFetch('/api/ai-coach', { method: 'DELETE' })
      setMessages([])
    } catch {
      // Silent fail — history will reload next time
    }
  }, [])

  const hasMessages = messages.length > 0

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto relative pb-24">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-1 rounded-full"
              onClick={goBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">{t('coach.title')}</h1>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">{t('coach.online')}</span>
                </div>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Effacer la conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  Toutes tes messages seront supprimés. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearChat}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* ── Chat Area ──────────────────────────────────────────────── */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-3 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : historyError && !hasMessages ? (
          /* ── Error State ────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <p className="text-sm text-muted-foreground">Impossible de charger l&apos;historique</p>
            <Button variant="outline" size="sm" onClick={loadHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        ) : !hasMessages ? (
          /* ── Empty State ────────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            {/* Coach illustration */}
            <div className="relative mb-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/30">
                <Bot className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>

            <h2 className="text-lg font-bold mb-1">{t('coach.personalCoach')}</h2>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-8 leading-relaxed">
              Disponible 24h/24 pour t&apos;aider à progresser sur le terrain.
            </p>

            {/* Welcome message */}
            <div className="w-full bg-muted rounded-2xl rounded-tl-sm p-4 mb-6 text-left">
              <p className="text-sm leading-relaxed">
                Salut {userName} ! 👋 Je suis ton coach IA. Je connais tes stats et je peux
                t&apos;aider à t&apos;améliorer. Pose-moi n&apos;importe quelle question sur le
                basket!
              </p>
            </div>

            {/* Suggested actions */}
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-3 font-medium">
                {t('coach.suggestedActions')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleSuggestedAction(action)}
                    className="px-3.5 py-2 rounded-full bg-card border border-border text-xs font-medium text-foreground hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 dark:hover:bg-orange-950/30 dark:hover:border-orange-700 dark:hover:text-orange-400 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── Messages ──────────────────────────────────────────── */}
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user'
                return (
                  <motion.div
                    key={`${msg.createdAt}-${index}`}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isUser ? (
                      <div className="max-w-[85%] bg-orange-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2.5 max-w-[85%]">
                        <div className="h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* ── Typing Indicator ──────────────────────────────────── */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-2.5"
              >
                <div className="h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* ── Suggested Actions (above input, only when chat exists) ── */}
      {hasMessages && !isLoading && (
        <div className="absolute bottom-[76px] left-0 right-0 z-20">
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
              {SUGGESTED_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => handleSuggestedAction(action)}
                  className="flex-shrink-0 min-h-[44px] flex items-center px-3 py-2.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground hover:text-orange-600 hover:border-orange-300 dark:hover:text-orange-400 dark:hover:border-orange-700 transition-colors whitespace-nowrap"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Input Area ────────────────────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-background/90 backdrop-blur-xl border-t border-border/50 pb-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto flex items-center gap-2 px-4 py-3"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('coach.typeMessage')}
            disabled={isLoading}
            className="flex-1 h-11 rounded-full bg-muted border-0 px-4 text-sm focus-visible:ring-1 focus-visible:ring-orange-500/50"
            maxLength={1000}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none flex-shrink-0"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </form>
      </div>
      <BottomNav />
    </div>
  )
}