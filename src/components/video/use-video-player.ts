'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatTime } from '@/components/video/video-types'
import type { VideoData } from '@/components/video/video-types'

interface UseVideoPlayerOptions {
  video: VideoData | undefined
  td: (fr: string, en: string) => string
}

export function useVideoPlayer({ video, td }: UseVideoPlayerOptions) {
  // ── Player State ───────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
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

  // ── Highlight playback (montage) ───────────────────────────────────────
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

  return {
    videoRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isMuted,
    isFullscreen,
    showControls,
    isBuffering,
    loopA,
    loopB,
    isPlayingHighlights,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setPlaybackRate,
    setIsMuted,
    setIsFullscreen,
    setShowControls,
    setIsBuffering,
    setLoopA,
    setLoopB,
    handleTogglePlay,
    handleTimeUpdate,
    handleSeek,
    handleSpeedChange,
    stepFrame,
    setLoopPoint,
    clearLoop,
    toggleFullscreen,
    resetControlsTimer,
    playHighlightMontage,
  }
}