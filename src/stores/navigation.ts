/**
 * Navigation store — delegates to useAppStore to ensure a single source of truth.
 * All navigation state lives in useAppStore. This module provides convenience
 * selectors for components that only need navigation state.
 */
import { useAppStore, type Screen } from '@/stores/app'

// Re-export the Screen type
export type { Screen }

/**
 * Navigation-focused selectors that read from the canonical useAppStore.
 * Using these instead of useAppStore() gives finer-grained reactivity
 * (components only re-render when navigation state changes, not workout state).
 */
export function useNavigation() {
  const currentScreen = useAppStore((s) => s.currentScreen)
  const selectedDrillId = useAppStore((s) => s.selectedDrillId)
  const screenHistory = useAppStore((s) => s.screenHistory)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const navigate = useAppStore((s) => s.navigate)
  const goBack = useAppStore((s) => s.goBack)
  const selectDrill = useAppStore((s) => s.selectDrill)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  return {
    currentScreen,
    selectedDrillId,
    screenHistory,
    sidebarOpen,
    navigate,
    goBack,
    selectDrill,
    toggleSidebar,
    setSidebarOpen,
  }
}