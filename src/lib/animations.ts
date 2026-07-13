import type { Variants, Transition } from 'framer-motion';

// ─── Spring Physics Config ─────────────────────────────────────────────────

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

// ─── Shared staggered container animation ─────────────────────────────────

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

// ─── fadeInUp ─────────────────────────────────────────────────────────────

/**
 * Fade in from below with a 20px vertical offset.
 * Ideal for page-level or section-level content.
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ─── fadeInScale ──────────────────────────────────────────────────────────

/**
 * Fade in with a subtle scale from 0.95 to 1.
 * Great for modals, cards, and focused elements.
 */
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
}

// ─── slideInLeft / slideInRight ───────────────────────────────────────────

/**
 * Slide in from the left edge.
 */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

/**
 * Slide in from the right edge.
 */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ─── staggerContainer ─────────────────────────────────────────────────────

/**
 * A stagger container with 0.08s delay between children.
 * Use with itemVariants or fadeInUp as children.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

// ─── cardHover ────────────────────────────────────────────────────────────

/**
 * Interactive card hover/tap effect.
 * Apply as whileHover / whileTap props on motion elements.
 */
export const cardHover = {
  whileHover: { scale: 1.02, transition: springTransition },
  whileTap: { scale: 0.98, transition: springTransition },
}

// ─── fadeUpProps ──────────────────────────────────────────────────────────

/**
 * Drop-in props object for motion elements: spread as `{...fadeUpProps}`.
 * Mirrors the common pattern of `initial/animate/exit/transition` in one object.
 */
export const fadeUpProps = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
}

// ─── pageTransition ──────────────────────────────────────────────────────

/**
 * Page-level transition for AnimatePresence.
 * Smooth opacity + scale + subtle vertical shift.
 */
export const pageTransition: Variants = {
  initial: { opacity: 0, scale: 0.98, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}