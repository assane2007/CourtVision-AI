import { create } from 'zustand'

// ── Re-export shared types from app.ts ─────────────────────────────────────────
import type { Screen } from '@/stores/app'

// ── Navigation Store ───────────────────────────────────────────────────────────

interface NavigationState {
  currentScreen: Screen
  selectedDrillId: string | null
  screenHistory: Screen[]
  sidebarOpen: boolean
  navigate: (screen: Screen) => void
  goBack: () => void
  selectDrill: (drillId: string) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useNavigation = create<NavigationState>((set) => ({
  currentScreen: 'auth',
  selectedDrillId: null,
  screenHistory: [],
  sidebarOpen: false,

  navigate: (screen) => set((state) => ({
    currentScreen: screen,
    screenHistory: [...state.screenHistory.slice(-20), state.currentScreen],
  })),

  goBack: () => set((state) => {
    const newHistory = [...state.screenHistory]
    const prevScreen = newHistory.pop() || 'home'
    return { currentScreen: prevScreen, screenHistory: newHistory }
  }),

  selectDrill: (drillId) => set({ selectedDrillId: drillId }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))