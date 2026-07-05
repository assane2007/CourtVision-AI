import { create } from 'zustand'

export type Screen = 'auth' | 'onboarding' | 'home' | 'train-hub' | 'drill-detail' | 'camera-workout' | 'stats' | 'profile' | 'achievements'

interface AppState {
  currentScreen: Screen
  selectedDrillId: string | null
  screenHistory: Screen[]
  sidebarOpen: boolean

  // Navigation
  navigate: (screen: Screen) => void
  goBack: () => void
  selectDrill: (drillId: string) => void

  // Sidebar
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'auth',
  selectedDrillId: null,
  screenHistory: [],
  sidebarOpen: false,

  navigate: (screen) => set((state) => ({
    currentScreen: screen,
    screenHistory: [...state.screenHistory, state.currentScreen],
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