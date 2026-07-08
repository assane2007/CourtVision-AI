'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  Volume2,
  VolumeX,
  Columns2,
  Layers,
  FlipHorizontal2,
  X,
  Check,
  Search,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

import { useNavigation } from '@/stores/navigation'
import { apiFetch, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { containerVariants, itemVariants } from '@/lib/animations'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useTranslation } from '@/components/providers/language-provider'

// ── Types ────────────────────────────────────────────────────────────────────

interface VideoCompareItem {
  id: string
  title: string
  description: string
  url: string
  thumbnailUrl: string | null
  durationSec: number
  isPublic: boolean
  player: { id: string; name: string; avatar: string | null }
  annotations: Array<{ id: string; type: string; data: string; timestampMs: number; durationMs: number }>
  highlights: Array<{ id: string; title: string; startMs: number; endMs: number; score: number | null }>
}

interface VideoListItem {
  id: string
  title: string
  thumbnailUrl: string | null
  durationSec: number
  createdAt: string
}

type CompareMode = 'split' | 'overlay' | 'mirror'

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VideoCompareScreen() {
  const { td } = useTranslation()
  const { goBack } = useNavigation()

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)

  // ── State ──────────────────────────────────────────────────────────────
  const [selectedA, setSelectedA] = useState<string>('')
  const [selectedB, setSelectedB] = useState<string>('')
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')
  const [compareMode, setCompareMode] = useState<CompareMode>('split')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [_volume, _setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [showVideoPicker, setShowVideoPicker] = useState<'A' | 'B' | null>(null)
  const [isComparing, setIsComparing] = useState(false)

  // ── Fetch video list for picker ────────────────────────────────────────
  const { data: videoListData } = useQuery({
    queryKey: ['videos-pick', searchA, searchB],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        apiFetch<{ videos: VideoListItem[] }>(`/api/videos?limit=50&sortBy=createdAt${searchA ? `&search=${searchA}` : ''}`),
        apiFetch<{ videos: VideoListItem[] }>(`/api/videos?limit=50&sortBy=createdAt${searchB ? `&search=${searchB}` : ''}`),
      ])
      return { listA: a.videos, listB: b.videos }
    },
  })

  const listA = videoListData?.listA || []
  const listB = videoListData?.listB || []

  // ── Fetch comparison data ──────────────────────────────────────────────
  const { data: compareData, isLoading, isError } = useQuery({
    queryKey: ['video-compare', selectedA, selectedB],
    queryFn: () =>
      apiFetch<{ videoA: VideoCompareItem; videoB: VideoCompareItem }>(
        `/api/videos/compare?videoA=${selectedA}&videoB=${selectedB}`
      ),
    enabled: !!selectedA && !!selectedB && selectedA !== selectedB,
  })

  const videoA = compareData?.videoA
  const videoB = compareData?.videoB

  // ── Player controls (synchronized) ────────────────────────────────────
  const syncTimeUpdate = useCallback(() => {
    const master = videoARef.current
    const slave = videoBRef.current
    if (!master) return

    setCurrentTime(master.currentTime)

    if (syncEnabled && slave && !slave.paused) {
      // Gently correct drift
      const diff = Math.abs(master.currentTime - slave.currentTime)
      if (diff > 0.15) {
        slave.currentTime = master.currentTime
      }
    }
  }, [syncEnabled])

  const handleTogglePlay = useCallback(() => {
    const a = videoARef.current
    const b = videoBRef.current
    if (!a) return

    if (isPlaying) {
      a.pause()
      b?.pause()
      setIsPlaying(false)
    } else {
      a.play().then(() => {
        if (syncEnabled && b) {
          b.currentTime = a.currentTime
          b.play()
        }
        setIsPlaying(true)
      }).catch(() => {})
    }
  }, [isPlaying, syncEnabled])

  const handleSeek = useCallback((value: number[]) => {
    const a = videoARef.current
    const b = videoBRef.current
    if (a) a.currentTime = value[0]
    if (b && syncEnabled) b.currentTime = value[0]
    setCurrentTime(value[0])
  }, [syncEnabled])

  const handleSpeedChange = useCallback((speed: number) => {
    if (videoARef.current) videoARef.current.playbackRate = speed
    if (videoBRef.current) videoBRef.current.playbackRate = speed
    setPlaybackRate(speed)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const a = videoARef.current
    if (a) {
      setDuration(a.duration)
      // Sync B to same position
      if (syncEnabled && videoBRef.current) {
        videoBRef.current.currentTime = a.currentTime
      }
    }
  }, [syncEnabled])

  // ── Start comparison ──────────────────────────────────────────────────
  const startCompare = useCallback(() => {
    if (!selectedA || !selectedB || selectedA === selectedB) {
      toast.error(td('Sélectionnez deux vidéos différentes', 'Select two different videos'))
      return
    }
    setIsComparing(true)
  }, [selectedA, selectedB, td])

  const resetCompare = useCallback(() => {
    setIsComparing(false)
    setIsPlaying(false)
    setCurrentTime(0)
    setSelectedA('')
    setSelectedB('')
    videoARef.current?.pause()
    videoBRef.current?.pause()
  }, [])

  // ── Render: Selection Screen ───────────────────────────────────────────
  if (!isComparing) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
            <Button variant="ghost" size="icon" onClick={goBack} aria-label={td('Retour', 'Back')} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold truncate">{td('Comparer des vidéos', 'Compare Videos')}</h1>
          </div>
        </header>

        <motion.div
          className="mx-auto max-w-3xl px-4 py-4 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Video A selector */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{td('Vidéo A', 'Video A')}</Label>
              <Badge variant={selectedA ? 'default' : 'outline'}>
                {selectedA ? td('Sélectionnée', 'Selected') : td('Requis', 'Required')}
              </Badge>
            </div>
            <Card
              className={cn(
                'cursor-pointer transition-all hover:ring-2 hover:ring-orange-500',
                selectedA && 'ring-2 ring-orange-500'
              )}
              onClick={() => setShowVideoPicker('A')}
            >
              <CardContent className="p-4 flex items-center gap-3">
                {selectedA ? (
                  <>
                    <div className="h-12 w-20 rounded bg-muted shrink-0 overflow-hidden">
                      {listA.find((v) => v.id === selectedA)?.thumbnailUrl ? (
                        <img
                          src={listA.find((v) => v.id === selectedA)!.thumbnailUrl!}
                          alt={listA.find((v) => v.id === selectedA)?.title || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">A</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {listA.find((v) => v.id === selectedA)?.title || listB.find((v) => v.id === selectedA)?.title}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </>
                ) : (
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-12 w-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center shrink-0">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{td('Sélectionner une vidéo', 'Select a video')}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Video B selector */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{td('Vidéo B', 'Video B')}</Label>
              <Badge variant={selectedB ? 'default' : 'outline'}>
                {selectedB ? td('Sélectionnée', 'Selected') : td('Requis', 'Required')}
              </Badge>
            </div>
            <Card
              className={cn(
                'cursor-pointer transition-all hover:ring-2 hover:ring-orange-500',
                selectedB && 'ring-2 ring-orange-500'
              )}
              onClick={() => setShowVideoPicker('B')}
            >
              <CardContent className="p-4 flex items-center gap-3">
                {selectedB ? (
                  <>
                    <div className="h-12 w-20 rounded bg-muted shrink-0 overflow-hidden">
                      {listA.find((v) => v.id === selectedB)?.thumbnailUrl || listB.find((v) => v.id === selectedB)?.thumbnailUrl ? (
                        <img
                          src={(listA.find((v) => v.id === selectedB) || listB.find((v) => v.id === selectedB))!.thumbnailUrl!}
                          alt={(listA.find((v) => v.id === selectedB) || listB.find((v) => v.id === selectedB))?.title || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">B</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {listA.find((v) => v.id === selectedB)?.title || listB.find((v) => v.id === selectedB)?.title}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </>
                ) : (
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-12 w-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center shrink-0">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{td('Sélectionner une vidéo', 'Select a video')}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Compare Mode Selection */}
          <motion.div variants={itemVariants} className="space-y-3">
            <Label className="text-base font-semibold">{td('Mode de comparaison', 'Comparison Mode')}</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { mode: 'split' as const, icon: Columns2, label: td('Écran divisé', 'Split Screen'), desc: td('Côte à côte', 'Side by side') },
                { mode: 'overlay' as const, icon: Layers, label: td('Superposé', 'Overlay'), desc: td('Semi-transparent', 'Semi-transparent') },
                { mode: 'mirror' as const, icon: FlipHorizontal2, label: td('Miroir', 'Mirror'), desc: td('Retourné', 'Flipped') },
              ]).map(({ mode, icon: Icon, label, desc }) => (
                <Card
                  key={mode}
                  className={cn(
                    'cursor-pointer transition-all hover:ring-2 hover:ring-orange-500',
                    compareMode === mode && 'ring-2 ring-orange-500 bg-orange-500/5'
                  )}
                  onClick={() => setCompareMode(mode)}
                >
                  <CardContent className="p-3 text-center space-y-2">
                    <Icon className={cn('h-6 w-6 mx-auto', compareMode === mode ? 'text-orange-500' : 'text-muted-foreground')} />
                    <div>
                      <p className={cn('text-xs font-medium', compareMode === mode && 'text-orange-500')}>{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Start button */}
          <motion.div variants={itemVariants}>
            <Button
              className="w-full h-12 text-base font-semibold gap-2"
              size="lg"
              onClick={startCompare}
              disabled={!selectedA || !selectedB || selectedA === selectedB}
            >
              <Layers className="h-5 w-5" />
              {td('Démarrer la comparaison', 'Start comparison')}
            </Button>
          </motion.div>
        </motion.div>

        {/* Video Picker Sheet */}
        <Sheet open={!!showVideoPicker} onOpenChange={() => setShowVideoPicker(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {showVideoPicker === 'A' ? td('Sélectionner vidéo A', 'Select video A') : td('Sélectionner vidéo B', 'Select video B')}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={showVideoPicker === 'A' ? searchA : searchB}
                  onChange={(e) => showVideoPicker === 'A' ? setSearchA(e.target.value) : setSearchB(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 pr-2">
                  {(showVideoPicker === 'A' ? listA : listB)
                    .filter((v) => v.id !== (showVideoPicker === 'A' ? selectedB : selectedA))
                    .map((v) => {
                      const isSelected = (showVideoPicker === 'A' ? selectedA : selectedB) === v.id
                      return (
                        <Card
                          key={v.id}
                          className={cn(
                            'cursor-pointer transition-all',
                            isSelected && 'ring-2 ring-orange-500'
                          )}
                          onClick={() => {
                            if (showVideoPicker === 'A') setSelectedA(v.id)
                            else setSelectedB(v.id)
                            setShowVideoPicker(null)
                          }}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="h-12 w-20 rounded bg-muted shrink-0 overflow-hidden">
                              {v.thumbnailUrl ? (
                                <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                  {formatTime(v.durationSec)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{v.title}</p>
                              <p className="text-xs text-muted-foreground">{formatTime(v.durationSec)}</p>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-orange-500 shrink-0" />}
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        <BottomNav />
      </div>
    )
  }

  // ── Render: Comparison View ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={resetCompare} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">
              {videoA?.title || 'A'} vs {videoB?.title || 'B'}
            </h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant={compareMode === 'split' ? 'default' : 'outline'}
              className="h-7 text-xs px-2"
              onClick={() => setCompareMode('split')}
            >
              <Columns2 className="h-3.5 w-3.5 mr-1" /> {td('Split', 'Split')}
            </Button>
            <Button
              size="sm"
              variant={compareMode === 'overlay' ? 'default' : 'outline'}
              className="h-7 text-xs px-2"
              onClick={() => setCompareMode('overlay')}
            >
              <Layers className="h-3.5 w-3.5 mr-1" /> {td('Overlay', 'Overlay')}
            </Button>
            <Button
              size="sm"
              variant={compareMode === 'mirror' ? 'default' : 'outline'}
              className="h-7 text-xs px-2"
              onClick={() => setCompareMode('mirror')}
            >
              <FlipHorizontal2 className="h-3.5 w-3.5 mr-1" /> {td('Miroir', 'Mirror')}
            </Button>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {isError && (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center space-y-3 px-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm">{td('Erreur de chargement', 'Loading error')}</p>
            <Button variant="outline" onClick={resetCompare}>{td('Retour', 'Back')}</Button>
          </div>
        </div>
      )}

      {videoA && videoB && (
        <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
          {/* Video Area */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            {compareMode === 'split' && (
              <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-black aspect-video">
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    A
                  </div>
                  <video
                    ref={videoARef}
                    src={videoA.url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={syncTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    playsInline
                    muted={isMuted}
                  />
                </div>
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    B
                  </div>
                  <video
                    ref={videoBRef}
                    src={videoB.url}
                    className="w-full h-full object-contain"
                    playsInline
                    muted={isMuted}
                  />
                </div>
              </div>
            )}

            {compareMode === 'overlay' && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">A</Badge>
                  <Slider
                    value={[overlayOpacity]}
                    onValueChange={(v) => setOverlayOpacity(v[0])}
                    min={0}
                    max={100}
                    className="w-24"
                  />
                  <Badge variant="secondary" className="text-[10px]">B</Badge>
                </div>
                <video
                  ref={videoARef}
                  src={videoA.url}
                  className="absolute inset-0 w-full h-full object-contain"
                  onTimeUpdate={syncTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  playsInline
                  muted={isMuted}
                />
                <video
                  ref={videoBRef}
                  src={videoB.url}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: overlayOpacity / 100 }}
                  playsInline
                  muted={isMuted}
                />
              </div>
            )}

            {compareMode === 'mirror' && (
              <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-black aspect-video">
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    A
                  </div>
                  <video
                    ref={videoARef}
                    src={videoA.url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={syncTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    playsInline
                    muted={isMuted}
                  />
                </div>
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    B (miroir)
                  </div>
                  <video
                    ref={videoBRef}
                    src={videoB.url}
                    className="w-full h-full object-contain -scale-x-100"
                    playsInline
                    muted={isMuted}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Controls */}
          <motion.div variants={itemVariants} initial="hidden" animate="visible">
            <Card>
              <CardContent className="p-3 space-y-3">
                {/* Timeline */}
                <div>
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback controls */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (videoARef.current) videoARef.current.currentTime = 0
                      if (videoBRef.current) videoBRef.current.currentTime = 0
                    }}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={handleTogglePlay}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Speed controls */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                </div>

                {/* Sync toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="sync-toggle"
                      checked={syncEnabled}
                      onCheckedChange={setSyncEnabled}
                    />
                    <Label htmlFor="sync-toggle" className="text-sm">{td('Synchronisation', 'Synchronization')}</Label>
                  </div>
                  {syncEnabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        if (videoBRef.current && videoARef.current) {
                          videoBRef.current.currentTime = videoARef.current.currentTime
                          toast.success(td('Vidéos synchronisées', 'Videos synchronized'))
                        }
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" /> {td('Resync', 'Resync')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Video info cards */}
          <motion.div variants={itemVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <Badge className="mb-2">A</Badge>
                <p className="text-sm font-medium truncate">{videoA.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(videoA.durationSec)} · {videoA.player.name}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <Badge className="mb-2">B</Badge>
                <p className="text-sm font-medium truncate">{videoB.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(videoB.durationSec)} · {videoB.player.name}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}