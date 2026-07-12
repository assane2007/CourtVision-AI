'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Dumbbell, BarChart3, User, MessageCircle } from 'lucide-react';
import { useAppStore, type Screen } from '@/stores/app';
import { hapticLight } from '@/lib/haptics';
import { useTranslation } from '@/components/providers/language-provider';
import type { TranslationKey } from '@/lib/i18n';

const tabs: { icon: typeof Home; labelKey: TranslationKey; screen: Screen }[] = [
  { icon: Home, labelKey: 'nav.home', screen: 'home' },
  { icon: Dumbbell, labelKey: 'nav.training', screen: 'train-hub' },
  { icon: BarChart3, labelKey: 'nav.stats', screen: 'stats' },
  { icon: MessageCircle, labelKey: 'nav.messages', screen: 'messages' },
  { icon: User, labelKey: 'nav.profile', screen: 'profile' },
];

export function BottomNav() {
  const currentScreen = useAppStore(s => s.currentScreen);
  const navigate = useAppStore(s => s.navigate);
  const { t } = useTranslation();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{
        background: 'rgba(8,6,0,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(249,115,22,0.12)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div
        role="tablist"
        className="mx-auto flex h-16 max-w-lg md:max-w-3xl lg:max-w-4xl items-center justify-around px-2"
      >
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.screen;
          return (
            <button
              key={tab.screen}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => { hapticLight(); navigate(tab.screen); }}
              className="relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[52px] px-2 py-1.5 rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              style={{
                background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
              }}
            >
              {/* Active glow */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="navGlow"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'rgba(249,115,22,0.1)',
                      border: '1px solid rgba(249,115,22,0.2)',
                      boxShadow: '0 0 16px rgba(249,115,22,0.2)',
                    }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="relative z-10"
              >
                <tab.icon
                  className="h-5 w-5 transition-colors duration-200"
                  style={{ color: isActive ? '#f97316' : 'rgba(255,255,255,0.4)' }}
                />
                {/* Active dot */}
                {isActive && (
                  <motion.div
                    layoutId="navDot"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#f97316', boxShadow: '0 0 6px rgba(249,115,22,0.8)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </motion.div>

              <span
                className="relative z-10 text-[10px] font-semibold truncate max-w-[56px] transition-colors duration-200"
                style={{ color: isActive ? '#f97316' : 'rgba(255,255,255,0.35)' }}
              >
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}