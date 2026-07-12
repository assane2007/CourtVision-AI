'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';

// ─── Page transition variants ──────────────────────────────────────────────────

const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    scale: 0.98,
    y: direction > 0 ? 12 : -8,
    filter: 'blur(2px)',
  }),
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    opacity: 0,
    scale: 0.97,
    y: direction > 0 ? -8 : 12,
    filter: 'blur(2px)',
  }),
}

// ─── Stagger children wrapper ──────────────────────────────────────────────────

function StaggerChildren({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.04, delayChildren: 0.08 },
        },
      }}
    >
      {typeof children === 'object' && children !== null && 'props' in children
        ? children
        : children}
    </motion.div>
  )
}

// ─── Loading spinner (uses framer-motion) ──────────────────────────────────────

export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">...</p>
      </motion.div>
    </div>
  )
}

// ─── Screen transition wrapper ─────────────────────────────────────────────────

export function ScreenTransition({
  screenKey,
  direction,
  children,
}: {
  screenKey: string
  direction: number
  children: ReactNode
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={screenKey}
        custom={direction}
        variants={prefersReducedMotion ? undefined : pageVariants}
        initial={prefersReducedMotion ? { opacity: 1 } : 'enter'}
        animate={prefersReducedMotion ? { opacity: 1 } : 'center'}
        exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
        transition={{
          duration: 0.25,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="min-h-screen"
      >
        <StaggerChildren>
          {children}
        </StaggerChildren>
      </motion.div>
    </AnimatePresence>
  )
}