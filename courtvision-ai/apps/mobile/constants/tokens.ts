// /d:/CourtVision-AI/courtvision-ai/apps/mobile/constants/tokens.ts

export const colors = {
    // Fonds
    void: '#050505',  // fond absolu — le noir arena
    base: '#0A0A0A',  // fond écran
    surface: '#141414',  // cards de premier niveau
    surface2: '#1C1C1C',  // cards imbriquées, inputs
    surface3: '#242424',  // éléments actifs/hover

    // Accent basketball
    fire: '#FF5C00',  // orange brûlé — accent primaire
    fireDim: '#CC4900',  // orange pressé
    fireGlow: 'rgba(255,92,0,0.18)',  // glow ambient
    fireTrace: 'rgba(255,92,0,0.08)',  // fond très subtle

    // Texte
    snow: '#F5F5F5',  // texte principal
    cloud: 'rgba(245,245,245,0.6)',  // texte secondaire
    fog: 'rgba(245,245,245,0.28)', // texte muted
    ghost: 'rgba(245,245,245,0.10)', // texte décoratif

    // Bordures
    line: 'rgba(255,255,255,0.07)',  // séparateurs
    lineStrong: 'rgba(255,92,0,0.25)',    // bordures orange

    // Statuts
    live: '#22C55E',   // vert live/succès
    liveDim: 'rgba(34,197,94,0.15)',
    caution: '#F59E0B',   // warning
    cautionDim: 'rgba(245,158,11,0.12)',
    danger: '#EF4444',   // erreur
    dangerDim: 'rgba(239,68,68,0.12)',
} as const;

export const typography = {
    // Titres — Barlow Condensed 800 Italic
    hero: { fontFamily: 'BarlowCondensed_800ExtraBold_Italic', fontSize: 56, lineHeight: 52, letterSpacing: -1 },
    h1: { fontFamily: 'BarlowCondensed_800ExtraBold_Italic', fontSize: 40, lineHeight: 38, letterSpacing: -0.5 },
    h2: { fontFamily: 'BarlowCondensed_800ExtraBold_Italic', fontSize: 28, lineHeight: 28 },
    h3: { fontFamily: 'BarlowCondensed_800ExtraBold_Italic', fontSize: 22, lineHeight: 22 },

    // Chiffres/Scores — JetBrains Mono
    stat: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 36, letterSpacing: -1 },
    statSm: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 20 },
    label: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 1.5 },

    // Body — DM Sans
    bodyLg: { fontFamily: 'DMSans_500Medium', fontSize: 16, lineHeight: 24 },
    body: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21 },
    bodySm: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
    cta: { fontFamily: 'DMSans_700Bold', fontSize: 15, letterSpacing: 0.3 },
} as const;

export const space = {
    px: 1, '0.5': 2,
    1: 4, 2: 8, 3: 12, 4: 16,
    5: 20, 6: 24, 7: 28, 8: 32,
    10: 40, 12: 48, 16: 64,
    screenH: 24,  // padding horizontal des screens
};

export const radius = {
    sm: 6, md: 12, lg: 18,
    xl: 24, '2xl': 32, pill: 999,
};

export const shadows = {
    orangeGlow: {
        shadowColor: '#FF5C00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 12,
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 5,
    },
};

// Durées des animations
export const DURATION = {
    micro: 120,  // tap feedback
    fast: 200,  // transitions UI
    standard: 350,  // transitions screens
    slow: 600,  // entrances
    boot: 1400, // séquence de boot
};

// Springs
export const SPRING_SNAPPY = { damping: 18, stiffness: 300 };
export const SPRING_FLUID = { damping: 22, stiffness: 180 };
export const SPRING_BOUNCY = { damping: 12, stiffness: 250 };
