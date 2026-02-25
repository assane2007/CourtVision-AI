/**
 * CourtVision AI — Premium Design System V2
 * Inspiré par HomeCourt, Nike Training, et les apps sportives premium.
 * Glassmorphism, gradients, micro-animations, typographie sharp.
 */

export const T = {
    // ── Couleurs principales ──────────────────────────────────
    colors: {
        // Backgrounds
        bg:           '#050A12',
        bgSurface:    '#0A0F1A',
        card:         '#0F1724',
        cardElevated: '#141D2E',
        cardGlass:    'rgba(15,23,36,0.75)',

        // Borders
        border:       'rgba(255,255,255,0.06)',
        borderLight:  'rgba(255,255,255,0.10)',
        borderAccent: 'rgba(0,212,255,0.20)',

        // Primary gradient
        primary:      '#007AFF',
        primaryLight: '#4DA3FF',
        primaryDim:   'rgba(0,122,255,0.12)',

        // Accent (cyan neon)
        accent:       '#00E5FF',
        accentLight:  '#66F0FF',
        accentDim:    'rgba(0,229,255,0.10)',
        accentGlow:   'rgba(0,229,255,0.25)',

        // Success
        green:        '#00E676',
        greenLight:   '#69F0AE',
        greenDim:     'rgba(0,230,118,0.10)',

        // Danger
        red:          '#FF3B5C',
        redLight:     '#FF6B8A',
        redDim:       'rgba(255,59,92,0.10)',

        // Warning
        orange:       '#FF9100',
        orangeLight:  '#FFB74D',
        orangeDim:    'rgba(255,145,0,0.10)',

        // Purple (XP)
        purple:       '#B388FF',
        purpleLight:  '#CE9CFF',
        purpleDim:    'rgba(179,136,255,0.10)',

        // Gold
        gold:         '#FFD740',
        goldDim:      'rgba(255,215,64,0.10)',

        // Text
        white:        '#F0F6FC',
        textPrimary:  '#F0F6FC',
        textSecondary:'#8899A6',
        muted:        '#6B7B8D',
        dim:          '#3D4F5F',
        dimmer:       '#1C2B3A',
    },

    // ── Glass effects ──────────────────────────────────────────
    glass: {
        light: {
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
        },
        medium: {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
        },
        accent: {
            backgroundColor: 'rgba(0,229,255,0.06)',
            borderColor: 'rgba(0,229,255,0.15)',
            borderWidth: 1,
        },
        primary: {
            backgroundColor: 'rgba(0,122,255,0.08)',
            borderColor: 'rgba(0,122,255,0.18)',
            borderWidth: 1,
        },
    },

    // ── Spacing ────────────────────────────────────────────────
    space: {
        xs:  4,
        sm:  8,
        md:  12,
        lg:  16,
        xl:  20,
        xxl: 28,
        xxxl: 40,
    },

    // ── Border Radius ──────────────────────────────────────────
    radius: {
        sm:    10,
        md:    14,
        lg:    18,
        xl:    22,
        xxl:   28,
        pill:  50,
        round: 9999,
    },

    // ── Typographie ────────────────────────────────────────────
    font: {
        xs:   9,
        sm:   11,
        md:   13,
        base: 15,
        lg:   17,
        xl:   20,
        xxl:  26,
        xxxl: 32,
        hero: 42,
    },

    // ── Ombres premium ─────────────────────────────────────────
    shadow: (color: string, opacity = 0.30, radius = 16) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation: 8,
    }),

    // ── Glow effect ────────────────────────────────────────────
    glow: (color: string, intensity = 0.4) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: intensity,
        shadowRadius: 20,
        elevation: 10,
    }),

    // ── Couleur de rating ──────────────────────────────────────
    ratingColor: (v: number): string => {
        if (v >= 85) return '#00E676'
        if (v >= 70) return '#00E5FF'
        if (v >= 50) return '#FF9100'
        return '#FF3B5C'
    },

    // ── Couleur de score (live) ────────────────────────────────
    scoreColor: (v: number): string => {
        if (v >= 75) return '#00E676'
        if (v >= 50) return '#FF9100'
        return '#FF3B5C'
    },
} as const

export type ThemeColors = typeof T.colors
