/**
 * CourtVision AI — Design System
 * Source unique de vérité pour couleurs, spacing, typographie.
 * Importer `T` au lieu de dupliquer les valeurs partout.
 */

export const T = {
    // ── Couleurs ──────────────────────────────────────────────
    colors: {
        bg:          '#0D1117',
        bgSurface:   '#0A0D14',
        card:        '#161B22',
        cardLight:   '#1C2333',
        border:      '#21262D',
        borderLight: '#30363D',

        accent:      '#00D4FF',
        accentDim:   'rgba(0,212,255,0.12)',
        accentMid:   'rgba(0,212,255,0.25)',

        blue:        '#1A73E8',
        blueDim:     'rgba(26,115,232,0.15)',

        green:       '#00C853',
        greenDim:    'rgba(0,200,83,0.12)',

        red:         '#FF3D57',
        redDim:      'rgba(255,61,87,0.12)',

        orange:      '#FF9800',
        orangeDim:   'rgba(255,152,0,0.12)',

        purple:      '#B388FF',
        purpleDim:   'rgba(179,136,255,0.12)',

        gold:        '#FFD700',
        goldDim:     'rgba(255,215,0,0.12)',

        white:       '#E6EDF3',
        muted:       '#8B949E',
        dim:         '#484F58',
        dimmer:      '#30363D',
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
        sm:    8,
        md:    12,
        lg:    16,
        xl:    20,
        xxl:   24,
        pill:  30,
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
        xxl:  24,
        xxxl: 28,
        hero: 36,
    },

    // ── Ombres ─────────────────────────────────────────────────
    shadow: (color: string, opacity = 0.35, radius = 12) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation: 6,
    }),

    // ── Couleur de rating ──────────────────────────────────────
    ratingColor: (v: number): string => {
        if (v >= 80) return '#00C853'
        if (v >= 60) return '#00D4FF'
        if (v >= 40) return '#FF9800'
        return '#FF3D57'
    },

    // ── Couleur de score (live) ────────────────────────────────
    scoreColor: (v: number): string => {
        if (v >= 75) return '#00C853'
        if (v >= 50) return '#FF9800'
        return '#FF3D57'
    },
} as const

export type ThemeColors = typeof T.colors
