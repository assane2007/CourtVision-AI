/**
 * CourtVision AI — Design System V5 "AURORA COURT"
 * =============================================================
 * Identity: Elite, Energetic, Immersive
 * Core Color: Plasma Orange (#F97316)
 * =============================================================
 */

import * as Haptics from 'expo-haptics'

const palette = {
    // 🌌 Deep court atmosphere (avoid pure black for better OLED ergonomics)
    black: '#09111D',
    surface: '#101A2B',
    elevated: '#162338',
    overlay: '#1E2D47',

    // 🔥 Plasma Orange signature
    amber: '#F97316',
    amberLight: '#FB923C',
    amberDark: '#C2410C',
    amberGlow: 'rgba(249, 115, 22, 0.46)',

    // 🌊 Aurora Cyan for data + live accents
    blue: '#2A7BFF',
    blueLight: '#5EA1FF',
    blueGlow: 'rgba(42, 123, 255, 0.34)',

    // 🥗 Semantic Growth
    green: '#16C784',
    red: '#FF4D6D',
    yellow: '#FBBF24',
    violet: '#A78BFA',
    gold: '#FACC15',

    // ⚪ Neutrals
    white: '#F7FAFF',
    slate: '#A8B4C7',
    steel: '#617089',
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
            soft: 'rgba(255,255,255,0.08)',
            base: 'rgba(255,255,255,0.14)',
            strong: 'rgba(255,255,255,0.24)',
            accent: 'rgba(249,115,22,0.35)',
        }
    },

    gradients: {
        app: [palette.black, palette.surface, '#11243D'],
        accent: [palette.amberDark, palette.amber, palette.amberLight],
        live: ['#0F1E33', '#16314F', '#0E4A64'],
    },

    // ─── Glassmorphism V4 ─────────────────────────────────────
    glass: {
        thin: {
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
        },
        base: {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.13)',
            borderWidth: 1,
        },
        frosted: {
            backgroundColor: 'rgba(18,30,48,0.78)',
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1,
        },
        vivid: {
            backgroundColor: 'rgba(249,115,22,0.15)',
            borderColor: 'rgba(249,115,22,0.34)',
            borderWidth: 1.5,
        },
        deep: {
            backgroundColor: 'rgba(9,17,29,0.90)',
            borderColor: 'rgba(255,255,255,0.10)',
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
            shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.24, shadowRadius: 12, elevation: 6
        }),
        hero: (c: string = palette.amber) => ({
            shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.50, shadowRadius: 28, elevation: 16
        }),
        organic: (c: string = palette.black) => ({
            shadowColor: c, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.56, shadowRadius: 22, elevation: 11
        })
    },

    // ─── Animations ───
    spring: {
        snappy: { damping: 15, stiffness: 240 },
        gentle: { damping: 22, stiffness: 128 },
        bouncy: { damping: 9, stiffness: 164 },
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
