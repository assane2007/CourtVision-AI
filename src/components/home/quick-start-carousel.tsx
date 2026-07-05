'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getCategoryMeta } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { DIFFICULTY_CONFIG } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RecommendationDrill {
  id: string
  name: string
  nameFr: string
  category: string
  difficulty: string
  icon: string
  reasonFr: string
  bestScore?: number
}

interface QuickStartCarouselProps {
  drills: RecommendationDrill[]
  onSelect: (drillId: string) => void
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
function CarouselCard({
  drill,
  onSelect,
}: {
  drill: RecommendationDrill
  onSelect: (drillId: string) => void
}) {
  const meta = getCategoryMeta(drill.category)
  const diffConfig = DIFFICULTY_CONFIG[drill.difficulty]

  return (
    <button
      type="button"
      onClick={() => onSelect(drill.id)}
      className="group relative flex-shrink-0 w-[240px] sm:w-[260px] cursor-pointer overflow-hidden rounded-2xl text-left transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Background gradient from category */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-90',
          meta.color,
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end p-4 h-[180px]">
        {/* Top-right badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="text-3xl drop-shadow-lg">{drill.icon}</span>
          <div className="flex flex-col gap-1 items-end">
            {drill.bestScore == null && (
              <Badge className="bg-white/25 text-white border-white/30 backdrop-blur-sm text-[10px] px-1.5 py-0">
                Nouveau
              </Badge>
            )}
            {diffConfig && (
              <Badge className="bg-white/25 text-white border-white/30 backdrop-blur-sm text-[10px] px-1.5 py-0">
                {diffConfig.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Bottom info */}
        <div>
          <h4 className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-1 drop-shadow-sm">
            {drill.nameFr}
          </h4>
          <p className="text-white/70 text-xs line-clamp-1 mb-1.5">{drill.reasonFr}</p>
          {drill.bestScore != null && (
            <div className="flex items-center gap-1">
              <span className="text-white/90 text-xs font-semibold tabular-nums">
                Meilleur score : {drill.bestScore}%
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Carousel
// ---------------------------------------------------------------------------
export function QuickStartCarousel({ drills, onSelect }: QuickStartCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)

    // Calculate active index from scroll position
    const cardWidth = el.querySelector('button')?.offsetWidth ?? 240
    const gap = 12
    const idx = Math.round(el.scrollLeft / (cardWidth + gap))
    setActiveIndex(Math.max(0, Math.min(idx, drills.length - 1)))
  }, [drills.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [checkScroll])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector('button')?.offsetWidth ?? 240
    const gap = 12
    const amount = cardWidth + gap
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  if (drills.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.35 }}
    >
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold tracking-tight">Recommandations IA</h2>
        </div>
      </div>

      {/* Carousel wrapper with arrow buttons on hover (desktop) */}
      <div className="group/carousel relative -mx-4 px-4">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 z-20 -translate-y-1/2 hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-card/90 border shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Défiler à gauche"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute right-1 top-1/2 z-20 -translate-y-1/2 hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-card/90 border shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Défiler à droite"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory scrollbar-none"
        >
          {drills.map((drill) => (
            <div key={drill.id} className="snap-start flex-shrink-0">
              <CarouselCard drill={drill} onSelect={onSelect} />
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        {drills.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {drills.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const el = scrollRef.current
                  if (!el) return
                  const cardWidth = el.querySelector('button')?.offsetWidth ?? 240
                  const gap = 12
                  el.scrollTo({ left: i * (cardWidth + gap), behavior: 'smooth' })
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === activeIndex
                    ? 'w-4 bg-orange-500'
                    : 'w-1.5 bg-muted-foreground/30',
                )}
                aria-label={`Aller à l'élément ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}