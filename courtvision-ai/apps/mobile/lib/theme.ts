/**
 * CourtVision AI — Design System V4 "APEX"
 * =============================================================
 * Identity: Futuristic, Elite, High-Performance
 * Core Color: Amber Blaze (#FF6B00)
 * =============================================================
 */

import * as Haptics from 'expo-haptics'

const palette = {
    // 🌑 Deep Space Core
    black: '#05080C',   // Ultra deep
    surface: '#0A1018',   // L1 Surface
    elevated: '#101824',   // L2 Elevation
    overlay: '#161F2E',   // L3 Modal

    // 🔥 Amber Blaze (Spalding Signature)
    amber: '#FF6B00',
    amberLight: '#FF8A33',
    amberDark: '#D95B00',
    amberGlow: 'rgba(255, 107, 0, 0.45)',

    // 🌊 Electric Ocean (Functional / Data)
    blue: '#0A84FF',
    blueLight: '#4DA6FF',
    blueGlow: 'rgba(10, 132, 255, 0.35)',

    // 🥗 Semantic Growth
    green: '#00D97E',
    red: '#FF3659',
    yellow: '#FFC400',
    violet: '#A78BFA',
    gold: '#FFD700',

    // ⚪ Neutrals
    white: '#F8FAFC',   // Crisp white
    slate: '#94A3B8',   // Secondary
    steel: '#475569',   // Muted
    ink: '#05080C',
} as const

const baseTheme = {
    color: {
        bg: {
            primary: palette.black,
            secondary: palette.surface,
            tertiary: palette.elevated,
            overlay: palette.overlay,
        },
        brand: {
            primary: palette.amber,
            secondary: palette.amberLight,
            dark: palette.amberDark,
            glow: palette.amberGlow,
            muted: 'rgba(255,107,0,0.12)',
        },
        semantic: {
            success: palette.green,
            error: palette.red,
            warning: palette.yellow,
            info: palette.blue,
            purple: palette.violet,
            gold: palette.gold,
        },
        text: {
            primary: palette.white,
            secondary: palette.slate,
            tertiary: palette.steel,
            inverse: palette.ink,
        },
        border: {
            soft: 'rgba(255,255,255,0.06)',
            base: 'rgba(255,255,255,0.10)',
            strong: 'rgba(255,255,255,0.18)',
            accent: 'rgba(255,107,0,0.30)',
        }
    },

    // ─── Glassmorphism V4 ─────────────────────────────────────
    glass: {
        thin: {
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
        },
        base: {
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
        },
        frosted: {
            backgroundColor: 'rgba(15,25,35,0.75)',
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
        },
        vivid: {
            backgroundColor: 'rgba(255,107,0,0.08)',
            borderColor: 'rgba(255,107,0,0.22)',
            borderWidth: 1.5,
        },
        deep: {
            backgroundColor: 'rgba(5,8,12,0.85)',
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
        }
    },

    gamification: {
        purple: palette.violet,
    },

    // ─── Typography ──────────────────────────────────────────
    fonts: {
        display: {
            regular: 'Sora_400Regular',
            medium: 'Sora_500Medium',
            semibold: 'Sora_600SemiBold',
            bold: 'Sora_700Bold',
            black: 'Sora_800ExtraBold',
        },
        body: {
            regular: 'DMSans_400Regular',
            medium: 'DMSans_500Medium',
            semibold: 'DMSans_600SemiBold',
            bold: 'DMSans_700Bold',
        },
        mono: {
            regular: 'JetBrainsMono_400Regular',
        },
    },

    fontSize: {
        xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, '2xl': 32, '3xl': 48, hero: 72
    },

    type: {
        hero: {
            fontSize: 72, fontFamily: 'Sora_800ExtraBold', letterSpacing: -3, lineHeight: 76
        },
        h1: {
            fontSize: 36, fontFamily: 'Sora_800ExtraBold', letterSpacing: -1, lineHeight: 40
        },
        h2: {
            fontSize: 24, fontFamily: 'Sora_700Bold', letterSpacing: -0.5, lineHeight: 28
        },
        h3: {
            fontSize: 18, fontFamily: 'Sora_700Bold', letterSpacing: -0.3, lineHeight: 22
        },
        body: {
            fontSize: 15, fontFamily: 'DMSans_400Regular', lineHeight: 22
        },
        bodyBold: {
            fontSize: 15, fontFamily: 'DMSans_700Bold', lineHeight: 22
        },
        caption: {
            fontSize: 13, fontFamily: 'DMSans_400Regular', color: '#94A3B8'
        },
        overline: {
            fontSize: 11, fontFamily: 'Sora_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' as const
        },
        statLarge: {
            fontSize: 48, fontFamily: 'Sora_800ExtraBold', letterSpacing: -1.5
        },
        screenTitle: {
            fontSize: 32, fontFamily: 'Sora_800ExtraBold', letterSpacing: -1, lineHeight: 36
        },
        sectionTitle: {
            fontSize: 18, fontFamily: 'Sora_700Bold', letterSpacing: -0.3, textTransform: 'uppercase' as const
        },
        cardTitle: {
            fontSize: 17, fontFamily: 'Sora_600SemiBold', letterSpacing: -0.2
        },
        mediumStat: {
            fontSize: 28, fontFamily: 'Sora_800ExtraBold', letterSpacing: -1
        }
    },

    // ─── Spacing ───
    spacing: {
        1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80
    },

    // ─── Radius ───
    radius: {
        sm: 6, md: 10, lg: 16, xl: 24, '2xl': 32, full: 9999
    },

    // ─── High Fidelity Glows ───
    glow: {
        soft: (c: string = palette.amber) => ({
            shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5
        }),
        hero: (c: string = palette.amber) => ({
            shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 25, elevation: 15
        }),
        organic: (c: string = palette.black) => ({
            shadowColor: c, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10
        })
    },

    // ─── Animations ───
    spring: {
        snappy: { damping: 14, stiffness: 220 },
        gentle: { damping: 20, stiffness: 120 },
        bouncy: { damping: 8, stiffness: 150 },
    },

    stagger: {
        base: 80, fast: 40, slow: 150
    },

    zIndex: {
        base: 1, modal: 100, toast: 1000
    },

    // ─── Helpers ───
    ratingColor: (v: number) => {
        if (v >= 85) return palette.green
        if (v >= 70) return palette.amber
        if (v >= 50) return palette.yellow
        return palette.red
    }
} as const

export const impact = {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
}

// ─── Backward Compatibility Layer ────────────────────────────
const legacyT = {
    ...baseTheme,
    color: {
        ...baseTheme.color,
        signature: baseTheme.color.brand,
        gamification: baseTheme.color.semantic,
        background: baseTheme.color.bg,
    },
    colors: {
        ...baseTheme.color,
        signature: baseTheme.color.brand,
        gamification: baseTheme.color.semantic,
        background: baseTheme.color.bg,
    },
    borderRadius: baseTheme.radius,
    typePresets: baseTheme.type,
    border: baseTheme.color.border,
}

// Make T.glow callable while retaining sub-properties
const enhancedGlow = Object.assign(
    (color: string, opacity: number = 0.2) => baseTheme.glow.soft(color),
    baseTheme.glow
)

export const ApexTheme = {
    ...legacyT,
    glass: {
        ...baseTheme.glass,
        regular: baseTheme.glass.base,       // alias: glass.regular → glass.base
        accent: baseTheme.glass.vivid,        // alias: glass.accent → glass.vivid
    },
    glow: enhancedGlow,
}

// Re-export as T for project-wide use
export { ApexTheme as T }
export const colors = ApexTheme.colors
export const typePresets = baseTheme.type
export const type = baseTheme.type
export const glass = ApexTheme.glass
export const spacing = baseTheme.spacing
export const typography = { fonts: baseTheme.fonts, sizes: baseTheme.fontSize }
export const radius = baseTheme.radius
export const palette_exposed = palette
export { palette }
