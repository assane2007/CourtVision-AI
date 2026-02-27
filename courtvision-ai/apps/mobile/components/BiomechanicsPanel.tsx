/**
 * BiomechanicsPanel — Panneau de métriques biomécaniques en temps réel.
 *
 * Affiche les métriques clés du tir en temps réel :
 * - Angle du coude (avec zone optimale)
 * - Hauteur de release (ratio)
 * - Temps de release
 * - Qualité de posture
 * - % Follow-through
 * - Score de consistance
 * - Tendances
 *
 * Design V4 : glass cards, amber accent, Sora display font.
 */

import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
    FadeIn,
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T, typePresets } from '../lib/theme'

const type = typePresets

// ==========================================
// Types
// ==========================================

interface BiomechanicsPanelProps {
    /** Angle du coude (degrés) */
    elbowAngle: number
    /** Hauteur de release (ratio) */
    releaseHeight: number
    /** Temps de release (secondes) */
    releaseTime: number
    /** Qualité de posture (0-100) */
    postureQuality: number
    /** % de follow-through */
    followThroughPct: number
    /** Score de consistance mécanique (0-100) */
    mechanicConsistency: number
    /** Tendances détectées */
    trends: Array<{
        metric: string
        direction: 'improving' | 'declining' | 'stable'
        description: string
    }>
    /** FPS du pipeline */
    fps: number
    /** Phase de tir */
    shotPhase: string
    /** Mode compact */
    compact?: boolean
}

// ==========================================
// Helpers
// ==========================================

/** Couleur selon la qualité du metric (vert/jaune/rouge) */
function getMetricColor(value: number, min: number, optMin: number, optMax: number, max: number): string {
    if (value >= optMin && value <= optMax) return T.color.semantic.success
    if (value >= min && value <= max) return T.color.semantic.warning
    return T.color.semantic.error
}

function getScoreColor(score: number): string {
    if (score >= 75) return T.color.semantic.success
    if (score >= 50) return T.color.semantic.warning
    return T.color.semantic.error
}

function getTrendIcon(direction: string): string {
    if (direction === 'improving') return 'trending-up'
    if (direction === 'declining') return 'trending-down'
    return 'minus'
}

function getTrendColor(direction: string): string {
    if (direction === 'improving') return T.color.semantic.success
    if (direction === 'declining') return T.color.semantic.error
    return T.color.text.tertiary
}

// ==========================================
// Sub-components
// ==========================================

/** Carte de métrique individuelle */
function MetricCard({
    label,
    value,
    unit,
    color,
    optimal,
    icon,
    delay = 0,
}: {
    label: string
    value: string
    unit?: string
    color: string
    optimal?: string
    icon: string
    delay?: number
}) {
    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(300)}
            style={styles.metricCard}
        >
            <View style={styles.metricHeader}>
                <Feather name={icon as any} size={12} color={T.color.text.tertiary} />
                <Text style={styles.metricLabel}>{label}</Text>
            </View>
            <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color }]}>{value}</Text>
                {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
            </View>
            {optimal ? (
                <Text style={styles.metricOptimal}>Optimal: {optimal}</Text>
            ) : null}
        </Animated.View>
    )
}

/** Score circulaire */
function ScoreRingMini({
    score,
    label,
    color,
}: {
    score: number
    label: string
    color: string
}) {
    return (
        <View style={styles.scoreRing}>
            <View style={[styles.scoreCircle, { borderColor: color }]}>
                <Text style={[styles.scoreValue, { color }]}>{score}</Text>
            </View>
            <Text style={styles.scoreLabel}>{label}</Text>
        </View>
    )
}

// ==========================================
// Composant principal
// ==========================================

export function BiomechanicsPanel({
    elbowAngle,
    releaseHeight,
    releaseTime,
    postureQuality,
    followThroughPct,
    mechanicConsistency,
    trends,
    fps,
    shotPhase,
    compact = false,
}: BiomechanicsPanelProps) {
    // Couleurs basées sur les seuils NBA
    const elbowColor = getMetricColor(elbowAngle, 80, 90, 100, 115)
    const heightColor = getMetricColor(releaseHeight, 1.05, 1.12, 1.22, 1.30)
    const timeColor = getMetricColor(releaseTime, 0.25, 0.32, 0.45, 0.60)
    const postureColor = getScoreColor(postureQuality)
    const consistencyColor = getScoreColor(mechanicConsistency)

    if (compact) {
        // Mode compact : juste les 3 métriques principales + score
        return (
            <Animated.View entering={FadeIn.duration(300)} style={styles.compactContainer}>
                <View style={styles.compactRow}>
                    <View style={styles.compactMetric}>
                        <Text style={styles.compactLabel}>Coude</Text>
                        <Text style={[styles.compactValue, { color: elbowColor }]}>{elbowAngle.toFixed(0)}°</Text>
                    </View>
                    <View style={styles.compactDivider} />
                    <View style={styles.compactMetric}>
                        <Text style={styles.compactLabel}>Release</Text>
                        <Text style={[styles.compactValue, { color: heightColor }]}>{releaseHeight.toFixed(2)}</Text>
                    </View>
                    <View style={styles.compactDivider} />
                    <View style={styles.compactMetric}>
                        <Text style={styles.compactLabel}>Temps</Text>
                        <Text style={[styles.compactValue, { color: timeColor }]}>{releaseTime.toFixed(2)}s</Text>
                    </View>
                    <View style={styles.compactDivider} />
                    <View style={styles.compactMetric}>
                        <Text style={styles.compactLabel}>Posture</Text>
                        <Text style={[styles.compactValue, { color: postureColor }]}>{postureQuality}</Text>
                    </View>
                </View>
            </Animated.View>
        )
    }

    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Biomécanique</Text>
                <View style={styles.fpsChip}>
                    <Text style={styles.fpsText}>{fps} FPS</Text>
                </View>
            </View>

            {/* Scores circulaires */}
            <View style={styles.scoresRow}>
                <ScoreRingMini score={postureQuality} label="Posture" color={postureColor} />
                <ScoreRingMini score={mechanicConsistency} label="Consistance" color={consistencyColor} />
                <ScoreRingMini score={Math.round(followThroughPct)} label="Follow-Thru" color={getScoreColor(followThroughPct)} />
            </View>

            {/* Metrics grid */}
            <View style={styles.metricsGrid}>
                <MetricCard
                    icon="target"
                    label="Angle coude"
                    value={elbowAngle.toFixed(0)}
                    unit="°"
                    color={elbowColor}
                    optimal="90-100°"
                    delay={0}
                />
                <MetricCard
                    icon="arrow-up"
                    label="Release Height"
                    value={releaseHeight.toFixed(2)}
                    unit="x"
                    color={heightColor}
                    optimal="1.12-1.22x"
                    delay={50}
                />
                <MetricCard
                    icon="clock"
                    label="Release Time"
                    value={releaseTime.toFixed(2)}
                    unit="s"
                    color={timeColor}
                    optimal="0.32-0.45s"
                    delay={100}
                />
                <MetricCard
                    icon="activity"
                    label="Phase"
                    value={shotPhase === 'idle' ? '—' : shotPhase.replace('_', ' ')}
                    color={shotPhase === 'idle' ? T.color.text.tertiary : T.color.signature.primary}
                    delay={150}
                />
            </View>

            {/* Trends */}
            {trends.length > 0 ? (
                <View style={styles.trendsContainer}>
                    <Text style={styles.trendsTitle}>Tendances</Text>
                    {trends.map((trend, i) => (
                        <View key={i} style={styles.trendRow}>
                            <Feather
                                name={getTrendIcon(trend.direction) as any}
                                size={14}
                                color={getTrendColor(trend.direction)}
                            />
                            <Text style={[styles.trendText, { color: getTrendColor(trend.direction) }]}>
                                {trend.description}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </Animated.View>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    fpsChip: {
        backgroundColor: T.color.background.tertiary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    fpsText: {
        color: T.color.text.tertiary,
        fontSize: 10,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },

    // Score rings
    scoresRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    scoreRing: {
        alignItems: 'center',
    },
    scoreCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: T.color.background.tertiary,
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    scoreLabel: {
        color: T.color.text.secondary,
        fontSize: 10,
        fontFamily: T.fonts.body.regular,
    },

    // Metrics grid
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metricCard: {
        flex: 1,
        minWidth: '45%' as any,
        backgroundColor: T.color.background.tertiary,
        borderRadius: T.borderRadius.md,
        padding: 10,
        borderWidth: 1,
        borderColor: T.color.border.subtle,
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    metricLabel: {
        color: T.color.text.tertiary,
        fontSize: 10,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    metricUnit: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
    },
    metricOptimal: {
        color: T.color.text.tertiary,
        fontSize: 9,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Trends
    trendsContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: T.color.border.subtle,
    },
    trendsTitle: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        fontFamily: T.fonts.body.semibold,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    trendText: {
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },

    // Compact mode
    compactContainer: {
        backgroundColor: 'rgba(13,17,25,0.85)',
        borderRadius: T.borderRadius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    compactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    compactMetric: {
        flex: 1,
        alignItems: 'center',
    },
    compactLabel: {
        color: T.color.text.tertiary,
        fontSize: 9,
        fontWeight: '600',
        marginBottom: 2,
        fontFamily: T.fonts.body.semibold,
    },
    compactValue: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    compactDivider: {
        width: 1,
        height: 24,
        backgroundColor: T.color.border.subtle,
    },
})
