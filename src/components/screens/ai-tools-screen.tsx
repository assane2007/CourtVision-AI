'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  MessageCircle,
  Volume2,
  Mic,
  ImageIcon,
  Search,
  FileText,
  Upload,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Trash2,
  Music,
  Globe,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/stores/app'
import { apiFetch } from '@/lib/utils'
import { BottomNav } from '@/components/shared/bottom-nav'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  title: string
  snippet: string
  url: string
  date?: string
}

interface WebReaderResult {
  title: string
  content: string
  url: string
}

const VOICES = [
  { value: 'tongtong', label: 'TongTong' },
  { value: 'xiaochen', label: 'XiaoChen' },
  { value: 'jam', label: 'Jam' },
  { value: 'kazi', label: 'Kazi' },
  { value: 'douji', label: 'Douji' },
  { value: 'luodo', label: 'LuoDo' },
] as const

const IMAGE_SIZES = [
  { value: '1024x1024', label: 'Square', desc: '1024×1024' },
  { value: '1344x768', label: 'Landscape', desc: '1344×768' },
  { value: '768x1344', label: 'Portrait', desc: '768×1344' },
  { value: '1440x720', label: 'Wide', desc: '1440×720' },
] as const

// i18n-FR: entire file uses hardcoded English — TODO: migrate to useTranslation()

// ── Animation Variants ────────────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

// ── Tab Config ────────────────────────────────────────────────────────────────

// i18n-FR: hardcoded English labels — TODO: use i18n system
const TABS = [
  { value: 'chat', icon: MessageCircle, label: 'Chat Coach' },
  { value: 'tts', icon: Volume2, label: 'Voice' },
  { value: 'asr', icon: Mic, label: 'Transcribe' },
  { value: 'image', icon: Image, label: 'Image Gen' },
  { value: 'websearch', icon: Search, label: 'Web Search' },
  { value: 'webreader', icon: FileText, label: 'Web Reader' },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIToolsScreen() {
  const navigate = useAppStore((s) => s.navigate)
  const goBack = useAppStore((s) => s.goBack)
  const [activeTab, setActiveTab] = useState('chat')

  // Navigate to ai-coach on Chat Coach tab click
  const handleTabChange = useCallback(
    (value: string) => {
      if (value === 'chat') {
        navigate('ai-coach')
        return
      }
      setActiveTab(value)
    },
    [navigate],
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-lg md:max-w-3xl items-center gap-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={goBack}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1
            className="text-lg font-bold tracking-tight flex-1"
          >
            AI Tools Hub
          </h1>
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 text-[10px] px-2 py-0.5"
          >
            6 Tools
          </Badge>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-lg md:max-w-3xl px-4 pt-4 pb-24">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          {/* ── Tab Triggers ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/60 p-1">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 min-w-[calc(33%-4px)] sm:min-w-0 gap-1 text-xs py-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {/* ── Tab: Chat Coach ──────────────────────────────────── */}
          <TabsContent value="chat">
            <motion.div
              className="flex flex-col items-center justify-center py-20 gap-4 text-center"
              {...fadeUp}
            >
              <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Chat Coach</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Your AI basketball coach is ready. Tap below to start a
                  conversation and get personalized advice.
                </p>
              </div>
              <Button
                onClick={() => navigate('ai-coach')}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-8"
              >
                <MessageCircle className="h-4 w-4" />
                Open Chat Coach
              </Button>
            </motion.div>
          </TabsContent>

          {/* ── Tab: TTS (Voice) ─────────────────────────────────── */}
          <TabsContent value="tts">
            <TTSTab />
          </TabsContent>

          {/* ── Tab: ASR (Transcribe) ────────────────────────────── */}
          <TabsContent value="asr">
            <ASRTab />
          </TabsContent>

          {/* ── Tab: Image Gen ───────────────────────────────────── */}
          <TabsContent value="image">
            <ImageGenTab />
          </TabsContent>

          {/* ── Tab: Web Search ──────────────────────────────────── */}
          <TabsContent value="websearch">
            <WebSearchTab />
          </TabsContent>

          {/* ── Tab: Web Reader ──────────────────────────────────── */}
          <TabsContent value="webreader">
            <WebReaderTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Bottom Nav ───────────────────────────────────────────── */}
      <BottomNav />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TTS Tab
// ══════════════════════════════════════════════════════════════════════════════

function TTSTab() {
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('tongtong')
  const [speed, setSpeed] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const abortRef = useRef<AbortController>(null)

  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(body.error || `Erreur ${res.status}`)
      }
      const blob = await res.blob()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Erreur lors de la génération vocale.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      abortRef.current?.abort()
    }
  }, [audioUrl])

  return (
    <motion.div
      className="space-y-4 pt-2"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp}>
        <label className="text-sm font-medium mb-1.5 block">
          Text to Speech
        </label>
        <Textarea
          placeholder="Enter the text you want to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1024))}
          className="min-h-[100px] resize-none"
          maxLength={1024}
          disabled={loading}
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-muted-foreground">
            {text.length} / 1024
          </span>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Voice</label>
          <Select value={voice} onValueChange={setVoice}>
            <SelectTrigger className="w-full">
              <Music className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Speed: {speed.toFixed(1)}x
          </label>
          <div className="pt-2 px-1">
            <Slider
              value={[speed]}
              onValueChange={([v]) => setSpeed(v)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0.5x</span>
              <span>1.0x</span>
              <span>2.0x</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Button
          onClick={handleGenerate}
          disabled={!text.trim() || loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 h-11"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {loading ? 'Generating Speech...' : 'Generate Speech'}
        </Button>
      </motion.div>

      {/* Error with Retry */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className="border-destructive/50">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {audioUrl && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0">
                    <Volume2 className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Audio Ready</p>
                    <p className="text-xs text-muted-foreground">
                      {VOICES.find((v) => v.value === voice)?.label} •{' '}
                      {speed.toFixed(1)}x
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    WAV
                  </Badge>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  controls
                  className="w-full h-10"
                  preload="auto"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ASR (Transcribe) Tab
// ══════════════════════════════════════════════════════════════════════════════

function ASRTab() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (f: File) => {
    setError(null)
    const validTypes = ['.wav', '.mp3', '.m4a', '.ogg']
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!validTypes.includes(ext)) {
      toast.error('Formats acceptés : .wav, .mp3, .m4a, .ogg')
      return
    }
    if (f.size > 25_000_000) {
      toast.error('Fichier trop volumineux (max 25 Mo).')
      return
    }
    setFile(f)
    setTranscription('')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  const handleTranscribe = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const formData = new FormData()
      formData.append('audio', file)
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Erreur' }))
        throw new Error(body.error || `Erreur ${res.status}`)
      }
      const data = await res.json()
      setTranscription(data.text || data.transcription || 'Aucune transcription disponible.')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Erreur lors de la transcription.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const handleCopy = async () => {
    if (!transcription) return
    await navigator.clipboard.writeText(transcription)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      className="space-y-4 pt-2"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Drop Zone */}
      <motion.div variants={fadeUp}>
        <label className="text-sm font-medium mb-1.5 block">
          Audio File
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all
            ${
              isDragging
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                : 'border-muted-foreground/25 hover:border-orange-400 hover:bg-muted/30'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.ogg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileSelect(f)
            }}
          />
          {file ? (
            <div className="space-y-2">
              <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-950 mx-auto flex items-center justify-center">
                <Mic className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  setTranscription('')
                }}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mx-auto"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop or tap to upload
              </p>
              <p className="text-xs text-muted-foreground">
                .wav, .mp3, .m4a, .ogg
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Button
          onClick={handleTranscribe}
          disabled={!file || loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 h-11"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {loading ? 'Transcribing...' : 'Transcribe'}
        </Button>
      </motion.div>

      {/* Results */}
      {/* Error with Retry */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className="border-destructive/50">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={handleTranscribe}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transcription && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Transcription</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {transcription.split(/\s+/).filter(Boolean).length} words
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCopy}
                      aria-label="Copy transcription"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {transcription}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Image Gen Tab
// ══════════════════════════════════════════════════════════════════════════════

function ImageGenTab() {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const abortRef = useRef<AbortController>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const data = await apiFetch<{ image: string; size: string }>('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size }),
        signal: controller.signal,
      })
      setImageUrl(data.image)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Erreur lors de la génération d\'image.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  return (
    <motion.div
      className="space-y-4 pt-2"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp}>
        <label className="text-sm font-medium mb-1.5 block">Prompt</label>
        <Textarea
          placeholder="Describe the image you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
          className="min-h-[80px] resize-none"
          maxLength={2000}
          disabled={loading}
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-muted-foreground">
            {prompt.length} / 2000
          </span>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <label className="text-sm font-medium mb-1.5 block">Size</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {IMAGE_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSize(s.value)}
              className={`
                rounded-lg border-2 p-3 text-center transition-all
                ${
                  size === s.value
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-muted hover:border-orange-300'
                }
              `}
            >
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {s.desc}
              </p>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 h-11"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </motion.div>

      {/* Error with Retry */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className="border-destructive/50">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card>
              <CardContent className="p-4">
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-muted">
                  <Skeleton className="h-full w-full" />
                </div>
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imageUrl && !loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Generated Image</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {IMAGE_SIZES.find((s) => s.value === size)?.desc}
                  </Badge>
                </div>
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={imageUrl.startsWith('data:') ? imageUrl : `data:image/png;base64,${imageUrl}`}
                    alt={prompt}
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {prompt}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Web Search Tab
// ══════════════════════════════════════════════════════════════════════════════

function WebSearchTab() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const abortRef = useRef<AbortController>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const data = await apiFetch<{ results: SearchResult[] }>(
        '/api/ai/web-search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        },
      )
      setResults(data.results || [])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Erreur lors de la recherche.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  return (
    <motion.div
      className="space-y-4 pt-2"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp}>
        <label className="text-sm font-medium mb-1.5 block">Search Query</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search the web..."
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              className="pl-9"
              maxLength={500}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || loading}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Error with Retry */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className="border-destructive/50">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={handleSearch}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="space-y-3"
            variants={stagger}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {!loading && results.length > 0 && (
        <motion.div
          className="space-y-3"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          <motion.p variants={fadeUp} className="text-xs text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </motion.p>
          {results.map((r, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                      {r.title}
                    </h3>
                    {r.date && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0"
                      >
                        {r.date}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {r.snippet}
                  </p>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    <span className="truncate max-w-[200px] sm:max-w-[320px]">
                      {r.url}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* No Results */}
      {!loading && !error && results.length === 0 && query && (
        <motion.div
          className="text-center py-12"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            No results found. Try a different query.
          </p>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && results.length === 0 && !query && (
        <motion.div
          className="text-center py-12"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-950 mx-auto flex items-center justify-center mb-3">
            <Search className="h-7 w-7 text-orange-500" />
          </div>
          <h3 className="text-sm font-semibold">Web Search</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
            Search the web for basketball tips, drills, news, and more.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Web Reader Tab
// ══════════════════════════════════════════════════════════════════════════════

function WebReaderTab() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WebReaderResult | null>(null)
  const abortRef = useRef<AbortController>(null)

  const handleRead = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const data = await apiFetch<WebReaderResult>('/api/ai/web-reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      })
      setResult(data)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Erreur lors de la lecture de la page.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRead()
  }

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  return (
    <motion.div
      className="space-y-4 pt-2"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={fadeUp}>
        <label className="text-sm font-medium mb-1.5 block">Page URL</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value.slice(0, 2048))}
              onKeyDown={handleKeyDown}
              className="pl-9"
              maxLength={2048}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleRead}
            disabled={!url.trim() || loading}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {loading ? 'Reading...' : 'Read Page'}
            </span>
          </Button>
        </div>
      </motion.div>

      {/* Error with Retry */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className="border-destructive/50">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRead}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h2 className="text-lg font-bold leading-snug">
                    {result.title}
                  </h2>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium mt-1 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {result.url}
                  </a>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {result.content}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {result.content.split(/\s+/).filter(Boolean).length} words
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={async () => {
                      await navigator.clipboard.writeText(result.content)
                      toast.success('Content copied to clipboard')
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && !error && !result && (
        <motion.div
          className="text-center py-12"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-950 mx-auto flex items-center justify-center mb-3">
            <FileText className="h-7 w-7 text-orange-500" />
          </div>
          <h3 className="text-sm font-semibold">Web Reader</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
            Extract clean text content from any web page URL.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}