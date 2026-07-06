// ── Shared constants used across all screens ──────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  pocket_ball: 'Balle de Poche',
  shifty: 'Démarquage',
  ball_handling: 'Maniement',
  speed_change: 'Vitesse',
  defense: 'Défense',
  shooting: 'Tir',
  footwork: 'Placement',
  finishing: 'Finition',
  conditioning: 'Condition',
}

export const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  pocket_ball: { icon: '👝', label: 'Balle de Poche', color: 'from-amber-500 to-orange-500' },
  shifty: { icon: '↔️', label: 'Démarquage', color: 'from-cyan-500 to-blue-500' },
  ball_handling: { icon: '🤹', label: 'Maniement', color: 'from-green-500 to-emerald-500' },
  speed_change: { icon: '⚡', label: 'Vitesse', color: 'from-yellow-500 to-amber-500' },
  defense: { icon: '🛡️', label: 'Défense', color: 'from-red-500 to-rose-500' },
  shooting: { icon: '🎯', label: 'Tir', color: 'from-purple-500 to-violet-500' },
  footwork: { icon: '🦶', label: 'Placement', color: 'from-teal-500 to-cyan-500' },
  finishing: { icon: '🏅', label: 'Finition', color: 'from-orange-500 to-red-500' },
  conditioning: { icon: '💪', label: 'Condition', color: 'from-pink-500 to-rose-500' },
}

export const CATEGORIES_LIST = [
  { key: 'all', label: 'Tous', icon: '🏀' },
  { key: 'pocket_ball', label: 'Balle de Poche', icon: '👝' },
  { key: 'shifty', label: 'Démarquage', icon: '↔️' },
  { key: 'ball_handling', label: 'Maniement', icon: '🤹' },
  { key: 'speed_change', label: 'Vitesse', icon: '⚡' },
  { key: 'defense', label: 'Défense', icon: '🛡️' },
  { key: 'shooting', label: 'Tir', icon: '🎯' },
  { key: 'footwork', label: 'Placement', icon: '🦶' },
  { key: 'finishing', label: 'Finition', icon: '🏅' },
  { key: 'conditioning', label: 'Condition', icon: '💪' },
] as const

export const DIFFICULTIES = [
  { key: 'beginner', label: 'Débutant', color: 'bg-emerald-500' },
  { key: 'intermediate', label: 'Intermédiaire', color: 'bg-orange-500' },
  { key: 'advanced', label: 'Avancé', color: 'bg-red-500' },
] as const

export const DIFFICULTY_BADGE_MAP: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
  advanced: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
}

export const DIFFICULTY_CONFIG: Record<string, { label: string; className: string }> = {
  beginner: { label: 'Débutant', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  intermediate: { label: 'Intermédiaire', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  advanced: { label: 'Avancé', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20' },
}

export function getCategoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key
}

export function getCategoryMeta(key: string) {
  return CATEGORY_META[key] ?? { icon: '🏀', label: key, color: 'from-orange-500 to-amber-500' }
}