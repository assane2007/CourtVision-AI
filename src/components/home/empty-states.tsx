'use client'

import { motion } from 'framer-motion'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Animated bouncing basketball SVG
// ---------------------------------------------------------------------------
function BouncingBasketball() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-24 w-24 text-orange-500"
      fill="none"
    >
      <motion.circle
        cx="60"
        cy="60"
        r="40"
        stroke="currentColor"
        strokeWidth="3"
        fill="currentColor"
        fillOpacity={0.15}
        initial={{ y: 0 }}
        animate={{ y: [0, -20, 0] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1], // ease-in-out (bounce down, ease up)
        }}
      />
      {/* Seam lines on the ball */}
      <motion.g
        initial={{ y: 0 }}
        animate={{ y: [0, -20, 0] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
        }}
      >
        <line x1="60" y1="20" x2="60" y2="100" stroke="currentColor" strokeWidth="1.5" opacity={0.4} />
        <line x1="20" y1="60" x2="100" y2="60" stroke="currentColor" strokeWidth="1.5" opacity={0.4} />
        <path d="M 30 30 Q 60 50 30 90" stroke="currentColor" strokeWidth="1.5" fill="none" opacity={0.4} />
        <path d="M 90 30 Q 60 50 90 90" stroke="currentColor" strokeWidth="1.5" fill="none" opacity={0.4} />
      </motion.g>
      {/* Shadow */}
      <motion.ellipse
        cx="60"
        cy="108"
        rx="24"
        ry="4"
        fill="currentColor"
        initial={{ opacity: 0.3, scaleX: 1 }}
        animate={{
          opacity: [0.3, 0.1, 0.3],
          scaleX: [1, 0.6, 1],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
        }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Empty state for recommendations
// ---------------------------------------------------------------------------
export function EmptyRecommendations({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center"
    >
      <BouncingBasketball />
      <h3 className="mt-4 text-sm font-semibold text-foreground/80">
        Pr&ecirc;t &agrave; commencer ?
      </h3>
      <p className="mt-1 mb-5 max-w-[220px] text-xs text-muted-foreground leading-relaxed">
        Commencez votre premier entra&icirc;nement et l&apos;IA vous recommandera les meilleurs exercices.
      </p>
      <Button
        size="sm"
        onClick={onStart}
        className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20"
      >
        <Camera className="mr-1.5 h-3.5 w-3.5" />
        D&eacute;marrer l&apos;entra&icirc;nement
      </Button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Empty state for recent activity
// ---------------------------------------------------------------------------
export function EmptyActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center"
    >
      <BouncingBasketball />
      <h3 className="mt-4 text-sm font-semibold text-foreground/80">
        Aucune activit&eacute; r&eacute;cente
      </h3>
      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground leading-relaxed">
        Vos s&eacute;ances appara&icirc;tront ici une fois que vous aurez commenc&eacute; &agrave; vous entra&icirc;ner.
      </p>
    </motion.div>
  )
}