/**
 * AROverlayView — Composant de rendu des overlays AR temps réel.
 *
 * Affiche en surcouche de la caméra :
 * - Squelette du joueur (joints + bones colorés)
 * - Arc de tir (trajectoire prédite)
 * - Indicateurs biomécaniques (angle coude, hauteur release, etc.)
 * - Feedback instantané (texte + couleur + animation)
 * - Position du ballon et du rim
 * - Debug info (FPS, phase, confiance)
 *
 * Architecture :
 * - SVG natif (react-native-svg) pour les overlays haute performance
 * - Reanimated pour les animations fluides
 * - Positionnement absolu sur la preview caméra
 */

import React, { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Svg, { Circle, Line, Polyline, G, Text as SvgText } from 'react-native-svg'
import Animated, {
    FadeIn,
    FadeOut,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    Easing,
} from 'react-native-reanimated'
import { T } from '../lib/theme'
import type {
    AROverlayFrame,
    ARFeedback,
    ARJoint,
    ARBone,
    ShotArcOverlay,
    BioIndicator,
} from '../lib/realtimeAIService'

// ==========================================
// Types
// ==========================================

interface AROverlayViewProps {
    /** Frame AR à afficher */
    frame: AROverlayFrame | null
    /** Feedback additionnel (priorité sur frame.feedback) */
    feedback: ARFeedback | null
    /** Largeur de la vue caméra */
    width: number
    /** Hauteur de la vue caméra */
    height: number
    /** Afficher les infos de debug */
    showDebug?: boolean
    /** Phase du shot detector */
    shotPhase?: string
    /** FPS du pipeline */
    fps?: number
    /** Score de posture actuel */
    postureQuality?: number
}

// ==========================================
// Sous-composants
// ==========================================

/** Rendu du squelette (joints + bones) */
function SkeletonOverlay({
    joints, bones, width, height,
}: {
    joints: ARJoint[]
    bones: ARBone[]
    width: number
    height: number
}) {
    return (
        <G>
            {/* Bones (lignes entre joints) */}
            {bones.map((bone, i) => (
                <Line
                    key={`bone_${i}`}
                    x1={bone.from.x * width}
                    y1={bone.from.y * height}
                    x2={bone.to.x * width}
                    y2={bone.to.y * height}
                    stroke={bone.color}
                    strokeWidth={bone.width}
                    opacity={bone.opacity}
                    strokeLinecap="round"
                />
            ))}
            {/* Joints (cercles) */}
            {joints.map((joint, i) => (
                <Circle
                    key={`joint_${i}`}
                    cx={joint.x * width}
                    cy={joint.y * height}
                    r={joint.radius}
                    fill={joint.color}
                    opacity={joint.opacity}
                />
            ))}
        </G>
    )
}

/** Rendu de l'arc de tir */
function ShotArcView({
    arc, width, height,
}: {
    arc: ShotArcOverlay
    width: number
    height: number
}) {
    const points = arc.points
        .map(p => `${p.x * width},${p.y * height}`)
        .join(' ')

    return (
        <Polyline
            points={points}
            fill="none"
            stroke={arc.color}
            strokeWidth={arc.width}
            strokeDasharray={arc.style === 'dashed' ? '8,4' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    )
}

/** Indicateur biomécanique positionné */
function BioIndicatorView({
    indicator, width, height,
}: {
    indicator: BioIndicator
    width: number
    height: number
}) {
    const x = indicator.position.x * width
    const y = indicator.position.y * height

    return (
        <G>
            {/* Background pill */}
            <Circle
                cx={x}
                cy={y}
                r={22}
                fill="rgba(5,10,18,0.75)"
                stroke={indicator.color}
                strokeWidth={1.5}
            />
            {/* Valeur */}
            <SvgText
                x={x}
                y={y - 2}
                fill={indicator.color}
                fontSize={11}
                fontWeight="bold"
                textAnchor="middle"
            >
                {indicator.value}
            </SvgText>
            {/* Label */}
            <SvgText
                x={x}
                y={y + 10}
                fill="rgba(255,255,255,0.6)"
                fontSize={7}
                textAnchor="middle"
            >
                {indicator.label}
            </SvgText>
        </G>
    )
}

/** Feedback instantané (toast AR) */
function FeedbackBubble({ feedback }: { feedback: ARFeedback }) {
    const bgColor = {
        success: 'rgba(0,198,122,0.92)',
        warning: 'rgba(255,186,0,0.92)',
        error: 'rgba(255,58,94,0.92)',
        info: 'rgba(10,132,255,0.92)',
    }[feedback.type]

    const icon = {
        success: '✓',
        warning: '⚠',
        error: '✕',
        info: 'ℹ',
    }[feedback.type]

    const positionStyle = {
        top: { top: 60 } as const,
        center: { top: '40%' } as const,
        bottom: { bottom: 100 } as const,
    }[feedback.position]

    return (
        <Animated.View
            entering={ZoomIn.duration(200)}
            exiting={FadeOut.duration(300)}
            style={[styles.feedbackBubble, positionStyle, { backgroundColor: bgColor }]}
        >
            <Text style={styles.feedbackIcon}>{icon}</Text>
            <View style={styles.feedbackTextContainer}>
                <Text style={styles.feedbackMessage}>{feedback.message}</Text>
                {feedback.detail ? (
                    <Text style={styles.feedbackDetail}>{feedback.detail}</Text>
                ) : null}
            </View>
        </Animated.View>
    )
}

/** Shot phase indicator (pastille animée) */
function ShotPhaseIndicator({ phase }: { phase: string }) {
    const phaseConfig = {
        idle: { color: T.color.text.tertiary, label: 'Standby' },
        gathering: { color: T.color.semantic.warning, label: 'Gather' },
        releasing: { color: T.color.signature.primary, label: 'Release!' },
        following_through: { color: T.color.semantic.success, label: 'Follow-Through' },
        ball_flight: { color: T.color.semantic.info, label: 'Ball Flight' },
    }[phase] ?? { color: T.color.text.tertiary, label: phase }

    if (phase === 'idle') return null

    return (
        <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={[styles.phaseIndicator, { borderColor: phaseConfig.color }]}
        >
            <View style={[styles.phaseDot, { backgroundColor: phaseConfig.color }]} />
            <Text style={[styles.phaseLabel, { color: phaseConfig.color }]}>
                {phaseConfig.label}
            </Text>
        </Animated.View>
    )
}

/** Posture quality mini-bar */
function PostureQualityBar({ quality }: { quality: number }) {
    const color = quality >= 75 ? T.color.semantic.success
        : quality >= 50 ? T.color.semantic.warning
        : T.color.semantic.error

    const widthAnim = useSharedValue(0)
    useEffect(() => {
        widthAnim.value = withTiming(quality, { duration: 400, easing: Easing.out(Easing.cubic) })
    }, [quality])

    const barStyle = useAnimatedStyle(() => ({
        width: `${widthAnim.value}%`,
        backgroundColor: color,
    }))

    return (
        <View style={styles.postureBar}>
            <Text style={styles.postureLabel}>Posture</Text>
            <View style={styles.postureTrack}>
                <Animated.View style={[styles.postureFill, barStyle]} />
            </View>
            <Text style={[styles.postureValue, { color }]}>{quality}</Text>
        </View>
    )
}

// ==========================================
// Composant principal
// ==========================================

export function AROverlayView({
    frame,
    feedback,
    width,
    height,
    showDebug = false,
    shotPhase = 'idle',
    fps = 0,
    postureQuality = 0,
}: AROverlayViewProps) {
    const activeFeedback = feedback ?? frame?.feedback ?? null

    return (
        <View style={[styles.container, { width, height }]} pointerEvents="none">
            {/* SVG layer — skeleton, arc, bio indicators */}
            <Svg width={width} height={height} style={styles.svgLayer}>
                {/* Squelette */}
                {frame?.skeleton ? (
                    <SkeletonOverlay
                        joints={frame.skeleton.joints}
                        bones={frame.skeleton.bones}
                        width={width}
                        height={height}
                    />
                ) : null}

                {/* Arc de tir */}
                {frame?.shotArc ? (
                    <ShotArcView arc={frame.shotArc} width={width} height={height} />
                ) : null}

                {/* Indicateurs biomécaniques */}
                {frame?.bioIndicators?.map((indicator, i) => (
                    <BioIndicatorView
                        key={`bio_${i}`}
                        indicator={indicator}
                        width={width}
                        height={height}
                    />
                ))}

                {/* Ball indicator */}
                {frame?.ballIndicator ? (
                    <Circle
                        cx={frame.ballIndicator.x * width}
                        cy={frame.ballIndicator.y * height}
                        r={frame.ballIndicator.radius}
                        fill="none"
                        stroke={frame.ballIndicator.color}
                        strokeWidth={2}
                        strokeDasharray="4,2"
                    />
                ) : null}

                {/* Rim indicator */}
                {frame?.rimIndicator ? (
                    <Circle
                        cx={frame.rimIndicator.x * width}
                        cy={frame.rimIndicator.y * height}
                        r={frame.rimIndicator.radius}
                        fill="none"
                        stroke={frame.rimIndicator.color}
                        strokeWidth={2}
                    />
                ) : null}
            </Svg>

            {/* Phase indicator (haut gauche) */}
            <ShotPhaseIndicator phase={shotPhase} />

            {/* Posture quality bar (bas) */}
            {postureQuality > 0 ? (
                <View style={styles.postureContainer}>
                    <PostureQualityBar quality={postureQuality} />
                </View>
            ) : null}

            {/* Feedback bubble */}
            {activeFeedback ? (
                <FeedbackBubble feedback={activeFeedback} />
            ) : null}

            {/* Debug overlay */}
            {showDebug && frame?.debugInfo ? (
                <View style={styles.debugBox}>
                    <Text style={styles.debugText}>
                        {`FPS: ${frame.debugInfo.fps} | Phase: ${frame.debugInfo.shotPhase}`}
                    </Text>
                    <Text style={styles.debugText}>
                        {`Pose: ${(frame.debugInfo.poseConfidence * 100).toFixed(0)}% | ${frame.debugInfo.processingMs.toFixed(1)}ms`}
                    </Text>
                </View>
            ) : showDebug ? (
                <View style={styles.debugBox}>
                    <Text style={styles.debugText}>
                        {`FPS: ${fps} | Phase: ${shotPhase}`}
                    </Text>
                </View>
            ) : null}
        </View>
    )
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    svgLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
    },

    // Phase indicator
    phaseIndicator: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5,10,18,0.80)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
    },
    phaseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    phaseLabel: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },

    // Posture bar
    postureContainer: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
    },
    postureBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5,10,18,0.80)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    postureLabel: {
        color: T.color.text.secondary,
        fontSize: 10,
        fontWeight: '600',
        marginRight: 8,
        fontFamily: T.fonts.body.semibold,
    },
    postureTrack: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    postureFill: {
        height: 4,
        borderRadius: 2,
    },
    postureValue: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 8,
        minWidth: 24,
        textAlign: 'right',
        fontFamily: T.fonts.display.bold,
    },

    // Feedback bubble
    feedbackBubble: {
        position: 'absolute',
        alignSelf: 'center',
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
    },
    feedbackIcon: {
        fontSize: 20,
        marginRight: 10,
        color: '#FFF',
    },
    feedbackTextContainer: {
        flex: 1,
    },
    feedbackMessage: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: T.fonts.display.bold,
    },
    feedbackDetail: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        marginTop: 2,
        fontFamily: T.fonts.body.regular,
    },

    // Debug
    debugBox: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(5,10,18,0.85)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: T.color.border.default,
    },
    debugText: {
        color: T.color.text.tertiary,
        fontSize: 9,
        fontFamily: T.fonts.body.regular,
    },
})
