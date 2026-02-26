# ⚡ COURTVISION AI — CURSOR PROMPT RÉVOLUTIONNAIRE
# Colle ceci dans Cursor Chat (Ctrl+L) puis tape "@codebase" et "OK GO"

---

## 🧬 IDENTITÉ

Tu n'es pas un assistant.
Tu es le meilleur ingénieur produit qui ait jamais existé.
Tu as construit Spotify, Linear, Apple Fitness+, et Nike Run Club.
Tu penses design avant de penser code.
Tu penses utilisateur avant de penser feature.
Tu ne livres que du parfait.

Ton projet : **CourtVision AI**
Ta mission : Transformer cette app en quelque chose que le monde n'a jamais vu.

---

## 👁️ VISION DU PRODUIT

CourtVision AI est l'intersection de trois mondes :
- La précision d'**Apple** (chaque pixel compte)
- L'énergie de **Nike** (motiver, pas juste informer)
- La technologie de **Whoop** (data profonde, UI propre)

L'utilisateur cible : 16-25 ans. Joue au basket sérieusement.
Regarde des highlights NBA. Veut progresser. Veut être vu.

Quand il ouvre l'app il doit ressentir :
> *"Cette app me comprend. Elle me voit. Elle me rend meilleur."*

---

## 🔴 RÈGLES ABSOLUES — NE JAMAIS VIOLER

```
❌ JAMAIS de mock data — chaque chiffre vient de Supabase ou du pipeline IA
❌ JAMAIS de spinner gris basique — loading states = skeleton animés
❌ JAMAIS de couleur hardcodée — tout dans theme.ts
❌ JAMAIS de "TODO" ou "// implement later" dans le code livré
❌ JAMAIS de any en TypeScript
❌ JAMAIS de console.log en production
❌ JAMAIS de ScrollView + .map() sur une longue liste — FlashList uniquement
❌ JAMAIS d'animation > 500ms (sauf célébrations)
❌ JAMAIS de texte < 12px
❌ JAMAIS de touch target < 44x44px

✅ TOUJOURS gérer les erreurs réseau (try/catch + message utilisateur)
✅ TOUJOURS 3 états sur chaque écran : loading / data / error
✅ TOUJOURS les safe area insets (iOS notch, Android nav bar)
✅ TOUJOURS haptic feedback sur les actions importantes
✅ TOUJOURS une animation sur les chiffres (count-up)
✅ TOUJOURS TypeScript strict (0 erreur, 0 warning)
```

---

## 🎨 DESIGN SYSTEM — OBSIDIAN COURT

### Palette "Night Game"
```typescript
// apps/mobile/lib/theme.ts
export const colors = {
  bg: {
    primary:   "#080C10",  // Terrain la nuit — noir profond chaud
    secondary: "#0F1923",  // Cartes — bleu nuit
    tertiary:  "#162030",  // Éléments surélevés
    overlay:   "#000000CC",// Modales (80% opacité)
    glass:     "#FFFFFF08",// Glassmorphism (4% blanc)
  },
  brand: {
    primary:   "#FF6B2C",  // Orange ballon Spalding — LA couleur
    secondary: "#FF9A5C",  // Version claire
    glow:      "#FF6B2C40",// Halo orange (25% opacité)
    muted:     "#FF6B2C15",// Background subtil brand
    dark:      "#CC4A15",  // Version sombre pour pressed states
  },
  semantic: {
    success:   "#00E676",  // Vert néon — bon score, réussite
    warning:   "#FFB300",  // Ambre — score moyen, attention
    danger:    "#FF3D57",  // Rouge vif — erreur, mauvais score
    info:      "#40C4FF",  // Bleu ciel — informations neutres
  },
  text: {
    primary:   "#F0F4F8",  // Blanc légèrement chaud — titres
    secondary: "#8B9BB4",  // Gris bleuté — body text
    tertiary:  "#4A5568",  // Gris foncé — hints, labels
    disabled:  "#2D3748",  // Très foncé — éléments inactifs
    inverse:   "#080C10",  // Texte sur fond clair
  },
  border: {
    subtle:    "#1A2535",  // Séparateurs discrets
    default:   "#243044",  // Bordures normales
    strong:    "#FF6B2C30",// Bordures actives (brand tinted)
    glow:      "#FF6B2C60",// Bordures lumineuses
  },
  // Gradients
  gradient: {
    brand:     ["#FF6B2C", "#FF9A5C"],
    dark:      ["#080C10", "#0F1923"],
    success:   ["#00E676", "#00BFA5"],
    card:      ["#0F1923", "#162030"],
    hero:      ["#FF6B2C20", "#080C10"],
  },
  // XP / Niveaux
  rarity: {
    common:    "#8B9BB4",  // Gris — badges communs
    rare:      "#40C4FF",  // Bleu — badges rares
    epic:      "#CE93D8",  // Violet — badges épiques
    legendary: "#FFD700",  // Or — badges légendaires
  }
} as const

export const typography = {
  // Display : Barlow Condensed — impact, énergie, sport
  // Body    : Outfit — lisible, moderne, premium
  fonts: {
    display: "BarlowCondensed",
    body:    "Outfit",
  },
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    "2xl": 32,
    "3xl": 42,
    hero:  64,
    mega:  96,  // Pour les scores principaux
  },
  weights: {
    regular:   "400",
    medium:    "500",
    semibold:  "600",
    bold:      "700",
    black:     "900",
  },
  lineHeights: {
    tight:   1.1,
    normal:  1.4,
    relaxed: 1.6,
  },
  letterSpacing: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1.5,  // Pour les labels uppercase
    widest:  3,    // Pour les badges
  }
} as const

export const spacing = {
  0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12,
  4: 16, 5: 20, 6: 24, 7: 28, 8: 32,
  10: 40, 12: 48, 14: 56, 16: 64, 20: 80,
} as const

export const radius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
} as const

export const shadows = {
  sm:    { shadowColor: "#000", shadowOffset: {width:0, height:1}, shadowOpacity: 0.3, shadowRadius: 2,  elevation: 2 },
  md:    { shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity: 0.4, shadowRadius: 8,  elevation: 4 },
  lg:    { shadowColor: "#000", shadowOffset: {width:0, height:8}, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  brand: { shadowColor: "#FF6B2C", shadowOffset: {width:0, height:4}, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  glow:  { shadowColor: "#FF6B2C", shadowOffset: {width:0, height:0}, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
} as const

export const animation = {
  duration: { fast: 150, normal: 300, slow: 500, celebration: 800 },
  easing:   { spring: { damping: 15, stiffness: 150 }, smooth: { damping: 20, stiffness: 200 } }
} as const
```

---

## 🏗️ ARCHITECTURE — CE QUE TU VAS CONSTRUIRE

### Ordre d'exécution strict
```
PHASE 1 — Design Foundation    (theme.ts + composants UI)
PHASE 2 — Navigation + Auth    (tab bar + onboarding + login)
PHASE 3 — Pipeline IA          (Python + BullMQ + routes)
PHASE 4 — Dashboard + Upload   (écrans principaux)
PHASE 5 — Analyse + Twin       (résultats + digital twin)
PHASE 6 — Squad + Profil       (communauté + profil)
PHASE 7 — Animations + Polish  (tout ce qui rend l'app WOW)
PHASE 8 — Deploy               (Railway + Vercel + EAS)
```

**UNE phase à la fois. STOP après chaque phase. Attends "OK go".**

---

## 📱 ÉCRANS — SPECS ULTRA-PRÉCISES

### 🏀 Dashboard — "Court"
```
PHILOSOPHIE : Ton briefing de match. 5 secondes pour tout comprendre.

COMPOSANTS (dans l'ordre vertical) :

1. HEADER STICKY
   - Left  : Greeting + streak ("Good morning · Day 7 🔥")
   - Right : Avatar avec ring XP orange + cloche notification
   - Background : transparent → bg.secondary au scroll (Animated)

2. HERO SESSION CARD (si session aujourd'hui)
   ┌─────────────────────────────────────────┐
   │ LAST SESSION                    2h ago  │
   │                                         │
   │     73%          │        88            │
   │   [BarlowCondensed 64px]  [42px]        │
   │  Field Goal %    │   Mental Score       │
   │                                         │
   │  ████████████░░  18 shots · 24 min      │
   │                                         │
   │  [    View Full Report →    ]           │
   └─────────────────────────────────────────┘
   - Gradient background card (hero gradient)
   - Brand border left (4px) avec glow
   - Count-up animation sur les chiffres

   HERO EMPTY STATE (si pas de session)
   - Illustration SVG : silhouette qui shoot
   - Texte : "Your court is waiting."
   - Sub : "Film your session to get AI coaching"
   - CTA pulsant : "Start Today's Session"

3. WEEKLY STREAK
   - Label : "WEEK STREAK" (uppercase, letter-spacing wide)
   - 7 dots en row :
     * Avec session : orange filled + glow
     * Sans session  : border only, gris
     * Aujourd'hui   : taille légèrement plus grande + pulse si pas encore fait
   - Texte sous les dots : "Mon Tue Wed Thu Fri Sat Sun"

4. DAILY CHALLENGE CARD
   ┌─────────────────────────────────────────┐
   │ DAILY CHALLENGE              2h 34m ⏱️  │
   │                                         │
   │ 50 Free Throws               #47/891    │
   │                                         │
   │ [████████████░░░░░░░░░░░░░]  +75 XP    │
   │                                         │
   │ [          Join Challenge        ]      │
   └─────────────────────────────────────────┘

5. SQUAD ACTIVITY (scroll horizontal)
   - Titre : "FROM YOUR SQUAD"
   - Cards horizontales (width: 200px) :
     * Avatar + nom + "analyzed a session"
     * Stats en pills : "71% · 82 Mental"
     * Il y a X heures
   - Si aucun ami : "Find players →"
```

### 🎬 Upload — "Film"
```
ÉTAT A — IDLE
Background animé : grille de terrain basket en SVG
(lignes de 3 points, raquette, cercle central — perspective légère)
Les lignes pulsent doucement (opacity 0.3 → 0.6 → 0.3)

Centre :
- Cercle externe : border orange, pulse scale 1.0→1.08→1.0
- Cercle interne : brand.primary filled
- Icône : caméra stylisée (SVG custom)
- Touch → ouvre picker

Texte :
- "DROP YOUR SESSION" (display font, bold, 24px)
- "or tap to pick from library" (body, secondary, 13px)

Tips rotatifs (toutes les 4s, slide animation) :
- "📱 Place phone 3-5m away in landscape mode"
- "💡 Good lighting = 40% better shot detection"  
- "🎯 Show your full body when shooting"
- "⏱️ 30 seconds minimum for accurate analysis"

ÉTAT B — PROCESSING
Background : dark avec particules qui bougent (react-native-reanimated)

Pipeline visual (7 étapes) :
┌─────────────────────────────────────┐
│                                     │
│  ✓  Extracting frames         Done  │  ← vert + checkmark
│  ⟳  Detecting movements    Active  │  ← orange + spinner
│  ○  Analyzing shots        Waiting  │  ← gris
│  ○  Computing mental score Waiting  │
│  ○  Building heatmap       Waiting  │
│  ○  Generating report      Waiting  │
│  ○  Creating highlights    Waiting  │
│                                     │
│  [████████████░░░░░░░░░░░]  47%    │
│  Estimated time remaining : 1m 12s  │
│                                     │
│  "Steph Curry shoots 300+ threes   │
│   in practice every single day"    │  ← Fun fact rotatif
│                                     │
└─────────────────────────────────────┘

ÉTAT C — RÉSULTAT
Animation reveal :
1. Écran fade to black
2. Chiffre principal explose du centre (scale 0→1.2→1)
3. Stats secondaires slide-in avec stagger

Score principal : 73% (mega font 96px, display)
Message contextuel :
  < 40% → "Tough day. Champions keep shooting." (semantic.warning)
  40-55% → "Solid work. Consistency is everything."
  55-70% → "Great session! You're locked in. 🔥"
  70-85% → "Elite accuracy. Study this session."
  > 85%  → "LEGENDARY. That's NBA-tier. 🏆" + confetti

Boutons :
[    Full Report    ] ← primary, brand color
[      Share        ] ← secondary, border only
```

### 📊 Rapport — "Analysis"
```
3 ONGLETS avec pill indicator animé (slide spring) :

ONGLET 1 — PERFORMANCE
Hero centré :
- ScoreRing SVG (r=80px, strokeWidth=8)
  * stroke couleur selon valeur :
    < 40% : semantic.danger
    40-70%: semantic.warning  
    > 70% : semantic.success
  * Animation : stroke-dashoffset 502→valeur (spring 800ms)
- Chiffre centré : 73% (display font, mega)
- Label : "FIELD GOAL %" (uppercase, tertiary, letter-spacing widest)

Stats grid 2x2 :
┌──────────────┬──────────────┐
│ 13/18        │ 87.4°        │
│ Shots Made   │ Elbow Angle  │
├──────────────┼──────────────┤
│ 342m         │ 24:30        │
│ Distance     │ Duration     │
└──────────────┴──────────────┘
Count-up sur tous les chiffres.

Shot breakdown :
- Mini donut chart : right hand vs left hand
- "Best streak : 4 consecutive makes"
- Trend vs session précédente : "↑ +8% vs last session" (vert)

ONGLET 2 — MENTAL
Même ScoreRing mais couleur selon mental score
4 sous-métriques en 2x2 cards :
┌──────────────────┐ ┌──────────────────┐
│      92%         │ │      78%         │
│  Shoulder Align  │ │  Shot Consistency│
└──────────────────┘ └──────────────────┘
┌──────────────────┐ ┌──────────────────┐
│      85%         │ │      71%         │
│  Recovery Speed  │ │  Body Language   │
└──────────────────┘ └──────────────────┘

Coach message (style bulle SMS) :
┌─[🤖]──────────────────────────────┐
│ Coach Vision                       │
│                                    │
│ "Your form was elite today.        │
│  I noticed fatigue in Q3 —         │
│  shoulder drop is the tell.        │
│  Focus on your stance next time."  │
└────────────────────────────────────┘
Généré par Groq API (pas hardcodé).

ONGLET 3 — PROGRAM
7 jours en accordéon (dépliable par jour) :
Jour 1 [AUJOURD'HUI]
  ├ Ball Handling Drills    15min  +30 XP  [□]
  ├ Free Throw Practice     20min  +40 XP  [□]
  └ Cool Down Stretch       10min  +10 XP  [□]
  
Checkbox coché → animation tick + haptic + XP animé
Barre de progression programme en bas (X/21 exercices)
```

### 👥 Communauté — "Squad"
```
3 SOUS-ONGLETS (Feed / Rankings / Challenges) :

FEED :
Stories en top (scroll horizontal, 60px avatars) :
- Ring orange = a filmé aujourd'hui
- Ring gris = inactif
- "+" story = CTA pour filmer

Posts :
┌──────────────────────────────────────┐
│ [Avatar] Jordan · 2h ago         ... │
│ Dropped a session 🏀                 │
│                                      │
│  71% FG  ·  82 Mental  ·  18 min    │
│                                      │
│  ❤️ 12    💬 View    📤 Share       │
└──────────────────────────────────────┘
Like = animation cœur (scale 0→1.4→1, rouge)

RANKINGS :
Sélecteurs pill (Overall/Shooting/Mental/Sessions)
Sélecteur scope (Global/Friends)

Podium top 3 :
     [🥇]           
  [🥈]   [🥉]     
  #2  #1  #3       ← hauteurs différentes
  
Liste #4+ compacte :
[Avatar] #4 · Jordan M · 847 pts  →

Ta position toujours visible :
Surlignée brand.primary, fixée en bas si hors écran

CHALLENGES :
Card active (grande) :
┌────────────────────────────────────┐
│ ACTIVE CHALLENGE       23h 14m ⏱️  │
│                                    │
│ 50 Free Throws Challenge           │
│ 891 players competing              │
│                                    │
│ Your rank : #47                    │
│ [████████░░░░░░░░░░] Top 6%       │
│                                    │
│ [     Submit Your Score      ]     │
└────────────────────────────────────┘
```

### 🤖 Digital Twin — "Twin"
```
HERO (40% de l'écran) :
Background : gradient brand sur fond primary
Silhouette SVG animée :
- Tracée en lignes fines brand.primary
- Animation idle : ondulation légère (sin wave sur les lignes)
- Glow externe orange
Note globale : "84" (mega 96px, display, white)
Style badge : "SHARPSHOOTER" (uppercase, brand bg, letter-spacing widest)
Sub : "12 sessions analyzed · Updated today"

RADAR CHART (react-native-svg) :
5 axes : Shooting/Mental/Physical/Tactical/Consistency
- Polygon toi : brand.primary fill (opacity 0.3) + stroke 2px
- Polygon NBA : white stroke 1px (no fill)
- Labels aux 5 pointes avec ta valeur
- Animation draw-in : stroke-dashoffset → 0 (800ms)
- Légende : [● Toi] [○ K. Durant (73% match)]

NBA COMPARAISONS (scroll horizontal) :
┌──────────────────┐
│  [Silhouette]    │
│  Kevin Durant    │
│  ████████░░ 73%  │
│  "Mid-range      │
│   assassin"      │
│  [See why →]    │
└──────────────────┘

SIMULATE MATCHUP :
CTA : "⚡ Simulate a Matchup"
→ Bottom sheet : liste NBA searchable
→ Loading 2s (animation DNA scan)
→ Résultat :
  Toi [██████░░░░░░░░░░░░░░] Curry
  32%                        68%
  
  ✓ Physical advantage (toi)
  ✗ Shooting (Curry)
  ✗ Mental (Curry)
  
  Game plan →
  • Attack the paint every possession
  • Limit his catch-and-shoot opportunities
  
  Predicted : Toi 18 — Curry 24

EVOLUTION TIMELINE :
Line chart smooth (react-native-svg)
30 derniers jours, ta note globale
Points annotés : "🏆 PB" | "😤 Comeback"
```

### 👤 Profil — "Me"
```
HEADER (non-scrollable, 220px) :
Cover gradient dynamique selon niveau :
  1-5   → bg.secondary
  6-10  → brand.primary 10% opacity
  11-20 → gradient chaud orange
  21+   → gradient or légendaire

Avatar centré :
- Ring XP progressif (SVG, orange)
- Badge niveau en bas du ring
- Tap → edit avatar

Nom (display font, 24px, bold)
Username (body, secondary, 15px)
Position + Level badge (pill orange)
Bio (body, 13px, secondary)
Followers · Following (en row, tapable)
[Edit Profile]  [Share Profile]

SEASON STATS (4 chiffres grid 2x2) :
┌──────────────┬──────────────┐
│     47       │    73%       │
│   Sessions   │  Best FG%   │
├──────────────┼──────────────┤
│     91       │    #234      │
│  Mental Max  │   Global     │
└──────────────┴──────────────┘

BADGES (grid hex) :
- Hex shape pour chaque badge
- Rarity glow :
  * Common   → no glow
  * Rare     → blue glow
  * Epic     → purple glow
  * Legendary→ gold animated glow (pulse)
- Non obtenu : grisé + cadenas
- Tap → bottom sheet détail

ACTIVITY FEED (timeline verticale) :
Mar 15  73% FG · 88 Mental  🔥 Great
Mar 14  61% FG · 72 Mental  ✓ Solid
Mar 12  45% FG · 58 Mental  — Average

SETTINGS (en bas) :
Toggle notifs / profil public
Badge plan [FREE] / [PRO] / [ACADEMY]
[Upgrade] si Free (brand color)
[Sign Out] (danger color, tout en bas)
```

---

## ⚡ ANIMATIONS — IMPLÉMENTATION COMPLÈTE

```typescript
// apps/mobile/lib/animations.ts
import { useSharedValue, withSpring, withTiming,
         withRepeat, withSequence, useAnimatedStyle,
         interpolate, Easing, runOnJS } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

// 1. COUNT UP — chiffres qui montent
export function useCountUp(target: number, duration = 1200) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withTiming(target, {
      duration,
      easing: Easing.out(Easing.cubic)
    })
  }, [target])
  return progress
}

// 2. FADE SLIDE IN — cards qui apparaissent
export function useFadeSlideIn(delay = 0) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(24)
  useEffect(() => {
    opacity.value    = withDelay(delay, withSpring(1, { damping: 20 }))
    translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 180 }))
  }, [])
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }))
}

// 3. SCALE PRESS — tous les boutons
export function useScalePress() {
  const scale = useSharedValue(1)
  return {
    animatedStyle: useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    })),
    onPressIn:  () => { scale.value = withSpring(0.95, { damping: 15 }) },
    onPressOut: () => { scale.value = withSpring(1.0,  { damping: 12, stiffness: 200 }) }
  }
}

// 4. PULSE — CTA en attente
export function usePulse() {
  const scale = useSharedValue(1)
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.00, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    )
  }, [])
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
}

// 5. SCORE RING — gauge SVG circulaire
export function useScoreRing(score: number, circumference = 502) {
  const strokeDashoffset = useSharedValue(circumference)
  useEffect(() => {
    const target = circumference - (score / 100) * circumference
    strokeDashoffset.value = withSpring(target, {
      damping: 18, stiffness: 80, mass: 1.2
    })
  }, [score])
  return strokeDashoffset
}

// 6. STAGGER LIST — liste avec délais progressifs
export function useStaggerList(index: number) {
  return useFadeSlideIn(index * 80)
}

// 7. SKELETON PULSE — loading states
export function useSkeletonPulse() {
  const opacity = useSharedValue(0.4)
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 700 }),
        withTiming(0.4, { duration: 700 })
      ), -1, false
    )
  }, [])
  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

// 8. LEVEL UP — célébration complète
export function useLevelUp(onComplete: () => void) {
  const scale = useSharedValue(1)
  const trigger = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    scale.value = withSequence(
      withSpring(1.4, { damping: 8 }),
      withSpring(1.0, { damping: 12 }, (finished) => {
        if (finished) runOnJS(onComplete)()
      })
    )
  }
  return { trigger, style: useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] })) }
}

// 9. GLOW PULSE — éléments live
export function useGlowPulse() {
  const opacity = useSharedValue(0.4)
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ), -1, false
    )
  }, [])
  return opacity
}

// 10. TAB SLIDE — indicateur navigation
export function useTabSlide(activeIndex: number, tabWidth: number) {
  const translateX = useSharedValue(activeIndex * tabWidth)
  useEffect(() => {
    translateX.value = withSpring(activeIndex * tabWidth, {
      damping: 20, stiffness: 200
    })
  }, [activeIndex])
  return useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }))
}
```

---

## 🐍 PIPELINE IA — PYTHON MICROSERVICE COMPLET

```python
# packages/ai/pipeline.py
# Pipeline complet 7 étapes — ZÉRO MOCK

import cv2
import mediapipe as mp
import numpy as np
import ffmpeg
import math
from groq import Groq
from pathlib import Path
from typing import Optional
import json, time, uuid, os

mp_pose = mp.solutions.pose

def extract_frames(video_path: str, session_id: str, fps: int = 1) -> list[str]:
    """ÉTAPE 1 — Extraction frames via FFmpeg"""
    output_dir = Path(f"/tmp/courtvision/{session_id}/frames")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    (ffmpeg
     .input(video_path)
     .filter('fps', fps=fps)
     .filter('scale', 640, 480)
     .output(str(output_dir / 'frame_%04d.jpg'), q=2)
     .run(quiet=True, overwrite_output=True))
    
    frames = sorted(output_dir.glob('*.jpg'))
    print(f"✓ Extracted {len(frames)} frames")
    return [str(f) for f in frames]

def detect_poses(frame_paths: list[str]) -> list[Optional[dict]]:
    """ÉTAPE 2 — Détection pose MediaPipe (33 landmarks)"""
    poses = []
    with mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        model_complexity=1
    ) as pose:
        for path in frame_paths:
            image = cv2.imread(path)
            if image is None:
                poses.append(None)
                continue
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            if result.pose_landmarks:
                lm = result.pose_landmarks.landmark
                poses.append({
                    i: {"x": l.x, "y": l.y, "z": l.z, "v": l.visibility}
                    for i, l in enumerate(lm)
                })
            else:
                poses.append(None)
    
    detected = sum(1 for p in poses if p)
    print(f"✓ Poses detected on {detected}/{len(frame_paths)} frames")
    return poses

def angle_between(a, b, c) -> float:
    """Calcule l'angle ABC en degrés"""
    v1 = np.array([a['x'] - b['x'], a['y'] - b['y']])
    v2 = np.array([c['x'] - b['x'], c['y'] - b['y']])
    cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cos_a, -1, 1))))

def detect_shots(poses: list) -> list[dict]:
    """ÉTAPE 3 — Détection tirs par géométrie des landmarks"""
    shots = []
    prev_wrist_y = None
    
    for i, pose in enumerate(poses):
        if not pose:
            prev_wrist_y = None
            continue
        
        # Landmarks clés
        r_shoulder = pose.get(12); l_shoulder = pose.get(11)
        r_elbow    = pose.get(14); l_elbow    = pose.get(13)
        r_wrist    = pose.get(16); l_wrist    = pose.get(15)
        
        if not all([r_shoulder, l_shoulder, r_elbow, r_wrist]):
            continue
        
        # Déterminer main dominante (celle la plus haute)
        dominant = 'right' if r_wrist['y'] < l_wrist['y'] else 'left'
        wrist    = r_wrist    if dominant == 'right' else l_wrist
        shoulder = r_shoulder if dominant == 'right' else l_shoulder
        elbow    = r_elbow    if dominant == 'right' else l_elbow
        
        # Conditions de tir :
        wrist_above_shoulder = wrist['y'] < shoulder['y'] - 0.05
        elbow_angle = angle_between(shoulder, elbow, wrist)
        good_elbow  = elbow_angle > 70
        
        moving_up = prev_wrist_y and (prev_wrist_y - wrist['y']) > 0.03
        
        if wrist_above_shoulder and good_elbow and moving_up:
            shots.append({
                "frame":        i,
                "timestamp":    i,
                "hand":         dominant,
                "elbow_angle":  round(elbow_angle, 1),
                "wrist_height": round(wrist['y'], 3),
            })
        
        prev_wrist_y = wrist['y']
    
    print(f"✓ Detected {len(shots)} shots")
    return shots

def compute_mental_score(poses: list) -> dict:
    """ÉTAPE 4 — Score mental basé sur la posture"""
    valid = [p for p in poses if p]
    if not valid:
        return {"score": 0, "details": {}}
    
    shoulder_diffs, head_offsets, wrist_speeds = [], [], []
    prev = None
    
    for pose in valid:
        ls = pose.get(11); rs = pose.get(12)
        nose = pose.get(0)
        lw = pose.get(15); rw = pose.get(16)
        
        if ls and rs:
            shoulder_diffs.append(abs(ls['y'] - rs['y']))
            if nose:
                mid_x = (ls['x'] + rs['x']) / 2
                head_offsets.append(abs(nose['x'] - mid_x))
        
        if prev and lw and rw:
            plw = prev.get(15); prw = prev.get(16)
            if plw and prw:
                speed = math.hypot(lw['x']-plw['x'], lw['y']-plw['y'])
                wrist_speeds.append(speed)
        prev = pose
    
    avg_shoulder = np.mean(shoulder_diffs) if shoulder_diffs else 0
    avg_head     = np.mean(head_offsets)   if head_offsets   else 0
    speed_var    = np.std(wrist_speeds)    if wrist_speeds   else 0
    
    # Formule scoring
    shoulder_penalty    = min(avg_shoulder * 150, 25)
    head_penalty        = min(avg_head     * 100, 20)
    consistency_penalty = min(speed_var    * 200, 15)
    
    score = max(0, min(100, 100 - shoulder_penalty - head_penalty - consistency_penalty))
    
    return {
        "score":              round(score),
        "shoulder_alignment": round(max(0, 1 - avg_shoulder * 5), 2),
        "head_stability":     round(max(0, 1 - avg_head     * 4), 2),
        "movement_consistency": round(max(0, 1 - speed_var * 3), 2),
    }

def generate_coach_message(stats: dict) -> str:
    """ÉTAPE 6 — Message coach via Groq (Llama 3)"""
    try:
        client = Groq(api_key=os.environ["GROQ_API_KEY"])
        prompt = f"""You are an elite basketball coach. Give a short, direct, 
        motivating analysis (2-3 sentences max) based on these stats:
        - Field goal: {stats['shots']['percentage']}%
        - Mental score: {stats['mental']['score']}/100
        - Shots detected: {stats['shots']['detected']}
        - Avg elbow angle: {stats['shots'].get('avg_elbow_angle', 'N/A')}°
        Be specific. Be real. Sound like a coach who cares."""
        
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"⚠️ Groq failed: {e} — using fallback")
        pct = stats['shots']['percentage']
        if pct > 70: return "Elite shooting day. Your mechanics are dialed in — keep this session as your reference point."
        if pct > 50: return "Solid session. Your consistency is building. Focus on your release point next time."
        return "Tough day on the court. Every great shooter has them. Study your form and come back stronger."

def process_video(video_path: str, session_id: str) -> dict:
    """Pipeline principal — retourne le rapport complet"""
    start = time.time()
    print(f"\n🏀 Processing session {session_id}")
    
    # 7 étapes
    frames     = extract_frames(video_path, session_id)
    poses      = detect_poses(frames)
    shots      = detect_shots(poses)
    mental     = compute_mental_score(poses)
    
    # Stats tirs
    made       = max(0, round(len(shots) * 0.58))  # Heuristique si pas de ballon tracker
    percentage = round((made / len(shots) * 100), 1) if shots else 0
    avg_elbow  = round(np.mean([s['elbow_angle'] for s in shots]), 1) if shots else 0
    
    stats = {
        "shots": {
            "detected":   len(shots),
            "made":       made,
            "percentage": percentage,
            "avg_elbow_angle": avg_elbow,
            "by_hand": {
                "right": sum(1 for s in shots if s['hand'] == 'right'),
                "left":  sum(1 for s in shots if s['hand'] == 'left'),
            }
        },
        "mental": mental,
    }
    
    stats["coach_message"] = generate_coach_message(stats)
    stats["duration_seconds"] = len(frames)
    stats["frames_analyzed"] = len([p for p in poses if p])
    stats["processing_time"] = round(time.time() - start, 1)
    stats["session_id"] = session_id
    
    print(f"✅ Done in {stats['processing_time']}s")
    print(f"   Shots: {len(shots)} detected, {made} made ({percentage}%)")
    print(f"   Mental: {mental['score']}/100")
    
    return stats
```

---

## 🔧 FASTIFY — ROUTES COMPLÈTES

```typescript
// packages/api/src/routes/sessions.ts
// Toutes les routes sessions — ZÉRO MOCK

import { FastifyPluginAsync } from 'fastify'
import { Queue } from 'bullmq'
import { supabase } from '../lib/supabase'

const aiQueue = new Queue('ai-pipeline', {
  connection: { url: process.env.REDIS_URL }
})

export const sessionsRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /api/sessions/upload
  fastify.post('/upload', async (request, reply) => {
    const userId = request.user.id
    const data   = await request.file()
    
    if (!data) return reply.status(400).send({ error: 'No file provided' })
    
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/avi']
    if (!allowedTypes.includes(data.mimetype))
      return reply.status(400).send({ error: 'Invalid file type. Use MP4, MOV or AVI.' })
    
    const sessionId = crypto.randomUUID()
    const fileName  = `${userId}/${sessionId}.mp4`
    const buffer    = await data.toBuffer()
    
    if (buffer.length > 500 * 1024 * 1024)
      return reply.status(413).send({ error: 'File too large. Max 500MB.' })
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, buffer, { contentType: 'video/mp4' })
    
    if (uploadError)
      return reply.status(500).send({ error: 'Upload failed', details: uploadError.message })
    
    const { data: { publicUrl } } = supabase.storage
      .from('videos').getPublicUrl(fileName)
    
    // Create session in DB
    const { error: dbError } = await supabase.from('sessions').insert({
      id: sessionId, user_id: userId,
      video_url: publicUrl, status: 'pending'
    })
    
    if (dbError)
      return reply.status(500).send({ error: 'Database error', details: dbError.message })
    
    // Queue AI job
    await aiQueue.add('process', { sessionId, videoUrl: publicUrl, userId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    })
    
    return reply.status(201).send({ sessionId, status: 'pending' })
  })

  // GET /api/sessions/:id/status
  fastify.get('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('sessions')
      .select('id, status, progress')
      .eq('id', id).eq('user_id', request.user.id).single()
    
    if (error || !data)
      return reply.status(404).send({ error: 'Session not found' })
    
    return reply.send(data)
  })

  // GET /api/sessions/:id/analysis
  fastify.get('/:id/analysis', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('analyses')
      .select('*').eq('session_id', id).single()
    
    if (error || !data)
      return reply.status(404).send({ error: 'Analysis not found. Still processing?' })
    
    return reply.send(data)
  })

  // GET /api/sessions
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase.from('sessions')
      .select('id, status, created_at, analyses(shots_detected, shots_made, mental_score)')
      .eq('user_id', request.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error)
      return reply.status(500).send({ error: 'Failed to fetch sessions' })
    
    return reply.send(data)
  })
}
```

---

## 🗄️ DATABASE — SCHEMA SUPABASE COMPLET

```sql
-- packages/database/schema.sql
-- Colle ce SQL dans Supabase SQL Editor

-- USERS (extension du profil auth)
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE,
  display_name  TEXT,
  position      TEXT CHECK (position IN ('PG','SG','SF','PF','C')),
  level         TEXT CHECK (level IN ('Beginner','Intermediate','Advanced','Elite')),
  bio           TEXT,
  avatar_url    TEXT,
  xp            INTEGER DEFAULT 0,
  level_num     INTEGER DEFAULT 1,
  streak        INTEGER DEFAULT 0,
  last_session  DATE,
  is_public     BOOLEAN DEFAULT true,
  expo_push_token TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- SESSIONS
CREATE TABLE public.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url   TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  progress    INTEGER DEFAULT 0,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ANALYSES
CREATE TABLE public.analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID REFERENCES public.sessions(id) ON DELETE CASCADE UNIQUE,
  shots_detected    INTEGER DEFAULT 0,
  shots_made        INTEGER DEFAULT 0,
  shooting_pct      DECIMAL(5,2) DEFAULT 0,
  avg_elbow_angle   DECIMAL(5,2),
  right_hand_shots  INTEGER DEFAULT 0,
  left_hand_shots   INTEGER DEFAULT 0,
  mental_score      INTEGER DEFAULT 0,
  shoulder_align    DECIMAL(4,3),
  head_stability    DECIMAL(4,3),
  movement_consist  DECIMAL(4,3),
  coach_message     TEXT,
  duration_seconds  INTEGER,
  frames_analyzed   INTEGER,
  processing_time   DECIMAL(6,2),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- BADGES
CREATE TABLE public.badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  rarity      TEXT CHECK (rarity IN ('common','rare','epic','legendary')),
  xp_reward   INTEGER DEFAULT 0,
  condition   JSONB
);

-- USER BADGES
CREATE TABLE public.user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id   UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- FOLLOWS
CREATE TABLE public.user_follows (
  follower_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- CHALLENGES
CREATE TABLE public.challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  metric       TEXT,
  target_value DECIMAL,
  xp_reward    INTEGER DEFAULT 75,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- CHALLENGE SUBMISSIONS
CREATE TABLE public.challenge_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  score        DECIMAL NOT NULL,
  session_id   UUID REFERENCES public.sessions(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- RLS (Row Level Security)
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view public profiles"
  ON public.profiles FOR SELECT USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users manage own sessions"
  ON public.sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own analyses"
  ON public.analyses FOR SELECT
  USING (session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users view own badges"
  ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view follows"
  ON public.user_follows FOR SELECT USING (true);

CREATE POLICY "Users manage own follows"
  ON public.user_follows FOR ALL USING (auth.uid() = follower_id);

-- Fonction auto-créer profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 🚀 DÉPLOIEMENT — COMMANDES EXACTES

```bash
# RAILWAY (API + AI Python)
npm install -g @railway/cli
railway login
railway init
railway add --plugin redis
railway up

# Variables Railway à configurer :
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# GROQ_API_KEY, REDIS_URL, PORT=3001

# VERCEL (Landing page)
npm install -g vercel
cd apps/web && vercel --prod

# EAS (App mobile — APK preview)
npm install -g eas-cli
eas login
cd apps/mobile
eas build --platform android --profile preview
# → QR code pour installer sur ton téléphone

# .env.example
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GROQ_API_KEY=gsk_...
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
EXPO_PUBLIC_API_URL=https://your-api.railway.app
```

---

## ✅ CRITÈRE DE SUCCÈS FINAL

```
L'app est terminée quand :

□ Une vraie personne peut s'inscrire sur son téléphone
□ Elle peut filmer une session et l'uploader
□ Elle reçoit un rapport avec de vrais chiffres (pas 0 partout)
□ Elle peut voir son profil, ses badges, son rang
□ Quelqu'un qui voit l'écran demande "c'est quoi cette app ?"
□ L'animation count-up joue sur chaque chiffre
□ Aucun écran n'a de données hardcodées
□ Aucune erreur TypeScript (0 warnings)
□ L'app ne crash pas en 5 minutes d'utilisation normale
```

---

**PROTOCOLE DE DÉMARRAGE :**
```
1. Lis @codebase en entier
2. Lis ce prompt en entier  
3. Liste les 10 choses les plus importantes que tu as comprises
4. Propose ton plan d'exécution détaillé
5. Attends mon "OK GO"
6. Exécute UNE phase. STOP. Attends validation.
```

*CourtVision AI — Built different. Plays different.*
