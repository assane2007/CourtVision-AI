'use client'

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { hapticMedium, hapticSuccess } from '@/lib/haptics'
import { cn } from '@/lib/utils'

export interface PullToRefreshProps {
  /** Unique query key prefix to invalidate on refresh */
  queryKeys?: string[][]
  /** Custom on-refresh callback */
  onRefresh?: () => Promise<void>
  /** Pull threshold in px to trigger refresh (default: 60) */
  threshold?: number
  /** Maximum pull distance in px (default: 120) */
  maxPull?: number
  children: ReactNode
  /** Additional class name for the wrapper */
  className?: string
}

/**
 * Pull-to-refresh gesture component.
 *
 * Shows an animated basketball icon that rotates as the user pulls.
 * On release past the threshold, invalidates React Query caches and refetches.
 * Fires haptic feedback on refresh trigger.
 */
export function PullToRefresh({
  queryKeys = [],
  onRefresh,
  threshold = 60,
  maxPull = 120,
  children,
  className,
}: PullToRefreshProps) {
  const queryClient = useQueryClient()
  const prefersReducedMotion = useReducedMotion()

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const touchStartY = useRef(0)
  const scrollTop = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPulling = useRef(false)

  // ── Touch handlers ──────────────────────────────────────────────
  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    if (isRefreshing) return
    const target = e.currentTarget as HTMLElement
    scrollTop.current = target.scrollTop
    touchStartY.current = e.touches[0].clientY
    isPulling.current = false
  }, [isRefreshing])

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (isRefreshing) return
      // Only pull when at the very top of scroll
      if (scrollTop.current > 5) return

      const currentY = e.touches[0].clientY
      const diff = currentY - touchStartY.current

      if (diff > 0) {
        isPulling.current = true
        // Apply resistance (less movement the further you pull)
        const resistance = 0.5
        const clamped = Math.min(diff * resistance, maxPull)
        setPullDistance(clamped)
        setIsReady(clamped >= threshold)

        // Prevent default only when pulling
        if (clamped > 0) {
          e.preventDefault()
        }
      }
    },
    [isRefreshing, threshold, maxPull],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) {
      setPullDistance(0)
      setIsReady(false)
      return
    }

    if (pullDistance >= threshold) {
      hapticSuccess()
      setIsRefreshing(true)
      setPullDistance(60) // Keep indicator visible during refresh

      try {
        // Invalidate query caches
        const keys = queryKeys.length > 0
          ? queryKeys
          : [['stats'], ['sessions'], ['recommendations'], ['achievements']]
        await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })))
        if (onRefresh) {
          await onRefresh()
        }
        // Let refresh state show briefly
        await new Promise((r) => setTimeout(r, 400))
      } catch {
        // Ignore refresh errors
      } finally {
        setIsRefreshing(false)
        setIsReady(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
      setIsReady(false)
    }

    isPulling.current = false
  }, [pullDistance, threshold, isRefreshing, queryClient, queryKeys, onRefresh])

  // Reset on pointer cancel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleTouchCancel = () => {
      isPulling.current = false
      setPullDistance(0)
      setIsReady(false)
    }

    el.addEventListener('touchcancel', handleTouchCancel)
    return () => el.removeEventListener('touchcancel', handleTouchCancel)
  }, [])

  const rotation = prefersReducedMotion ? 0 : (pullDistance / maxPull) * 360
  const opacity = Math.min(pullDistance / 30, 1)

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isRefreshing ? 1 : opacity }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center pb-2 pt-0"
            style={{ height: isRefreshing ? 60 : pullDistance }}
          >
            {isRefreshing ? (
              <div className="h-8 w-8 rounded-full border-[3px] border-orange-500/30 border-t-orange-500 animate-spin" />
            ) : (
              <motion.div
                animate={{ rotate: rotation }}
                transition={{ type: 'tween', duration: 0 }}
                className="text-2xl"
              >
                🏀
              </motion.div>
            )}
            {!isRefreshing && pullDistance > 10 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground mt-0.5"
              >
                {isReady ? 'Relâcher pour actualiser' : 'Tirer pour actualiser'}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content — shift down when pulling */}
      <motion.div
        animate={prefersReducedMotion ? {} : { y: isRefreshing ? 60 : pullDistance }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  )
}