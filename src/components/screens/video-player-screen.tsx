'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Share2,
  Star,
  Timer,
  AlertCircle,
  PenTool,
  FileOutput,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNavigation } from '@/stores/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'

// Video sub-components
import {
  formatTime,
  type VideoData,
  type Highlight,
  type VideoExport,
  type AnnotationTool,
  type AnnotationColor,
  type PlayerTab,
} from '@/components/video/video-types'
import { useVideoPlayer } from '@/components/video/use-video-player'
import { VideoControlsOverlay, SpeedControlBar } from '@/components/video/video-controls'
import { HighlightManager } from '@/components/video/highlight-manager'
import { AnnotationPanel } from '@/components/video/annotation-panel'
import { AnnotationCanvas } from '@/components/video/annotation-canvas'
import { ExportManager } from '@/components/video/export-manager'
import { SharePanel } from '@/components/video/share-panel'
import { VideoInfoCard } from '@/components/video/video-info-card'

// ── Component ────────────────────────────────────────────────────────────────

export default function VideoPlayerScreen() {
  const { td } = useTranslation()
  const { goBack } = useNavigation()
  const queryClient = useQueryClient()

  const videoId = useMemo(() => sessionStorage.getItem('lastVideoId') || '', [])

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

  // ── Player (hook) ──────────────────────────────────────────────────────
  const {
    videoRef, containerRef,
    isPlaying, currentTime, duration, playbackRate,
    isMuted, isFullscreen, showControls, isBuffering,
    loopA, loopB, isPlayingHighlights,
    setIsPlaying, setDuration, setIsBuffering, setIsMuted,
    handleTimeUpdate, handleTogglePlay, handleSeek,
    handleSpeedChange, stepFrame,
    setLoopPoint, clearLoop, toggleFullscreen, resetControlsTimer,
    playHighlightMontage,
  } = useVideoPlayer({ video, td })

  // ── Active Panel ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PlayerTab>('highlights')
  const [showAnnotationTools, setShowAnnotationTools] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)

  // ── Annotation tool/color ──────────────────────────────────────────────
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('freehand')
  const [annotationColor, setAnnotationColor] = useState<AnnotationColor>('#ef4444')
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

  // ── Mutations ──────────────────────────────────────────────────────────
  const saveAnnotation = useMutation({
    mutationFn: (data: { type: string; data: string; timestampMs: number; durationMs: number }) =>
      apiFetch(`/api/videos/${videoId}/annotations`, {
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
  const pollExportStatus = (exportId: string) => {
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
  }

  // Text annotation submit
  const handleTextAnnotation = () => {
    if (!textAnnotation.trim()) return
    saveAnnotation.mutate({
      type: 'text',
      data: JSON.stringify({ text: textAnnotation.trim(), x: 0.5, y: 0.1, color: annotationColor }),
      timestampMs: Math.round(currentTime * 1000),
      durationMs: 2000,
    })
    setTextAnnotation('')
  }

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
  const currentMs = player.currentTime * 1000
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
            <AnnotationCanvas
              videoRef={videoRef}
              video={video}
              currentTime={currentTime}
              showAnnotationTools={showAnnotationTools}
              showAnnotations={showAnnotations}
              annotationTool={annotationTool}
              annotationColor={annotationColor}
              onSaveAnnotation={(data) => saveAnnotation.mutate(data)}
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
              <SharePanel
                video={video}
                shareMutation={shareMutation}
                deleteVideo={deleteVideo}
                td={td}
              />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Video Info */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <VideoInfoCard video={video} td={td} />
        </motion.div>
      </div>

      <BottomNav />
    </div>
  )
}