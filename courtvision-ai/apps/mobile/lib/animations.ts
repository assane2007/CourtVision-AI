/**
 * CourtVision AI — Animation Hooks V3
 * =====================================================================
 * Tous les hooks utilisent react-native-reanimated v3 UNIQUEMENT.
 * Pas de setTimeout. Pas d'Animated API classique.
 * Chaque hook est autonome, composable et mémorisé.
 * =====================================================================
 */

import {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withRepeat,
    withSequence,
    withDelay,
    cancelAnimation,
    runOnJS,
    interpolate,
    Easing,
} from 'react-native-reanimated'
/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useRef, useCallback } from 'react'
import { T } from './theme'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnimatedStyleResult {
    animatedStyle: ReturnType<typeof useAnimatedStyle>
}

export interface CountUpResult {
    displayValue: number
    animatedStyle: ReturnType<typeof useAnimatedStyle>
    progress: ReturnType<typeof useSharedValue>
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. useCountUp — Anime un nombre de 0 → targetValue
//    Easing: spring avec légère overshoot sur les pourcentages
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param targetValue  Valeur finale (ex: 73 pour "73%")
 * @param duration     Durée en ms (défaut: 1000ms)
 * @param delay        Délai avant démarrage en ms (défaut: 0)
 */
export function useCountUp(
    targetValue: number,
    duration = 1000,
    delay = 0,
) {
    const progress = useSharedValue(0)

    useEffect(() => {
        cancelAnimation(progress)
        progress.value = 0

        const start = () => {
            progress.value = withTiming(1, {
                duration,
                easing: Easing.out(Easing.cubic),
            })
        }

        if (delay > 0) {
            progress.value = withDelay(delay, withTiming(1, {
                duration,
                easing: Easing.out(Easing.cubic),
            }))
        } else {
            start()
        }
    }, [targetValue])

    // currentValue = interpolated 0 → targetValue
    const animatedStyle = useAnimatedStyle(() => {
        // Style vide — on expose progress pour que les consommateurs
        // calculent la valeur affichée via interpolate()
        return {}
    })

    return { progress, animatedStyle }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. useFadeSlideIn — Fade + slide depuis le bas
//    Idéal pour les cards qui apparaissent au scroll
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param delay   Délai de démarrage en ms (pour stagger liste)
 * @param offset  Distance de slide (défaut: 20px)
 */
export function useFadeSlideIn(delay = 0, offset = 20) {
    const opacity = useSharedValue(0)
    const translateY = useSharedValue(offset)

    useEffect(() => {
        opacity.value = withDelay(
            delay,
            withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) })
        )
        translateY.value = withDelay(
            delay,
            withSpring(0, T.spring.snappy)
        )

        return () => {
            cancelAnimation(opacity)
            cancelAnimation(translateY)
        }
    }, [delay])

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }))

    return { animatedStyle, opacity, translateY }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. useScalePress — Feedback visuel au press (scale down)
//    S'applique sur n'importe quel Pressable/TouchableOpacity
// ─────────────────────────────────────────────────────────────────────────────

export function useScalePress(scale = 0.95) {
    const pressed = useSharedValue(false)
    const scaleValue = useSharedValue(1)

    const onPressIn = useCallback(() => {
        pressed.value = true
        scaleValue.value = withSpring(scale, T.spring.interaction)
    }, [scale])

    const onPressOut = useCallback(() => {
        pressed.value = false
        scaleValue.value = withSpring(1, T.spring.interaction)
    }, [])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleValue.value }],
    }))

    return { animatedStyle, onPressIn, onPressOut }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. usePulse — Scale loop 1 → 1.05 → 1
//    Pour les CTA qui attendent une action ("Record your session")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param amplitude   Amplitude du pulse (défaut: 1.05)
 * @param period      Durée d'un cycle aller-retour en ms (défaut: 1800)
 */
export function usePulse(amplitude = 1.05, period = 1800) {
    const scale = useSharedValue(1)

    useEffect(() => {
        // One-shot emphasis on state change; never idle-loop by default.
        scale.value = withSequence(
            withTiming(amplitude, { duration: period / 2, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin) })
        )

        return () => cancelAnimation(scale)
    }, [amplitude, period])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return { animatedStyle, scale }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. useGlow — Glow pulsant sur une card (opacity de la shadow)
//    Pour highlight les nouvelles notifications, badges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param active  true = glow actif et pulsant, false = glow off
 */
export function useGlow(active = true) {
    const intensity = useSharedValue(active ? 0.3 : 0)

    useEffect(() => {
        if (active) {
            intensity.value = withTiming(0.35, { duration: 220 })
        } else {
            cancelAnimation(intensity)
            intensity.value = withTiming(0, { duration: 150 })
        }

        return () => cancelAnimation(intensity)
    }, [active])

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: 1, // shadowOpacity ne se anime pas en Reanimated — utiliser opacity sur le wrapper
    }))

    return { animatedStyle, intensity }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. useTabSlide — Indicateur tab qui slide (position X)
//    Spring animation entre les onglets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param activeIndex   Index de l'onglet actif (0-based)
 * @param tabWidth      Largeur d'un onglet en px
 */
export function useTabSlide(activeIndex: number, tabWidth: number) {
    const translateX = useSharedValue(activeIndex * tabWidth)

    useEffect(() => {
        translateX.value = withSpring(activeIndex * tabWidth, T.spring.snappy)
    }, [activeIndex, tabWidth])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }))

    return { animatedStyle, translateX }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. useSkeletonPulse — Shimmer pour skeleton loaders
//    Opacity 0.15 → 0.40 en loop
// ─────────────────────────────────────────────────────────────────────────────

export function useSkeletonPulse() {
    const opacity = useSharedValue(0.15)

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.40, { duration: 800, easing: Easing.inOut(Easing.sin) }),
                withTiming(0.15, { duration: 800, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            false
        )
        return () => cancelAnimation(opacity)
    }, [])

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }))

    return { animatedStyle }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. useLevelUp — Animation de célébration (level up)
//    Scale + glow burst — se déclenche une seule fois
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param onDone   Callback appelé quand l'animation est terminée
 */
export function useLevelUp(onDone?: () => void) {
    const scale = useSharedValue(1)
    const opacity = useSharedValue(0)
    const glowOpacity = useSharedValue(0)

    const trigger = useCallback(() => {
        // Burst d'apparition + scale overshoot
        opacity.value = withTiming(1, { duration: 100 })
        scale.value = withSequence(
            withSpring(1.35, { damping: 6, stiffness: 300 }),
            withSpring(1, T.spring.snappy)
        )
        glowOpacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(600, withTiming(0, { duration: 400 }))
        )
        // Retour après 1200ms
        opacity.value = withDelay(
            1200,
            withTiming(0, { duration: 300 }, (finished) => {
                if (finished && onDone) runOnJS(onDone)()
            })
        )
    }, [onDone])

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }))

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }))

    return { animatedStyle, glowStyle, trigger }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. useStaggeredList — Stagger pour une liste de cards
//    Génère N styles d'entrée avec délais incrémentaux
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param count       Nombre d'items dans la liste
 * @param staggerMs   Délai entre chaque item en ms (défaut: 60)
 */
export function useStaggeredList(count: number, staggerMs = 60) {
    return Array.from({ length: count }, (_, i) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useFadeSlideIn(i * staggerMs)
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. useProgressBar — Barre de progression animée (0 → pct)
//     Spring fluide, idéal pour XPBar et challenge progress
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param target    Valeur cible 0-100
 * @param delay     Délai de démarrage en ms
 */
export function useProgressBar(target: number, delay = 0) {
    const progress = useSharedValue(0)

    useEffect(() => {
        const targetDecimal = Math.min(Math.max(target, 0), 100) / 100
        cancelAnimation(progress)

        if (delay > 0) {
            progress.value = withDelay(
                delay,
                withTiming(targetDecimal, {
                    duration: 500,
                    easing: Easing.linear,
                })
            )
        } else {
            progress.value = withTiming(targetDecimal, {
                duration: 500,
                easing: Easing.linear,
            })
        }
    }, [target])

    // Retourne un style `width` en % pour un wrapper à flex:1
    const animatedStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%` as any,
    }))

    return { animatedStyle, progress }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. useRingProgress — Stroke-dashoffset pour SVG ScoreRing
//     Calcule l'offset à partir de la circonférence et du score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param score           Score 0-100
 * @param circumference   Circonférence du cercle SVG (2π × r)
 * @param delay           Délai de démarrage en ms
 */
export function useRingProgress(score: number, circumference: number, delay = 0) {
    const strokeDashoffset = useSharedValue(circumference)

    useEffect(() => {
        const targetOffset = circumference - (score / 100) * circumference
        cancelAnimation(strokeDashoffset)

        if (delay > 0) {
            strokeDashoffset.value = withDelay(
                delay,
                withTiming(targetOffset, {
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                })
            )
        } else {
            strokeDashoffset.value = withTiming(targetOffset, {
                duration: 500,
                easing: Easing.out(Easing.cubic),
            })
        }
    }, [score, circumference])

    const animatedProps = { strokeDashoffset }

    return { strokeDashoffset, animatedProps }
}
