/**
 * CourtVision AI — Design System V3
 * =============================================================
 * Couleur signature : Amber #FF6B00 — couleur du ballon, unique
 * dans l'univers sport. Jamais vu chez Nike, Apple Fitness,
 * Whoop ou Strava. Identitaire et mémorable.
 *
 * Typographie :
 *   Display — Sora (géométrique, sportif, impactant)
 *   Body    — DM Sans (lisible, moderne, neutre)
 *
 * "If it doesn't make you say WOW, it's not done."
 * =============================================================
 */

// ─── Palette brute (source of truth) ─────────────────────────

const palette = {
    // Backgrounds — sombre sans être noir pur, préserve les yeux
    black:      '#080C12',   // fond app principal
    surface:    '#0D1119',   // cartes de premier niveau
    elevated:   '#121922',   // cartes surélevées, sections
    overlay:    '#171F2B',   // modales, drawers
    // Signature — Amber Blaze (couleur du ballon de basket)
    amber:      '#FF6B00',   // brand principale — wow factor
    amberLight: '#FF8C36',   // version claire, états hover/active
    amberDark:  '#CC5500',   // version sombre, états pressed
    // Blue — fonctionnel, liens, éléments interactifs secondaires
    blue:       '#0A84FF',   // bleu iOS, crédibilité et confiance
    blueLight:  '#4DA6FF',   // hover/active
    // Semantic — succès, erreur, avertissement, info
    green:      '#00C67A',   // vert menthe — succès, performance
    greenLight: '#4DEBA1',
    red:        '#FF3A5E',   // rouge — erreur, danger
    redLight:   '#FF6B8A',
    yellow:     '#FFBA00',   // jaune ambré — warning, XP gold
    yellowLight:'#FFD44D',
    // Text — hiérarchie de 4 niveaux
    white:      '#F2F6FC',   // texte principal — blanc chaud
    slate:      '#7C8FA3',   // texte secondaire — info, labels
    steel:      '#48596B',   // texte tertiaire — désactivé, hints
    ink:        '#080C12',   // texte sur fond clair (inverse)
    // Purple — XP, gamification, badges rares
    violet:     '#A78BFA',
    violetLight:'#C4B5FD',
    // Gold — achievements, top 3 rankings, streaks
    gold:       '#FFD700',
    goldLight:  '#FFE55E',
} as const

// ─── Design Token Object ──────────────────────────────────────

export const T = {

    // ══════════════════════════════════════════════════════════
    // COULEURS
    // ══════════════════════════════════════════════════════════

    /**
     * Couleurs structurées par rôle sémantique.
     * Ces buckets sont la référence — utilise-les plutôt que
     * les aliases de compatibilité en bas du fichier.
     */
    color: {
        background: {
            primary:   palette.black,       // fond app
            secondary: palette.surface,     // cartes
            tertiary:  palette.elevated,    // éléments surélevés
            overlay:   palette.overlay,     // modales
        },
        signature: {
            primary:   palette.amber,       // amber #FF6B00
            light:     palette.amberLight,  // états hover
            dark:      palette.amberDark,   // états pressed
            dim:       'rgba(255,107,0,0.10)' as string, // backgrounds tint
            glow:      'rgba(255,107,0,0.28)' as string, // glow + shadows
        },
        semantic: {
            success:   palette.green,
            successDim:'rgba(0,198,122,0.10)' as string,
            error:     palette.red,
            errorDim:  'rgba(255,58,94,0.10)' as string,
            warning:   palette.yellow,
            warningDim:'rgba(255,186,0,0.10)' as string,
            info:      palette.blue,
            infoDim:   'rgba(10,132,255,0.10)' as string,
        },
        text: {
            primary:   palette.white,    // F2F6FC — lisible sur dark
            secondary: palette.slate,    // 7C8FA3 — labels, captions
            tertiary:  palette.steel,    // 48596B — désactivé, muted
            inverse:   palette.ink,      // sur fond clair
        },
        border: {
            subtle:    'rgba(255,255,255,0.05)' as string,   // séparateurs
            default:   'rgba(255,255,255,0.08)' as string,   // cards
            strong:    'rgba(255,255,255,0.14)' as string,   // focus, active
            accent:    'rgba(255,107,0,0.22)' as string,     // brand highlight
        },
        gamification: {
            purple:    palette.violet,       // XP, badges rares, gamification
            purpleDim: 'rgba(167,139,250,0.10)' as string,
            gold:      palette.gold,         // achievements, top 3 rankings, streaks
            goldDim:   'rgba(255,215,0,0.10)' as string,
        },
    },

    // ── Aliases de compatibilité (backward compat avec v2) ───
    // Permet aux screens existants de ne pas casser
    colors: {
        // Backgrounds
        bg:           palette.black,
        bgSurface:    palette.surface,
        card:         palette.elevated,
        cardElevated: palette.overlay,
        cardGlass:    'rgba(13,17,25,0.80)' as string,
        // Borders
        border:       'rgba(255,255,255,0.05)' as string,
        borderLight:  'rgba(255,255,255,0.10)' as string,
        borderAccent: 'rgba(255,107,0,0.22)' as string,
        // Primary (bleu fonctionnel)
        primary:      palette.blue,
        primaryLight: palette.blueLight,
        primaryDim:   'rgba(10,132,255,0.10)' as string,
        // Accent = signature brand AMBER (remplace cyan)
        accent:       palette.amber,
        accentLight:  palette.amberLight,
        accentDim:    'rgba(255,107,0,0.10)' as string,
        accentGlow:   'rgba(255,107,0,0.28)' as string,
        // Success
        green:        palette.green,
        greenLight:   palette.greenLight,
        greenDim:     'rgba(0,198,122,0.10)' as string,
        // Danger
        red:          palette.red,
        redLight:     palette.redLight,
        redDim:       'rgba(255,58,94,0.10)' as string,
        // Warning
        orange:       palette.yellow,
        orangeLight:  palette.yellowLight,
        orangeDim:    'rgba(255,186,0,0.10)' as string,
        // Purple (XP, gamification)
        purple:       palette.violet,
        purpleLight:  palette.violetLight,
        purpleDim:    'rgba(167,139,250,0.10)' as string,
        // Gold (achievements)
        gold:         palette.gold,
        goldDim:      'rgba(255,215,0,0.10)' as string,
        // Text
        white:        palette.white,
        textPrimary:  palette.white,
        textSecondary:palette.slate,
        muted:        palette.slate,
        dim:          palette.steel,
        dimmer:       '#1A2535' as string,
    },

    // ══════════════════════════════════════════════════════════
    // GLASS / GLASSMORPHISM
    // ══════════════════════════════════════════════════════════

    glass: {
        light: {
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderColor:     'rgba(255,255,255,0.07)',
            borderWidth: 1,
        },
        medium: {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor:     'rgba(255,255,255,0.10)',
            borderWidth: 1,
        },
        accent: {
            // amber-tinted glass (remplace le cyan d'avant)
            backgroundColor: 'rgba(255,107,0,0.06)',
            borderColor:     'rgba(255,107,0,0.16)',
            borderWidth: 1,
        },
        primary: {
            backgroundColor: 'rgba(10,132,255,0.07)',
            borderColor:     'rgba(10,132,255,0.16)',
            borderWidth: 1,
        },
        success: {
            backgroundColor: 'rgba(0,198,122,0.07)',
            borderColor:     'rgba(0,198,122,0.16)',
            borderWidth: 1,
        },
    },

    // ══════════════════════════════════════════════════════════
    // TYPOGRAPHIE
    // ══════════════════════════════════════════════════════════

    /**
     * Familles de fonts (chargées via expo-google-fonts)
     *   Display : Sora — géométrique, sportif, impactant pour les gros chiffres
     *   Body    : DM Sans — lisible, moderne, excellent sur mobile
     */
    fonts: {
        display: {
            regular:  'Sora_400Regular',
            medium:   'Sora_500Medium',
            semibold: 'Sora_600SemiBold',
            bold:     'Sora_700Bold',
            black:    'Sora_800ExtraBold',
        },
        body: {
            regular:  'DMSans_400Regular',
            medium:   'DMSans_500Medium',
            semibold: 'DMSans_600SemiBold',
            bold:     'DMSans_700Bold',
        },
    },

    /**
     * Échelle typographique — 4px grid
     * Règle : tout chiffre important → min xl (24px)
     */
    fontSize: {
        xs:   11,   // captions, badges, timestamps
        sm:   13,   // labels secondaires, sous-titres courts
        base: 15,   // texte courant, description
        md:   17,   // titres de section, valeurs importantes
        lg:   20,   // sous-titres d'écrans, stats intermédiaires
        xl:   24,   // stats headline, titres
        '2xl': 32,  // chiffres clés (FG%, mental score)
        '3xl': 42,  // hero stat secondaire
        hero: 64,   // stat principale absolue (ne jamais descendre ici)
    },

    /** Alias backward compat (v2 → v3) */
    font: {
        xs:   11,
        sm:   13,
        md:   13,   // note: md était 13 en v2, inchangé
        base: 15,
        lg:   17,
        xl:   20,
        xxl:  24,
        xxxl: 32,
        hero: 42,
    },

    /** Weights comme constantes string pour StyleSheet */
    weight: {
        regular:  '400' as const,
        medium:   '500' as const,
        semibold: '600' as const,
        bold:     '700' as const,
        black:    '900' as const,
    },

    // ══════════════════════════════════════════════════════════
    // ESPACEMENTS — grille 4px
    // ══════════════════════════════════════════════════════════

    spacing: {
        1:  4,    // micro espacements, badges padding
        2:  8,    // gaps entre éléments petits
        3:  12,   // padding interne compact
        4:  16,   // padding standard
        5:  20,   // gap large
        6:  24,   // section spacing compact
        8:  32,   // section spacing normal
        10: 40,   // section spacing large
        12: 48,   // hero section spacing
        16: 64,   // très grand
        20: 80,   // spacing XL
        24: 96,   // spacing XXL (hero sections)
    } as const,

    /** Alias backward compat */
    space: {
        xs:   4,
        sm:   8,
        md:   12,
        lg:   16,
        xl:   20,
        xxl:  24,
        xxxl: 32,
    },

    // ══════════════════════════════════════════════════════════
    // BORDER RADIUS
    // ══════════════════════════════════════════════════════════

    /**
     * Système de radius plus anguleux que v2.
     * Résultat : identité plus "high-tech", moins bubbly.
     */
    borderRadius: {
        sm:   4,     // boutons inline, badges petits
        md:   8,     // chips, tags
        lg:   12,    // cartes compactes
        xl:   16,    // cartes standard
        '2xl':24,    // cartes large, modales
        full: 9999,  // pills, avatars ronds
    } as const,

    /** Alias backward compat (v2 avait des valeurs plus grandes) */
    radius: {
        sm:    8,    // légère augmentation pour softness
        md:    12,
        lg:    16,
        xl:    20,
        xxl:   24,
        pill:  9999,
        round: 9999,
    },

    // ══════════════════════════════════════════════════════════
    // OMBRES ET GLOW
    // ══════════════════════════════════════════════════════════

    /** Ombre directionnelle premium (cartes, boutons) */
    shadow: (color: string, opacity = 0.28, radius = 16) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation: 8,
    }),

    /** Glow diffus omnidirectionnel (accents, stats importantes) */
    glow: (color: string, intensity = 0.38) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: intensity,
        shadowRadius: 24,
        elevation: 10,
    }),

    /** Ombres prédéfinies par niveau */
    shadows: {
        sm:  (color = '#000') => ({ shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 6,  elevation: 3 }),
        md:  (color = '#000') => ({ shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 12, elevation: 6 }),
        lg:  (color = '#000') => ({ shadowColor: color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 10 }),
        xl:  (color = '#000') => ({ shadowColor: color, shadowOffset: { width: 0, height: 12}, shadowOpacity: 0.32, shadowRadius: 28, elevation: 14 }),
    },

    // ══════════════════════════════════════════════════════════
    // Z-INDEX
    // ══════════════════════════════════════════════════════════

    zIndex: {
        base:    0,
        raised:  10,
        dropdown:50,
        modal:   100,
        toast:   1000,
    } as const,

    // ══════════════════════════════════════════════════════════
    // ANIMATION TOKENS
    // ══════════════════════════════════════════════════════════

    animation: {
        duration: {
            fast:      150,   // micro-interactions (press, tap)
            normal:    300,   // transitions standard
            slow:      500,   // reveals, count-ups
            verySlow:  800,   // entrées d'écrans, celebrations
        },
        easing: {
            // Utiliser avec Easing de react-native
            spring:    { tension: 200, friction: 10 },
            snappy:    { tension: 280, friction: 14 },
            smooth:    { tension: 120, friction: 12 },
        },
    },

    // ══════════════════════════════════════════════════════════
    // HELPERS DYNAMIQUES
    // ══════════════════════════════════════════════════════════

    /**
     * Couleur selon une valeur 0-100.
     * red → orange → amber → green
     * Note: on évite le rouge pur pour les valeurs moyennes —
     * psychologiquement moins décourageant.
     */
    ratingColor: (v: number): string => {
        if (v >= 85) return palette.green        // Elite
        if (v >= 70) return palette.amber        // Great (amber brand!)
        if (v >= 50) return palette.yellow       // Average
        return palette.red                        // Needs work
    },

    /**
     * Badge de performance textuel
     */
    performanceBadge: (v: number): { label: string; color: string } => {
        if (v >= 85) return { label: 'Elite',    color: palette.green }
        if (v >= 70) return { label: 'Great',    color: palette.amber }
        if (v >= 55) return { label: 'Good',     color: palette.yellow }
        return              { label: 'Keep Going', color: palette.red }
    },

    /** Couleur live-score (alias de ratingColor pour backward compat) */
    scoreColor: (v: number): string => {
        if (v >= 85) return palette.green
        if (v >= 70) return palette.amber
        if (v >= 50) return palette.yellow
        return palette.red
    },
} as const

// ─── Type helpers ─────────────────────────────────────────────

// ─── V4 Presets (REDESIGN) ────────────────────────────────────

/** Typographic presets — use these everywhere instead of raw fontSize/fontWeight */
export const typePresets = {
    heroStat: {
        fontSize: 64,
        fontFamily: 'Sora_800ExtraBold',
        letterSpacing: -2,
        lineHeight: 68,
    },
    bigStat: {
        fontSize: 48,
        fontFamily: 'Sora_800ExtraBold',
        letterSpacing: -1.5,
        lineHeight: 52,
    },
    mediumStat: {
        fontSize: 36,
        fontFamily: 'Sora_800ExtraBold',
        letterSpacing: -1,
        lineHeight: 40,
    },
    smallStat: {
        fontSize: 28,
        fontFamily: 'Sora_700Bold',
        letterSpacing: -0.5,
        lineHeight: 32,
    },
    screenTitle: {
        fontSize: 32,
        fontFamily: 'Sora_800ExtraBold',
        letterSpacing: -0.8,
        lineHeight: 36,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: 'Sora_700Bold',
        letterSpacing: -0.4,
        lineHeight: 26,
    },
    cardTitle: {
        fontSize: 17,
        fontFamily: 'Sora_700Bold',
        letterSpacing: -0.3,
        lineHeight: 22,
    },
    body: {
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        letterSpacing: 0,
        lineHeight: 22,
    },
    bodySemibold: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0,
        lineHeight: 22,
    },
    caption: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        letterSpacing: 0,
        lineHeight: 18,
    },
    overline: {
        fontSize: 11,
        fontFamily: 'DMSans_700Bold',
        letterSpacing: 1.2,
        textTransform: 'uppercase' as const,
        lineHeight: 14,
    },
} as const

// Attach to T for convenience
;(T as any).type = typePresets

// Glass V4 additions
;(T as any).glass.regular = {
    backgroundColor: 'rgba(18,24,32,0.88)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
}
;(T as any).glass.gold = {
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderColor: 'rgba(255,214,10,0.16)',
    borderWidth: 1,
}
;(T as any).glass.danger = {
    backgroundColor: 'rgba(255,58,94,0.08)',
    borderColor: 'rgba(255,58,94,0.16)',
    borderWidth: 1,
}
;(T as any).glass.thin = {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
}

// Glows V4
;(T as any).glows = {
    accent: T.glow(palette.amber, 0.35),
    success: T.glow(palette.green, 0.3),
    danger: T.glow(palette.red, 0.3),
    gold: T.glow(palette.gold, 0.3),
}

// Spring configs for Reanimated
;(T as any).spring = {
    snappy: { damping: 14, stiffness: 280 },
    bouncy: { damping: 10, stiffness: 150 },
    gentle: { damping: 20, stiffness: 120 },
}

// Stagger config
;(T as any).stagger = {
    base: 80,
    fast: 50,
    slow: 120,
}

// Extra color aliases for V4
;(T as any).colors.violet = palette.violet
;(T as any).colors.gold = palette.gold

export type ThemeColors   = typeof T.colors
export type ThemeColor    = typeof T.color
export type ThemeSpacing  = typeof T.spacing
export type ThemeFontSize = typeof T.fontSize

// ─── Export de la palette brute (pour usage avancé) ──────────
export { palette }

/** Retourne T.color.signature.primary — amber #FF6B00 */
export const brand = T.color.signature.primary

/** Constante sémantique : fond d'écran principal */
export const screenBg = T.color.background.primary

// ──────────────────────────────────────────────────────────────────────────────
// Night Game Design System — exports pour les nouveaux écrans
// (Palette, typo et tokens tels que décrits dans le prompt produit)
// ──────────────────────────────────────────────────────────────────────────────

export const colors = {
    bg: {
        primary: '#080C10', // Terrain la nuit — noir profond chaud
        secondary: '#0F1923', // Cartes — bleu nuit
        tertiary: '#162030', // Éléments surélevés
        overlay: '#000000CC', // Modales (80% opacité)
        glass: '#FFFFFF08', // Glassmorphism (4% blanc)
    },
    brand: {
        primary: '#FF6B2C', // Orange ballon Spalding — LA couleur
        secondary: '#FF9A5C', // Version claire
        glow: '#FF6B2C40', // Halo orange (25% opacité)
        muted: '#FF6B2C15', // Background subtil brand
        dark: '#CC4A15', // Version sombre pour pressed states
    },
    semantic: {
        success: '#00E676', // Vert néon — bon score, réussite
        warning: '#FFB300', // Ambre — score moyen, attention
        danger: '#FF3D57', // Rouge vif — erreur, mauvais score
        info: '#40C4FF', // Bleu ciel — informations neutres
    },
    text: {
        primary: '#F0F4F8', // Blanc légèrement chaud — titres
        secondary: '#8B9BB4', // Gris bleuté — body text
        tertiary: '#4A5568', // Gris foncé — hints, labels
        disabled: '#2D3748', // Très foncé — éléments inactifs
        inverse: '#080C10', // Texte sur fond clair
    },
    border: {
        subtle: '#1A2535', // Séparateurs discrets
        default: '#243044', // Bordures normales
        strong: '#FF6B2C30', // Bordures actives (brand tinted)
        glow: '#FF6B2C60', // Bordures lumineuses
    },
    gradient: {
        brand: ['#FF6B2C', '#FF9A5C'],
        dark: ['#080C10', '#0F1923'],
        success: ['#00E676', '#00BFA5'],
        card: ['#0F1923', '#162030'],
        hero: ['#FF6B2C20', '#080C10'],
    },
    rarity: {
        common: '#8B9BB4', // badges communs
        rare: '#40C4FF', // badges rares
        epic: '#CE93D8', // badges épiques
        legendary: '#FFD700', // badges légendaires
    },
} as const

export const typography = {
    fonts: {
        display: 'BarlowCondensed',
        body: 'Outfit',
    },
    sizes: {
        xs: 11,
        sm: 13,
        base: 15,
        md: 17,
        lg: 20,
        xl: 24,
        '2xl': 32,
        '3xl': 42,
        hero: 64,
        mega: 96, // Pour les scores principaux
    },
    weights: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900',
    },
    lineHeights: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
    },
    letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 0.5,
        wider: 1.5, // Pour les labels uppercase
        widest: 3, // Pour les badges
    },
} as const

export const spacing = {
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    10: 40,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
} as const

export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
    full: 9999,
} as const

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    brand: {
        shadowColor: '#FF6B2C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    glow: {
        shadowColor: '#FF6B2C',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 10,
    },
} as const

export const animation = {
    duration: {
        fast: 150,
        normal: 300,
        slow: 500,
        celebration: 800,
    },
    easing: {
        spring: { damping: 15, stiffness: 150 },
        smooth: { damping: 20, stiffness: 200 },
    },
} as const
