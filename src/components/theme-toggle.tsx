'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  // Avoid hydration mismatch — useSyncExternalStore is the recommended React 18+ approach
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const isDark = theme === 'dark'

  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  if (!mounted) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted" />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-muted/80 backdrop-blur-sm border border-border/50 ${className ?? ''}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="relative h-9 w-9 rounded-full hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              exit={{ rotate: 90, scale: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex items-center justify-center"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] text-amber-400" />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              exit={{ rotate: -90, scale: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex items-center justify-center"
            >
              <Moon className="h-[1.2rem] w-[1.2rem] text-slate-700" />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </div>
  )
}