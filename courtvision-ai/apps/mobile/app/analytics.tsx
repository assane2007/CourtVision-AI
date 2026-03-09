/**
 * CourtVision AI — Advanced Analytics Screen
 * Charts, NBA comparisons, Shot DNA, and Data Lab (statistical engine).
 *
 * Tabs:
 * 1. Shot Chart (court zones with stats)
 * 2. Shot DNA Profile (biomechanical signature)
 * 3. Data Lab (significance, correlations, fatigue, hot hand, projections)
 * 4. NBA Comparison (player comps)
 * 5. Progression Graphs
 *
 * Design V4: glass cards, amber accent.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView, StatusBar,
    StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInRight,
} from 'react-native-reanimated'
import { T } from '../lib/theme'
import { CourtZoneSelector, type CourtZoneData } from '../components/workout/CourtZoneSelector'
import { SessionStorageService, type SessionHistoryItem, type StoredSession } from '../lib/sessionStorage'
import { useAdvancedAnalytics } from '../hooks/useAdvancedAnalytics'
import type {
    SignificanceTest,
    CorrelationResult,
    FatigueCurve,
    ZoneProgression,
    HotHandResult,
    EWMAProjection,
    CausalImpact,
    ShotDistribution,
} from '../lib/analyticsEngine'

const type = T.type
const { width: SCREEN_W } = Dimensions.get('window')

// ==========================================
// NBA Reference Data (2023-24 Season)
// ==========================================

interface NBAPlayerComp {
    name: string
    team: string
    similarity: number
    elbowAngle: number
    releaseHeight: number
    releaseTime: number
    fgPct: number
    style: string
}

const NBA_COMPS: NBAPlayerComp[] = [
    { name: 'Stephen Curry', team: 'GSW', similarity: 0, elbowAngle: 92, releaseHeight: 1.18, releaseTime: 0.38, fgPct: 45.0, style: 'Quick Release, High Arc' },
    { name: 'Klay Thompson', team: 'GSW', similarity: 0, elbowAngle: 94, releaseHeight: 1.15, releaseTime: 0.40, fgPct: 43.2, style: 'Textbook Form, Catch & Shoot' },
    { name: 'Devin Booker', team: 'PHX', similarity: 0, elbowAngle: 96, releaseHeight: 1.14, releaseTime: 0.42, fgPct: 49.2, style: 'Smooth Mid-Range, Pull-Up' },
    { name: 'Jayson Tatum', team: 'BOS', similarity: 0, elbowAngle: 95, releaseHeight: 1.20, releaseTime: 0.43, fgPct: 47.1, style: 'High Release, Versatile' },
    { name: 'Kevin Durant', team: 'PHX', similarity: 0, elbowAngle: 93, releaseHeight: 1.25, releaseTime: 0.44, fgPct: 52.3, style: 'Unblockable Release' },
    { name: 'Damian Lillard', team: 'MIL', similarity: 0, elbowAngle: 91, releaseHeight: 1.12, releaseTime: 0.36, fgPct: 42.4, style: 'Deep Range, Quick Release' },
    { name: 'Luka Dončić', team: 'DAL', similarity: 0, elbowAngle: 98, releaseHeight: 1.13, releaseTime: 0.46, fgPct: 48.7, style: 'Step-Back Master' },
    { name: 'Shai Gilgeous-Alexander', team: 'OKC', similarity: 0, elbowAngle: 95, releaseHeight: 1.16, releaseTime: 0.44, fgPct: 53.5, style: 'Efficient Mid-Range' },
]

// ==========================================
// Shot DNA Profile
// ==========================================

interface ShotDNAProfile {
    elbowAngle: { value: number; percentile: number; label: string }
    releaseHeight: { value: number; percentile: number; label: string }
    releaseTime: { value: number; percentile: number; label: string }
    consistency: { value: number; percentile: number; label: string }
    followThrough: { value: number; percentile: number; label: string }
    postureQuality: { value: number; percentile: number; label: string }
}

function computeShotDNA(sessions: SessionHistoryItem[]): ShotDNAProfile | null {
    if (sessions.length === 0) return null

    const avgElbow = sessions.reduce((sum, s) => sum + s.avgElbowAngle, 0) / sessions.length
    const avgHeight = sessions.reduce((sum, s) => sum + s.avgReleaseHeight, 0) / sessions.length
    const avgTime = sessions.reduce((sum, s) => sum + s.avgReleaseTime, 0) / sessions.length
    const avgConsistency = sessions.reduce((sum, s) => sum + s.mechanicConsistency, 0) / sessions.length
    const avgFT = sessions.reduce((sum, s) => sum + s.followThroughPct, 0) / sessions.length
    const avgPosture = sessions.reduce((sum, s) => sum + s.avgPostureQuality, 0) / sessions.length

    // Percentile against NBA distribution (simplified)
    const percentile = (value: number, nbaMean: number, nbaStd: number) => {
        const z = (value - nbaMean) / nbaStd
        return Math.min(99, Math.max(1, Math.round(50 + z * 30)))
    }

    const label = (pct: number) => {
        if (pct >= 90) return 'Elite'
        if (pct >= 75) return 'Above Average'
        if (pct >= 50) return 'Average'
        if (pct >= 25) return 'Below Average'
        return 'Needs Work'
    }

    const elbowPct = percentile(avgElbow, 95, 5)
    const heightPct = percentile(avgHeight, 1.14, 0.05)
    const timePct = percentile(0.5 - avgTime, 0, 0.1) // Lower is better → inverse
    const consistencyPct = percentile(avgConsistency, 65, 15)
    const ftPct = percentile(avgFT, 75, 15)
    const posturePct = percentile(avgPosture, 70, 12)

    return {
        elbowAngle: { value: Math.round(avgElbow * 10) / 10, percentile: elbowPct, label: label(elbowPct) },
        releaseHeight: { value: Math.round(avgHeight * 1000) / 1000, percentile: heightPct, label: label(heightPct) },
        releaseTime: { value: Math.round(avgTime * 1000) / 1000, percentile: timePct, label: label(timePct) },
        consistency: { value: Math.round(avgConsistency), percentile: consistencyPct, label: label(consistencyPct) },
        followThrough: { value: Math.round(avgFT), percentile: ftPct, label: label(ftPct) },
        postureQuality: { value: Math.round(avgPosture), percentile: posturePct, label: label(posturePct) },
    }
}

function findNBAComps(
    elbowAngle: number,
    releaseHeight: number,
    releaseTime: number,
): NBAPlayerComp[] {
    return NBA_COMPS.map(p => {
        const elbowDiff = Math.abs(p.elbowAngle - elbowAngle) / 10
        const heightDiff = Math.abs(p.releaseHeight - releaseHeight) / 0.1
        const timeDiff = Math.abs(p.releaseTime - releaseTime) / 0.1
        const similarity = Math.max(0, 100 - (elbowDiff * 25 + heightDiff * 35 + timeDiff * 40))
        return { ...p, similarity: Math.round(similarity) }
    })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
}

// ==========================================
// Sub-components
// ==========================================

function TabSelector({
    tabs,
    selected,
    onSelect,
}: {
    tabs: Array<{ key: string; label: string; icon: string }>
    selected: string
    onSelect: (key: string) => void
}) {
    return (
        <View style={styles.tabRow}>
            {tabs.map(tab => {
                const active = tab.key === selected
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, active && styles.tabActive]}
                        onPress={() => onSelect(tab.key)}
                        activeOpacity={0.7}
                    >
                        <Feather
                            name={tab.icon as any}
                            size={14}
                            color={active ? T.color.brand.primary : T.color.text.tertiary}
                        />
                        <Text style={[styles.tabText, active && styles.tabTextActive, active && { fontFamily: T.fonts.body.bold }]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

function NBACompCard({ comp, rank, delay = 0 }: { comp: NBAPlayerComp; rank: number; delay?: number }) {
    const simColor = comp.similarity >= 75 ? T.color.semantic.success
        : comp.similarity >= 50 ? T.color.semantic.warning
            : T.color.text.tertiary

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={styles.compCard}>
            <View style={styles.compRank}>
                <Text style={styles.compRankText}>#{rank}</Text>
            </View>
            <View style={styles.compInfo}>
                <Text style={styles.compName}>{comp.name}</Text>
                <Text style={styles.compTeam}>{comp.team} · {comp.style}</Text>
                <View style={styles.compStatsRow}>
                    <Text style={styles.compStat}>Elbow: {comp.elbowAngle}°</Text>
                    <Text style={styles.compStat}>Release: {comp.releaseHeight}x</Text>
                    <Text style={styles.compStat}>Time: {comp.releaseTime}s</Text>
                </View>
            </View>
            <View style={styles.compSimilarity}>
                <Text style={[styles.compSimValue, { color: simColor }]}>{comp.similarity}%</Text>
                <Text style={styles.compSimLabel}>Similarity</Text>
            </View>
        </Animated.View>
    )
}

function ShotDNACard({ dna }: { dna: ShotDNAProfile }) {
    const metrics = [
        { key: 'elbowAngle', displayLabel: 'Elbow Angle', displayValue: `${dna.elbowAngle.value}°`, percentile: dna.elbowAngle.percentile },
        { key: 'releaseHeight', displayLabel: 'Release Height', displayValue: `${dna.releaseHeight.value}x`, percentile: dna.releaseHeight.percentile },
        { key: 'releaseTime', displayLabel: 'Release Time', displayValue: `${(dna.releaseTime.value * 1000).toFixed(0)}ms`, percentile: dna.releaseTime.percentile },
        { key: 'consistency', displayLabel: 'Consistency', displayValue: `${dna.consistency.value}/100`, percentile: dna.consistency.percentile },
        { key: 'followThrough', displayLabel: 'Follow-Through', displayValue: `${dna.followThrough.value}%`, percentile: dna.followThrough.percentile },
        { key: 'postureQuality', displayLabel: 'Posture Quality', displayValue: `${dna.postureQuality.value}/100`, percentile: dna.postureQuality.percentile },
    ]

    return (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={[styles.dnaCard, T.glass.thin]}>
            <View style={styles.cardHeader}>
                <Feather name="cpu" size={14} color={T.color.brand.primary} />
                <Text style={styles.cardTitle}>Shot DNA Profile</Text>
            </View>

            {metrics.map((m, i) => {
                const barColor = m.percentile >= 75 ? T.color.semantic.success
                    : m.percentile >= 50 ? T.color.brand.primary
                        : m.percentile >= 25 ? T.color.semantic.warning
                            : T.color.semantic.error

                return (
                    <View key={m.key} style={styles.dnaRow}>
                        <View style={styles.dnaLabel}>
                            <Text style={styles.dnaMetricLabel}>{m.displayLabel}</Text>
                            <Text style={styles.dnaMetricValue}>{m.displayValue}</Text>
                        </View>
                        <View style={styles.dnaBarContainer}>
                            <View style={styles.dnaBarBg}>
                                <Animated.View
                                    entering={FadeInRight.delay(100 + i * 50).duration(400)}
                                    style={[styles.dnaBar, { width: `${m.percentile}%`, backgroundColor: barColor }]}
                                />
                            </View>
                            <Text style={[styles.dnaPctText, { color: barColor }]}>
                                {m.percentile}th %ile
                            </Text>
                        </View>
                    </View>
                )
            })}
        </Animated.View>
    )
}

// ==========================================
// Data Lab Sub-Components
// ==========================================

function SignificanceRow({ sig, delay = 0 }: { sig: SignificanceTest; delay?: number }) {
    const color = sig.significant
        ? sig.direction === 'improved' ? T.color.semantic.success
            : sig.direction === 'declined' ? T.color.semantic.error
                : T.color.text.tertiary
        : T.color.text.tertiary

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(200)} style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <Text style={[styles.sciMetric, { color }]}>{sig.metric}</Text>
                <View style={[styles.pBadge, { borderColor: sig.significant ? `${color}40` : T.color.border.base }]}>
                    <Text style={[styles.pText, { color: sig.significant ? color : T.color.text.tertiary }]}>
                        p={sig.pValue < 0.001 ? '<.001' : sig.pValue.toFixed(3)}
                        {sig.significant ? ' ✓' : ''}
                    </Text>
                </View>
            </View>
            <View style={styles.sciRowDetail}>
                <Text style={styles.sciSub}>
                    {sig.periodB.mean.toFixed(1)} → {sig.periodA.mean.toFixed(1)}
                    {sig.significant ? ` · d=${sig.effectSize.toFixed(2)} (${sig.effectSize > 0.8 ? 'large' : sig.effectSize > 0.5 ? 'medium' : 'small'} effect)` : ' · not significant'}
                </Text>
            </View>
        </Animated.View>
    )
}

function CorrelationRow({ corr, delay = 0 }: { corr: CorrelationResult; delay?: number }) {
    const absR = Math.abs(corr.r)
    const barWidth = Math.round(absR * 100)
    const color = absR >= 0.7 ? T.color.semantic.success
        : absR >= 0.4 ? T.color.brand.primary
            : absR >= 0.2 ? T.color.semantic.warning
                : T.color.text.tertiary

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(200)} style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <Text style={styles.sciMetric}>{corr.metricA}</Text>
                <Text style={[styles.sciCorValue, { color }]}>r = {corr.r > 0 ? '+' : ''}{corr.r.toFixed(3)}</Text>
            </View>
            <View style={styles.corrBarBg}>
                <View style={[styles.corrBar, { width: `${barWidth}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.sciSub}>{corr.interpretation}</Text>
        </Animated.View>
    )
}

function FatigueRow({ curve, index }: { curve: FatigueCurve; index: number }) {
    const fatigueColor = curve.fatigueIndex > 40 ? T.color.semantic.error
        : curve.fatigueIndex > 20 ? T.color.semantic.warning
            : T.color.semantic.success

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).duration(200)} style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <Text style={styles.sciMetric}>Session {index + 1}</Text>
                <Text style={[styles.sciFatigueIdx, { color: fatigueColor }]}>
                    Fatigue: {curve.fatigueIndex}/100
                </Text>
            </View>
            <View style={styles.quartilesRow}>
                {curve.quartiles.map((q, qi) => (
                    <View key={qi} style={styles.quartileCell}>
                        <Text style={styles.quartileLabel}>{q.label}</Text>
                        <Text style={[styles.quartileValue, {
                            color: qi === 0 ? T.color.text.primary
                                : q.fgPct < curve.quartiles[0].fgPct - 5 ? T.color.semantic.error
                                    : T.color.text.secondary
                        }]}>{q.fgPct}%</Text>
                        <Text style={styles.quartileShots}>{q.shotCount} shots</Text>
                    </View>
                ))}
            </View>
            {curve.dropOffPoint != null && (
                <Text style={styles.sciSub}>
                    ⚠️ Accuracy drops in Q{curve.dropOffPoint + 1} — consider a break at {curve.dropOffPoint * 25}% through.
                </Text>
            )}
        </Animated.View>
    )
}

function ZoneProgressionRow({ zone: zp }: { zone: ZoneProgression }) {
    const trendColor = zp.trend === 'improving' ? T.color.semantic.success
        : zp.trend === 'declining' ? T.color.semantic.error
            : T.color.text.tertiary
    const trendIcon = zp.trend === 'improving' ? '↑' : zp.trend === 'declining' ? '↓' : '→'

    return (
        <View style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <Text style={styles.sciMetric}>{zp.zone}</Text>
                <Text style={[styles.sciTrend, { color: trendColor }]}>{trendIcon} {zp.trend}</Text>
            </View>
            <View style={styles.quartilesRow}>
                {zp.periods.filter(p => p.attempts > 0).map((period, i) => (
                    <View key={i} style={styles.quartileCell}>
                        <Text style={styles.quartileLabel}>{period.label}</Text>
                        <Text style={[styles.quartileValue, { color: T.color.text.primary }]}>{period.fgPct}%</Text>
                        <Text style={styles.quartileShots}>{period.made}/{period.attempts}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

function HotHandRow({ hh }: { hh: HotHandResult }) {
    const color = hh.streakiness === 'hot-hand' ? T.color.semantic.error
        : hh.streakiness === 'cold-streaks' ? '#4FC3F7'
            : T.color.text.tertiary

    return (
        <View style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <View style={styles.streakRow}>
                    <Text style={{ fontSize: 14 }}>
                        {hh.streakiness === 'hot-hand' ? '🔥' : hh.streakiness === 'cold-streaks' ? '🧊' : '🎲'}
                    </Text>
                    <Text style={[styles.sciMetric, { color }]}>
                        {hh.streakiness === 'hot-hand' ? 'Hot Hand' : hh.streakiness === 'cold-streaks' ? 'Cold Streaks' : 'Random'}
                    </Text>
                </View>
                <View style={[styles.pBadge, { borderColor: hh.isStreaky ? `${color}40` : T.color.border.base }]}>
                    <Text style={[styles.pText, { color: hh.isStreaky ? color : T.color.text.tertiary }]}>
                        p={hh.runsTestP < 0.001 ? '<.001' : hh.runsTestP.toFixed(3)}
                    </Text>
                </View>
            </View>
            <Text style={styles.sciSub}>
                Best streak: {hh.longestMadeStreak} makes · Worst: {hh.longestMissStreak} misses · Cluster ratio: {hh.clusterRatio}
            </Text>
        </View>
    )
}

function ProjectionRow({ proj }: { proj: EWMAProjection }) {
    const momentum = proj.momentum > 0 ? 'Accelerating' : proj.momentum < 0 ? 'Decelerating' : 'Steady'
    const momColor = proj.momentum > 0 ? T.color.semantic.success : proj.momentum < 0 ? T.color.semantic.error : T.color.text.tertiary

    return (
        <View style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <Text style={styles.sciMetric}>{proj.metric}</Text>
                <Text style={[styles.sciCorValue, { color: momColor }]}>{momentum}</Text>
            </View>
            <View style={styles.projRow}>
                <View style={styles.projCell}>
                    <Text style={styles.quartileLabel}>Now</Text>
                    <Text style={[styles.projValue, { color: T.color.text.primary }]}>{proj.currentValue}%</Text>
                </View>
                <Text style={styles.projArrow}>→</Text>
                <View style={styles.projCell}>
                    <Text style={styles.quartileLabel}>2 weeks</Text>
                    <Text style={[styles.projValue, { color: T.color.brand.primary }]}>{proj.projected2w}%</Text>
                </View>
                <Text style={styles.projArrow}>→</Text>
                <View style={styles.projCell}>
                    <Text style={styles.quartileLabel}>4 weeks</Text>
                    <Text style={[styles.projValue, { color: T.color.semantic.purple }]}>{proj.projected4w}%</Text>
                </View>
            </View>
            <Text style={styles.sciSub}>
                95% CI: {proj.confidence.lower}–{proj.confidence.upper}% · Trend: {(proj.trendStrength * 100).toFixed(0)}% strength
            </Text>
        </View>
    )
}

function CausalRow({ impact }: { impact: CausalImpact }) {
    const color = impact.significant ? (impact.lift > 0 ? T.color.semantic.success : T.color.semantic.error) : T.color.text.tertiary

    return (
        <View style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <Text style={[styles.sciMetric, { color }]}>
                    {impact.trigger} → {impact.lift > 0 ? '+' : ''}{impact.lift}% FG
                </Text>
                <View style={[styles.pBadge, { borderColor: impact.significant ? `${color}40` : T.color.border.base }]}>
                    <Text style={[styles.pText, { color: impact.significant ? color : T.color.text.tertiary }]}>
                        p={impact.pValue < 0.001 ? '<.001' : impact.pValue.toFixed(3)}
                    </Text>
                </View>
            </View>
            <Text style={styles.sciSub}>{impact.explanation}</Text>
        </View>
    )
}

function DistributionRow({ dist }: { dist: ShotDistribution }) {
    const cvPct = dist.mean > 0 ? ((dist.stdDev / dist.mean) * 100).toFixed(1) : '0'

    return (
        <View style={styles.sciRow}>
            <View style={styles.sciRowHeader}>
                <Text style={styles.sciMetric}>{dist.metric}</Text>
                <Text style={styles.sciSub}>{dist.n} shots</Text>
            </View>
            <View style={styles.distStatsRow}>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>Mean</Text>
                    <Text style={styles.distValue}>{dist.mean}</Text>
                </View>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>Median</Text>
                    <Text style={styles.distValue}>{dist.median}</Text>
                </View>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>Std Dev</Text>
                    <Text style={styles.distValue}>{dist.stdDev}</Text>
                </View>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>CV</Text>
                    <Text style={styles.distValue}>{cvPct}%</Text>
                </View>
            </View>
            <View style={styles.distStatsRow}>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>P10</Text>
                    <Text style={styles.distValue}>{dist.percentiles.p10}</Text>
                </View>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>P25</Text>
                    <Text style={styles.distValue}>{dist.percentiles.p25}</Text>
                </View>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>P75</Text>
                    <Text style={styles.distValue}>{dist.percentiles.p75}</Text>
                </View>
                <View style={styles.distCell}>
                    <Text style={styles.quartileLabel}>P90</Text>
                    <Text style={styles.distValue}>{dist.percentiles.p90}</Text>
                </View>
            </View>
            <Text style={styles.sciSub}>
                {dist.isNormal ? '✓ Normal distribution' : '✕ Non-normal'} · Skew: {dist.skewness} · {dist.interpretation}
            </Text>
        </View>
    )
}

// ==========================================
// Existing Sub-components
// ==========================================

function ProgressionChart({
    sessions,
    metric,
}: {
    sessions: SessionHistoryItem[]
    metric: 'shootingPct' | 'avgPostureQuality' | 'mechanicConsistency' | 'avgElbowAngle'
}) {
    if (sessions.length < 2) {
        return (
            <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>
                    2+ sessions required to see progression
                </Text>
            </View>
        )
    }

    const values = sessions.map(s => s[metric] as number).slice(-12)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min || 1

    const metricLabels: Record<string, string> = {
        shootingPct: 'FG%',
        avgPostureQuality: 'Posture',
        mechanicConsistency: 'Consistency',
        avgElbowAngle: 'Elbow Angle',
    }

    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.chartContainer}>
            <Text style={styles.chartTitle}>{metricLabels[metric]}</Text>
            <View style={styles.chartBars}>
                {values.map((v, i) => {
                    const height = 8 + ((v - min) / range) * 40
                    const isLast = i === values.length - 1
                    return (
                        <View key={i} style={styles.chartBarWrapper}>
                            <View
                                style={[
                                    styles.chartBar,
                                    {
                                        height,
                                        backgroundColor: isLast ? T.color.brand.primary : 'rgba(255,255,255,0.1)',
                                    },
                                ]}
                            />
                        </View>
                    )
                })}
            </View>
            <View style={styles.chartLabels}>
                <Text style={styles.chartLabelMin}>{min.toFixed(1)}</Text>
                <Text style={[styles.chartLabelCurrent, { color: T.color.brand.primary }]}>
                    {values[values.length - 1].toFixed(1)}
                </Text>
                <Text style={styles.chartLabelMax}>{max.toFixed(1)}</Text>
            </View>
        </Animated.View>
    )
}

// ==========================================
// Main Screen
// ==========================================

const TABS = [
    { key: 'shotchart', label: 'Shot Chart', icon: 'target' },
    { key: 'dna', label: 'Shot DNA', icon: 'cpu' },
    { key: 'science', label: 'Data Lab', icon: 'activity' },
    { key: 'nba', label: 'NBA Comp', icon: 'users' },
    { key: 'progress', label: 'Trends', icon: 'trending-up' },
]

export default function AnalyticsScreen() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('shotchart')
    const [sessions, setSessions] = useState<SessionHistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const storage = SessionStorageService.getInstance()
            const hist = await storage.getSessionHistory(30)
            setSessions(hist)
        } catch (err) {
            console.warn('[Analytics] Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    // Compute aggregated zone data from all sessions
    const [zoneData, setZoneData] = useState<Partial<CourtZoneData>>({})

    useEffect(() => {
        (async () => {
            const storage = SessionStorageService.getInstance()
            const stats = await storage.getZoneStats(30)
            if (Object.keys(stats).length > 0) {
                setZoneData(stats)
            }
        })()
    }, [sessions])

    const shotDNA = useMemo(() => computeShotDNA(sessions), [sessions])

    const nbaComps = useMemo(() => {
        if (!shotDNA) return []
        return findNBAComps(shotDNA.elbowAngle.value, shotDNA.releaseHeight.value, shotDNA.releaseTime.value)
    }, [shotDNA])

    // Advanced analytics engine
    const { report, summary, loading: analyticsLoading } = useAdvancedAnalytics()

    // ---- Render ----

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color={T.color.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Analytics</Text>
                    <Text style={styles.headerSub}>
                        {sessions.length} sessions · {sessions.reduce((sum, s) => sum + s.totalShots, 0)} shots
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <TabSelector tabs={TABS} selected={activeTab} onSelect={setActiveTab} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Shot Chart Tab */}
                {activeTab === 'shotchart' && (
                    <Animated.View entering={FadeIn.duration(300)}>
                        <View style={[styles.card, T.glass.thin]}>
                            <View style={styles.cardHeader}>
                                <Feather name="target" size={14} color={T.color.brand.primary} />
                                <Text style={styles.cardTitle}>Shot Chart</Text>
                            </View>
                            <CourtZoneSelector
                                data={zoneData}
                                showNbaComparison={true}
                            />
                        </View>

                        {/* Zone breakdown table */}
                        <View style={[styles.card, { marginTop: 12 }, T.glass.thin]}>
                            <View style={styles.cardHeader}>
                                <Feather name="bar-chart-2" size={14} color={T.color.brand.primary} />
                                <Text style={styles.cardTitle}>Zone Breakdown</Text>
                            </View>
                            {Object.entries(zoneData).map(([zone, stats]) => {
                                if (!stats || stats.attempts === 0) return null
                                const zoneLabels: Record<string, string> = {
                                    restrictedArea: 'Restricted Area',
                                    paint: 'Paint',
                                    midRangeLeft: 'Mid-Range Left',
                                    midRangeRight: 'Mid-Range Right',
                                    midRangeCenter: 'Mid-Range Center',
                                    corner3Left: 'Corner 3 Left',
                                    corner3Right: 'Corner 3 Right',
                                    wing3Left: 'Wing 3 Left',
                                    wing3Right: 'Wing 3 Right',
                                    topKey3: 'Top of Key 3',
                                }
                                return (
                                    <View key={zone} style={styles.zoneRow}>
                                        <Text style={styles.zoneLabel}>{zoneLabels[zone] ?? zone}</Text>
                                        <Text style={styles.zoneAttempts}>{stats.made}/{stats.attempts}</Text>
                                        <Text style={[styles.zonePct, {
                                            color: stats.pct >= 45 ? T.color.semantic.success
                                                : stats.pct >= 35 ? T.color.semantic.warning
                                                    : T.color.semantic.error
                                        }]}>
                                            {stats.pct}%
                                        </Text>
                                    </View>
                                )
                            })}
                        </View>
                    </Animated.View>
                )}

                {/* Shot DNA Tab */}
                {activeTab === 'dna' && (
                    <Animated.View entering={FadeIn.duration(300)}>
                        {shotDNA ? (
                            <ShotDNACard dna={shotDNA} />
                        ) : (
                            <View style={styles.emptyState}>
                                <Feather name="cpu" size={32} color={T.color.text.tertiary} />
                                <Text style={styles.emptyTitle}>No Shot DNA Yet</Text>
                                <Text style={styles.emptyText}>
                                    Complete a few sessions to generate your unique biomechanics profile.
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* NBA Comparison Tab */}
                {activeTab === 'nba' && (
                    <Animated.View entering={FadeIn.duration(300)}>
                        {nbaComps.length > 0 ? (
                            <>
                                <View style={[styles.card, T.glass.thin]}>
                                    <View style={styles.cardHeader}>
                                        <Feather name="users" size={14} color={T.color.brand.primary} />
                                        <Text style={styles.cardTitle}>NBA Comparisons 2023-24</Text>
                                    </View>
                                    <Text style={styles.compDescription}>
                                        Based on your elbow angle ({shotDNA?.elbowAngle.value}°),
                                        release height ({shotDNA?.releaseHeight.value}x),
                                        and release time ({((shotDNA?.releaseTime.value ?? 0) * 1000).toFixed(0)}ms).
                                    </Text>
                                </View>
                                {nbaComps.map((comp, i) => (
                                    <NBACompCard
                                        key={comp.name}
                                        comp={comp}
                                        rank={i + 1}
                                        delay={i * 100}
                                    />
                                ))}
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Feather name="users" size={32} color={T.color.text.tertiary} />
                                <Text style={styles.emptyTitle}>Insufficient Data</Text>
                                <Text style={styles.emptyText}>
                                    Complete a few sessions to see which NBA player you resemble.
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* Data Lab (Science) Tab */}
                {activeTab === 'science' && (
                    <Animated.View entering={FadeIn.duration(300)} style={{ gap: 12 }}>
                        {analyticsLoading && !report && (
                            <View style={styles.emptyState}>
                                <ActivityIndicator size="small" color={T.color.brand.primary} />
                                <Text style={styles.emptyTitle}>Crunching numbers…</Text>
                            </View>
                        )}
                        {/* Summary headline */}
                        {summary && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Feather name="activity" size={14} color={T.color.brand.primary} />
                                    <Text style={styles.cardTitle}>Data Lab</Text>
                                    <View style={[styles.qualityBadge, {
                                        backgroundColor: summary.dataQuality === 'excellent' ? `${T.color.semantic.success}15`
                                            : summary.dataQuality === 'good' ? `${T.color.brand.primary}15`
                                                : `${T.color.semantic.warning}15`
                                    }]}>
                                        <Text style={[styles.qualityText, {
                                            color: summary.dataQuality === 'excellent' ? T.color.semantic.success
                                                : summary.dataQuality === 'good' ? T.color.brand.primary
                                                    : T.color.semantic.warning
                                        }]}>
                                            {summary.dataQuality.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.scienceHeadline}>{summary.headline}</Text>
                                <Text style={styles.scienceSub}>
                                    {report?.sessionsAnalyzed ?? 0} sessions · {report?.shotsAnalyzed ?? 0} shots analyzed
                                </Text>
                            </View>
                        )}

                        {/* Significance Tests */}
                        {report && report.significance.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>📊</Text>
                                    <Text style={styles.cardTitle}>Significance Tests</Text>
                                </View>
                                {report.significance.map((sig, i) => (
                                    <SignificanceRow key={sig.metric} sig={sig} delay={i * 50} />
                                ))}
                            </View>
                        )}

                        {/* Correlation Matrix */}
                        {report && report.correlations.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>🔗</Text>
                                    <Text style={styles.cardTitle}>What Drives Your Accuracy?</Text>
                                </View>
                                {report.correlations.map((corr, i) => (
                                    <CorrelationRow key={corr.metricA} corr={corr} delay={i * 50} />
                                ))}
                            </View>
                        )}

                        {/* Fatigue Curves */}
                        {report && report.fatigueCurves.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>🔋</Text>
                                    <Text style={styles.cardTitle}>Fatigue Analysis</Text>
                                </View>
                                {report.fatigueCurves.slice(0, 3).map((curve, i) => (
                                    <FatigueRow key={curve.sessionId} curve={curve} index={i} />
                                ))}
                            </View>
                        )}

                        {/* Zone Progression */}
                        {report && report.zoneProgression.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>🗺️</Text>
                                    <Text style={styles.cardTitle}>Zone Progression</Text>
                                </View>
                                {report.zoneProgression.map((zone) => (
                                    <ZoneProgressionRow key={zone.zone} zone={zone} />
                                ))}
                            </View>
                        )}

                        {/* Hot Hand */}
                        {report && report.hotHand.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>🔥</Text>
                                    <Text style={styles.cardTitle}>Streak Analysis</Text>
                                </View>
                                {report.hotHand.slice(0, 3).map((hh) => (
                                    <HotHandRow key={hh.sessionId} hh={hh} />
                                ))}
                            </View>
                        )}

                        {/* Projections */}
                        {report && report.projections.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>🎯</Text>
                                    <Text style={styles.cardTitle}>EWMA Projections</Text>
                                </View>
                                {report.projections.map((proj) => (
                                    <ProjectionRow key={proj.metric} proj={proj} />
                                ))}
                            </View>
                        )}

                        {/* Causal Impacts */}
                        {report && report.causalImpacts.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>⚡</Text>
                                    <Text style={styles.cardTitle}>Causal Impact</Text>
                                </View>
                                {report.causalImpacts.map((ci, i) => (
                                    <CausalRow key={`${ci.trigger}-${i}`} impact={ci} />
                                ))}
                            </View>
                        )}

                        {/* Distributions */}
                        {report && report.distributions.length > 0 && (
                            <View style={[styles.card, T.glass.thin]}>
                                <View style={styles.cardHeader}>
                                    <Text style={{ fontSize: 14 }}>📈</Text>
                                    <Text style={styles.cardTitle}>Shot Distributions</Text>
                                </View>
                                {report.distributions.map((dist) => (
                                    <DistributionRow key={dist.metric} dist={dist} />
                                ))}
                            </View>
                        )}

                        {/* Empty state */}
                        {(!report || (report.significance.length === 0 && report.correlations.length === 0)) && (
                            <View style={styles.emptyState}>
                                <Feather name="activity" size={32} color={T.color.text.tertiary} />
                                <Text style={styles.emptyTitle}>Not Enough Data Yet</Text>
                                <Text style={styles.emptyText}>
                                    Complete 6+ sessions to unlock statistical significance testing,
                                    correlation analysis, fatigue modeling, and more.
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* Progression Tab */}
                {activeTab === 'progress' && (
                    <Animated.View entering={FadeIn.duration(300)}>
                        <View style={[styles.card, T.glass.thin]}>
                            <View style={styles.cardHeader}>
                                <Feather name="trending-up" size={14} color={T.color.brand.primary} />
                                <Text style={styles.cardTitle}>Progression</Text>
                            </View>

                            <ProgressionChart sessions={sessions} metric="shootingPct" />
                            <View style={{ height: 16 }} />
                            <ProgressionChart sessions={sessions} metric="avgPostureQuality" />
                            <View style={{ height: 16 }} />
                            <ProgressionChart sessions={sessions} metric="mechanicConsistency" />
                        </View>
                    </Animated.View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.color.bg.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    headerSub: {
        color: T.color.text.secondary,
        fontSize: 12,
        marginTop: 1,
        fontFamily: T.fonts.body.regular,
    },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingBottom: 8,
        gap: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: T.color.bg.secondary,
    },
    tabActive: {
        backgroundColor: `${T.color.brand.primary}15`,
        borderWidth: 1,
        borderColor: `${T.color.brand.primary}30`,
    },
    tabText: {
        color: T.color.text.tertiary,
        fontSize: 10,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    tabTextActive: {
        color: T.color.brand.primary,
    },

    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
        gap: 12,
        paddingBottom: 40,
    },

    // Cards
    card: {
        backgroundColor: T.color.bg.secondary,
        borderRadius: T.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        color: T.color.text.primary,
        fontSize: 15,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Zone table
    zoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: T.color.border.base,
    },
    zoneLabel: {
        flex: 1,
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },
    zoneAttempts: {
        color: T.color.text.tertiary,
        fontSize: 12,
        marginRight: 12,
        fontFamily: T.fonts.body.regular,
    },
    zonePct: {
        fontSize: 13,
        fontWeight: '700',
        width: 45,
        textAlign: 'right',
        fontFamily: T.fonts.display.bold,
    },

    // NBA Comp
    compCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.color.bg.secondary,
        borderRadius: T.radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    compRank: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: T.color.bg.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    compRankText: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    compInfo: {
        flex: 1,
    },
    compName: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    compTeam: {
        color: T.color.text.tertiary,
        fontSize: 11,
        marginTop: 1,
        fontFamily: T.fonts.body.regular,
    },
    compStatsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    compStat: {
        color: T.color.text.secondary,
        fontSize: 10,
        fontFamily: T.fonts.body.regular,
    },
    compDescription: {
        color: T.color.text.secondary,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: T.fonts.body.regular,
    },
    compSimilarity: {
        alignItems: 'center',
        marginLeft: 12,
    },
    compSimValue: {
        fontSize: 18,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    compSimLabel: {
        color: T.color.text.tertiary,
        fontSize: 9,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Shot DNA
    dnaCard: {
        backgroundColor: T.color.bg.secondary,
        borderRadius: T.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    dnaRow: {
        marginBottom: 12,
    },
    dnaLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    dnaMetricLabel: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },
    dnaMetricValue: {
        color: T.color.text.primary,
        fontSize: 13,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    dnaBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dnaBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: T.color.bg.tertiary,
        overflow: 'hidden',
    },
    dnaBar: {
        height: 6,
        borderRadius: 3,
    },
    dnaPctText: {
        fontSize: 10,
        fontWeight: '600',
        width: 55,
        textAlign: 'right',
        fontFamily: T.fonts.body.semibold,
    },

    // Charts
    chartContainer: {
        paddingVertical: 4,
    },
    chartTitle: {
        color: T.color.text.secondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        fontFamily: T.fonts.body.semibold,
    },
    chartBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 50,
    },
    chartBarWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    chartBar: {
        width: '100%',
        borderRadius: 3,
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    chartLabelMin: {
        color: T.color.text.tertiary,
        fontSize: 10,
        fontFamily: T.fonts.body.regular,
    },
    chartLabelCurrent: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    chartLabelMax: {
        color: T.color.text.tertiary,
        fontSize: 10,
        fontFamily: T.fonts.body.regular,
    },

    emptyChart: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    emptyChartText: {
        color: T.color.text.tertiary,
        fontSize: 12,
        fontFamily: T.fonts.body.regular,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: T.color.bg.secondary,
        borderRadius: T.radius.lg,
        borderWidth: 1,
        borderColor: T.color.border.base,
    },
    emptyTitle: {
        color: T.color.text.primary,
        fontSize: 17,
        fontWeight: '700',
        marginTop: 12,
        fontFamily: T.fonts.display.bold,
    },
    emptyText: {
        color: T.color.text.secondary,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 8,
        fontFamily: T.fonts.body.regular,
    },

    // Data Lab styles
    qualityBadge: {
        marginLeft: 'auto',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    qualityText: {
        fontSize: 9,
        fontWeight: '700',
        fontFamily: T.fonts.body.bold,
        letterSpacing: 0.5,
    },
    scienceHeadline: {
        color: T.color.text.primary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
        lineHeight: 20,
    },
    scienceSub: {
        color: T.color.text.tertiary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
        marginTop: 4,
    },
    sciRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: `${T.color.border.base}60`,
    },
    sciRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    sciRowDetail: {
        marginTop: 2,
    },
    sciMetric: {
        color: T.color.text.primary,
        fontSize: 13,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    sciSub: {
        color: T.color.text.secondary,
        fontSize: 11,
        fontFamily: T.fonts.body.regular,
        lineHeight: 16,
        marginTop: 4,
    },
    sciCorValue: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: T.fonts.mono.regular,
    },
    sciFatigueIdx: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    sciTrend: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: T.fonts.body.semibold,
    },
    pBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    pText: {
        fontSize: 10,
        fontFamily: T.fonts.mono.regular,
    },
    corrBarBg: {
        height: 4,
        borderRadius: 2,
        backgroundColor: `${T.color.text.tertiary}12`,
        overflow: 'hidden',
        marginVertical: 4,
    },
    corrBar: {
        height: 4,
        borderRadius: 2,
    },
    quartilesRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 6,
    },
    quartileCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        backgroundColor: `${T.color.bg.tertiary}80`,
        borderRadius: 8,
    },
    quartileLabel: {
        color: T.color.text.tertiary,
        fontSize: 9,
        fontFamily: T.fonts.body.regular,
        letterSpacing: 0.3,
    },
    quartileValue: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
        marginTop: 2,
    },
    quartileShots: {
        color: T.color.text.tertiary,
        fontSize: 9,
        fontFamily: T.fonts.body.regular,
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    projRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    projCell: {
        flex: 1,
        alignItems: 'center',
    },
    projValue: {
        fontSize: 16,
        fontWeight: '800',
        fontFamily: T.fonts.display.bold,
    },
    projArrow: {
        color: T.color.text.tertiary,
        fontSize: 16,
    },
    distStatsRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 4,
    },
    distCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
        backgroundColor: `${T.color.bg.tertiary}60`,
        borderRadius: 6,
    },
    distValue: {
        color: T.color.text.primary,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: T.fonts.display.bold,
    },
})
