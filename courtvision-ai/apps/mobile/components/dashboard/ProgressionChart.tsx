/**
 * ProgressionChart — Graphique de progression des métriques dans le temps.
 *
 * Affiche un mini line chart pour visualiser l'évolution
 * des métriques (FG%, angle coude, release time, etc.) sur les N dernières sessions.
 *
 * Design V4 : dark premium, amber accent, glass card.
 */

import React, { useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Svg, { Path, Circle, Line, G, Text as SvgText, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'
import { T } from '../../lib/theme'

// ==========================================
// Types
// ==========================================

export interface DataPoint {
    label: string
    value: number
    timestamp?: number
}

interface ProgressionChartProps {
    /** Points de données */
    data: DataPoint[]
    /** Titre du graphique */
    title: string
    /** Unité affichée */
    unit?: string
    /** Couleur de la ligne */
    color?: string
    /** Valeur cible/idéale (ligne horizontale) */
    targetValue?: number
    /** Label de la cible */
    targetLabel?: string
    /** Hauteur du chart */
    height?: number
    /** Afficher le gradient sous la courbe */
    showGradient?: boolean
    /** Afficher les points de données */
    showDots?: boolean
}

// ==========================================
// Component
// ==========================================

export function ProgressionChart({
    data,
    title,
    unit = '',
    color = T.color.signature.primary,
    targetValue,
    targetLabel,
    height = 160,
    showGradient = true,
    showDots = true,
}: ProgressionChartProps) {
    const { width: screenWidth } = Dimensions.get('window')
    const chartWidth = screenWidth - 64 // padding
    const chartHeight = height - 40 // leave room for labels

    const { path, gradientPath, dots, yMin, yMax, yLabels, targetY } = useMemo(() => {
        if (data.length === 0) {
            return { path: '', gradientPath: '', dots: [], yMin: 0, yMax: 100, yLabels: [], targetY: null }
        }

        const values = data.map(d => d.value)
        const minVal = Math.min(...values)
        const maxVal = Math.max(...values)
        const padding = (maxVal - minVal) * 0.15 || 5
        const yMinCalc = Math.max(0, minVal - padding)
        const yMaxCalc = maxVal + padding

        const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2
        const scaleY = (v: number) => chartHeight - ((v - yMinCalc) / (yMaxCalc - yMinCalc)) * chartHeight

        // Build SVG path
        const points = data.map((d, i) => ({
            x: i * xStep,
            y: scaleY(d.value),
        }))

        let linePath = `M ${points[0].x} ${points[0].y}`
        for (let i = 1; i < points.length; i++) {
            // Smooth curve
            const prev = points[i - 1]
            const curr = points[i]
            const cpx = (prev.x + curr.x) / 2
            linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
        }

        // Gradient path (close to bottom)
        const gradPath = linePath + ` L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`

        // Y-axis labels
        const yLabelValues = [yMinCalc, (yMinCalc + yMaxCalc) / 2, yMaxCalc]
        const yLabelsCalc = yLabelValues.map(v => ({
            value: Math.round(v * 10) / 10,
            y: scaleY(v),
        }))

        // Target line
        const tY = targetValue !== undefined && targetValue >= yMinCalc && targetValue <= yMaxCalc
            ? scaleY(targetValue)
            : null

        return {
            path: linePath,
            gradientPath: gradPath,
            dots: points.map((p, i) => ({ ...p, value: data[i].value, label: data[i].label })),
            yMin: yMinCalc,
            yMax: yMaxCalc,
            yLabels: yLabelsCalc,
            targetY: tY,
        }
    }, [data, chartWidth, chartHeight, targetValue])

    if (data.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Pas encore de données</Text>
                </View>
            </View>
        )
    }

    // Latest value and trend
    const latest = data[data.length - 1].value
    const previous = data.length >= 2 ? data[data.length - 2].value : null
    const trend = previous !== null ? latest - previous : null

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.valueRow}>
                    <Text style={[styles.latestValue, { color }]}>
                        {latest.toFixed(1)}{unit}
                    </Text>
                    {trend !== null && (
                        <Text style={[styles.trendText, {
                            color: trend >= 0 ? T.color.semantic.success : T.color.semantic.error,
                        }]}>
                            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Chart */}
            <Svg width={chartWidth} height={chartHeight + 20} style={{ marginLeft: 4 }}>
                <Defs>
                    <LinearGradient id={`grad_${title}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity={0.25} />
                        <Stop offset="1" stopColor={color} stopOpacity={0} />
                    </LinearGradient>
                </Defs>

                {/* Grid lines */}
                {yLabels.map((yl, i) => (
                    <G key={i}>
                        <Line
                            x1={0} y1={yl.y} x2={chartWidth} y2={yl.y}
                            stroke={T.color.border.soft} strokeWidth={0.5} strokeDasharray="4,4"
                        />
                        <SvgText
                            x={chartWidth + 2} y={yl.y + 3}
                            fill={T.color.text.tertiary} fontSize={9}
                        >
                            {yl.value}
                        </SvgText>
                    </G>
                ))}

                {/* Target line */}
                {targetY !== null && (
                    <G>
                        <Line
                            x1={0} y1={targetY} x2={chartWidth} y2={targetY}
                            stroke={T.color.semantic.success} strokeWidth={1} strokeDasharray="6,3"
                            opacity={0.6}
                        />
                        {targetLabel && (
                            <SvgText
                                x={4} y={targetY - 4}
                                fill={T.color.semantic.success} fontSize={8} fontWeight="600"
                            >
                                {targetLabel}
                            </SvgText>
                        )}
                    </G>
                )}

                {/* Gradient fill */}
                {showGradient && gradientPath && (
                    <Path d={gradientPath} fill={`url(#grad_${title})`} />
                )}

                {/* Line */}
                <Path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots */}
                {showDots && dots.map((dot, i) => (
                    <G key={i}>
                        <Circle cx={dot.x} cy={dot.y} r={4} fill={T.color.background.primary} stroke={color} strokeWidth={2} />
                        {/* Label underneath (only for first, middle, last) */}
                        {(i === 0 || i === dots.length - 1 || i === Math.floor(dots.length / 2)) && (
                            <SvgText
                                x={dot.x} y={chartHeight + 14}
                                fill={T.color.text.tertiary} fontSize={8} textAnchor="middle"
                            >
                                {dot.label}
                            </SvgText>
                        )}
                    </G>
                ))}
            </Svg>
        </View>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    title: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: T.fonts.body.semibold,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    latestValue: {
        fontSize: 20,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    emptyState: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: T.color.text.tertiary,
        fontSize: 13,
        fontFamily: T.fonts.body.regular,
    },
})
