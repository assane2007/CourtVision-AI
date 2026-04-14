// /d:/CourtVision-AI/courtvision-ai/apps/mobile/constants/tokens.ts

export const colors = {
    // Fonds
    void: '#09111D',
    base: '#101A2B',
    surface: '#162338',
    surface2: '#1B2A41',
    surface3: '#233550',

    // Accent basketball
    fire: '#F97316',
    fireDim: '#C2410C',
    fireGlow: 'rgba(249,115,22,0.22)',
    fireTrace: 'rgba(249,115,22,0.12)',

    // Texte
    snow: '#F7FAFF',
    cloud: 'rgba(247,250,255,0.70)',
    fog: 'rgba(247,250,255,0.38)',
    ghost: 'rgba(247,250,255,0.15)',

    // Bordures
    line: 'rgba(255,255,255,0.11)',
    lineStrong: 'rgba(249,115,22,0.34)',

    // Statuts
    live: '#16C784',
    liveDim: 'rgba(22,199,132,0.17)',
    caution: '#FBBF24',
    cautionDim: 'rgba(251,191,36,0.16)',
    danger: '#FF4D6D',
    dangerDim: 'rgba(255,77,109,0.16)',
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
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.50,
        shadowRadius: 18,
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
