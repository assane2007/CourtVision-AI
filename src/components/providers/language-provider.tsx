'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import {
  translations,
  detectBrowserLanguage,
  type AppLanguage,
  type TranslationKey,
} from '@/lib/i18n'

// ── Context shape ────────────────────────────────────────────────────────────
interface LanguageContextValue {
  language: AppLanguage
  setLanguage: (lang: AppLanguage) => Promise<void>
  /** Translate a key using the current language */
  t: (key: TranslationKey) => string
  /** Translate a category key */
  tc: (category: string) => string
  /** Translate inline bilingual string: td('French', 'English') or legacy difficulty key: td('facile') */
  td: (fr: string, en?: string) => string
  /** Whether the language has been loaded from the server */
  isLoaded: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'courtvision-lang'

// ── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    // Initial state: try localStorage, then browser language
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'fr' || stored === 'en') return stored
    }
    return detectBrowserLanguage()
  })
  const [isLoaded, setIsLoaded] = useState(true) // Start as loaded (use localStorage/browser lang)
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // ── Persist language to localStorage & sync <html lang> when it changes ──
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  // ── setLanguage: update state + persist to server ────────────────────────
  const setLanguage = useCallback(async (lang: AppLanguage) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)

    // Best-effort server sync (don't block UI)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      })
    } catch {
      // The local state is already correct; server will catch up later
    }
  }, [])

  // ── Translation function ─────────────────────────────────────────────────
  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language]?.[key] ?? translations.fr[key] ?? key
    },
    [language],
  )

  // ── Category translation ─────────────────────────────────────────────────
  const tc = useCallback(
    (category: string): string => {
      const key = `category.${category}` as TranslationKey
      const val = translations[language]?.[key]
      if (val && val !== key) return val
      const frVal = translations.fr[key]
      if (frVal && frVal !== key) return frVal
      return category
    },
    [language],
  )

  // ── Inline bilingual / difficulty translation ────────────────────────────
  // td('Français', 'English') → returns the string matching current language
  // td('facile')               → legacy difficulty key lookup
  const td = useCallback(
    (fr: string, en?: string): string => {
      if (en !== undefined) {
        return language === 'en' ? en : fr
      }
      // Legacy single-arg: difficulty key lookup
      const key = `difficulty.${fr}` as TranslationKey
      const val = translations[language]?.[key]
      if (val && val !== key) return val
      return fr
    },
    [language],
  )

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, tc, td, isLoaded }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within a <LanguageProvider>')
  }
  return ctx
}

// ── Convenience: re-export server-side t from i18n.ts for use in server code
export { type AppLanguage, type TranslationKey } from '@/lib/i18n'