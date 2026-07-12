'use client';

import React, { useCallback } from 'react';
import * as React from'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { hapticMedium } from '@/lib/haptics';

export interface AnimatedCardProps extends React.ComponentProps<typeof Card> {
  /** Disable animations entirely (overrides reduced-motion preference) */
  disableAnimation?: boolean
}

/**
 * Reusable animated card wrapper.
 *
 * - Mobile (press): `scale(0.98)` + subtle shadow reduction
 * - Desktop (hover): `scale(1.01)` + enhanced shadow
 * - Fires `hapticMedium()` on press start
 * - Respects `prefers-reduced-motion`
 */
export function AnimatedCard({
  className,
  disableAnimation = false,
  children,
  ...props
}: AnimatedCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = !disableAnimation && !prefersReducedMotion

  const handlePressStart = React.useCallback(() => {
    hapticMedium()
  }, [])

  if (!shouldAnimate) {
    return (
      <Card className={cn('transition-shadow duration-200', className)} {...props}>
        {children}
      </Card>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.98, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      transition={{ type: 'spring', stiffness: 450, damping: 30, mass: 0.8 }}
      onPointerDown={handlePressStart}
      className="rounded-xl"
    >
      <Card className={cn('transition-shadow duration-200', className)} {...props}>
        {children}
      </Card>
    </motion.div>
  )
}