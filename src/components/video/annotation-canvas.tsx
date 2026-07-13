'use client';
import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';
import { cn } from '@/lib/utils';
import type { VideoData, AnnotationTool, AnnotationColor } from '@/components/video/video-types';

interface AnnotationCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>
  video: VideoData | undefined
  currentTime: number
  showAnnotationTools: boolean
  showAnnotations: boolean
  annotationTool: AnnotationTool
  annotationColor: AnnotationColor
  onSaveAnnotation: (data: { type: string; data: string; timestampMs: number; durationMs: number }) => void
}

export function AnnotationCanvas({
  videoRef,
  video,
  currentTime,
  showAnnotationTools,
  showAnnotations,
  annotationTool,
  annotationColor,
  onSaveAnnotation,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── Annotation Drawing State ───────────────────────────────────────────
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([])
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)

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
        onSaveAnnotation({
          type: 'freehand',
          data: JSON.stringify({ points: drawingPoints, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      } else if (annotationTool === 'line' && drawStart) {
        onSaveAnnotation({
          type: 'line',
          data: JSON.stringify({ start: drawStart, end: coords, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      } else if (annotationTool === 'arrow' && drawStart) {
        onSaveAnnotation({
          type: 'arrow',
          data: JSON.stringify({ start: drawStart, end: coords, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      } else if (annotationTool === 'circle' && drawStart) {
        const dx = coords.x - drawStart.x
        const dy = coords.y - drawStart.y
        const radius = Math.sqrt(dx * dx + dy * dy)
        onSaveAnnotation({
          type: 'circle',
          data: JSON.stringify({ center: drawStart, radius, color: annotationColor }),
          timestampMs: Math.round(currentTime * 1000),
          durationMs: 2000,
        })
      }

      setDrawingPoints([])
      setDrawStart(null)
    },
    [isDrawing, annotationTool, drawStart, drawingPoints, annotationColor, onSaveAnnotation, currentTime, showAnnotationTools, getCanvasCoords]
  )

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
  }, [currentTime, video?.annotations, showAnnotations, videoRef])

  // Draw current freehand in progress
  useEffect(() => {
    if (!isDrawing || annotationTool !== 'freehand' || drawingPoints.length < 2) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // The annotation render effect above also draws, so we don't need extra logic here
  }, [isDrawing, annotationTool, drawingPoints])

  return (
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
  )
}