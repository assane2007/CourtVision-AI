'use client'

import { useEffect, useRef, useState, useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface AnimatedNumberProps {
  /** Target value to animate towards */
  value: number
  /** Duration in ms (default: 1000) */
  duration?: number
  /** Decimal places (default: 0) */
  decimals?: number
  /** Prefix string (e.g. "€") */
  prefix?: string
  /** Suffix string (e.g. "%", " pts") */
  suffix?: string
  /** Additional class names for the container */
  className?: string
  /** Start animating immediately on mount */
  autoStart?: boolean
}

/**
 * Animated number counter using requestAnimationFrame.
 * Smoothly counts from 0 to `value` with configurable easing.
 * Respects `prefers-reduced-motion`.
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  autoStart = true,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion()
  // Always start from 0 on mount; the rAF callback handles state updates asynchronously
  const [displayValue, setDisplayValue] = useState(0)
  const frameRef = useRef<number>(0)
  const id = useId()

  // Stabilize duration to avoid re-triggering animation on every render
  const stableDuration = useMemo(() => duration, [duration])

  useEffect(() => {
    // Skip animation when reduced motion or autoStart is off — show final value immediately via rAF (async)
    if (!autoStart || prefersReducedMotion) {
      const id = requestAnimationFrame(() => setDisplayValue(value))
      return () => cancelAnimationFrame(id)
    }

    const from = 0
    const target = value
    const startTime = performance.now()

    // Ease-out cubic
    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3)
    }

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / stableDuration, 1)
      const eased = easeOutCubic(progress)
      const current = from + (target - from) * eased

      setDisplayValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, stableDuration, autoStart, prefersReducedMotion])

  const formatted = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toString()

  return (
    <span className={cn('tabular-nums', className)} aria-label={`${prefix}${value}${suffix}`}>
      {prefersReducedMotion ? (
        <span>
          {prefix}{decimals > 0 ? value.toFixed(decimals) : value}{suffix}
        </span>
      ) : (
        <motion.span
          key={id}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {prefix}{formatted}{suffix}
        </motion.span>
      )}
    </span>
  )
}