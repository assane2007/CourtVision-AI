'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Dumbbell, BarChart3, User, MessageCircle } from 'lucide-react';
import { useAppStore, type Screen } from '@/stores/app';
import { hapticLight } from '@/lib/haptics';
import { useTranslation } from '@/components/providers/language-provider';
import type { TranslationKey } from '@/lib/i18n';

const tabs: { icon: typeof Home; labelKey: TranslationKey; screen: Screen }[] = [
  { icon: Home,          labelKey: 'nav.home',     screen: 'home' },
  { icon: Dumbbell,      labelKey: 'nav.training', screen: 'train-hub' },
  { icon: BarChart3,     labelKey: 'nav.stats',    screen: 'stats' },
  { icon: MessageCircle, labelKey: 'nav.messages', screen: 'messages' },
  { icon: User,          labelKey: 'nav.profile',  screen: 'profile' },
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
        background: 'rgba(6,4,0,0.9)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderTop: '1px solid rgba(249,115,22,0.1)',
        boxShadow: '0 -12px 48px rgba(0,0,0,0.5), 0 -1px 0 rgba(249,115,22,0.08)',
      }}
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)' }} />

      <div
        role="tablist"
        className="mx-auto flex h-16 max-w-lg md:max-w-3xl lg:max-w-4xl items-center justify-around px-2"
      >
        {tabs.map((tab, tabIndex) => {
          const isActive = currentScreen === tab.screen;
          return (
            <motion.button
              key={tab.screen}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => { hapticLight(); navigate(tab.screen); }}
              whileTap={{ scale: 0.88 }}
              className="relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[52px] px-2 py-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {/* Active background pill */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="navActivePill"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 38 }}
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'rgba(249,115,22,0.12)',
                      border: '1px solid rgba(249,115,22,0.22)',
                      boxShadow: '0 0 20px rgba(249,115,22,0.18)',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon container */}
              <motion.div
                animate={{
                  scale: isActive ? 1.12 : 1,
                  y: isActive ? -1.5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                className="relative z-10"
              >
                <tab.icon
                  className="h-5 w-5 transition-colors duration-200"
                  style={{ color: isActive ? '#f97316' : 'rgba(255,255,255,0.35)' }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />

                {/* Active dot indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="navDot"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 35 }}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{
                        background: '#f97316',
                        boxShadow: '0 0 8px rgba(249,115,22,0.9)',
                      }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Label */}
              <motion.span
                animate={{
                  color: isActive ? '#f97316' : 'rgba(255,255,255,0.3)',
                  fontWeight: isActive ? 800 : 500,
                }}
                transition={{ duration: 0.2 }}
                className="relative z-10 text-[10px] truncate max-w-[56px]"
              >
                {t(tab.labelKey)}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}