/**
 * SessionSummary — Écran résumé de fin de session d'entraînement.
 *
 * Affiche :
 * - Score global de la session
 * - Statistiques de tir (made/miss, FG%, par zone)
 * - Métriques biomécaniques moyennes
 * - Meilleur/pire tir
 * - Tendances détectées
 * - Comparaison avec la moyenne NBA
 * - Boutons de partage et sauvegarde
 *
 * Design V4 : glass cards, amber accent, animations Reanimated.
 */

import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T, typePresets, glass } from '../../lib/theme'
import { ShotScienceGrid } from './ShotScienceGrid'
import type { SessionRealtimeStats } from '../../lib/realtimeAIService'
import { CoachingEngine, type CoachingReport, type CoachingInsight, type DrillRecommendation } from '../../lib/coachingEngine'

const type = typePresets

// ==========================================
// Types
// ==========================================

interface SessionSummaryProps {
    /** Stats de la session */
    stats: SessionRealtimeStats
    /** Callback pour le partage */
    onShare?: () => void
    /** Callback pour la sauvegarde */
    onSave?: () => void
    /** Callback pour fermer */
    onClose?: () => void
    /** Callback pour recommencer */
    onRestart?: () => void
    /** Extra actions to render in the footer */
    extraActions?: React.ReactNode
}

// ==========================================
// Helpers
// ==========================================

function getGrade(score: number): { grade: string; color: string } {
    if (score >= 90) return { grade: 'A+', color: T.color.semantic.success }
    if (score >= 80) return { grade: 'A', color: T.color.semantic.success }
    if (score >= 70) return { grade: 'B+', color: T.color.signature.primary }
    if (score >= 60) return { grade: 'B', color: T.color.semantic.warning }
    if (score >= 50) return { grade: 'C', color: T.color.semantic.warning }
    return { grade: 'D', color: T.color.semantic.error }
}

function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function getTrendIcon(direction: string): string {
    return direction === 'improving' ? 'trending-up' : direction === 'declining' ? 'trending-down' : 'minus'
}

function getTrendColor(direction: string): string {
    return direction === 'improving' ? T.color.semantic.success : direction === 'declining' ? T.color.semantic.error : T.color.text.tertiary
}

// ==========================================
// Sub-components
// ==========================================

function BigScoreCard({ stats }: { stats: SessionRealtimeStats }) {
    const overallScore = Math.round(
        stats.avgPostureQuality * 0.35 +
        stats.mechanicConsistency * 0.25 +
        stats.shootingPct * 0.25 +
        stats.followThroughPct * 0.15
    )
    const { grade, color } = getGrade(overallScore)

    return (
        <Animated.View entering={ZoomIn.duration(400)} style={styles.bigScoreCard}>
            <View style={[styles.gradeCircle, { borderColor: color }]}>
                <Text style={[styles.gradeText, { color }]}>{grade}</Text>
                <Text style={[styles.gradeScore, { color }]}>{overallScore}</Text>
            </View>
            <Text style={styles.bigScoreLabel}>Score global</Text>
            <Text style={styles.bigScoreSub}>
                {stats.totalShots} tirs · {formatDuration(stats.sessionDurationSec)}
            </Text>
        </Animated.View>
    )
}

function StatRow({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
    return (
        <View style={styles.statRow}>
            <Text style={styles.statLabel}>{label}</Text>
            <View style={styles.statValueRow}>
                <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
                {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
            </View>
        </View>
    )
}

function SectionTitle({ title, icon, delay = 0 }: { title: string; icon: string; delay?: number }) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={styles.sectionHeader}>
            <Feather name={icon as any} size={14} color={T.color.signature.primary} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </Animated.View>
    )
}

// ==========================================
// Composant principal
// ==========================================

export function SessionSummary({
    stats,
    onShare,
    onSave,
    onClose,
    onRestart,
    extraActions,
}: SessionSummaryProps) {
    const fgColor = stats.shootingPct >= 50 ? T.color.semantic.success
        : stats.shootingPct >= 35 ? T.color.semantic.warning
            : T.color.semantic.error

    // Generate coaching report
    const coachingReport = useMemo(() => {
        const engine = new CoachingEngine()
        return engine.generateReport(stats, [])
    }, [stats])

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
                <Text style={styles.headerTitle}>Session terminée</Text>
                {onClose ? (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Feather name="x" size={22} color={T.color.text.secondary} />
                    </TouchableOpacity>
                ) : null}
            </Animated.View>

            {/* Big Score */}
            <BigScoreCard stats={stats} />

            {/* Shooting Stats */}
            <SectionTitle title="Tir" icon="target" delay={100} />
            <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.card}>
                <View style={styles.shootingRow}>
                    <View style={styles.shootingStat}>
                        <Text style={[styles.shootingBig, { color: T.color.semantic.success }]}>
                            {stats.madeShots}
                        </Text>
                        <Text style={styles.shootingLabel}>Made</Text>
                    </View>
                    <View style={styles.shootingCenter}>
                        <Text style={[styles.shootingPct, { color: fgColor }]}>
                            {stats.shootingPct}%
                        </Text>
                        <Text style={styles.shootingLabel}>FG%</Text>
                    </View>
                    <View style={styles.shootingStat}>
                        <Text style={[styles.shootingBig, { color: T.color.semantic.error }]}>
                            {stats.missedShots}
                        </Text>
                        <Text style={styles.shootingLabel}>Missed</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Biomechanics Stats */}
            <SectionTitle title="Biomécanique" icon="activity" delay={200} />
            <ShotScienceGrid
                metrics={[
                    { label: 'ANGLE COUDE', value: stats.avgElbowAngle.toFixed(1), unit: '°' },
                    { label: 'RELEASE HEIGHT', value: stats.avgReleaseHeight.toFixed(3), unit: 'x' },
                    { label: 'RELEASE TIME', value: stats.avgReleaseTime.toFixed(3), unit: 's' },
                    { label: 'FOLLOW-THROUGH', value: stats.followThroughPct.toFixed(0), unit: '%' },
                    { label: 'POSTURE', value: stats.avgPostureQuality.toFixed(0), unit: '/100' },
                    { label: 'CONSISTANCE', value: stats.mechanicConsistency.toFixed(0), unit: '/100' }
                ]}
            />

            {/* Performance */}
            <SectionTitle title="Performance" icon="zap" delay={300} />
            <Animated.View entering={FadeInDown.delay(350).duration(300)} style={styles.card}>
                <StatRow label="Frames analysées" value={stats.totalFramesProcessed.toFixed(0)} />
                <StatRow
                    label="Temps moyen/frame"
                    value={stats.avgProcessingTimeMs.toFixed(1)}
                    unit="ms"
                />
                <StatRow label="Durée session" value={formatDuration(stats.sessionDurationSec)} />
            </Animated.View>

            {/* Trends */}
            {stats.trends.length > 0 ? (
                <>
                    <SectionTitle title="Tendances" icon="trending-up" delay={400} />
                    <Animated.View entering={FadeInDown.delay(450).duration(300)} style={styles.card}>
                        {stats.trends.map((trend, i) => (
                            <View key={i} style={styles.trendRow}>
                                <Feather
                                    name={getTrendIcon(trend.direction) as any}
                                    size={16}
                                    color={getTrendColor(trend.direction)}
                                />
                                <Text style={[styles.trendText, { color: getTrendColor(trend.direction) }]}>
                                    {trend.description}
                                </Text>
                            </View>
                        ))}
                    </Animated.View>
                </>
            ) : null}

            {/* ═══ COACHING INSIGHTS ═══ */}
            {coachingReport.insights.length > 0 ? (
                <>
                    <SectionTitle title="Analyse IA" icon="cpu" delay={480} />
                    <Animated.View entering={FadeInDown.delay(500).duration(300)} style={styles.card}>
                        {/* Headline */}
                        <Text style={styles.coachHeadline}>{coachingReport.headline}</Text>
                        <Text style={styles.coachMotivation}>{coachingReport.motivationMessage}</Text>

                        {/* Top insights */}
                        {coachingReport.insights.slice(0, 4).map((insight, i) => (
                            <View key={insight.id} style={[
                                styles.insightRow,
                                i < Math.min(coachingReport.insights.length, 4) - 1 && styles.insightBorder,
                            ]}>
                                <Text style={styles.insightIcon}>{insight.icon}</Text>
                                <View style={styles.insightContent}>
                                    <Text style={[styles.insightTitle, {
                                        color: insight.category === 'strength' ? T.color.semantic.success
                                            : insight.category === 'weakness' ? T.color.semantic.error
                                                : T.color.text.primary,
                                    }]}>{insight.title}</Text>
                                    <Text style={styles.insightDesc}>{insight.description}</Text>
                                </View>
                            </View>
                        ))}

                        {/* NBA Comparison */}
                        <View style={styles.nbaCompBox}>
                            <Text style={styles.nbaCompLabel}>🏀 Comparaison NBA</Text>
                            <Text style={styles.nbaCompPlayer}>
                                {coachingReport.nbaComparison.closestPlayer} ({coachingReport.nbaComparison.similarity}% similaire)
                            </Text>
                            <Text style={styles.nbaCompDetail}>{coachingReport.nbaComparison.keyDifference}</Text>
                        </View>
                    </Animated.View>
                </>
            ) : null}

            {/* ═══ DRILL RECOMMENDATIONS ═══ */}
            {coachingReport.drills.length > 0 ? (
                <>
                    <SectionTitle title="Exercices recommandés" icon="book-open" delay={550} />
                    {coachingReport.drills.map((drill, i) => (
                        <Animated.View
                            key={drill.id}
                            entering={FadeInDown.delay(580 + i * 60).duration(300)}
                            style={styles.drillCard}
                        >
                            <View style={styles.drillHeader}>
                                <Text style={styles.drillIcon}>{drill.icon}</Text>
                                <View style={styles.drillHeaderText}>
                                    <Text style={styles.drillName}>{drill.name}</Text>
                                    <Text style={styles.drillMeta}>
                                        {drill.duration} · {drill.difficulty === 'easy' ? '🟢' : drill.difficulty === 'medium' ? '🟡' : '🔴'} {drill.difficulty}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.drillDesc}>{drill.description}</Text>
                        </Animated.View>
                    ))}

                    {/* Next session focus */}
                    <Animated.View entering={FadeInDown.delay(750).duration(300)} style={styles.focusCard}>
                        <Feather name="flag" size={16} color={T.color.signature.primary} />
                        <Text style={styles.focusText}>{coachingReport.nextSessionFocus}</Text>
                    </Animated.View>
                </>
            ) : null}

            {/* Action buttons */}
            <Animated.View entering={FadeInUp.delay(500).duration(300)} style={styles.actions}>
                {onRestart ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={onRestart}>
                        <Feather name="refresh-cw" size={18} color="#FFF" />
                        <Text style={styles.primaryBtnText}>Nouvelle session</Text>
                    </TouchableOpacity>
                ) : null}
                <View style={styles.secondaryRow}>
                    {onSave ? (
                        <TouchableOpacity style={styles.secondaryBtn} onPress={onSave}>
                            <Feather name="save" size={16} color={T.color.text.primary} />
                            <Text style={styles.secondaryBtnText}>Sauvegarder</Text>
                        </TouchableOpacity>
                    ) : null}
                    {onShare ? (
                        <TouchableOpacity style={styles.secondaryBtn} onPress={onShare}>
                            <Feather name="share-2" size={16} color={T.color.text.primary} />
                            <Text style={styles.secondaryBtnText}>Partager</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                {extraActions ?? null}
            </Animated.View>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
        </ScrollView>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.color.background.primary,
    },
    content: {
        padding: 16,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        color: T.color.text.primary,
        fontSize: 22,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        ...(T.glass.thin as any),
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Big score
    bigScoreCard: {
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 20,
        backgroundColor: T.color.background.secondary,
        borderRadius: T.borderRadius.xl,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    gradeCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: T.color.background.tertiary,
        marginBottom: 12,
    },
    gradeText: {
        fontSize: 28,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    gradeScore: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: -4,
        fontFamily: T.fonts.body.semibold,
    },
    bigScoreLabel: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: T.fonts.display.semibold,
    },
    bigScoreSub: {
        color: T.color.text.secondary,
        fontSize: 13,
        marginTop: 4,
        fontFamily: T.fonts.body.regular,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Card
    card: {
        ...(T.glass.base as any),
        borderRadius: T.borderRadius.lg,
        padding: 14,
        marginBottom: 12,
    },

    // Shooting row
    shootingRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
    },
    shootingStat: {
        alignItems: 'center',
    },
    shootingCenter: {
        alignItems: 'center',
    },
    shootingBig: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    shootingPct: {
        fontSize: 36,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    shootingLabel: {
        color: T.color.text.secondary,
        fontSize: 11,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Stat rows
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.soft,
    },
    statLabel: {
        color: T.color.text.secondary,
        fontSize: 13,
        fontFamily: T.fonts.body.regular,
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    statValue: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    statUnit: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
    },

    // Trends
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 5,
    },
    trendText: {
        fontSize: 13,
        fontFamily: T.fonts.body.regular,
    },

    // Actions
    actions: {
        marginTop: 16,
    },
    primaryBtn: {
        backgroundColor: T.color.signature.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: T.borderRadius.md,
        marginBottom: 12,
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    secondaryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: T.borderRadius.md,
        ...(T.glass.thin as any),
    },
    secondaryBtnText: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },

    // Coaching insights
    coachHeadline: {
        color: T.color.text.primary,
        fontSize: 15,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
        marginBottom: 4,
    },
    coachMotivation: {
        color: T.color.text.secondary,
        fontSize: 13,
        fontFamily: T.fonts.body.regular,
        marginBottom: 12,
        lineHeight: 18,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 8,
    },
    insightBorder: {
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.soft,
    },
    insightIcon: {
        fontSize: 18,
        marginTop: 2,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
        marginBottom: 2,
    },
    insightDesc: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
        lineHeight: 17,
    },

    // NBA comparison
    nbaCompBox: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: T.color.border.soft,
    },
    nbaCompLabel: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
        marginBottom: 4,
    },
    nbaCompPlayer: {
        color: T.color.signature.primary,
        fontSize: 15,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
        marginBottom: 2,
    },
    nbaCompDetail: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },

    // Drills
    drillCard: {
        ...(T.glass.base as any),
        borderRadius: T.borderRadius.lg,
        padding: 14,
        marginBottom: 8,
    },
    drillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    drillIcon: {
        fontSize: 22,
    },
    drillHeaderText: {
        flex: 1,
    },
    drillName: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    drillMeta: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
        marginTop: 1,
    },
    drillDesc: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
        lineHeight: 17,
    },

    // Focus card
    focusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: T.color.signature.muted,
        borderRadius: T.borderRadius.md,
        padding: 14,
        marginTop: 4,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: `${T.color.signature.primary}30`,
    },
    focusText: {
        color: T.color.signature.primary,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
        flex: 1,
    },
})
