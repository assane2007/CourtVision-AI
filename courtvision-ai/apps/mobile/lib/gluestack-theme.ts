/**
 * CourtVision AI — Gluestack-UI Custom Theme
 * =============================================
 * Maps the CourtVision Design System V3 tokens into gluestack-ui's
 * theme configuration format. This ensures a single source of truth
 * for all colors, spacing, radii, typography, and shadows.
 *
 * Import and use via the GluestackUIProvider in _layout.tsx.
 */

import { config as defaultConfig } from '@gluestack-ui/config'
import { T, palette, typePresets } from './theme'

// ─── Color Tokens ────────────────────────────────────────────

const courtVisionColors = {
  // ── Backgrounds ──
  black: T.color.background.primary,      // #080C12
  surface: T.color.background.secondary,  // #0D1119
  elevated: T.color.background.tertiary,  // #121922
  overlay: T.color.background.overlay,     // #171F2B

  // ── Brand Amber ──
  amber50: 'rgba(255,107,0,0.04)',
  amber100: 'rgba(255,107,0,0.10)',
  amber200: 'rgba(255,107,0,0.18)',
  amber300: 'rgba(255,107,0,0.28)',
  amber400: T.color.signature.light,       // #FF8C36
  amber500: T.color.signature.primary,     // #FF6B00 — brand
  amber600: T.color.signature.dark,        // #CC5500
  amber700: '#993F00',
  amber800: '#662A00',
  amber900: '#331500',

  // ── Blue Functional ──
  blue50: 'rgba(10,132,255,0.06)',
  blue100: 'rgba(10,132,255,0.10)',
  blue200: 'rgba(10,132,255,0.20)',
  blue300: '#4DA6FF',
  blue400: '#2896FF',
  blue500: '#0A84FF',
  blue600: '#0068CC',
  blue700: '#004D99',

  // ── Success Green ──
  success50: 'rgba(0,198,122,0.06)',
  success100: 'rgba(0,198,122,0.10)',
  success200: 'rgba(0,198,122,0.20)',
  success300: '#4DEBA1',
  success400: '#26D68D',
  success500: '#00C67A',
  success600: '#009E62',
  success700: '#00764A',

  // ── Error Red ──
  error50: 'rgba(255,58,94,0.06)',
  error100: 'rgba(255,58,94,0.10)',
  error200: 'rgba(255,58,94,0.20)',
  error300: '#FF6B8A',
  error400: '#FF5272',
  error500: '#FF3A5E',
  error600: '#CC2E4B',
  error700: '#992338',

  // ── Warning Yellow ──
  warning50: 'rgba(255,186,0,0.06)',
  warning100: 'rgba(255,186,0,0.10)',
  warning200: 'rgba(255,186,0,0.20)',
  warning300: '#FFD44D',
  warning400: '#FFC726',
  warning500: '#FFBA00',
  warning600: '#CC9500',
  warning700: '#997000',

  // ── Gamification Purple ──
  purple50: 'rgba(167,139,250,0.06)',
  purple100: 'rgba(167,139,250,0.10)',
  purple200: 'rgba(167,139,250,0.20)',
  purple300: '#C4B5FD',
  purple400: '#B5A3FC',
  purple500: '#A78BFA',
  purple600: '#8B6FF0',
  purple700: '#6F53E0',

  // ── Gold Achievements ──
  gold50: 'rgba(255,215,0,0.06)',
  gold100: 'rgba(255,215,0,0.10)',
  gold200: 'rgba(255,215,0,0.20)',
  gold300: '#FFE55E',
  gold400: '#FFDD2F',
  gold500: '#FFD700',
  gold600: '#CCAC00',
  gold700: '#998100',

  // ── Text ──
  textPrimary: T.color.text.primary,       // #F2F6FC
  textSecondary: T.color.text.secondary,   // #7C8FA3
  textTertiary: T.color.text.tertiary,     // #48596B
  textInverse: T.color.text.inverse,       // #080C12

  // ── Borders ──
  borderSubtle: T.color.border.subtle,     // rgba(255,255,255,0.05)
  borderDefault: T.color.border.default,   // rgba(255,255,255,0.08)
  borderStrong: T.color.border.strong,     // rgba(255,255,255,0.14)
  borderAccent: T.color.border.accent,     // rgba(255,107,0,0.22)

  // ── Special ──
  transparent: 'transparent',
  white: '#FFFFFF',
  backgroundDim: 'rgba(0,0,0,0.5)',
}

// ─── Spacing Tokens (4px grid) ───────────────────────────────

const courtVisionSpace = {
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
}

// ─── Border Radius ────────────────────────────────────────────

const courtVisionRadii = {
  'none': 0,
  'xs': 2,
  'sm': 4,
  'md': 8,
  'lg': 12,
  'xl': 16,
  '2xl': 24,
  '3xl': 32,
  'full': 9999,
}

// ─── Font Sizes ──────────────────────────────────────────────

const courtVisionFontSizes = {
  '2xs': 10,
  'xs': 11,
  'sm': 13,
  'md': 15,
  'lg': 17,
  'xl': 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 42,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
  '8xl': 96,
}

// ─── Font Weights ────────────────────────────────────────────

const courtVisionFontWeights = {
  hairline: '100',
  thin: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
}

// ─── Line Heights ────────────────────────────────────────────

const courtVisionLineHeights = {
  '2xs': 14,
  'xs': 16,
  'sm': 18,
  'md': 22,
  'lg': 24,
  'xl': 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
  '5xl': 52,
  '6xl': 68,
}

// ─── Letter Spacing ──────────────────────────────────────────

const courtVisionLetterSpacings = {
  'xs': -2,
  'sm': -1,
  'md': -0.5,
  'lg': -0.3,
  'xl': 0,
  '2xl': 0.5,
  '3xl': 1.2,
}

// ─── Opacity ─────────────────────────────────────────────────

const courtVisionOpacity = {
  0: 0,
  5: 0.05,
  10: 0.1,
  20: 0.2,
  25: 0.25,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  75: 0.75,
  80: 0.8,
  90: 0.9,
  95: 0.95,
  100: 1,
}

// ─── Shadows ─────────────────────────────────────────────────

const courtVisionShadows = {
  'none': {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  'sm': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 3,
  },
  'md': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  'lg': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  'xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 14,
  },
  'amber': {
    shadowColor: T.color.signature.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  'glow': {
    shadowColor: T.color.signature.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 10,
  },
}

// ─── Build Config ────────────────────────────────────────────

export const courtVisionGluestackConfig = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      ...courtVisionColors,

      // Map to semantic aliases that gluestack components use
      primary0: courtVisionColors.amber50,
      primary50: courtVisionColors.amber100,
      primary100: courtVisionColors.amber200,
      primary200: courtVisionColors.amber300,
      primary300: courtVisionColors.amber400,
      primary400: courtVisionColors.amber500,
      primary500: courtVisionColors.amber500,
      primary600: courtVisionColors.amber600,
      primary700: courtVisionColors.amber700,
      primary800: courtVisionColors.amber800,
      primary900: courtVisionColors.amber900,

      secondary0: courtVisionColors.blue50,
      secondary50: courtVisionColors.blue100,
      secondary100: courtVisionColors.blue200,
      secondary200: courtVisionColors.blue300,
      secondary300: courtVisionColors.blue400,
      secondary400: courtVisionColors.blue500,
      secondary500: courtVisionColors.blue500,
      secondary600: courtVisionColors.blue600,
      secondary700: courtVisionColors.blue700,

      // Background aliases
      backgroundDark0: courtVisionColors.black,
      backgroundDark50: courtVisionColors.surface,
      backgroundDark100: courtVisionColors.elevated,
      backgroundDark200: courtVisionColors.overlay,

      // Text aliases
      textDark0: courtVisionColors.textPrimary,
      textDark50: courtVisionColors.textSecondary,
      textDark100: courtVisionColors.textTertiary,

      // Border aliases
      borderDark0: courtVisionColors.borderSubtle,
      borderDark50: courtVisionColors.borderDefault,
      borderDark100: courtVisionColors.borderStrong,
    },
    space: {
      ...defaultConfig.tokens.space,
      ...courtVisionSpace,
    },
    radii: {
      ...defaultConfig.tokens.radii,
      ...courtVisionRadii,
    },
    fontSizes: {
      ...defaultConfig.tokens.fontSizes,
      ...courtVisionFontSizes,
    },
    fontWeights: {
      ...defaultConfig.tokens.fontWeights,
      ...courtVisionFontWeights,
    },
    lineHeights: {
      ...defaultConfig.tokens.lineHeights,
      ...courtVisionLineHeights,
    },
    letterSpacings: {
      ...defaultConfig.tokens.letterSpacings,
      ...courtVisionLetterSpacings,
    },
    opacity: {
      ...defaultConfig.tokens.opacity,
      ...courtVisionOpacity,
    },
  },
} as any
