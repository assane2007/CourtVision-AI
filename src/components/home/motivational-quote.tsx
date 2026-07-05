'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'

// ---------------------------------------------------------------------------
// 20+ French basketball motivational quotes
// ---------------------------------------------------------------------------
const QUOTES: { text: string; author: string }[] = [
  { text: "La pratique ne fait pas parfait. La pratique parfaite fait parfait.", author: "Vince Lombardi" },
  { text: "Le talent gagne des matchs, mais le travail d'équipe et l'intelligence gagnent des championnats.", author: "Michael Jordan" },
  { text: "Je rate plus de 9 000 tirs dans ma carrière. J'ai perdu presque 300 matchs. J'ai échoué encore et encore. C'est pourquoi je réussis.", author: "Michael Jordan" },
  { text: "Chaque matin, vous avez deux choix : continuer à dormir ou vous lever et poursuivre vos rêves.", author: "Unknown" },
  { text: "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.", author: "Winston Churchill" },
  { text: "Si vous ne vous entraînez pas dur, quelqu'un d'autre le fera.", author: "Unknown" },
  { text: "Un champion est quelqu'un qui se lève quand il ne le peut plus.", author: "Unknown" },
  { text: "Le basket est comme la vie : il faut savoir rebondir.", author: "Unknown" },
  { text: "Ne laissez personne vous dire que vos rêves sont impossibles.", author: "Unknown" },
  { text: "La discipline est le pont entre les objectifs et la réussite.", author: "Jim Rohn" },
  { text: "Les champions ne deviennent pas champions sur le terrain. Ils sont simplement reconnus sur le terrain.", author: "Unknown" },
  { text: "Le seul endroit où le succès précède le travail est dans le dictionnaire.", author: "Vidal Sassoon" },
  { text: "Il n'y a pas de raccourci vers un endroit qui en vaut la peine.", author: "Beverly Sills" },
  { text: "La différence entre l'ordinaire et l'extraordinaire, c'est ce petit plus.", author: "Jimmy Johnson" },
  { text: "Le travail acharné bat le talent quand le talent ne travaille pas dur.", author: "Tim Notke" },
  { text: "La pression, c'est ce que vous ressentez quand vous ne savez pas ce que vous faites.", author: "Chuck Noll" },
  { text: "Le sacrifice est le prix de la réussite dans tout domaine de la vie.", author: "Unknown" },
  { text: "Vous devez vous attendre à de grandes choses de vous-même avant de pouvoir les accomplir.", author: "Michael Jordan" },
  { text: "Chaque grande réalisation a été autrefois considérée comme impossible.", author: "Unknown" },
  { text: "Le secret du succès est de commencer.", author: "Mark Twain" },
  { text: "L'échec est la mère du succès.", author: "Proverbe chinois" },
  { text: "Obstinez-vous et persévérez, la victoire est au bout.", author: "Voltaire" },
]

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function MotivationalQuote() {
  const quote = useMemo(() => {
    const idx = getDayOfYear() % QUOTES.length
    return QUOTES[idx]
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.25 }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-muted/50 to-muted/20 px-5 py-5"
    >
      <Quote className="absolute -top-1 -left-1 h-16 w-16 text-muted-foreground/[0.07]" />
      <Quote className="absolute -bottom-1 -right-1 h-16 w-16 rotate-180 text-muted-foreground/[0.07]" />

      <blockquote className="relative z-10">
        <p className="text-sm leading-relaxed text-foreground/80 italic mb-2">
          &laquo;&nbsp;{quote.text}&nbsp;&raquo;
        </p>
        <footer className="text-xs font-medium text-muted-foreground">
          &mdash; {quote.author}
        </footer>
      </blockquote>
    </motion.div>
  )
}