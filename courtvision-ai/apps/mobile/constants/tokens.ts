// /d:/CourtVision-AI/courtvision-ai/apps/mobile/constants/tokens.ts

export const colors = {
    // Layers
    void: '#000000',
    base: '#0A0A0A',
    surface: '#111111',
    surface2: '#121212',
    surface3: '#161616',

    // Accent hierarchy
    fire: '#FF4D00',
    fireDim: '#D93F00',
    fireGlow: 'rgba(255,77,0,0.25)',
    fireTrace: 'rgba(255,77,0,0.14)',
    ice: '#00F0FF',
    iceDim: 'rgba(0,240,255,0.18)',

    // Text
    snow: '#F5F7FA',
    cloud: 'rgba(255,255,255,0.72)',
    fog: 'rgba(255,255,255,0.52)',
    ghost: 'rgba(255,255,255,0.15)',

    // Borders
    line: 'rgba(255,255,255,0.06)',
    lineStrong: 'rgba(255,77,0,0.40)',

    // States
    live: '#00F0FF',
    liveDim: 'rgba(0,240,255,0.16)',
    caution: '#FFC145',
    cautionDim: 'rgba(255,193,69,0.16)',
    danger: '#FF5A65',
    dangerDim: 'rgba(255,90,101,0.16)',
} as const;

export const typography = {
    // Display / hero
    hero: { fontFamily: 'Sora_700Bold', fontSize: 56, lineHeight: 58, letterSpacing: -1.12 },
    h1: { fontFamily: 'Sora_700Bold', fontSize: 40, lineHeight: 42, letterSpacing: -0.8 },
    h2: { fontFamily: 'Sora_700Bold', fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
    h3: { fontFamily: 'Sora_600SemiBold', fontSize: 22, lineHeight: 26, letterSpacing: -0.44 },

    // Data metrics
    stat: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 36, letterSpacing: -1 },
    statSm: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 20 },
    label: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 0.3 },

    // UI labels and controls
    bodyLg: { fontFamily: 'DMSans_500Medium', fontSize: 16, lineHeight: 24 },
    body: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
    bodySm: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 18 },
    cta: { fontFamily: 'DMSans_700Bold', fontSize: 14, letterSpacing: 0.2 },
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
        shadowColor: '#FF4D00',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 2,
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
export const SPRING_SNAPPY = { mass: 1, damping: 18, stiffness: 200 };
export const SPRING_FLUID = { mass: 1, damping: 18, stiffness: 200 };
export const SPRING_BOUNCY = { mass: 1, damping: 18, stiffness: 200 };
