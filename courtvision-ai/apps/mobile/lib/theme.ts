/**
 * CourtVision AI — Design System V6 "NEURAL ARENA"
 * =============================================================
 * Identity: tactical HUD precision x luxury sport
 * Core accents:
 * - Primary CTA / hero metric: Plasma Orange (#FF4D00)
 * - AI / data intelligence: Ice Cyan (#00F0FF)
 * =============================================================
 */

import * as Haptics from 'expo-haptics'

const palette = {
    // Neural Arena depth layers
    black: '#000000',
    surface: '#0A0A0A',
    elevated: '#111111',
    overlay: 'rgba(17,17,17,0.94)',

    // Accent hierarchy
    plasma: '#FF4D00',
    plasmaSoft: 'rgba(255,77,0,0.16)',
    plasmaFocus: 'rgba(255,77,0,0.40)',
    plasmaGlow: 'rgba(255,77,0,0.25)',
    ice: '#00F0FF',
    iceSoft: 'rgba(0,240,255,0.16)',
    iceGlow: 'rgba(0,240,255,0.26)',

    // Semantic signals
    green: '#22C55E',
    red: '#FF5A65',
    yellow: '#FFC145',
    violet: '#8B7CFF',
    gold: '#FFD166',

    // Text neutrals
    white: '#F5F7FA',
    slate: 'rgba(255,255,255,0.72)',
    steel: 'rgba(255,255,255,0.52)',
    ink: '#000000',
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
            primary: palette.plasma,
            secondary: palette.ice,
            dark: '#D93F00',
            glow: palette.plasmaGlow,
            muted: palette.plasmaSoft,
        },
        ai: {
            primary: palette.ice,
            glow: palette.iceGlow,
            muted: palette.iceSoft,
        },
        semantic: {
            success: palette.green,
            error: palette.red,
            warning: palette.yellow,
            info: palette.ice,
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
            hairline: 'rgba(255,255,255,0.04)',
            soft: 'rgba(255,255,255,0.06)',
            base: 'rgba(255,255,255,0.06)',
            strong: 'rgba(255,255,255,0.12)',
            accent: palette.plasmaFocus,
            ai: 'rgba(0,240,255,0.30)',
        }
    },

    gradients: {
        app: [palette.black, palette.black, palette.surface],
        accent: ['#7A2500', palette.plasma, '#FF6A33'],
        live: [palette.black, '#051416', '#082327'],
    },

    // Layered card system: void/surface/elevated
    glass: {
        thin: {
            backgroundColor: 'rgba(255,255,255,0.015)',
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 0.5,
        },
        base: {
            backgroundColor: palette.surface,
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 0.5,
        },
        frosted: {
            backgroundColor: palette.elevated,
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 0.5,
        },
        vivid: {
            backgroundColor: palette.iceSoft,
            borderColor: 'rgba(0,240,255,0.30)',
            borderWidth: 0.5,
        },
        deep: {
            backgroundColor: palette.black,
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 0.5,
        },
        cta: {
            backgroundColor: palette.plasma,
            borderColor: palette.plasmaFocus,
            borderWidth: 0.5,
        }
    },

    gamification: {
        purple: palette.violet,
        gold: palette.gold,
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
        xs: 10, sm: 14, base: 14, md: 16, lg: 18, xl: 24, '2xl': 32, '3xl': 48, hero: 72
    },

    type: {
        hero: {
            fontSize: 72, fontFamily: 'Sora_700Bold', letterSpacing: -1.4, lineHeight: 76
        },
        h1: {
            fontSize: 36, fontFamily: 'Sora_700Bold', letterSpacing: -0.72, lineHeight: 40
        },
        h2: {
            fontSize: 24, fontFamily: 'Sora_700Bold', letterSpacing: -0.48, lineHeight: 30
        },
        h3: {
            fontSize: 18, fontFamily: 'Sora_600SemiBold', letterSpacing: -0.36, lineHeight: 24
        },
        body: {
            fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 20
        },
        bodyBold: {
            fontSize: 14, fontFamily: 'DMSans_700Bold', lineHeight: 20
        },
        caption: {
            fontSize: 12, fontFamily: 'DMSans_400Regular', color: palette.slate
        },
        overline: {
            fontSize: 12, fontFamily: 'DMSans_500Medium', letterSpacing: 0.6
        },
        statLarge: {
            fontSize: 48, fontFamily: 'Sora_700Bold', letterSpacing: -0.96
        },
        screenTitle: {
            fontSize: 32, fontFamily: 'Sora_700Bold', letterSpacing: -0.64, lineHeight: 36
        },
        sectionTitle: {
            fontSize: 14, fontFamily: 'DMSans_500Medium', letterSpacing: 0.6
        },
        cardTitle: {
            fontSize: 16, fontFamily: 'DMSans_600SemiBold', letterSpacing: -0.2
        },
        mediumStat: {
            fontSize: 28, fontFamily: 'JetBrainsMono_400Regular', letterSpacing: -0.6
        },
        dataMicro: {
            fontSize: 10, fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 0.2
        },
        systemLabel: {
            fontSize: 10, fontFamily: 'JetBrainsMono_400Regular', letterSpacing: 1.1, textTransform: 'uppercase' as const
        },
    },

    // ─── Spacing ───
    spacing: {
        1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80
    },

    // ─── Radius ───
    radius: {
        sm: 8, md: 12, lg: 16, xl: 22, '2xl': 32, full: 9999
    },

    // Selective glow: primary CTA only
    glow: {
        soft: (_c: string = palette.plasma) => ({
        }),
        hero: (c: string = palette.plasma) => ({
            shadowColor: c,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 8,
        }),
        cta: (c: string = palette.plasma) => ({
            shadowColor: c,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 8,
        }),
        organic: (_c: string = palette.black) => ({
        })
    },

    // ─── Animations ───
    spring: {
        snappy: { mass: 1, damping: 18, stiffness: 200 },
        gentle: { mass: 1, damping: 18, stiffness: 200 },
        bouncy: { mass: 1, damping: 18, stiffness: 200 },
        interaction: { mass: 1, damping: 18, stiffness: 200 },
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
        if (v >= 70) return palette.ice
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
