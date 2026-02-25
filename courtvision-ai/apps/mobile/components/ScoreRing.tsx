/**
 * ScoreRing — Jauge circulaire SVG animée (stroke-dashoffset).
 *
 * Couleur dynamique : rouge → orange → amber → vert selon la valeur.
 * Animation draw-in au premier render.
 * Chiffre central avec count-up.
 *
 * Usage :
 *   <ScoreRing value={73} size={180} label="Mental Score" />
 */

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    withDelay,
    Easing,
    interpolate,
    useAnimatedStyle,
} from 'react-native-reanimated'
import { T } from '../lib/theme'

// ─── Animated SVG Circle ─────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ─── Types ────────────────────────────────────────────────────

export interface ScoreRingProps {
    value: number          // 0-100
    size?: number          // diamètre total en px (défaut: 140)
    strokeWidth?: number   // épaisseur du tracé (défaut: 10)
    label?: string         // sous le chiffre, ex: "Mental Score"
    sublabel?: string      // encore plus bas, ex: "Cette session"
    delay?: number         // délai avant animation en ms
    style?: ViewStyle
    showTrack?: boolean    // afficher le cercle de fond (défaut: true)
}

// ─── Helpers ──────────────────────────────────────────────────

/** Couleur dynamique : rouge → amber brand → vert */
function scoreColor(v: number) {
    if (v >= 85) return T.colors.green         // Elite
    if (v >= 70) return T.colors.accent        // Great — AMBER brand
    if (v >= 50) return T.colors.orange        // Solid
    return T.colors.red                         // Needs work
}

/** Gradient ID unique par instance */
let gradientIdCounter = 0

// ─── Composant ────────────────────────────────────────────────

export function ScoreRing({
    value,
    size = 140,
    strokeWidth = 10,
    label,
    sublabel,
    delay = 0,
    style,
    showTrack = true,
}: ScoreRingProps) {
    const clampedValue = Math.min(Math.max(value, 0), 100)
    const color = scoreColor(clampedValue)

    // Géométrie
    const center = size / 2
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const targetOffset = circumference - (clampedValue / 100) * circumference

    // Animation stroke-dashoffset
    const strokeOffset = useSharedValue(circumference) // commence à 0% rempli
    const centralOpacity = useSharedValue(0)

    useEffect(() => {
        strokeOffset.value = withDelay(
            delay,
            withTiming(targetOffset, {
                duration: T.animation.duration.slow,
                easing: Easing.out(Easing.cubic),
            })
        )
        centralOpacity.value = withDelay(
            delay + 300,
            withTiming(1, { duration: 400 })
        )
    }, [clampedValue, delay, targetOffset, circumference])

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: strokeOffset.value,
    }))

    const centerStyle = useAnimatedStyle(() => ({
        opacity: centralOpacity.value,
    }))

    // Count-up sur le chiffre central
    const [display, setDisplay] = useState(0)
    useEffect(() => {
        const startMs = performance.now() + delay + 100
        let raf: ReturnType<typeof requestAnimationFrame>

        const tick = (now: number) => {
            const elapsed = now - startMs
            if (elapsed < 0) { raf = requestAnimationFrame(tick); return }
            const t = Math.min(elapsed / T.animation.duration.slow, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setDisplay(Math.round(eased * clampedValue))
            if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [clampedValue, delay])

    // Gradient unique pour chaque ring
    const [gradientId] = useState(() => `ringGrad_${++gradientIdCounter}`)

    return (
        <View style={[styles.container, { width: size, height: size }, style]}>
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={color} stopOpacity="1" />
                        <Stop offset="100%" stopColor={color === T.colors.accent ? '#FFB347' : color} stopOpacity="0.85" />
                    </LinearGradient>
                </Defs>

                {/* Track (fond gris sombre) */}
                {showTrack && (
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={T.colors.dimmer}
                        strokeWidth={strokeWidth - 2}
                        fill="none"
                    />
                )}

                {/* Arc animé */}
                <AnimatedCircle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={`url(#${gradientId})`}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animatedProps={animatedProps}
                    // Rotation pour démarrer en haut (12h) : -90°
                    transform={`rotate(-90 ${center} ${center})`}
                />
            </Svg>

            {/* Contenu central */}
            <Animated.View style={[styles.centerContent, centerStyle]}>
                <Text style={[styles.valueText, { color }]}>
                    {display}
                </Text>
                {label && (
                    <Text style={styles.labelText} numberOfLines={1}>
                        {label}
                    </Text>
                )}
                {sublabel && (
                    <Text style={styles.sublabelText} numberOfLines={1}>
                        {sublabel}
                    </Text>
                )}
            </Animated.View>
        </View>
    )
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    valueText: {
        fontSize: T.font.xxxl, // 32
        fontWeight: '900',
        letterSpacing: -1.5,
        fontVariant: ['tabular-nums'],
    },
    labelText: {
        fontSize: T.font.xs,
        color: T.colors.textSecondary,
        fontWeight: '600',
        letterSpacing: 0.3,
        textAlign: 'center',
        maxWidth: 80,
    },
    sublabelText: {
        fontSize: 10,
        color: T.colors.muted,
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 80,
    },
})
