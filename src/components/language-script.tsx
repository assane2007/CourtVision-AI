'use client'

import { useEffect } from 'react'

/**
 * Detects the user's preferred language from localStorage or navigator,
 * then sets `document.documentElement.lang` accordingly.
 *
 * Replaces the previous inline `<script dangerouslySetInnerHTML>` approach
 * so we can use nonce-based CSP without `unsafe-inline`.
 */
export function LanguageScript() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('courtvision-lang')
      const browserLang = navigator.language.split('-')[0]
      const lang = (stored === 'fr' || stored === 'en')
        ? stored
        : (browserLang === 'fr' || browserLang === 'en')
          ? browserLang
          : 'fr'
      document.documentElement.lang = lang
    } catch {
      // localStorage unavailable – keep the default "fr" from the HTML
    }
  }, [])

  return null
}