'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  PenTool,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SPEED_OPTIONS, formatTime } from '@/components/video/video-types'
import type { Highlight } from '@/components/video/video-types'

interface VideoControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  isMuted: boolean
  isFullscreen: boolean
  showControls: boolean
  isBuffering: boolean
  showAnnotationTools: boolean
  isPlayingHighlights: boolean
  loopA: number | null
  loopB: number | null
  highlights: Highlight[]
  onTogglePlay: () => void
  onSeek: (value: number[]) => void
  onMuteToggle: () => void
  onFullscreenToggle: () => void
  onStepFrame: (direction: 1 | -1) => void
  td: (fr: string, en: string) => string
}

export function VideoControlsOverlay({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  isMuted,
  isFullscreen,
  showControls,
  showAnnotationTools,
  loopA,
  loopB,
  highlights,
  onTogglePlay,
  onSeek,
  onMuteToggle,
  onFullscreenToggle,
  onStepFrame,
  td,
}: VideoControlsProps) {
  return (
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
                    <PenTool className="h-3 w-3 mr-1" /> {td('Mode annotation', 'Annotation mode')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Center play/pause */}
          <div className="flex-1 flex items-center justify-center gap-8">
            <button onClick={() => onStepFrame(-1)} className="text-white/80 hover:text-white transition-colors">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={onTogglePlay}
              className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center text-black hover:bg-white transition-colors"
            >
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" fill="black" />}
            </button>
            <button onClick={() => onStepFrame(1)} className="text-white/80 hover:text-white transition-colors">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Bottom controls */}
          <div className="bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 space-y-2">
            {/* Timeline */}
            <div className="relative">
              {/* Highlight markers on timeline */}
              {highlights.length > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none">
                  {highlights.map((hl) => (
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
                onValueChange={onSeek}
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
                <button onClick={onMuteToggle} className="p-1.5 hover:text-white/80">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button onClick={onFullscreenToggle} className="p-1.5 hover:text-white/80">
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface SpeedControlBarProps {
  playbackRate: number
  loopA: number | null
  onSpeedChange: (speed: number) => void
  onStepFrame: (direction: 1 | -1) => void
  onSetLoopPoint: (point: 'A' | 'B') => void
  onClearLoop: () => void
  td: (fr: string, en: string) => string
}

export function SpeedControlBar({
  playbackRate,
  loopA,
  onSpeedChange,
  onStepFrame,
  onSetLoopPoint,
  onClearLoop,
  td,
}: SpeedControlBarProps) {
  return (
    <Card>
      <CardContent className="p-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {SPEED_OPTIONS.map((speed) => (
            <Button
              key={speed}
              size="sm"
              variant={playbackRate === speed ? 'default' : 'outline'}
              className="h-7 px-2.5 text-xs shrink-0"
              onClick={() => onSpeedChange(speed)}
            >
              {speed}x
            </Button>
          ))}
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs shrink-0"
            onClick={() => onStepFrame(-1)}
            title={td('Image précédente (Shift+←)', 'Previous frame (Shift+←)')}
          >
            <ChevronLeft className="h-3 w-3 mr-0.5" />1 frame
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs shrink-0"
            onClick={() => onStepFrame(1)}
            title={td('Image suivante (Shift+→)', 'Next frame (Shift+→)')}
          >
            1 frame<ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            size="sm"
            variant={loopA !== null ? 'default' : 'outline'}
            className="h-7 px-2.5 text-xs shrink-0"
            onClick={() => loopA !== null ? onClearLoop() : onSetLoopPoint('A')}
          >
            A
          </Button>
          <Button
            size="sm"
            variant={loopA !== null ? 'default' : 'outline'}
            className="h-7 px-2.5 text-xs shrink-0"
            onClick={() => onSetLoopPoint('B')}
            disabled={loopA === null}
          >
            B
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}