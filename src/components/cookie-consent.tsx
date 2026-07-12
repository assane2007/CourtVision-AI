'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { useTranslation } from '@/components/providers/language-provider';

const CONSENT_KEY = 'courtvision-cookie-consent'

export function CookieConsent() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [analyticsChecked, setAnalyticsChecked] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ essential: true, analytics: analyticsChecked }))
    setVisible(false)
  }

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected')
    setVisible(false)
  }

  const handleMoreInfo = async () => {
    try {
      const res = await fetch('/api/privacy')
      const html = await res?.text()
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      URL.revokeObjectURL(url)
    } catch {
      // Silently fail
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl shadow-xl p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 shrink-0 mt-0.5">
              <Shield className="h-4 w-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                {t('cookie.description')}
              </p>

              <p className="text-xs text-muted-foreground mt-1.5 mb-2">
                {t('cookie.preferences')}
              </p>

              {/* Analytics option — disabled for future use */}
              <label className="flex items-center gap-2 mb-3 cursor-not-allowed opacity-50">
                <input
                  type="checkbox"
                  checked={analyticsChecked}
                  onChange={(e) => setAnalyticsChecked(e?.target?.checked)}
                  disabled
                  className="h-3.5 w-3.5 rounded border-muted-foreground/30 text-orange-500 focus:ring-orange-500/30"
                />
                <span className="text-xs text-muted-foreground">{t('cookie.analytics')}</span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 min-h-[44px]"
                >
                  {t('cookie.accept')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  className="text-xs px-4 min-h-[44px]"
                >
                  {t('cookie.reject')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMoreInfo}
                  className="text-xs px-3 min-h-[44px]"
                >
                  {t('cookie.moreInfo')}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}