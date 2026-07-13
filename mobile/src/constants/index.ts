export const CATEGORY_META: Record<string, { icon: string; label: string; labelEn: string; color: string }> = {
  pocket_ball: { icon: '🏀', label: 'Balle de Poche', labelEn: 'Pocket Ball', color: '#f59e0b' },
  shifty: { icon: '↔️', label: 'Démarquage', labelEn: 'Shifty', color: '#06b6d4' },
  ball_handling: { icon: '🤹', label: 'Maniement', labelEn: 'Ball Handling', color: '#22c55e' },
  speed_change: { icon: '⚡', label: 'Vitesse', labelEn: 'Speed', color: '#eab308' },
  defense: { icon: '🛡️', label: 'Défense', labelEn: 'Defense', color: '#ef4444' },
  shooting: { icon: '🎯', label: 'Tir', labelEn: 'Shooting', color: '#a855f7' },
  footwork: { icon: '🦶', label: 'Placement', labelEn: 'Footwork', color: '#14b8a6' },
  finishing: { icon: '🏅', label: 'Finition', labelEn: 'Finishing', color: '#f97316' },
  conditioning: { icon: '💪', label: 'Condition', labelEn: 'Conditioning', color: '#ec4899' },
};

export const CATEGORIES_LIST = Object.entries(CATEGORY_META).map(([key, val]) => ({
  key,
  ...val,
}));

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://courtvision-ai.vercel.app';

export const COLORS = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  primaryLight: '#fb923c',
  background: '#ffffff',
  backgroundDark: '#0a0a0a',
  card: '#ffffff',
  cardDark: '#171717',
  text: '#171717',
  textDark: '#fafafa',
  textMuted: '#737373',
  textMutedDark: '#a3a3a3',
  border: '#e5e5e5',
  borderDark: '#262626',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#eab308',
};

export const TAB_BAR_HEIGHT = 80;
export const HEADER_HEIGHT = 56;