/**
 * ShareCard — Visual share card for Instagram/TikTok Stories (9:16 format).
 *
 * Renders a premium-looking card with:
 * - Session grade & score
 * - Court heatmap with shot zones
 * - Key biomechanics stats
 * - CourtVision AI branding
 *
 * Designed to be captured with react-native-view-shot.
 */

import React, { forwardRef } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Svg, { Rect, Circle, Line, Path, Text as SvgText } from 'react-native-svg'
import type { SessionRealtimeStats } from '../../lib/realtimeAIService'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W
const CARD_H = Math.round(CARD_W * (16 / 9))

// ── Helpers ──────────────────────────────────

function getGrade(score: number): { grade: string; color: string } {
    if (score >= 90) return { grade: 'A+', color: '#00D97E' }
    if (score >= 80) return { grade: 'A', color: '#00D97E' }
    if (score >= 70) return { grade: 'B+', color: '#FF6B00' }
    if (score >= 60) return { grade: 'B', color: '#FFC400' }
    if (score >= 50) return { grade: 'C', color: '#FFC400' }
    return { grade: 'D', color: '#FF3659' }
}

const ZONE_POSITIONS: Record<string, { cx: number; cy: number }> = {
    restricted: { cx: 0.5, cy: 0.85 },
    paint_left: { cx: 0.35, cy: 0.72 },
    paint_right: { cx: 0.65, cy: 0.72 },
    midrange_left: { cx: 0.2, cy: 0.6 },
    midrange_right: { cx: 0.8, cy: 0.6 },
    midrange_top: { cx: 0.5, cy: 0.52 },
    corner3_left: { cx: 0.08, cy: 0.75 },
    corner3_right: { cx: 0.92, cy: 0.75 },
    wing3_left: { cx: 0.15, cy: 0.4 },
    wing3_right: { cx: 0.85, cy: 0.4 },
    top3: { cx: 0.5, cy: 0.28 },
}

function getZoneColor(pct: number): string {
    if (pct >= 60) return '#00D97E'
    if (pct >= 40) return '#FF6B00'
    if (pct >= 20) return '#FFC400'
    return '#FF3659'
}

// ── Court Mini SVG ───────────────────────────

function MiniCourt({ zoneStats, width, height }: {
    zoneStats?: Record<string, { pct: number; attempts: number }>
    width: number
    height: number
}) {
    const cw = width
    const ch = height

    return (
        <Svg width={cw} height={ch} viewBox={`0 0 ${cw} ${ch}`}>
            {/* Court background */}
            <Rect x={0} y={0} width={cw} height={ch} rx={8} fill="#0A1018" />

            {/* Court outline */}
            <Rect x={cw * 0.05} y={ch * 0.15} width={cw * 0.9} height={ch * 0.8}
                rx={4} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />

            {/* Paint */}
            <Rect x={cw * 0.3} y={ch * 0.6} width={cw * 0.4} height={ch * 0.35}
                fill="rgba(255,107,0,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

            {/* 3-point arc */}
            <Path
                d={`M ${cw * 0.1} ${ch * 0.95} Q ${cw * 0.1} ${ch * 0.2} ${cw * 0.5} ${ch * 0.18} Q ${cw * 0.9} ${ch * 0.2} ${cw * 0.9} ${ch * 0.95}`}
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1} strokeDasharray="4,4"
            />

            {/* Free throw circle */}
            <Circle cx={cw * 0.5} cy={ch * 0.6} r={cw * 0.12}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

            {/* Rim */}
            <Circle cx={cw * 0.5} cy={ch * 0.92} r={5}
                fill="#FF6B00" stroke="#FF8A33" strokeWidth={1.5} />

            {/* Zone dots with FG% */}
            {zoneStats && Object.entries(zoneStats).map(([zone, data]) => {
                const pos = ZONE_POSITIONS[zone]
                if (!pos || data.attempts === 0) return null
                const dotColor = getZoneColor(data.pct)
                const r = Math.min(18, 8 + data.attempts * 1.5)
                return (
                    <React.Fragment key={zone}>
                        <Circle
                            cx={pos.cx * cw} cy={pos.cy * ch} r={r}
                            fill={dotColor} opacity={0.3}
                        />
                        <Circle
                            cx={pos.cx * cw} cy={pos.cy * ch} r={r * 0.6}
                            fill={dotColor} opacity={0.7}
                        />
                        <SvgText
                            x={pos.cx * cw} y={pos.cy * ch + 3}
                            fill="#fff" fontSize={9} fontWeight="bold"
                            textAnchor="middle"
                        >
                            {`${Math.round(data.pct)}%`}
                        </SvgText>
                    </React.Fragment>
                )
            })}
        </Svg>
    )
}

// ── Stat Pill ────────────────────────────────

function StatPill({ label, value, unit, accent }: {
    label: string; value: string; unit?: string; accent?: boolean
}) {
    return (
        <View style={[s.statPill, accent && s.statPillAccent]}>
            <Text style={s.statPillLabel}>{label}</Text>
            <Text style={[s.statPillValue, accent && { color: '#FF6B00' }]}>
                {value}{unit ? <Text style={s.statPillUnit}>{unit}</Text> : null}
            </Text>
        </View>
    )
}

// ── Main ShareCard ───────────────────────────

interface ShareCardProps {
    stats: SessionRealtimeStats
    zoneStats?: Record<string, { pct: number; attempts: number }>
    playerName?: string
}

export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
    { stats, zoneStats, playerName },
    ref,
) {
    const overallScore = Math.round(
        stats.avgPostureQuality * 0.35 +
        stats.mechanicConsistency * 0.25 +
        stats.shootingPct * 0.25 +
        stats.followThroughPct * 0.15,
    )
    const { grade, color } = getGrade(overallScore)
    const fgColor = stats.shootingPct >= 50 ? '#00D97E'
        : stats.shootingPct >= 35 ? '#FFC400' : '#FF3659'

    const courtW = CARD_W - 48
    const courtH = Math.round(courtW * 0.75)

    return (
        <View ref={ref} style={s.card} collapsable={false}>
            {/* Background gradient layers */}
            <View style={s.bgBase} />
            <View style={s.bgGlow} />

            {/* Top brand bar */}
            <View style={s.brandBar}>
                <Text style={s.brandLogo}>COURTVISION</Text>
                <Text style={s.brandAI}>AI</Text>
            </View>

            {/* Grade + Score hero */}
            <View style={s.heroSection}>
                <View style={[s.gradeCircle, { borderColor: color }]}>
                    <Text style={[s.gradeText, { color }]}>{grade}</Text>
                </View>
                <View style={s.heroRight}>
                    <Text style={s.heroScore}>{overallScore}</Text>
                    <Text style={s.heroLabel}>OVERALL SCORE</Text>
                    {playerName ? (
                        <Text style={s.heroPlayer}>{playerName}</Text>
                    ) : null}
                </View>
            </View>

            {/* Shooting headline */}
            <View style={s.shootingRow}>
                <View style={s.shootingStat}>
                    <Text style={[s.shootingBig, { color: '#00D97E' }]}>{stats.madeShots}</Text>
                    <Text style={s.shootingLabel}>MADE</Text>
                </View>
                <View style={s.shootingCenter}>
                    <Text style={[s.shootingPct, { color: fgColor }]}>{stats.shootingPct}%</Text>
                    <Text style={s.shootingLabel}>FG%</Text>
                </View>
                <View style={s.shootingStat}>
                    <Text style={[s.shootingBig, { color: '#FF3659' }]}>{stats.missedShots}</Text>
                    <Text style={s.shootingLabel}>MISSED</Text>
                </View>
            </View>

            {/* Court heatmap */}
            <View style={s.courtContainer}>
                <MiniCourt zoneStats={zoneStats} width={courtW} height={courtH} />
            </View>

            {/* Biomechanics grid */}
            <View style={s.statsGrid}>
                <StatPill label="ELBOW" value={stats.avgElbowAngle.toFixed(0)} unit="°" accent />
                <StatPill label="RELEASE" value={(stats.avgReleaseTime * 1000).toFixed(0)} unit="ms" />
                <StatPill label="POSTURE" value={stats.avgPostureQuality.toFixed(0)} unit="/100" />
                <StatPill label="CONSIST." value={stats.mechanicConsistency.toFixed(0)} unit="/100" />
            </View>

            {/* Total shots & duration */}
            <View style={s.metaRow}>
                <Text style={s.metaText}>🏀 {stats.totalShots} shots</Text>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.metaText}>
                    ⏱ {Math.floor(stats.sessionDurationSec / 60)}m {stats.sessionDurationSec % 60}s
                </Text>
            </View>

            {/* Bottom branding */}
            <View style={s.footer}>
                <View style={s.footerLine} />
                <Text style={s.footerText}>courtvision.ai</Text>
                <Text style={s.footerHash}>#CourtVisionAI</Text>
            </View>
        </View>
    )
})

// ── Styles ───────────────────────────────────

const s = StyleSheet.create({
    card: {
        width: CARD_W,
        height: CARD_H,
        overflow: 'hidden',
    },
    bgBase: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#05080C',
    },
    bgGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        borderWidth: 0,
        // Radial-like glow achieved via top amber tint
        borderTopWidth: CARD_H * 0.15,
        borderTopColor: 'rgba(255,107,0,0.04)',
    },

    // Brand bar
    brandBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 52,
        paddingBottom: 8,
        gap: 6,
    },
    brandLogo: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 4,
        color: '#F8FAFC',
    },
    brandAI: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FF6B00',
        letterSpacing: 2,
        backgroundColor: 'rgba(255,107,0,0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },

    // Hero section
    heroSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        gap: 20,
    },
    gradeCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    gradeText: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
    },
    heroRight: {
        alignItems: 'flex-start',
    },
    heroScore: {
        fontSize: 56,
        fontWeight: '900',
        color: '#F8FAFC',
        letterSpacing: -2,
        lineHeight: 58,
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 2,
        marginTop: 2,
    },
    heroPlayer: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B00',
        marginTop: 4,
    },

    // Shooting stats
    shootingRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    shootingStat: {
        alignItems: 'center',
    },
    shootingCenter: {
        alignItems: 'center',
    },
    shootingBig: {
        fontSize: 32,
        fontWeight: '800',
    },
    shootingPct: {
        fontSize: 40,
        fontWeight: '900',
        letterSpacing: -1,
    },
    shootingLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 1.5,
        marginTop: 2,
    },

    // Court
    courtContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },

    // Stats grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 8,
        justifyContent: 'center',
        paddingTop: 12,
    },
    statPill: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
        minWidth: 76,
    },
    statPillAccent: {
        borderColor: 'rgba(255,107,0,0.25)',
        backgroundColor: 'rgba(255,107,0,0.06)',
    },
    statPillLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 1,
        marginBottom: 2,
    },
    statPillValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    statPillUnit: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },

    // Meta
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 16,
        gap: 8,
    },
    metaText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    metaDot: {
        fontSize: 14,
        color: '#475569',
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 24,
    },
    footerLine: {
        width: 40,
        height: 2,
        backgroundColor: 'rgba(255,107,0,0.3)',
        borderRadius: 1,
        marginBottom: 12,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FF6B00',
        letterSpacing: 1,
    },
    footerHash: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
        marginTop: 4,
    },
})
