/**
 * WeeklyQuestCard — Multi-step weekly quest with glassmorphism.
 *
 * Displays a narrative quest with step checklist, overall progress,
 * tier badge, and claim button.
 */

import React, { memo, useMemo } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { T } from '../../lib/theme'
import { useWeeklyQuests, TIER_COLORS, TIER_LABELS } from '../../hooks/useWeeklyQuests'

export const WeeklyQuestCard = memo(function WeeklyQuestCard() {
    const { quest, loading, overallProgress, daysLeft, claimReward } = useWeeklyQuests()

    // Animated progress bar
    const progressAnim = useSharedValue(0)
    React.useEffect(() => {
        progressAnim.value = withTiming(overallProgress / 100, { duration: 800 })
    }, [overallProgress])

    const progressStyle = useAnimatedStyle(() => ({
        width: `${Math.round(progressAnim.value * 100)}%`,
    }))

    const color = useMemo(() => (quest ? TIER_COLORS[quest.tier] : T.color.semantic.purple), [quest?.tier])

    if (loading) {
        return (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
                <ActivityIndicator color={T.color.text.secondary} />
            </View>
        )
    }

    if (!quest) return null

    const completedSteps = quest.steps.filter(s => s.completed).length
    const totalSteps = quest.steps.length

    return (
        <Animated.View entering={FadeInDown.duration(600).delay(150)} style={[styles.card, { borderColor: `${color}18` }]}>
            <View style={{ gap: 14 }}>
                {/* ── Header ─────────────────────────────────── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Text style={{ fontSize: 28 }}>{quest.emoji}</Text>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.title}>{quest.title}</Text>
                                <View style={[styles.tierBadge, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                                    <Text style={[styles.tierText, { color }]}>{TIER_LABELS[quest.tier]}</Text>
                                </View>
                            </View>
                            <Text style={styles.subtitle}>{quest.subtitle}</Text>
                        </View>
                    </View>
                    <View style={styles.daysLeft}>
                        <Feather name="clock" size={11} color={T.color.text.tertiary} />
                        <Text style={styles.daysLeftText}>{daysLeft}d left</Text>
                    </View>
                </View>

                {/* ── Step Checklist ─────────────────────────── */}
                <View style={{ gap: 6 }}>
                    {quest.steps.map((step, i) => {
                        const isActive = !step.completed && quest.steps.slice(0, i).every(s => s.completed)
                        return (
                            <View key={step.id} style={[
                                styles.stepRow,
                                isActive && { backgroundColor: `${color}08`, borderColor: `${color}15` }
                            ]}>
                                {/* Check / number */}
                                <View style={[
                                    styles.stepIcon,
                                    step.completed
                                        ? { backgroundColor: `${T.color.semantic.success}20` }
                                        : isActive ? { backgroundColor: `${color}15` } : {}
                                ]}>
                                    {step.completed ? (
                                        <Feather name="check" size={12} color={T.color.semantic.success} />
                                    ) : (
                                        <Text style={[styles.stepNumber, isActive && { color }]}>{i + 1}</Text>
                                    )}
                                </View>

                                {/* Step info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={[
                                        styles.stepTitle,
                                        step.completed && { color: T.color.text.tertiary, textDecorationLine: 'line-through' }
                                    ]}>
                                        {step.title}
                                    </Text>
                                    <Text style={styles.stepDesc}>{step.description}</Text>
                                </View>

                                {/* Progress indicator */}
                                <Text style={[styles.stepProgress, step.completed && { color: T.color.semantic.success }]}>
                                    {step.completed ? '✓' : `${Math.min(step.current, step.target)}/${step.target}`}
                                </Text>
                            </View>
                        )
                    })}
                </View>

                {/* ── Overall Progress Bar ───────────────────── */}
                <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.progressLabel}>Quest Progress</Text>
                        <Text style={[styles.progressPct, { color }]}>{completedSteps}/{totalSteps} steps</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, { backgroundColor: color }, progressStyle]} />
                    </View>
                </View>

                {/* ── Footer ─────────────────────────────────── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="zap" size={14} color={color} />
                            <Text style={[styles.xpText, { color }]}>+{quest.xp_reward} XP</Text>
                        </View>
                        {quest.bonus_xp > 0 && !quest.completed && (
                            <View style={[styles.bonusBadge, { borderColor: `${T.color.semantic.gold}25`, backgroundColor: `${T.color.semantic.gold}12` }]}>
                                <Text style={styles.bonusText}>+{quest.bonus_xp} bonus</Text>
                            </View>
                        )}
                    </View>

                    {quest.completed && !quest.claimed && (
                        <TouchableOpacity
                            style={[styles.claimBtn, { backgroundColor: color, ...T.glow.soft(color) }]}
                            onPress={claimReward}
                            accessibilityRole="button"
                        >
                            <Feather name="award" size={13} color={T.color.bg.primary} />
                            <Text style={styles.claimText}>Claim!</Text>
                        </TouchableOpacity>
                    )}

                    {quest.claimed && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="gift" size={14} color={T.color.semantic.success} />
                            <Text style={styles.claimedText}>Claimed</Text>
                        </View>
                    )}
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
    title: {
        color: T.color.text.primary,
        fontSize: 16,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    subtitle: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
        marginTop: 2,
    },
    tierBadge: {
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderWidth: 1,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: T.fonts.body.bold,
    },
    daysLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: `${T.color.text.tertiary}10`,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    daysLeftText: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
        fontVariant: ['tabular-nums'],
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: T.radius.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    stepIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.color.text.tertiary}10`,
    },
    stepNumber: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: T.fonts.body.bold,
    },
    stepTitle: {
        color: T.color.text.primary,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    stepDesc: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
        marginTop: 1,
    },
    stepProgress: {
        color: T.color.text.secondary,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
        fontVariant: ['tabular-nums'],
        minWidth: 34,
        textAlign: 'right',
    },
    progressLabel: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },
    progressPct: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: T.fonts.body.bold,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: `${T.color.text.tertiary}12`,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    xpText: {
        fontWeight: '900',
        fontSize: 15,
        fontFamily: T.fonts.display.black,
    },
    bonusBadge: {
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderWidth: 1,
    },
    bonusText: {
        color: T.color.semantic.gold,
        fontSize: 10,
        fontWeight: '700',
        fontFamily: T.fonts.body.bold,
    },
    claimBtn: {
        borderRadius: T.radius.sm,
        paddingHorizontal: 18,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    claimText: {
        color: T.color.bg.primary,
        fontWeight: '800',
        fontSize: 13,
        fontFamily: T.fonts.display.bold,
    },
    claimedText: {
        color: T.color.semantic.success,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
})
