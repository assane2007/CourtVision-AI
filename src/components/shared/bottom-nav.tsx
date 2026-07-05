'use client'

import { motion } from 'framer-motion'
import { Home, Dumbbell, BarChart3, User } from 'lucide-react'
import { useAppStore, type Screen } from '@/stores/app'

const tabs: { icon: typeof Home; label: string; screen: Screen }[] = [
  { icon: Home, label: 'Accueil', screen: 'home' },
  { icon: Dumbbell, label: 'Entraînement', screen: 'train-hub' },
  { icon: BarChart3, label: 'Stats', screen: 'stats' },
  { icon: User, label: 'Profil', screen: 'profile' },
]

export function BottomNav() {
  const { currentScreen, navigate } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 pb-safe">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.screen
          return (
            <button
              key={tab.screen}
              type="button"
              onClick={() => navigate(tab.screen)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? 'text-orange-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {isActive && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-5 rounded-full bg-orange-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </div>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}