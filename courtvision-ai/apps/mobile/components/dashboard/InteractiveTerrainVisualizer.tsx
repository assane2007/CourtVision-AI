import React, { useState } from 'react'
import { View, Dimensions, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated'
import Svg, { Path, Rect, Circle, G, Polygon } from 'react-native-svg'
import { T } from '../../lib/theme'
import { GlassCard, CVText } from '../ui'
import { Feather } from '@expo/vector-icons'

const { width: SCREEN_W } = Dimensions.get('window')
const COURT_W = SCREEN_W - T.spacing[8]
const COURT_H = COURT_W * 0.85

const ZONES = [
    { id: 'left_corner', label: 'Left Corner 3', x: 10, y: 80, accuracy: 42, attempts: 24, heat: 0.6 },
    { id: 'right_corner', label: 'Right Corner 3', x: 90, y: 80, accuracy: 38, attempts: 18, heat: 0.4 },
    { id: 'top_key', label: 'Top of Key', x: 50, y: 20, accuracy: 55, attempts: 40, heat: 0.8 },
    { id: 'paint', label: 'In the Paint', x: 50, y: 85, accuracy: 68, attempts: 85, heat: 0.95 },
    { id: 'left_wing', label: 'Left Wing', x: 20, y: 45, accuracy: 31, attempts: 30, heat: 0.3 },
    { id: 'right_wing', label: 'Right Wing', x: 80, y: 45, accuracy: 48, attempts: 45, heat: 0.7 },
]

export function InteractiveTerrainVisualizer() {
    const [selectedZone, setSelectedZone] = useState<typeof ZONES[0] | null>(null)
    const rotateX = useSharedValue(60) // Isometric projection
    const rotateZ = useSharedValue(0)
    const scale = useSharedValue(1)

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { perspective: 800 },
                { rotateX: `${rotateX.value}deg` },
                { rotateZ: `${rotateZ.value}deg` },
                { scale: scale.value }
            ]
        }
    })

    const handleZonePress = (zone: typeof ZONES[0]) => {
        setSelectedZone(zone)
        // Spring animation to highlight the tapped zone
        scale.value = withSequence(
            withSpring(1.05, { damping: 10, stiffness: 100 }),
            withSpring(1, { damping: 10, stiffness: 100 })
        )
    }

    const togglePerspective = () => {
        if (rotateX.value === 60) {
            rotateX.value = withSpring(0)
            rotateZ.value = withSpring(0)
        } else {
            rotateX.value = withSpring(60)
            rotateZ.value = withSpring(0)
        }
    }

    return (
        <GlassCard padding={0} style={{ overflow: 'hidden', paddingBottom: T.spacing[4], marginBottom: T.spacing[5] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: T.spacing[4], borderBottomWidth: 1, borderBottomColor: T.color.border.base }}>
                <CVText preset="cardTitle" color="primary">Interactive Terrain</CVText>
                <TouchableOpacity onPress={togglePerspective} style={{ padding: 6, backgroundColor: T.color.background.secondary, borderRadius: T.radius.full }}>
                    <Feather name="layers" size={16} color={T.color.text.secondary} />
                </TouchableOpacity>
            </View>

            <View style={{ height: COURT_H + 40, justifyContent: 'center', alignItems: 'center', backgroundColor: T.color.background.primary }}>
                <Animated.View style={[{ width: COURT_W, height: COURT_H }, animatedStyle]}>
                    <Svg width="100%" height="100%" viewBox={`0 0 100 100`} preserveAspectRatio="none">
                        {/* Court Base */}
                        <Rect x="0" y="0" width="100" height="100" fill={T.color.background.secondary} stroke={T.color.border.soft} strokeWidth="1" />

                        {/* Paint */}
                        <Rect x="35" y="60" width="30" height="40" fill={T.color.border.soft} opacity="0.3" stroke={T.color.border.base} strokeWidth="1" />

                        {/* Free throw circle */}
                        <Circle cx="50" cy="60" r="15" fill="none" stroke={T.color.border.base} strokeWidth="1" />

                        {/* 3PT Line */}
                        <Path
                            d="M 5 100 L 5 80 A 45 45 0 0 1 95 80 L 95 100"
                            fill="none"
                            stroke={T.color.brand.primary}
                            strokeWidth="1.5"
                            opacity="0.6"
                        />

                        {/* Backboard & Hoop */}
                        <Rect x="42" y="94" width="16" height="1" fill={T.color.signature.primary} />
                        <Circle cx="50" cy="90" r="3" fill="none" stroke={T.color.signature.secondary} strokeWidth="1" />

                        {/* Zones */}
                        {ZONES.map((zone) => {
                            const isSelected = selectedZone?.id === zone.id;
                            const heatColor = zone.heat > 0.7 ? T.color.semantic.success : zone.heat > 0.4 ? T.color.semantic.warning : T.color.semantic.error;
                            return (
                                <G key={zone.id} onPress={() => handleZonePress(zone)}>
                                    <Circle
                                        cx={zone.x} cy={zone.y} r={isSelected ? "12" : "8"}
                                        fill={heatColor} fillOpacity={isSelected ? "0.6" : "0.3"}
                                        stroke={isSelected ? '#fff' : heatColor} strokeWidth={isSelected ? "1.5" : "0"}
                                    />
                                    <Circle cx={zone.x} cy={zone.y} r="2" fill={isSelected ? '#fff' : heatColor} />
                                </G>
                            )
                        })}
                    </Svg>
                </Animated.View>
            </View>

            {/* Selected Zone Hover Panel */}
            <View style={{ paddingHorizontal: T.spacing[4], paddingTop: T.spacing[2], height: 80 }}>
                {selectedZone ? (
                    <Animated.View entering={FadeInDown} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.glass.vivid.backgroundColor, padding: T.spacing[3], borderRadius: T.radius.md, borderWidth: 1, borderColor: T.color.border.soft }}>
                        <View>
                            <CVText preset="cardTitle" color="primary">{selectedZone.label}</CVText>
                            <CVText preset="caption" color="secondary">{selectedZone.attempts} Attempts</CVText>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <CVText preset="statLarge" style={{ color: selectedZone.heat > 0.7 ? T.color.semantic.success : selectedZone.heat > 0.4 ? T.color.semantic.warning : T.color.semantic.error }}>{selectedZone.accuracy}%</CVText>
                            <CVText preset="overline" color="tertiary">ACCURACY</CVText>
                        </View>
                    </Animated.View>
                ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <CVText preset="caption" color="tertiary">Tap a zone on the 3D court to see details</CVText>
                    </View>
                )}
            </View>
        </GlassCard>
    )
}

// FadeInDown logic inside component requires reanimated
import { FadeInDown } from 'react-native-reanimated'
