'use client'

import { motion } from 'framer-motion'
import { Home, Dumbbell, BarChart3, User, MessageCircle } from 'lucide-react'
import { useAppStore, type Screen } from '@/stores/app'
import { hapticLight } from '@/lib/haptics'
import { useTranslation } from '@/components/providers/language-provider'
import type { TranslationKey } from '@/lib/i18n'

const tabs: { icon: typeof Home; labelKey: TranslationKey; screen: Screen }[] = [
  { icon: Home, labelKey: 'nav.home', screen: 'home' },
  { icon: Dumbbell, labelKey: 'nav.training', screen: 'train-hub' },
  { icon: BarChart3, labelKey: 'nav.stats', screen: 'stats' },
  { icon: MessageCircle, labelKey: 'nav.messages', screen: 'ai-coach' },
  { icon: User, labelKey: 'nav.profile', screen: 'profile' },
]

export function BottomNav() {
  const currentScreen = useAppStore(s => s.currentScreen)
  const navigate = useAppStore(s => s.navigate)
  const { t } = useTranslation()

  return (
    <nav aria-label="Navigation principale" className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 pb-safe">
      <div role="tablist" className="mx-auto flex h-16 max-w-lg md:max-w-3xl lg:max-w-4xl items-center justify-around px-1">
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.screen
          return (
            <button
              key={tab.screen}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => { hapticLight(); navigate(tab.screen) }}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl min-h-[44px] min-w-[44px] px-1.5 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
              <span className="truncate max-w-[56px]">{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}