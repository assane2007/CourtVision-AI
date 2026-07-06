'use client'

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { hapticHeavy } from '@/lib/haptics'
import { cn } from '@/lib/utils'

export interface SwipeToGoBackProps {
  /** Minimum swipe distance in px to trigger go-back (default: 100) */
  threshold?: number
  children: ReactNode
  /** Additional class name */
  className?: string
}

/**
 * Swipe-right gesture to go back on detail screens.
 *
 * Shows a visual indicator (arrow + "Retour" text) during the swipe.
 * Fires haptic feedback on successful swipe back.
 * Respects `prefers-reduced-motion`.
 */
export function SwipeToGoBack({
  threshold = 100,
  children,
  className,
}: SwipeToGoBackProps) {
  const goBack = useAppStore((s) => s.goBack)
  const prefersReducedMotion = useReducedMotion()

  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isHorizontal = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontal.current = false
  }, [])

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current

      // Determine swipe direction on first significant move
      if (!isHorizontal.current) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }

      // Only handle right-swipe
      if (!isHorizontal.current || dx <= 0) {
        if (swipeX !== 0) setSwipeX(0)
        return
      }

      setIsSwiping(true)
      // Apply resistance
      setSwipeX(dx * 0.4)
    },
    [swipeX],
  )

  const handleTouchEnd = useCallback(() => {
    if (isSwiping && swipeX >= threshold) {
      hapticHeavy()
      goBack()
    }
    setIsSwiping(false)
    setSwipeX(0)
    isHorizontal.current = false
  }, [isSwiping, swipeX, threshold, goBack])

  // Reset on cancel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = () => {
      setIsSwiping(false)
      setSwipeX(0)
      isHorizontal.current = false
    }
    el.addEventListener('touchcancel', handler)
    return () => el.removeEventListener('touchcancel', handler)
  }, [])

  const indicatorOpacity = prefersReducedMotion ? 0 : Math.min(swipeX / 60, 1)

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back indicator overlay */}
      <AnimatePresence>
        {isSwiping && swipeX > 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: indicatorOpacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-y-0 left-0 z-30 flex items-center pl-4 pointer-events-none"
            style={{
              width: 120,
              background: 'linear-gradient(to right, rgba(249,115,22,0.15), transparent)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 backdrop-blur-sm"
                style={{
                  transform: `translateX(${(swipeX - 20) * 0.3}px)`,
                  opacity: indicatorOpacity,
                }}
              >
                <ArrowLeft className="h-5 w-5 text-orange-500" />
              </div>
              <span
                className="text-sm font-medium text-orange-500"
                style={{
                  opacity: indicatorOpacity * 0.8,
                  transform: `translateX(${(swipeX - 40) * 0.2}px)`,
                }}
              >
                Retour
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content that moves with swipe */}
      <motion.div
        animate={prefersReducedMotion ? {} : { x: swipeX }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  )
}