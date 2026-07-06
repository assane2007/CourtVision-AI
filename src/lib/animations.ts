import type { Variants } from 'framer-motion'

/**
 * Shared staggered container animation.
 * Fades in and staggers children with a slight delay.
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
}

/**
 * Shared fade-up item animation.
 * Each child fades in and slides up from below.
 */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
}