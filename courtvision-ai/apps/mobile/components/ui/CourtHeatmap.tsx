import React from 'react'
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native'
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg'
import { T } from '../../lib/theme'
import { CVText } from './CVText'
import { GlassCard } from './GlassCard'

const { width: SCREEN_W } = Dimensions.get('window')

interface ShotZone {
    id: string
    x: number
    y: number
    accuracy: number
    shots: number
}

interface CourtHeatmapProps {
    data: ShotZone[]
    onZonePress?: (zone: ShotZone) => void
}

export const CourtHeatmap: React.FC<CourtHeatmapProps> = ({ data, onZonePress }) => {
    const courtW = SCREEN_W - T.spacing[8]
    const courtH = courtW * 0.8 // Standard ratio

    const renderZone = (zone: ShotZone) => {
        const color = zone.accuracy >= 60 ? T.color.semantic.success :
            zone.accuracy >= 40 ? T.color.semantic.warning :
                T.color.semantic.error

        return (
            <G key={zone.id}>
                <Circle
                    cx={zone.x * (courtW / 100)}
                    cy={zone.y * (courtH / 100)}
                    r="20"
                    fill={color}
                    fillOpacity="0.4"
                />
                <Circle
                    cx={zone.x * (courtW / 100)}
                    cy={zone.y * (courtH / 100)}
                    r="6"
                    fill={color}
                />
            </G>
        )
    }

    return (
        <GlassCard padding={0} style={{ height: courtH, overflow: 'hidden' }}>
            <Svg width={courtW} height={courtH} viewBox={`0 0 ${courtW} ${courtH}`}>
                {/* Court Outline */}
                <Rect x="0" y="0" width={courtW} height={courtH} fill="transparent" stroke={T.color.border.base} strokeWidth="2" />

                {/* Paint */}
                <Rect x={courtW * 0.35} y={courtH - courtH * 0.4} width={courtW * 0.3} height={courtH * 0.4} fill="transparent" stroke={T.color.border.base} strokeWidth="2" />

                {/* 3PT Line */}
                <Path
                    d={`M 0 ${courtH * 0.2} L ${courtW * 0.1} ${courtH * 0.2} A ${courtW * 0.4} ${courtW * 0.4} 0 0 1 ${courtW * 0.9} ${courtH * 0.2} L ${courtW} ${courtH * 0.2}`}
                    fill="none"
                    stroke={T.color.border.base}
                    strokeWidth="2"
                    transform={`translate(0, ${courtH * 0.15})`}
                />

                {/* Hoop/Backboard */}
                <Line x1={courtW * 0.45} y1={courtH * 0.05} x2={courtW * 0.55} y2={courtH * 0.05} stroke={T.color.border.base} strokeWidth="4" />
                <Circle cx={courtW * 0.5} cy={courtH * 0.08} r="10" fill="none" stroke={T.color.brand.primary} strokeWidth="2" />

                {/* Heat Zones */}
                {data.map(renderZone)}
            </Svg>

            <View style={styles.legend}>
                <View style={[styles.legendItem, { backgroundColor: T.color.semantic.success }]} />
                <CVText preset="caption" color="secondary">Elite</CVText>
                <View style={[styles.legendItem, { backgroundColor: T.color.semantic.warning, marginLeft: 8 }]} />
                <CVText preset="caption" color="secondary">Avg</CVText>
                <View style={[styles.legendItem, { backgroundColor: T.color.semantic.error, marginLeft: 8 }]} />
                <CVText preset="caption" color="secondary">Cold</CVText>
            </View>
        </GlassCard>
    )
}

const styles = StyleSheet.create({
    legend: {
        position: 'absolute',
        bottom: T.spacing[3],
        right: T.spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: T.radius.sm
    },
    legendItem: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4
    }
})
