'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mic, MicOff, Send, Volume2,
  Bot, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigation } from '@/stores/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch } from '@/lib/utils'
import { BottomNav } from '@/components/shared/bottom-nav'

// ── Types ──────────────────────────────────────────────────────────────────────

interface VoiceExchange {
  id: string
  question: string
  reply: string
  audio?: string
  timestamp: string
}

interface VoiceSession {
  id: string
  transcript: string
  sessionId: string | null
  durationSec: number
  createdAt: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VoiceCoachScreen() {
  const { t, td } = useTranslation()
  const { goBack } = useNavigation()
  const [exchanges, setExchanges] = useState<VoiceExchange[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [history, setHistory] = useState<VoiceSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  // ── Load voice session history ─────────────────────────────────────────
  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await apiFetch<{ sessions: VoiceSession[]; total: number }>('/api/ai/voice/coach')
        setHistory(data.sessions)
      } catch {
        // Silent fail
      } finally {
        setInitialLoading(false)
      }
    }
    loadHistory()
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [exchanges, isLoading])

  // ── Play audio response ───────────────────────────────────────────────
  const playAudio = useCallback((base64Audio: string) => {
    try {
      if (audioElRef.current) {
        audioElRef.current.pause()
        URL.revokeObjectURL(audioUrl || '')
      }
      const byteChars = atob(base64Audio)
      const byteNumbers = new Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'audio/mp3' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      const audio = new Audio(url)
      audioElRef.current = audio
      audio.play().catch(() => { /* autoplay blocked */ })
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setAudioUrl(null)
      }
    } catch {
      // Audio playback failed
    }
  }, [audioUrl])

  // ── Send question to voice coach ──────────────────────────────────────
  const sendQuestion = useCallback(async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || isLoading) return

    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const data = await apiFetch<{ reply: string; audio?: string; voiceSessionId: string }>('/api/ai/voice/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })

      const exchange: VoiceExchange = {
        id: data.voiceSessionId,
        question: trimmed,
        reply: data.reply,
        audio: data.audio,
        timestamp: new Date().toISOString(),
      }

      setExchanges(prev => [...prev, exchange])

      // Auto-play audio if available
      if (data.audio) {
        playAudio(data.audio)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : td('Erreur du coach vocal', 'Voice coach error'))
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [isLoading, playAudio, td])

  // ── Start/stop recording ──────────────────────────────────────────────
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        // Convert blob to base64
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1]
          if (base64) {
            try {
              setIsLoading(true)
              const data = await apiFetch<{ transcript: string }>('/api/ai/voice/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64 }),
              })
              if (data.transcript) {
                sendQuestion(data.transcript)
              }
            } catch {
              setError(td('Erreur de transcription', 'Transcription error'))
              setIsLoading(false)
            }
          }
        }
        reader.readAsDataURL(blob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setError(td("Impossible d'accéder au microphone", 'Unable to access microphone'))
    }
  }, [isRecording, sendQuestion, td])

  // ── Handle submit ─────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendQuestion(input)
  }

  const hasExchanges = exchanges.length > 0

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-lg mx-auto relative pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1 rounded-full" onClick={goBack} aria-label={t('action.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">{td('Coach Vocal IA', 'AI Voice Coach')}</h1>
                <p className="text-[11px] text-muted-foreground">{td('Parlez ou tapez votre question', 'Speak or type your question')}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost" size="icon" className="h-9 w-9 rounded-full"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/50"
          >
            <div className="max-h-48 overflow-y-auto p-4 bg-muted/30 space-y-2">
              {initialLoading ? (
                <Skeleton className="h-10 rounded-lg" />
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{td('Aucun historique vocal', 'No voice history')}</p>
              ) : (
                history.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-background">
                    <Mic className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{s.transcript || td('(session vide)', '(empty session)')}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasExchanges && !isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/30 mb-4">
              <Mic className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-lg font-bold mb-1">{td('Coach Vocal IA', 'AI Voice Coach')}</h2>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-8">
              {td('Posez une question pendant votre entraînement et recevez une réponse vocale instantanée', 'Ask a question during your workout and get an instant voice response')}
            </p>
            <div className="space-y-2 w-full max-w-xs">
              {[
                td('Comment améliorer mon tir ?', 'How to improve my shot?'),
                td('Quels exercices pour la défense ?', 'What drills for defense?'),
                td('Pourquoi je rate mes lancers francs ?', 'Why do I miss my free throws?'),
                td('Comment éviter les blessures ?', 'How to avoid injuries?'),
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuestion(q)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-card border border-border text-sm hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {exchanges.map((ex) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {/* Question */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-orange-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
                      <p className="text-sm">{ex.question}</p>
                    </div>
                  </div>
                  {/* Reply */}
                  <div className="flex gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-[85%]">
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                        <p className="text-sm leading-relaxed">{ex.reply}</p>
                      </div>
                      {ex.audio && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => playAudio(ex.audio!)}
                          className="mt-1 h-7 text-xs text-orange-500 hover:text-orange-600"
                        >
                          <Volume2 className="h-3 w-3 mr-1" />
                          {td('Réécouter', 'Replay')}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5"
              >
                <div className="h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
                <p className="text-xs text-destructive">{error}</p>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-background/90 backdrop-blur-xl border-t border-border/50 pb-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto flex items-center gap-2 px-4 py-3"
        >
          <Button
            type="button"
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            className="h-11 w-11 rounded-full flex-shrink-0"
            onClick={toggleRecording}
            disabled={isLoading}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(input) } }}
            placeholder={td('Tapez votre question...', 'Type your question...')}
            disabled={isLoading}
            className="flex-1 h-11 rounded-full bg-muted border-0 px-4 text-sm focus-visible:ring-1 focus-visible:ring-orange-500/50"
            maxLength={500}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 disabled:opacity-40 disabled:shadow-none flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
        {isRecording && (
          <div className="flex items-center justify-center gap-2 pb-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-destructive font-medium">{td('Enregistrement en cours...', 'Recording...')}</span>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}