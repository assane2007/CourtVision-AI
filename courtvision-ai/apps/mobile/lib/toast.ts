/**
 * Système de toast / notifications in-app globales.
 * 
 * - Toast de succès, erreur, warning, info, XP
 * - Auto-dismiss configurable
 * - File d'attente (pas de superposition)
 * - Accessible (accessibilityLiveRegion)
 * 
 * Usage :
 *   import { toast } from '@/lib/toast'
 *   toast.success('Tir enregistré !')
 *   toast.xp('+25 XP', 'Session complétée')
 *   toast.error('Connexion perdue')
 */

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'xp'

export interface ToastMessage {
    id: string
    type: ToastType
    title: string
    subtitle?: string
    duration?: number   // ms avant auto-dismiss (défaut 3000)
    emoji?: string
}

interface ToastStore {
    messages: ToastMessage[]
    push: (msg: Omit<ToastMessage, 'id'>) => void
    dismiss: (id: string) => void
    dismissAll: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
    messages: [],

    push(msg) {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
        set(s => ({ messages: [...s.messages, { ...msg, id }].slice(-3) }))  // max 3 simultanés

        // Auto-dismiss
        const delay = msg.duration ?? 3000
        setTimeout(() => {
            set(s => ({ messages: s.messages.filter(m => m.id !== id) }))
        }, delay)
    },

    dismiss(id) {
        set(s => ({ messages: s.messages.filter(m => m.id !== id) }))
    },

    dismissAll() {
        set({ messages: [] })
    },
}))

// ─── Helpers pratiques ─────────────────────────────────────────

const push = (msg: Omit<ToastMessage, 'id'>) => useToastStore.getState().push(msg)

export const toast = {
    success: (title: string, subtitle?: string, duration = 2800) =>
        push({ type: 'success', title, subtitle, duration, emoji: '✅' }),

    error: (title: string, subtitle?: string, duration = 4000) =>
        push({ type: 'error', title, subtitle, duration, emoji: '❌' }),

    warning: (title: string, subtitle?: string, duration = 3500) =>
        push({ type: 'warning', title, subtitle, duration, emoji: '⚠️' }),

    info: (title: string, subtitle?: string, duration = 3000) =>
        push({ type: 'info', title, subtitle, duration, emoji: 'ℹ️' }),

    xp: (title: string, subtitle?: string, duration = 2500) =>
        push({ type: 'xp', title, subtitle, duration, emoji: '⚡' }),

    custom: (msg: Omit<ToastMessage, 'id'>) => push(msg),
}
