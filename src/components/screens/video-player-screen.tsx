'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Share2,
  Trash2,
  Loader2,
  Eye,
  Star,
  Timer,
  MessageSquare,
  Link2,
  AlertCircle,
  PenTool,
  FileOutput,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNavigation } from '@/stores/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch, cn, formatLocaleDate } from '@/lib/utils'
import { toast } from 'sonner'
import { itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'

// Video sub-components
import {
  formatTime,
  formatFileSize,
  type VideoData,
  type Annotation,
  type Highlight,
  type VideoExport,
  type AnnotationTool,
  type AnnotationColor,
  type PlayerTab,
} from '@/components/video/video-types'
import { VideoControlsOverlay, SpeedControlBar } from '@/components/video/video-controls'
import { HighlightManager } from '@/components/video/highlight-manager'
import { AnnotationPanel } from '@/components/video/annotation-panel'
import { ExportManager } from '@/components/video/export-manager'

// ── Component ────────────────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const { td } = useTranslation()
  const { goBack } = useNavigation()
  const queryClient = useQueryClient()

  const videoId = useMemo(() => sessionStorage.getItem('lastVideoId') || '', [])

  // ── Player State ───────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
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
  const [, setShareDialogOpen] = useState(false)

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
      toast.success(td('Annotation ajoutée', 'Annotation added'))
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : td('Erreur', 'Error')),
  })

  const deleteAnnotation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/videos/${videoId}/annotations/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error(td('Erreur', 'Error'))
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
      toast.success(td('Highlight créé', 'Highlight created'))
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
      toast.success(td('Highlights générés !', 'Highlights generated!'))
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
      toast.success(td('Export démarré !', 'Export started!'))
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
          () => toast.success(td('Lien copié !', 'Link copied!')),
          () => toast.success(data.url!)
        )
      } else if (action === 'share-to-feed') {
      toast.success(td("Partagé dans le fil d'actualité !", 'Shared in feed!'))
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
      toast.success(td('Vidéo supprimée', 'Video deleted'))
      goBack()
    },
    onError: () => toast.error(td('Erreur lors de la suppression', 'Delete error')),
  })

  // Poll export status
  const pollExportStatus = useCallback(
    (exportId: string) => {
      const interval = setInterval(async () => {
        try {
          const data = await apiFetch<{ export: VideoExport }>(`/api/videos/${videoId}/export/${exportId}`)
          if (data.export.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['video', videoId] })
            toast.success(td('Export terminé !', 'Export complete!'))
            clearInterval(interval)
          } else if (data.export.status === 'failed') {
            toast.error(td('Export échoué', 'Export failed'))
            clearInterval(interval)
          }
        } catch {
          clearInterval(interval)
        }
      }, 3000)
      // Auto-stop after 5 minutes
      setTimeout(() => clearInterval(interval), 300000)
    },
    [videoId, queryClient, td]
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
        toast.error(td('Le point B doit être après le point A', 'Point B must be after Point A'))
        return
      }
      setLoopB(time)
      toast.success(`Point B: ${formatTime(time)}`)
    }
  }, [loopA, td])

  const clearLoop = useCallback(() => {
    setLoopA(null)
    setLoopB(null)
    toast.success(td('Boucle A-B supprimée', 'A-B loop removed'))
  }, [td])

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

  const handleDrawEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !showAnnotationTools) return
      e.preventDefault()
      setIsDrawing(false)

      const coords = getCanvasCoords(e)

      if (annotationTool === 'freehand' && drawingPoints.length > 1) {
        saveAnnotation.mutate({
          type: 'freehand',
          data: JSON.stringify({ points: drawingPoints, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      } else if (annotationTool === 'line' && drawStart) {
        saveAnnotation.mutate({
          type: 'line',
          data: JSON.stringify({ start: drawStart, end: coords, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      } else if (annotationTool === 'arrow' && drawStart) {
        saveAnnotation.mutate({
          type: 'arrow',
          data: JSON.stringify({ start: drawStart, end: coords, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      } else if (annotationTool === 'circle' && drawStart) {
        const dx = coords.x - drawStart.x
        const dy = coords.y - drawStart.y
        const radius = Math.sqrt(dx * dx + dy * dy)
        saveAnnotation.mutate({
          type: 'circle',
          data: JSON.stringify({ center: drawStart, radius, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      }

      setDrawingPoints([])
      setDrawStart(null)
    },
    [isDrawing, annotationTool, drawStart, drawingPoints, annotationColor, saveAnnotation, currentTime, showAnnotationTools, getCanvasCoords]
  )

  const handleTextAnnotation = useCallback(() => {
    if (!textAnnotation.trim()) return

    saveAnnotation.mutate({
      type: 'text',
      data: JSON.stringify({ text: textAnnotation.trim(), x: 0.5, y: 0.1, color: annotationColor }),
      timestampMs: Math.round(currentTime * 1000),
      durationMs: 2000,
    })

    setTextAnnotation('')
  }, [textAnnotation, annotationColor, saveAnnotation, currentTime])

  // Draw annotations on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current
    const videoEl = videoRef.current
    if (!canvas || !videoEl || !showAnnotations) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Size canvas to match video display
    const resizeCanvas = () => {
      canvas.width = videoEl.videoWidth || 1920
      canvas.height = videoEl.videoHeight || 1080
    }
    resizeCanvas()
    videoEl.addEventListener('resize', resizeCanvas)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!video?.annotations) return

      video.annotations.forEach((ann) => {
        const startSec = ann.timestampMs / 1000
        const endSec = (ann.timestampMs + ann.durationMs) / 1000

        const isVisible = ann.durationMs > 0
          ? currentTime >= startSec && currentTime <= endSec
          : Math.abs(currentTime - startSec) < 2

        if (!isVisible) return

        try {
          const parsed = JSON.parse(ann.data)
          ctx.strokeStyle = parsed.color || '#ef4444'
          ctx.fillStyle = parsed.color || '#ef4444'
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          if (ann.type === 'freehand' && parsed.points) {
            ctx.beginPath()
            parsed.points.forEach((pt: { x: number; y: number }, i: number) => {
              if (i === 0) ctx.moveTo(pt.x, pt.y)
              else ctx.lineTo(pt.x, pt.y)
            })
            ctx.stroke()
          } else if (ann.type === 'line' && parsed.start && parsed.end) {
            ctx.beginPath()
            ctx.moveTo(parsed.start.x, parsed.start.y)
            ctx.lineTo(parsed.end.x, parsed.end.y)
            ctx.stroke()
          } else if (ann.type === 'arrow' && parsed.start && parsed.end) {
            ctx.beginPath()
            ctx.moveTo(parsed.start.x, parsed.start.y)
            ctx.lineTo(parsed.end.x, parsed.end.y)
            ctx.stroke()
          } else if (ann.type === 'circle' && parsed.center && parsed.radius) {
            ctx.beginPath()
            ctx.arc(parsed.center.x, parsed.center.y, parsed.radius, 0, Math.PI * 2)
            ctx.stroke()
          } else if (ann.type === 'text' && parsed.text) {
            ctx.font = 'bold 28px sans-serif'
            const metrics = ctx.measureText(parsed.text)
            const x = (parsed.x || 0.5) * canvas.width - metrics.width / 2
            const y = (parsed.y || 0.1) * canvas.height
            ctx.fillStyle = 'rgba(0,0,0,0.6)'
            ctx.fillRect(x - 6, y - 28, metrics.width + 12, 36)
            ctx.fillStyle = parsed.color || '#ffffff'
            ctx.fillText(parsed.text, x, y)
          }
        } catch {
          // Skip malformed annotations
        }
      })

      requestAnimationFrame(draw)
    }

    const raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      videoEl.removeEventListener('resize', resizeCanvas)
    }
  }, [currentTime, video?.annotations, showAnnotations])

  // Draw current freehand in progress
  useEffect(() => {
    if (!isDrawing || annotationTool !== 'freehand' || drawingPoints.length < 2) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // The annotation render effect above also draws, so we don't need extra logic here
  }, [isDrawing, annotationTool, drawingPoints])

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.code === 'Space') {
        e.preventDefault()
        handleTogglePlay()
      } else if (e.shiftKey && e.code === 'ArrowLeft') {
        e.preventDefault()
        stepFrame(-1)
      } else if (e.shiftKey && e.code === 'ArrowRight') {
        e.preventDefault()
        stepFrame(1)
      } else if (e.code === 'KeyA' && !e.ctrlKey && !e.metaKey) {
        setLoopPoint('A')
      } else if (e.code === 'KeyB' && !e.ctrlKey && !e.metaKey) {
        setLoopPoint('B')
      } else if (e.code === 'KeyF') {
        toggleFullscreen()
      } else if (e.code === 'KeyM') {
        setIsMuted((m) => !m)
      } else {
        resetControlsTimer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleTogglePlay, stepFrame, toggleFullscreen, setLoopPoint, resetControlsTimer])

  // Highlight playback (montage)
  const [isPlayingHighlights, setIsPlayingHighlights] = useState(false)
  const playHighlightMontage = useCallback(async () => {
    if (!video?.highlights || !videoRef.current) return
    const highlights = video.highlights.filter((h) => h.type === 'auto' || h.score !== null)
    if (highlights.length === 0) return

    setIsPlayingHighlights(true)
    const vid = videoRef.current
    vid.pause()

    for (const hl of highlights) {
      vid.currentTime = hl.startMs / 1000
      await new Promise<void>((resolve) => {
        const handleTime = () => {
          if (vid.currentTime >= hl.endMs / 1000) {
            vid.removeEventListener('timeupdate', handleTime)
            resolve()
          }
        }
        vid.addEventListener('timeupdate', handleTime)
        vid.play()
      })
      vid.pause()
      await new Promise((r) => setTimeout(r, 300))
    }
    setIsPlayingHighlights(false)
  }, [video?.highlights])

  // ── Render ─────────────────────────────────────────────────────────────
  if (!videoId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{td('Aucune vidéo sélectionnée', 'No video selected')}</p>
          <Button onClick={goBack}>{td('Retour', 'Back')}</Button>
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
          <p className="text-sm">{td('Vidéo introuvable', 'Video not found')}</p>
          <Button onClick={goBack}>{td('Retour', 'Back')}</Button>
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
  const visibleAnnotationIds = visibleAnnotations.map((a) => a.id)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label={td('Retour', 'Back')} className="shrink-0">
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
                <Star className="h-3 w-3" fill="white" /> {td('Highlights', 'Highlights')}
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
            <VideoControlsOverlay
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              playbackRate={playbackRate}
              isMuted={isMuted}
              isFullscreen={isFullscreen}
              showControls={showControls}
              isBuffering={isBuffering}
              showAnnotationTools={showAnnotationTools}
              isPlayingHighlights={isPlayingHighlights}
              loopA={loopA}
              loopB={loopB}
              highlights={video.highlights || []}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onMuteToggle={() => setIsMuted((m) => !m)}
              onFullscreenToggle={toggleFullscreen}
              onStepFrame={stepFrame}
              td={td}
            />
          </div>
        </motion.div>

        {/* Speed Control Bar */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <SpeedControlBar
            playbackRate={playbackRate}
            loopA={loopA}
            onSpeedChange={handleSpeedChange}
            onStepFrame={stepFrame}
            onSetLoopPoint={setLoopPoint}
            onClearLoop={clearLoop}
            td={td}
          />
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
                {td('Partage', 'Share')}
              </TabsTrigger>
            </TabsList>

            {/* ── Highlights Tab ─────────────────────────────────────── */}
            <TabsContent value="highlights" className="space-y-3 mt-3">
              <HighlightManager
                videoRef={videoRef}
                highlights={video.highlights || []}
                currentTime={currentTime}
                isPlayingHighlights={isPlayingHighlights}
                generateHighlights={generateHighlights}
                createHighlight={createHighlight}
                highlightDialogOpen={highlightDialogOpen}
                setHighlightDialogOpen={setHighlightDialogOpen}
                hlStart={hlStart}
                setHlStart={setHlStart}
                hlEnd={hlEnd}
                setHlEnd={setHlEnd}
                hlTitle={hlTitle}
                setHlTitle={setHlTitle}
                onPlayMontage={playHighlightMontage}
                td={td}
              />
            </TabsContent>

            {/* ── Annotations Tab ────────────────────────────────────── */}
            <TabsContent value="annotations" className="space-y-3 mt-3">
              <AnnotationPanel
                videoRef={videoRef}
                annotations={video.annotations || []}
                visibleAnnotationIds={visibleAnnotationIds}
                showAnnotationTools={showAnnotationTools}
                setShowAnnotationTools={setShowAnnotationTools}
                showAnnotations={showAnnotations}
                setShowAnnotations={setShowAnnotations}
                annotationTool={annotationTool}
                setAnnotationTool={setAnnotationTool}
                annotationColor={annotationColor}
                setAnnotationColor={setAnnotationColor}
                textAnnotation={textAnnotation}
                setTextAnnotation={setTextAnnotation}
                onTextAnnotationSubmit={handleTextAnnotation}
                onDeleteAnnotation={(id) => deleteAnnotation.mutate(id)}
                td={td}
              />
            </TabsContent>

            {/* ── Export Tab ────────────────────────────────────────── */}
            <TabsContent value="export" className="space-y-3 mt-3">
              <ExportManager
                videoExports={video.exports || []}
                currentTime={currentTime}
                startExport={startExport}
                exportDialogOpen={exportDialogOpen}
                setExportDialogOpen={setExportDialogOpen}
                exportStart={exportStart}
                setExportStart={setExportStart}
                exportEnd={exportEnd}
                setExportEnd={setExportEnd}
                exportQuality={exportQuality}
                setExportQuality={setExportQuality}
                exportType={exportType}
                setExportType={setExportType}
                td={td}
              />
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
                    {td('Copier le lien', 'Copy link')}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {video.isPublic ? td('Public', 'Public') : td('Rend public', 'Make public')}
                    </span>
                  </Button>
                  <Button
                    className="w-full gap-2 justify-start"
                    variant="outline"
                    onClick={() => shareMutation.mutate('share-to-feed')}
                    disabled={shareMutation.isPending}
                  >
                    <MessageSquare className="h-4 w-4 text-orange-500" />
                    {td("Partager dans le fil d'actualité", 'Share in feed')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardContent className="p-4">
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    onClick={() => {
                      if (confirm(td('Supprimer cette vidéo ? Cette action est irréversible.', 'Delete this video? This action is irreversible.'))) {
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
                    {td('Supprimer la vidéo', 'Delete video')}
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
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{video.viewCount} {td('vues', 'views')}</span>
                <span>{formatTime(video.durationSec)}</span>
                <span>{formatFileSize(video.fileSize)}</span>
                <span>{video.mimeType.split('/')[1]?.toUpperCase()}</span>
                <span>{formatLocaleDate(new Date(video.createdAt))}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  )
}