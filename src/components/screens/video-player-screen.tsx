'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Settings,
  PenTool,
  Sparkles,
  Download,
  Share2,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  CircleDot,
  Copy,
  Link2,
  FileOutput,
  Star,
  Highlighter,
  Type,
  Minus,
  Plus,
  RotateCcw,
  ChevronDown,
  MessageSquare,
  Check,
  AlertCircle,
  Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useNavigation } from '@/stores/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch, cn, formatLocaleDate } from '@/lib/utils'
import { toast } from 'sonner'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'

// ── Types ────────────────────────────────────────────────────────────────────

interface VideoData {
  id: string
  title: string
  description: string
  url: string
  thumbnailUrl: string | null
  durationSec: number
  fileSize: number
  mimeType: string
  width: number
  height: number
  isPublic: boolean
  viewCount: number
  tags: string
  createdAt: string
  player: { id: string; name: string; avatar: string | null }
  annotations: Annotation[]
  highlights: Highlight[]
  exports: VideoExport[]
}

interface Annotation {
  id: string
  videoId: string
  playerId: string
  type: string
  data: string
  timestampMs: number
  durationMs: number
  createdAt: string
}

interface Highlight {
  id: string
  videoId: string
  title: string
  startMs: number
  endMs: number
  type: string
  score: number | null
  createdAt: string
}

interface VideoExport {
  id: string
  videoId: string
  type: string
  format: string
  url: string | null
  status: string
  fileSize: number
  createdAt: string
  completedAt: string | null
}

type AnnotationTool = 'freehand' | 'line' | 'arrow' | 'circle' | 'text'
type AnnotationColor = string
type PlayerTab = 'highlights' | 'annotations' | 'export' | 'share'

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
const ANNOTATION_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff']

// ── Utility ──────────────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTimeMs(ms: number): string {
  return formatTime(ms / 1000)
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const { t } = useTranslation()
  const { goBack, navigate } = useNavigation()
  const queryClient = useQueryClient()

  const videoId = useMemo(() => sessionStorage.getItem('lastVideoId') || '', [])

  // ── Player State ───────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)

  // A-B Loop
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)

  // ── Active Panel ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PlayerTab>('highlights')
  const [showAnnotationTools, setShowAnnotationTools] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)

  // ── Annotation Drawing State ───────────────────────────────────────────
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('freehand')
  const [annotationColor, setAnnotationColor] = useState<AnnotationColor>('#ef4444')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([])
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [textAnnotation, setTextAnnotation] = useState('')

  // ── Highlight creation ─────────────────────────────────────────────────
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false)
  const [hlStart, setHlStart] = useState(0)
  const [hlEnd, setHlEnd] = useState(0)
  const [hlTitle, setHlTitle] = useState('')

  // ── Export Dialog ──────────────────────────────────────────────────────
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportStart, setExportStart] = useState(0)
  const [exportEnd, setExportEnd] = useState(0)
  const [exportQuality, setExportQuality] = useState('medium')
  const [exportType, setExportType] = useState('gif')

  // ── Share Dialog ───────────────────────────────────────────────────────
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // ── Fetch video ────────────────────────────────────────────────────────
  const {
    data: videoData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => apiFetch<{ video: VideoData }>(`/api/videos/${videoId}`).then((d) => d.video),
    enabled: !!videoId,
    refetchInterval: 30000,
  })

  const video = videoData

  // ── Mutations ──────────────────────────────────────────────────────────
  const saveAnnotation = useMutation({
    mutationFn: (data: { type: string; data: string; timestampMs: number; durationMs: number }) =>
      apiFetch<Annotation>(`/api/videos/${videoId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] })
      toast.success('Annotation ajoutée')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  })

  const deleteAnnotation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/videos/${videoId}/annotations/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] })
    },
  })

  const createHighlight = useMutation({
    mutationFn: (data: { title: string; startMs: number; endMs: number }) =>
      apiFetch<Highlight>(`/api/videos/${videoId}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] })
      toast.success('Highlight créé')
      setHighlightDialogOpen(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  })

  const generateHighlights = useMutation({
    mutationFn: () =>
      apiFetch<{ highlights: Highlight[] }>(`/api/videos/${videoId}/highlights/generate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] })
      toast.success('Highlights générés !')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  })

  const startExport = useMutation({
    mutationFn: (data: { type: string; startMs: number; endMs: number; quality: string }) =>
      apiFetch<{ export: VideoExport }>(`/api/videos/${videoId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId] })
      toast.success('Export démarré !')
      setExportDialogOpen(false)
      // Start polling for export status
      pollExportStatus(data.export.id)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  })

  const shareMutation = useMutation({
    mutationFn: (action: string) =>
      apiFetch<{ url?: string; embedCode?: string; post?: unknown }>(`/api/videos/${videoId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }),
    onSuccess: (data, action) => {
      if (action === 'generate-link' && data.url) {
        navigator.clipboard.writeText(data.url).then(
          () => toast.success('Lien copié !'),
          () => toast.success(data.url!)
        )
      } else if (action === 'share-to-feed') {
        toast.success('Partagé dans le fil d\'actualité !')
      }
      setShareDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['video', videoId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Erreur'),
  })

  const deleteVideo = useMutation({
    mutationFn: () =>
      fetch(`/api/videos/${videoId}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Vidéo supprimée')
      goBack()
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  // Poll export status
  const pollExportStatus = useCallback(
    (exportId: string) => {
      const interval = setInterval(async () => {
        try {
          const data = await apiFetch<{ export: VideoExport }>(`/api/videos/${videoId}/export/${exportId}`)
          if (data.export.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['video', videoId] })
            toast.success('Export terminé !')
            clearInterval(interval)
          } else if (data.export.status === 'failed') {
            toast.error('Export échoué')
            clearInterval(interval)
          }
        } catch {
          clearInterval(interval)
        }
      }, 3000)
      // Auto-stop after 5 minutes
      setTimeout(() => clearInterval(interval), 300000)
    },
    [videoId, queryClient]
  )

  // ── Video Events ───────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    setCurrentTime(vid.currentTime)

    // A-B loop enforcement
    if (loopA !== null && loopB !== null && vid.currentTime >= loopB) {
      vid.currentTime = loopA
    }
  }, [loopA, loopB])

  const handlePlay = useCallback(() => {
    videoRef.current?.play()
    setIsPlaying(true)
  }, [])

  const handlePause = useCallback(() => {
    videoRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) handlePause()
    else handlePlay()
  }, [isPlaying, handlePlay, handlePause])

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }, [])

  const handleSpeedChange = useCallback((speed: number) => {
    if (videoRef.current) videoRef.current.playbackRate = speed
    setPlaybackRate(speed)
  }, [])

  const stepFrame = useCallback((direction: 1 | -1) => {
    const vid = videoRef.current
    if (!vid) return
    // ~30fps assumption
    vid.currentTime = Math.max(0, Math.min(vid.duration, vid.currentTime + direction / 30))
  }, [])

  const setLoopPoint = useCallback((point: 'A' | 'B') => {
    const vid = videoRef.current
    if (!vid) return
    const time = vid.currentTime
    if (point === 'A') {
      setLoopA(time)
      toast.success(`Point A: ${formatTime(time)}`)
    } else {
      if (loopA !== null && time <= loopA) {
        toast.error('Le point B doit être après le point A')
        return
      }
      setLoopB(time)
      toast.success(`Point B: ${formatTime(time)}`)
    }
  }, [loopA])

  const clearLoop = useCallback(() => {
    setLoopA(null)
    setLoopB(null)
    toast.success('Boucle A-B supprimée')
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }, [])

  // Show/hide controls on activity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  // ── Annotation Drawing ─────────────────────────────────────────────────
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    }
  }, [])

  const handleDrawStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!showAnnotationTools) return
      e.preventDefault()
      const coords = getCanvasCoords(e)
      setIsDrawing(true)

      if (annotationTool === 'freehand') {
        setDrawingPoints([coords])
      } else {
        setDrawStart(coords)
      }
    },
    [showAnnotationTools, annotationTool, getCanvasCoords]
  )

  const handleDrawMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !showAnnotationTools) return
      e.preventDefault()
      const coords = getCanvasCoords(e)

      if (annotationTool === 'freehand') {
        setDrawingPoints((prev) => [...prev, coords])
      }
    },
    [isDrawing, showAnnotationTools, annotationTool, getCanvasCoords]
  )

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)

    const videoEl = videoRef.current
    if (!videoEl) return

    const timestampMs = Math.round(videoEl.currentTime * 1000)

    if (annotationTool === 'freehand' && drawingPoints.length > 1) {
      saveAnnotation.mutate({
        type: 'drawing',
        data: JSON.stringify({ points: drawingPoints, color: annotationColor }),
        timestampMs,
        durationMs: 0,
      })
    } else if (annotationTool === 'line' && drawStart) {
      const end = drawingPoints[drawingPoints.length - 1] || drawStart
      saveAnnotation.mutate({
        type: 'line',
        data: JSON.stringify({ start: drawStart, end, color: annotationColor }),
        timestampMs,
        durationMs: 0,
      })
    } else if (annotationTool === 'arrow' && drawStart) {
      const end = drawingPoints[drawingPoints.length - 1] || drawStart
      saveAnnotation.mutate({
        type: 'arrow',
        data: JSON.stringify({ start: drawStart, end, color: annotationColor }),
        timestampMs,
        durationMs: 0,
      })
    } else if (annotationTool === 'circle' && drawStart) {
      const end = drawingPoints[drawingPoints.length - 1] || drawStart
      const radius = Math.sqrt(
        Math.pow(end.x - drawStart.x, 2) + Math.pow(end.y - drawStart.y, 2)
      )
      saveAnnotation.mutate({
        type: 'circle',
        data: JSON.stringify({ center: drawStart, radius, color: annotationColor }),
        timestampMs,
        durationMs: 0,
      })
    }

    setDrawingPoints([])
    setDrawStart(null)
  }, [isDrawing, annotationTool, drawStart, drawingPoints, annotationColor, saveAnnotation])

  const handleTextAnnotation = useCallback(() => {
    if (!textAnnotation.trim()) return
    const videoEl = videoRef.current
    if (!videoEl) return

    saveAnnotation.mutate({
      type: 'text',
      data: JSON.stringify({ text: textAnnotation.trim(), x: 0.5, y: 0.1, color: annotationColor }),
      timestampMs: Math.round(videoEl.currentTime * 1000),
      durationMs: 3000,
    })
    setTextAnnotation('')
  }, [textAnnotation, annotationColor, saveAnnotation])

  // Draw annotations on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current
    const videoEl = videoRef.current
    if (!canvas || !videoEl || !showAnnotations) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = videoEl.videoWidth || 640
    canvas.height = videoEl.videoHeight || 360

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const currentMs = Math.round(videoEl.currentTime * 1000)

    if (!video?.annotations) return

    video.annotations.forEach((ann) => {
      if (ann.durationMs > 0 && (currentMs < ann.timestampMs || currentMs > ann.timestampMs + ann.durationMs)) return

      try {
        const data = JSON.parse(ann.data)

        if (ann.type === 'drawing' && Array.isArray(data.points)) {
          ctx.beginPath()
          ctx.strokeStyle = data.color || '#ef4444'
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          data.points.forEach((p: { x: number; y: number }, i: number) => {
            if (i === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          })
          ctx.stroke()
        } else if (ann.type === 'line' && data.start && data.end) {
          ctx.beginPath()
          ctx.strokeStyle = data.color || '#ef4444'
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.moveTo(data.start.x, data.start.y)
          ctx.lineTo(data.end.x, data.end.y)
          ctx.stroke()
        } else if (ann.type === 'arrow' && data.start && data.end) {
          const angle = Math.atan2(data.end.y - data.start.y, data.end.x - data.start.x)
          const headLen = 15
          ctx.beginPath()
          ctx.strokeStyle = data.color || '#ef4444'
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.moveTo(data.start.x, data.start.y)
          ctx.lineTo(data.end.x, data.end.y)
          ctx.lineTo(data.end.x - headLen * Math.cos(angle - Math.PI / 6), data.end.y - headLen * Math.sin(angle - Math.PI / 6))
          ctx.moveTo(data.end.x, data.end.y)
          ctx.lineTo(data.end.x - headLen * Math.cos(angle + Math.PI / 6), data.end.y - headLen * Math.sin(angle + Math.PI / 6))
          ctx.stroke()
        } else if (ann.type === 'circle' && data.center && data.radius) {
          ctx.beginPath()
          ctx.strokeStyle = data.color || '#ef4444'
          ctx.lineWidth = 3
          ctx.arc(data.center.x, data.center.y, data.radius, 0, Math.PI * 2)
          ctx.stroke()
        } else if (ann.type === 'text' && data.text) {
          const fontSize = Math.max(16, Math.round(canvas.width * 0.035))
          ctx.font = `bold ${fontSize}px sans-serif`
          ctx.fillStyle = data.color || '#ffffff'
          ctx.strokeStyle = 'rgba(0,0,0,0.7)'
          ctx.lineWidth = 3
          const x = (data.x || 0.5) * canvas.width
          const y = (data.y || 0.1) * canvas.height
          ctx.strokeText(data.text, x, y)
          ctx.fillText(data.text, x, y)
        }
      } catch {
        // Skip malformed annotations
      }
    })
  }, [currentTime, video?.annotations, showAnnotations])

  // Draw current drawing in progress
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isDrawing) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // The annotation render effect above also draws, so we don't need extra logic here
    // The drawing points state will be picked up in the next frame
  }, [isDrawing, drawingPoints])

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          handleTogglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) stepFrame(-1)
          else if (videoRef.current) videoRef.current.currentTime -= 5
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) stepFrame(1)
          else if (videoRef.current) videoRef.current.currentTime += 5
          break
        case 'f':
          toggleFullscreen()
          break
        case 'm':
          setIsMuted((m) => !m)
          break
        case 'a':
          setLoopPoint('A')
          break
        case 'b':
          setLoopPoint('B')
          break
      }
      resetControlsTimer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleTogglePlay, stepFrame, toggleFullscreen, setLoopPoint, resetControlsTimer])

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Highlight playback (montage)
  const [isPlayingHighlights, setIsPlayingHighlights] = useState(false)
  const playHighlightMontage = useCallback(async () => {
    if (!video?.highlights || !videoRef.current) return
    const highlights = video.highlights.filter((h) => h.type === 'auto' || h.score !== null)
    if (highlights.length === 0) return

    setIsPlayingHighlights(true)
    setIsPlaying(true)
    const vid = videoRef.current

    for (const hl of highlights) {
      vid.currentTime = hl.startMs / 1000
      await new Promise<void>((resolve) => {
        const check = () => {
          if (vid.currentTime >= hl.endMs / 1000) resolve()
          else requestAnimationFrame(check)
        }
        vid.play().then(check)
      })
    }
    vid.pause()
    setIsPlayingHighlights(false)
    setIsPlaying(false)
  }, [video?.highlights])

  // ── Render ─────────────────────────────────────────────────────────────
  if (!videoId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Aucune vidéo sélectionnée</p>
          <Button onClick={goBack}>Retour</Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3 px-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-sm">Vidéo introuvable</p>
          <Button onClick={goBack}>Retour</Button>
        </div>
      </div>
    )
  }

  // Get annotations/highlights for current time
  const currentMs = currentTime * 1000
  const visibleAnnotations = (video.annotations || []).filter(
    (a) => a.durationMs > 0
      ? currentMs >= a.timestampMs && currentMs <= a.timestampMs + a.durationMs
      : Math.abs(currentMs - a.timestampMs) < 2000
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate flex-1">{video.title}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Video Player */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div
            ref={containerRef}
            className="relative aspect-video bg-black rounded-xl overflow-hidden group"
            onMouseMove={resetControlsTimer}
            onTouchStart={resetControlsTimer}
          >
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
              onClick={handleTogglePlay}
              playsInline
              muted={isMuted}
            />

            {/* Annotation Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className={cn(
                'absolute inset-0 w-full h-full pointer-events-none',
                showAnnotationTools && 'pointer-events-auto cursor-crosshair'
              )}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            />

            {/* Buffering indicator */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}

            {/* Highlight montage badge */}
            {isPlayingHighlights && (
              <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5">
                <Star className="h-3 w-3" fill="white" /> Highlights
              </div>
            )}

            {/* A-B Loop indicator */}
            {loopA !== null && (
              <div className="absolute bottom-16 left-3 bg-black/80 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                <Timer className="h-3 w-3" />
                A: {formatTime(loopA)} {loopB !== null ? `→ B: ${formatTime(loopB)}` : '→ ...'}
              </div>
            )}

            {/* Controls overlay */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col justify-end"
                >
                  {/* Top bar */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {showAnnotationTools && (
                          <Badge variant="destructive" className="text-[10px]">
                            <PenTool className="h-3 w-3 mr-1" /> Mode annotation
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center play/pause */}
                  <div className="flex-1 flex items-center justify-center gap-8">
                    <button onClick={() => stepFrame(-1)} className="text-white/80 hover:text-white transition-colors">
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={handleTogglePlay}
                      className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center text-black hover:bg-white transition-colors"
                    >
                      {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" fill="black" />}
                    </button>
                    <button onClick={() => stepFrame(1)} className="text-white/80 hover:text-white transition-colors">
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Bottom controls */}
                  <div className="bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 space-y-2">
                    {/* Timeline */}
                    <div className="relative">
                      {/* Highlight markers on timeline */}
                      {video.highlights && video.highlights.length > 0 && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none">
                          {video.highlights.map((hl) => (
                            <div
                              key={hl.id}
                              className="absolute top-0 h-2 w-0.5 rounded bg-orange-400"
                              style={{ left: `${(hl.startMs / (duration * 1000)) * 100}%` }}
                            />
                          ))}
                        </div>
                      )}
                      {/* A-B loop markers */}
                      {loopA !== null && (
                        <div
                          className="absolute top-0 h-4 w-0.5 rounded bg-green-400 -translate-y-1"
                          style={{ left: `${(loopA / duration) * 100}%` }}
                        />
                      )}
                      {loopB !== null && (
                        <div
                          className="absolute top-0 h-4 w-0.5 rounded bg-red-400 -translate-y-1"
                          style={{ left: `${(loopB / duration) * 100}%` }}
                        />
                      )}
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="z-10"
                      />
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums min-w-[3.5rem]">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <span className="text-white/60 flex items-center gap-1">
                          {playbackRate !== 1 && `${playbackRate}x`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setIsMuted((m) => !m)} className="p-1.5 hover:text-white/80">
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                        <button onClick={toggleFullscreen} className="p-1.5 hover:text-white/80">
                          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Speed Control Bar */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="p-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {SPEED_OPTIONS.map((speed) => (
                  <Button
                    key={speed}
                    size="sm"
                    variant={playbackRate === speed ? 'default' : 'outline'}
                    className="h-7 px-2.5 text-xs shrink-0"
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed}x
                  </Button>
                ))}
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs shrink-0"
                  onClick={() => stepFrame(-1)}
                  title="Image précédente (Shift+←)"
                >
                  <ChevronLeft className="h-3 w-3 mr-0.5" />1 frame
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs shrink-0"
                  onClick={() => stepFrame(1)}
                  title="Image suivante (Shift+→)"
                >
                  1 frame<ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button
                  size="sm"
                  variant={loopA !== null ? 'default' : 'outline'}
                  className="h-7 px-2.5 text-xs shrink-0"
                  onClick={() => loopA !== null ? clearLoop() : setLoopPoint('A')}
                >
                  A
                </Button>
                <Button
                  size="sm"
                  variant={loopB !== null ? 'default' : 'outline'}
                  className="h-7 px-2.5 text-xs shrink-0"
                  onClick={() => setLoopPoint('B')}
                  disabled={loopA === null}
                >
                  B
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tool Tabs */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PlayerTab)}>
            <TabsList className="w-full h-10">
              <TabsTrigger value="highlights" className="flex-1 gap-1.5 text-xs">
                <Star className="h-3.5 w-3.5" />
                Highlights
              </TabsTrigger>
              <TabsTrigger value="annotations" className="flex-1 gap-1.5 text-xs">
                <PenTool className="h-3.5 w-3.5" />
                Annotations
              </TabsTrigger>
              <TabsTrigger value="export" className="flex-1 gap-1.5 text-xs">
                <FileOutput className="h-3.5 w-3.5" />
                Export
              </TabsTrigger>
              <TabsTrigger value="share" className="flex-1 gap-1.5 text-xs">
                <Share2 className="h-3.5 w-3.5" />
                Partage
              </TabsTrigger>
            </TabsList>

            {/* ── Highlights Tab ─────────────────────────────────────── */}
            <TabsContent value="highlights" className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateHighlights.mutate()}
                    disabled={generateHighlights.isPending}
                    className="gap-1.5"
                  >
                    {generateHighlights.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    IA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHlStart(Math.round(currentTime * 1000))
                      setHlEnd(Math.round(currentTime * 1000) + 5000)
                      setHighlightDialogOpen(true)
                    }}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Manuel
                  </Button>
                </div>
                {(video.highlights || []).length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={playHighlightMontage}
                    disabled={isPlayingHighlights}
                    className="gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" /> Montage
                  </Button>
                )}
              </div>

              <ScrollArea className="max-h-72">
                <div className="space-y-2 pr-2">
                  {(video.highlights || []).length === 0 ? (
                    <div className="text-center py-6">
                      <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun highlight</p>
                      <p className="text-xs text-muted-foreground mt-1">Générez avec l&apos;IA ou créez manuellement</p>
                    </div>
                  ) : (
                    (video.highlights || []).map((hl) => (
                      <Card
                        key={hl.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.currentTime = hl.startMs / 1000
                        }}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="h-10 w-16 rounded bg-muted flex items-center justify-center shrink-0">
                            <Play className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{hl.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeMs(hl.startMs)} → {formatTimeMs(hl.endMs)}
                              {hl.score !== null && (
                                <span className="ml-2 text-orange-500">
                                  {(hl.score * 100).toFixed(0)}%
                                </span>
                              )}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {hl.type === 'auto' ? 'IA' : 'Manuel'}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Annotations Tab ────────────────────────────────────── */}
            <TabsContent value="annotations" className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showAnnotationTools}
                    onCheckedChange={setShowAnnotationTools}
                    id="ann-toggle"
                  />
                  <Label htmlFor="ann-toggle" className="text-sm">
                    Mode dessin
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showAnnotations}
                    onCheckedChange={setShowAnnotations}
                    id="ann-show"
                  />
                  <Label htmlFor="ann-show" className="text-sm">
                    <Eye className="h-3.5 w-3.5 inline mr-1" />
                    Afficher
                  </Label>
                </div>
              </div>

              {/* Annotation tools */}
              <AnimatePresence>
                {showAnnotationTools && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <Card>
                      <CardContent className="p-3 space-y-3">
                        {/* Tool selection */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {([
                            { tool: 'freehand' as const, icon: PenTool, label: 'Dessin' },
                            { tool: 'line' as const, icon: Minus, label: 'Ligne' },
                            { tool: 'arrow' as const, icon: ChevronRight, label: 'Flèche' },
                            { tool: 'circle' as const, icon: CircleDot, label: 'Cercle' },
                            { tool: 'text' as const, icon: Type, label: 'Texte' },
                          ]).map(({ tool, icon: Icon, label }) => (
                            <Button
                              key={tool}
                              size="sm"
                              variant={annotationTool === tool ? 'default' : 'outline'}
                              className="h-8 px-2.5 text-xs shrink-0 gap-1"
                              onClick={() => setAnnotationTool(tool)}
                            >
                              <Icon className="h-3.5 w-3.5" /> {label}
                            </Button>
                          ))}
                        </div>

                        {/* Color picker */}
                        <div className="flex items-center gap-1.5">
                          {ANNOTATION_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setAnnotationColor(color)}
                              className={cn(
                                'h-6 w-6 rounded-full border-2 transition-transform',
                                annotationColor === color
                                  ? 'border-foreground scale-110'
                                  : 'border-transparent'
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        {/* Text annotation input */}
                        {annotationTool === 'text' && (
                          <div className="flex gap-2">
                            <Input
                              value={textAnnotation}
                              onChange={(e) => setTextAnnotation(e.target.value)}
                              placeholder="Texte de l'annotation..."
                              onKeyDown={(e) => e.key === 'Enter' && handleTextAnnotation()}
                              className="h-9 text-sm"
                            />
                            <Button size="sm" onClick={handleTextAnnotation} disabled={!textAnnotation.trim()}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Annotation list */}
              <ScrollArea className="max-h-52">
                <div className="space-y-2 pr-2">
                  {(video.annotations || []).length === 0 ? (
                    <div className="text-center py-6">
                      <PenTool className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucune annotation</p>
                      <p className="text-xs text-muted-foreground mt-1">Activez le mode dessin pour annoter</p>
                    </div>
                  ) : (
                    (video.annotations || []).map((ann) => (
                      <Card
                        key={ann.id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          visibleAnnotations.some((v) => v.id === ann.id)
                            ? 'ring-2 ring-orange-500'
                            : 'hover:bg-muted/50'
                        )}
                        onClick={() => {
                          if (videoRef.current) videoRef.current.currentTime = ann.timestampMs / 1000
                        }}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">{ann.type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeMs(ann.timestampMs)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAnnotation.mutate(ann.id)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Export Tab ────────────────────────────────────────── */}
            <TabsContent value="export" className="space-y-3 mt-3">
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setExportStart(Math.round(currentTime * 1000))
                  setExportEnd(Math.round(currentTime * 1000) + 10000)
                  setExportDialogOpen(true)
                }}
              >
                <FileOutput className="h-4 w-4" />
                Nouvel export
              </Button>

              <ScrollArea className="max-h-72">
                <div className="space-y-2 pr-2">
                  {(video.exports || []).length === 0 ? (
                    <div className="text-center py-6">
                      <Download className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun export</p>
                    </div>
                  ) : (
                    (video.exports || []).map((exp) => (
                      <Card key={exp.id}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] uppercase">
                                {exp.format}
                              </Badge>
                              <span className={cn(
                                'text-[10px] font-medium',
                                exp.status === 'completed' && 'text-green-500',
                                exp.status === 'failed' && 'text-destructive',
                                exp.status === 'processing' && 'text-orange-500',
                                exp.status === 'pending' && 'text-muted-foreground',
                              )}>
                                {exp.status === 'completed' ? 'Terminé' :
                                 exp.status === 'processing' ? 'Traitement...' :
                                 exp.status === 'failed' ? 'Échoué' : 'En attente'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatFileSize(exp.fileSize)} · {formatLocaleDate(new Date(exp.createdAt))}
                            </p>
                          </div>
                          {exp.status === 'completed' && exp.url && (
                            <a
                              href={exp.url}
                              download
                              className="shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          {exp.status === 'processing' && (
                            <Loader2 className="h-4 w-4 animate-spin text-orange-500 shrink-0" />
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Share Tab ─────────────────────────────────────────── */}
            <TabsContent value="share" className="space-y-3 mt-3">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    className="w-full gap-2 justify-start"
                    variant="outline"
                    onClick={() => shareMutation.mutate('generate-link')}
                    disabled={shareMutation.isPending}
                  >
                    <Link2 className="h-4 w-4 text-orange-500" />
                    Copier le lien
                    <span className="ml-auto text-xs text-muted-foreground">
                      {video.isPublic ? 'Public' : 'Rend public'}
                    </span>
                  </Button>
                  <Button
                    className="w-full gap-2 justify-start"
                    variant="outline"
                    onClick={() => shareMutation.mutate('share-to-feed')}
                    disabled={shareMutation.isPending}
                  >
                    <MessageSquare className="h-4 w-4 text-orange-500" />
                    Partager dans le fil d&apos;actualité
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardContent className="p-4">
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    onClick={() => {
                      if (confirm('Supprimer cette vidéo ? Cette action est irréversible.')) {
                        deleteVideo.mutate()
                      }
                    }}
                    disabled={deleteVideo.isPending}
                  >
                    {deleteVideo.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Supprimer la vidéo
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Video Info */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold">{video.title}</h2>
              {video.description && (
                <p className="text-sm text-muted-foreground">{video.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{video.viewCount} vues</span>
                <span>{formatTime(video.durationSec)}</span>
                <span>{formatFileSize(video.fileSize)}</span>
                <span>{video.mimeType.split('/')[1]?.toUpperCase()}</span>
                <span>{formatLocaleDate(new Date(video.createdAt))}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Highlight Creation Dialog */}
      <Dialog open={highlightDialogOpen} onOpenChange={setHighlightDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un highlight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={hlTitle}
                onChange={(e) => setHlTitle(e.target.value)}
                placeholder="Ex: Super tir à 3 points"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Début (ms)</Label>
                <Input
                  type="number"
                  value={hlStart}
                  onChange={(e) => setHlStart(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin (ms)</Label>
                <Input
                  type="number"
                  value={hlEnd}
                  onChange={(e) => setHlEnd(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHighlightDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createHighlight.mutate({ title: hlTitle || 'Highlight', startMs: hlStart, endMs: hlEnd })}
              disabled={!hlTitle.trim() || hlEnd <= hlStart || createHighlight.isPending}
            >
              {createHighlight.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exporter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gif">GIF</SelectItem>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qualité</Label>
                <Select value={exportQuality} onValueChange={setExportQuality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Début (ms)</Label>
                <Input
                  type="number"
                  value={exportStart}
                  onChange={(e) => setExportStart(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin (ms)</Label>
                <Input
                  type="number"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Durée: {formatTimeMs(exportEnd - exportStart)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={() => startExport.mutate({ type: exportType, startMs: exportStart, endMs: exportEnd, quality: exportQuality })}
              disabled={exportEnd <= exportStart || startExport.isPending}
            >
              {startExport.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}