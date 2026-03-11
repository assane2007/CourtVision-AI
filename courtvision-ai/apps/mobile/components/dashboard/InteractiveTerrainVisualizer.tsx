import React, { useState, useRef, useEffect, Suspense } from 'react'
import { View, Dimensions, TouchableOpacity, Platform } from 'react-native'
import { T } from '../../lib/theme'
import { GlassCard, CVText } from '../ui'
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SessionStorageService } from '../../lib/sessionStorage'

// @react-three/fiber is not compatible with web (uses react-reconciler pinned to React 18)
const Canvas = Platform.OS !== 'web' ? require('@react-three/fiber/native').Canvas : View;
const useFrame = Platform.OS !== 'web' ? require('@react-three/fiber/native').useFrame : () => {};

const { width: SCREEN_W } = Dimensions.get('window')
const COURT_W = SCREEN_W - T.spacing[8]
const COURT_H = COURT_W * 0.85

interface ZoneData {
    id: string
    label: string
    x: number
    z: number
    accuracy: number
    attempts: number
    heat: number
}

const ZONE_LAYOUT: Array<{ id: string; label: string; x: number; z: number; storageKey: string }> = [
    { id: 'left_corner', label: 'Left Corner 3', x: -4, z: 2, storageKey: 'left_corner_3' },
    { id: 'right_corner', label: 'Right Corner 3', x: 4, z: 2, storageKey: 'right_corner_3' },
    { id: 'top_key', label: 'Top of Key', x: 0, z: -4, storageKey: 'top_key' },
    { id: 'paint', label: 'In the Paint', x: 0, z: 2.5, storageKey: 'paint' },
    { id: 'left_wing', label: 'Left Wing', x: -3, z: -1.5, storageKey: 'left_wing' },
    { id: 'right_wing', label: 'Right Wing', x: 3, z: -1.5, storageKey: 'right_wing' },
]

function CourtLines() {
    return (
        <group position={[0, -0.05, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 12]} />
                <meshStandardMaterial color={T.color.bg.tertiary} />
            </mesh>
            {/* Paint area */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2.5]}>
                <planeGeometry args={[3.2, 4]} />
                <meshStandardMaterial color="#2d2d3a" />
            </mesh>
            {/* Hoop center marker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4.5]}>
                <ringGeometry args={[0.2, 0.3, 16]} />
                <meshBasicMaterial color={T.color.brand.primary} />
            </mesh>
        </group>
    )
}

function ZoneMarker({ zone, isSelected, onSelect }: any) {
    const meshRef = useRef<any>(null)
    const heatColor = zone.heat > 0.7 ? T.color.semantic.success : zone.heat > 0.4 ? T.color.semantic.warning : T.color.semantic.error

    useFrame((state) => {
        if (meshRef.current) {
            if (isSelected) {
                meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.2 + 0.4
                meshRef.current.rotation.y += 0.03
                meshRef.current.rotation.x += 0.01
            } else {
                meshRef.current.position.y = 0.2
                meshRef.current.rotation.y = 0
                meshRef.current.rotation.x = 0
            }
        }
    })

    return (
        <mesh
            ref={meshRef}
            position={[zone.x, 0.2, zone.z]}
            onClick={(e) => { e.stopPropagation(); onSelect(zone) }}
        >
            {isSelected ? <boxGeometry args={[0.8, 0.8, 0.8]} /> : <sphereGeometry args={[0.4, 16, 16]} />}
            <meshStandardMaterial
                color={heatColor}
                emissive={heatColor}
                emissiveIntensity={isSelected ? 0.8 : 0.2}
                wireframe={isSelected}
            />
        </mesh>
    )
}

function Scene({ selectedZone, onSelectZone, perspective, zones }: any) {
    const groupRef = useRef<any>(null)

    useFrame((state) => {
        if (groupRef.current) {
            if (perspective === '3D') {
                groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
                groupRef.current.rotation.x = Math.PI / 6 // Tilt
            } else {
                groupRef.current.rotation.y = 0
                groupRef.current.rotation.x = 0 // Top-down
            }
        }
    })

    return (
        <group ref={groupRef} position={[0, -1, -5]}>
            <ambientLight intensity={0.5} />
            <pointLight position={[0, 5, 0]} intensity={1.5} color="#ffffff" />
            <pointLight position={[0, 2, 5]} intensity={2} color={T.color.brand.primary} />

            <CourtLines />

            {zones.map(z => (
                <ZoneMarker
                    key={z.id}
                    zone={z}
                    isSelected={selectedZone?.id === z.id}
                    onSelect={onSelectZone}
                />
            ))}
        </group>
    )
}

export function InteractiveTerrainVisualizer() {
    const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null)
    const [perspective, setPerspective] = useState<'3D' | '2D'>('3D')
    const [zones, setZones] = useState<ZoneData[]>(() =>
        ZONE_LAYOUT.map(z => ({ id: z.id, label: z.label, x: z.x, z: z.z, accuracy: 0, attempts: 0, heat: 0 }))
    )

    useEffect(() => {
        const storage = SessionStorageService.getInstance()
        storage.getZoneStats(50).then(stats => {
            const maxAttempts = Math.max(1, ...Object.values(stats).map(s => s.attempts))
            setZones(ZONE_LAYOUT.map(z => {
                const s = stats[z.storageKey] || stats[z.id]
                if (s) {
                    return { id: z.id, label: z.label, x: z.x, z: z.z, accuracy: Math.round(s.pct), attempts: s.attempts, heat: s.attempts / maxAttempts }
                }
                return { id: z.id, label: z.label, x: z.x, z: z.z, accuracy: 0, attempts: 0, heat: 0 }
            }))
        }).catch(() => {})
    }, [])

    const togglePerspective = () => setPerspective(p => p === '3D' ? '2D' : '3D')

    return (
        <GlassCard padding={0} style={{ overflow: 'hidden', paddingBottom: T.spacing[4], marginBottom: T.spacing[5] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: T.spacing[4], borderBottomWidth: 1, borderBottomColor: T.color.border.base }}>
                <CVText preset="cardTitle" color="primary">Digital Twin (Live 3D)</CVText>
                <TouchableOpacity onPress={togglePerspective} style={{ padding: 6, backgroundColor: T.color.background.secondary, borderRadius: T.radius.full }}>
                    <Feather name={perspective === '3D' ? "layers" : "map"} size={16} color={T.color.text.secondary} />
                </TouchableOpacity>
            </View>

            <View style={{ height: COURT_H + 40, width: '100%', backgroundColor: '#0a0a0f' }}>
                <Suspense fallback={
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <CVText preset="caption" color="secondary">Initializing Neural Engine...</CVText>
                    </View>
                }>
                    <Canvas camera={{ position: [0, 5, 5], fov: 60 }}>
                        <Scene
                            selectedZone={selectedZone}
                            onSelectZone={setSelectedZone}
                            perspective={perspective}
                            zones={zones}
                        />
                    </Canvas>
                </Suspense>
            </View>

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
                        <CVText preset="caption" color="tertiary">Tap a shot node on the 3D court to see details</CVText>
                    </View>
                )}
            </View>
        </GlassCard>
    )
}
