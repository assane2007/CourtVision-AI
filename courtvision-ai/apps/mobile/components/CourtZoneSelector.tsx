/**
 * CourtZoneSelector — Sélecteur de zone de tir interactif.
 *
 * Affiche un demi-terrain NBA stylisé avec des zones cliquables :
 * - Paint (Restricted Area, Short Mid-Range)
 * - Mid-Range (Elbows, Baseline, Wings)
 * - Three-Point (Corner 3, Wing 3, Top of Key)
 * - Free Throw Line
 *
 * Chaque zone affiche les stats de l'utilisateur (FG%, tentatives).
 * Les couleurs varient selon la performance (vert → rouge).
 *
 * Design V4 : glass cards, amber accent.
 */

import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import Svg, {
    Path, Rect, Circle as SvgCircle, Line as SvgLine, G, Text as SvgText,
    Defs, LinearGradient, Stop,
} from 'react-native-svg'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { T } from '../lib/theme'

// ==========================================
// Types
// ==========================================

export interface ZoneStats {
    attempts: number
    made: number
    pct: number
}

export interface CourtZoneData {
    restrictedArea: ZoneStats
    paint: ZoneStats
    midRangeLeft: ZoneStats
    midRangeRight: ZoneStats
    midRangeCenter: ZoneStats
    corner3Left: ZoneStats
    corner3Right: ZoneStats
    wing3Left: ZoneStats
    wing3Right: ZoneStats
    topKey3: ZoneStats
    freeThrow: ZoneStats
}

interface CourtZoneSelectorProps {
    /** Stats par zone */
    data: Partial<CourtZoneData>
    /** Callback quand une zone est sélectionnée */
    onSelectZone?: (zone: keyof CourtZoneData) => void
    /** Zone actuellement sélectionnée */
    selectedZone?: keyof CourtZoneData | null
    /** Mode compact */
    compact?: boolean
    /** Afficher les labels NBA (zone averages) */
    showNbaComparison?: boolean
}

// ==========================================
// NBA 2023-24 Zone Averages
// ==========================================

const NBA_ZONE_AVG: Record<keyof CourtZoneData, number> = {
    restrictedArea: 65.5,
    paint: 42.8,
    midRangeLeft: 42.2,
    midRangeRight: 42.5,
    midRangeCenter: 44.0,
    corner3Left: 38.5,
    corner3Right: 39.0,
    wing3Left: 37.2,
    wing3Right: 37.0,
    topKey3: 36.5,
    freeThrow: 78.0,
}

// ==========================================
// Helpers
// ==========================================

function getZoneColor(pct: number, attempts: number): string {
    if (attempts === 0) return 'rgba(255,255,255,0.08)'
    if (pct >= 55) return 'rgba(0,198,122,0.55)'
    if (pct >= 45) return 'rgba(0,198,122,0.30)'
    if (pct >= 35) return 'rgba(255,186,0,0.35)'
    if (pct >= 25) return 'rgba(255,107,0,0.35)'
    return 'rgba(255,58,94,0.35)'
}

function getZoneTextColor(pct: number, attempts: number): string {
    if (attempts === 0) return 'rgba(255,255,255,0.3)'
    if (pct >= 45) return T.color.semantic.success
    if (pct >= 35) return T.color.semantic.warning
    return T.color.semantic.error
}

// ==========================================
// Composant
// ==========================================

const COURT_WIDTH = 300
const COURT_HEIGHT = 280

export function CourtZoneSelector({
    data,
    onSelectZone,
    selectedZone = null,
    compact = false,
    showNbaComparison = false,
}: CourtZoneSelectorProps) {
    // Zones avec fallback
    const zones = useMemo(() => {
        const empty: ZoneStats = { attempts: 0, made: 0, pct: 0 }
        return {
            restrictedArea: data.restrictedArea ?? empty,
            paint: data.paint ?? empty,
            midRangeLeft: data.midRangeLeft ?? empty,
            midRangeRight: data.midRangeRight ?? empty,
            midRangeCenter: data.midRangeCenter ?? empty,
            corner3Left: data.corner3Left ?? empty,
            corner3Right: data.corner3Right ?? empty,
            wing3Left: data.wing3Left ?? empty,
            wing3Right: data.wing3Right ?? empty,
            topKey3: data.topKey3 ?? empty,
            freeThrow: data.freeThrow ?? empty,
        }
    }, [data])

    const handleZonePress = (zone: keyof CourtZoneData) => {
        onSelectZone?.(zone)
    }

    const renderZoneLabel = (
        zone: keyof CourtZoneData,
        x: number,
        y: number,
        stats: ZoneStats,
    ) => {
        const pct = stats.pct
        const color = getZoneTextColor(pct, stats.attempts)
        const isSelected = selectedZone === zone

        return (
            <G key={zone}>
                <SvgText
                    x={x}
                    y={y - 6}
                    fill={color}
                    fontSize={compact ? 11 : 13}
                    fontWeight="bold"
                    textAnchor="middle"
                    opacity={isSelected ? 1 : 0.9}
                >
                    {stats.attempts > 0 ? `${Math.round(pct)}%` : '—'}
                </SvgText>
                <SvgText
                    x={x}
                    y={y + 8}
                    fill="rgba(255,255,255,0.45)"
                    fontSize={compact ? 8 : 9}
                    textAnchor="middle"
                >
                    {stats.attempts > 0 ? `${stats.made}/${stats.attempts}` : '0 tirs'}
                </SvgText>
                {showNbaComparison && stats.attempts > 0 ? (
                    <SvgText
                        x={x}
                        y={y + 19}
                        fill={pct >= NBA_ZONE_AVG[zone] ? 'rgba(0,198,122,0.7)' : 'rgba(255,58,94,0.7)'}
                        fontSize={7}
                        textAnchor="middle"
                    >
                        NBA: {NBA_ZONE_AVG[zone]}%
                    </SvgText>
                ) : null}
            </G>
        )
    }

    return (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.container, compact && styles.compact]}>
            <Svg
                width={COURT_WIDTH}
                height={COURT_HEIGHT}
                viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}
            >
                <Defs>
                    <LinearGradient id="courtGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="rgba(255,107,0,0.05)" />
                        <Stop offset="1" stopColor="rgba(255,107,0,0.02)" />
                    </LinearGradient>
                </Defs>

                {/* Court background */}
                <Rect x="0" y="0" width={COURT_WIDTH} height={COURT_HEIGHT}
                    rx="8" fill="url(#courtGradient)" />

                {/* Court lines */}
                {/* Baseline */}
                <SvgLine x1="20" y1={COURT_HEIGHT - 10} x2={COURT_WIDTH - 20} y2={COURT_HEIGHT - 10}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

                {/* 3-point arc */}
                <Path
                    d={`M 30 ${COURT_HEIGHT - 10} L 30 ${COURT_HEIGHT - 70} 
                        Q 30 60, ${COURT_WIDTH / 2} 40 
                        Q ${COURT_WIDTH - 30} 60, ${COURT_WIDTH - 30} ${COURT_HEIGHT - 70} 
                        L ${COURT_WIDTH - 30} ${COURT_HEIGHT - 10}`}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1.5"
                    fill="none"
                />

                {/* Paint */}
                <Rect
                    x={COURT_WIDTH / 2 - 45} y={COURT_HEIGHT - 100}
                    width={90} height={90}
                    rx="4"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                    fill="none"
                />

                {/* Free throw circle */}
                <SvgCircle
                    cx={COURT_WIDTH / 2} cy={COURT_HEIGHT - 100}
                    r="30"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    fill="none"
                />

                {/* Restricted area */}
                <Path
                    d={`M ${COURT_WIDTH / 2 - 20} ${COURT_HEIGHT - 10} 
                        A 20 20 0 0 1 ${COURT_WIDTH / 2 + 20} ${COURT_HEIGHT - 10}`}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    fill="none"
                />

                {/* Rim */}
                <SvgCircle
                    cx={COURT_WIDTH / 2} cy={COURT_HEIGHT - 15}
                    r="5"
                    stroke={T.color.signature.primary}
                    strokeWidth="1.5"
                    fill="rgba(255,107,0,0.15)"
                />

                {/* ---- Zone Areas (touchable fill) ---- */}

                {/* Restricted Area */}
                <Rect
                    x={COURT_WIDTH / 2 - 25} y={COURT_HEIGHT - 45}
                    width={50} height={30}
                    rx="4"
                    fill={getZoneColor(zones.restrictedArea.pct, zones.restrictedArea.attempts)}
                    stroke={selectedZone === 'restrictedArea' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('restrictedArea')}
                />

                {/* Paint (non-restricted) */}
                <Rect
                    x={COURT_WIDTH / 2 - 35} y={COURT_HEIGHT - 90}
                    width={70} height={40}
                    rx="4"
                    fill={getZoneColor(zones.paint.pct, zones.paint.attempts)}
                    stroke={selectedZone === 'paint' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('paint')}
                />

                {/* Mid-range Left */}
                <Rect
                    x={45} y={COURT_HEIGHT - 100}
                    width={55} height={60}
                    rx="4"
                    fill={getZoneColor(zones.midRangeLeft.pct, zones.midRangeLeft.attempts)}
                    stroke={selectedZone === 'midRangeLeft' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('midRangeLeft')}
                />

                {/* Mid-range Right */}
                <Rect
                    x={COURT_WIDTH - 100} y={COURT_HEIGHT - 100}
                    width={55} height={60}
                    rx="4"
                    fill={getZoneColor(zones.midRangeRight.pct, zones.midRangeRight.attempts)}
                    stroke={selectedZone === 'midRangeRight' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('midRangeRight')}
                />

                {/* Mid-range Center (free throw area) */}
                <Rect
                    x={COURT_WIDTH / 2 - 30} y={COURT_HEIGHT - 130}
                    width={60} height={35}
                    rx="4"
                    fill={getZoneColor(zones.midRangeCenter.pct, zones.midRangeCenter.attempts)}
                    stroke={selectedZone === 'midRangeCenter' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('midRangeCenter')}
                />

                {/* Corner 3 Left */}
                <Rect
                    x={15} y={COURT_HEIGHT - 60}
                    width={25} height={45}
                    rx="4"
                    fill={getZoneColor(zones.corner3Left.pct, zones.corner3Left.attempts)}
                    stroke={selectedZone === 'corner3Left' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('corner3Left')}
                />

                {/* Corner 3 Right */}
                <Rect
                    x={COURT_WIDTH - 40} y={COURT_HEIGHT - 60}
                    width={25} height={45}
                    rx="4"
                    fill={getZoneColor(zones.corner3Right.pct, zones.corner3Right.attempts)}
                    stroke={selectedZone === 'corner3Right' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('corner3Right')}
                />

                {/* Wing 3 Left */}
                <Rect
                    x={20} y={COURT_HEIGHT - 140}
                    width={40} height={45}
                    rx="4"
                    fill={getZoneColor(zones.wing3Left.pct, zones.wing3Left.attempts)}
                    stroke={selectedZone === 'wing3Left' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('wing3Left')}
                />

                {/* Wing 3 Right */}
                <Rect
                    x={COURT_WIDTH - 60} y={COURT_HEIGHT - 140}
                    width={40} height={45}
                    rx="4"
                    fill={getZoneColor(zones.wing3Right.pct, zones.wing3Right.attempts)}
                    stroke={selectedZone === 'wing3Right' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('wing3Right')}
                />

                {/* Top of Key 3 */}
                <Rect
                    x={COURT_WIDTH / 2 - 35} y={30}
                    width={70} height={40}
                    rx="4"
                    fill={getZoneColor(zones.topKey3.pct, zones.topKey3.attempts)}
                    stroke={selectedZone === 'topKey3' ? T.color.signature.primary : 'transparent'}
                    strokeWidth="2"
                    onPress={() => handleZonePress('topKey3')}
                />

                {/* ---- Zone Labels ---- */}
                {renderZoneLabel('restrictedArea', COURT_WIDTH / 2, COURT_HEIGHT - 28, zones.restrictedArea)}
                {renderZoneLabel('paint', COURT_WIDTH / 2, COURT_HEIGHT - 68, zones.paint)}
                {renderZoneLabel('midRangeLeft', 72, COURT_HEIGHT - 68, zones.midRangeLeft)}
                {renderZoneLabel('midRangeRight', COURT_WIDTH - 72, COURT_HEIGHT - 68, zones.midRangeRight)}
                {renderZoneLabel('midRangeCenter', COURT_WIDTH / 2, COURT_HEIGHT - 110, zones.midRangeCenter)}
                {renderZoneLabel('corner3Left', 27, COURT_HEIGHT - 35, zones.corner3Left)}
                {renderZoneLabel('corner3Right', COURT_WIDTH - 27, COURT_HEIGHT - 35, zones.corner3Right)}
                {renderZoneLabel('wing3Left', 40, COURT_HEIGHT - 115, zones.wing3Left)}
                {renderZoneLabel('wing3Right', COURT_WIDTH - 40, COURT_HEIGHT - 115, zones.wing3Right)}
                {renderZoneLabel('topKey3', COURT_WIDTH / 2, 52, zones.topKey3)}
            </Svg>
        </Animated.View>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    compact: {
        transform: [{ scale: 0.85 }],
    },
})
