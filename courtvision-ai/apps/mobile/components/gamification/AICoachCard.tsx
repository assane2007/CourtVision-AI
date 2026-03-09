/**
 * AICoachCard — "Your AI Data Scientist" dashboard card.
 *
 * Displays rotating insights generated from cross-session analysis:
 * trends, predictions, patterns, personal records, adaptive plans.
 */

import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'
import { useAICoach, type CoachInsight, type InsightType } from '../../hooks/useAICoach'

const TYPE_ACCENT: Record<InsightType, string> = {
    trend_up: T.color.semantic.success,
    trend_down: '#FF6B6B',
    prediction: T.color.semantic.purple,
    pattern: T.color.semantic.gold,
    record: T.color.semantic.gold,
    plan: T.color.semantic.info,
    milestone: T.color.semantic.purple,
}

const TYPE_LABEL: Record<InsightType, string> = {
    trend_up: 'TREND',
    trend_down: 'ALERT',
    prediction: 'PREDICTION',
    pattern: 'PATTERN',
    record: 'RECORD',
    plan: 'TRAINING PLAN',
    milestone: 'MILESTONE',
}

export const AICoachCard = memo(function AICoachCard() {
    const { insights, loading, sessionsAnalyzed } = useAICoach()
    const [currentIdx, setCurrentIdx] = useState(0)

    const next = useCallback(() => {
        if (insights.length > 0) {
            setCurrentIdx(i => (i + 1) % insights.length)
        }
    }, [insights.length])

    const prev = useCallback(() => {
        if (insights.length > 0) {
            setCurrentIdx(i => (i - 1 + insights.length) % insights.length)
        }
    }, [insights.length])

    if (loading) {
        return (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
                <ActivityIndicator color={T.color.text.secondary} />
                <Text style={styles.loadingText}>Analyzing your sessions...</Text>
            </View>
        )
    }

    if (insights.length === 0) return null

    const insight = insights[currentIdx % insights.length]
    const accent = TYPE_ACCENT[insight.type]

    return (
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.card, { borderColor: `${accent}18` }]}>
            <View style={{ gap: 12 }}>
                {/* ── Header ─────────────────────────── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.aiBadge, { backgroundColor: `${T.color.semantic.purple}15`, borderColor: `${T.color.semantic.purple}30` }]}>
                            <Text style={{ fontSize: 14 }}>🧠</Text>
                            <Text style={[styles.aiBadgeText, { color: T.color.semantic.purple }]}>AI Coach</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: `${accent}12`, borderColor: `${accent}25` }]}>
                            <Text style={[styles.typeText, { color: accent }]}>{TYPE_LABEL[insight.type]}</Text>
                        </View>
                    </View>
                    <Text style={styles.counter}>{currentIdx + 1}/{insights.length}</Text>
                </View>

                {/* ── Insight Body ────────────────────── */}
                <InsightContent key={insight.id} insight={insight} accent={accent} />

                {/* ── Progress bar (if applicable) ───── */}
                {insight.progress != null && (
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.min(100, insight.progress)}%`, backgroundColor: accent }]} />
                    </View>
                )}

                {/* ── Footer ─────────────────────────── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.footerText}>
                        Based on {sessionsAnalyzed} session{sessionsAnalyzed !== 1 ? 's' : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={prev} style={styles.navBtn} accessibilityLabel="Previous insight">
                            <Feather name="chevron-left" size={16} color={T.color.text.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={next} style={styles.navBtn} accessibilityLabel="Next insight">
                            <Feather name="chevron-right" size={16} color={T.color.text.secondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Animated.View>
    )
})

/** Inner component for animated insight transitions */
const InsightContent = memo(function InsightContent({ insight, accent }: { insight: CoachInsight; accent: string }) {
    return (
        <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 28, marginTop: 2 }}>{insight.icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: accent }]}>{insight.title}</Text>
                    <Text style={styles.insightBody}>{insight.body}</Text>
                </View>
            </View>
        </Animated.View>
    )
})

const styles = StyleSheet.create({
    card: {
        ...T.glass.vivid as object,
        borderRadius: T.radius.xl,
        padding: 18,
        borderWidth: 1,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    aiBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    typeBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    typeText: {
        fontSize: 9,
        fontWeight: '700',
        fontFamily: T.fonts.body.bold,
        letterSpacing: 0.5,
    },
    counter: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
        fontVariant: ['tabular-nums'],
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
        marginBottom: 4,
    },
    insightBody: {
        color: T.color.text.secondary,
        fontSize: 13,
        fontFamily: T.fonts.body.regular,
        lineHeight: 19,
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: `${T.color.text.tertiary}12`,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    footerText: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
    },
    navBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${T.color.text.tertiary}10`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
        marginTop: 8,
    },
})
