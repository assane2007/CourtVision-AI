/**
 * SkeletonOverlay — AR-style skeleton overlay for video replay.
 *
 * Renders a transparent SVG layer on top of video with:
 * - Joint connections (bones)
 * - Joint dots with confidence-based opacity
 * - Angle arc annotations (elbow, knee)
 * - Optional shot arc trajectory
 * - Real-time pulse/glow animation on key joints
 *
 * Designed to be absolutely positioned over a Video component.
 */

import React, { memo, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Svg, {
    Circle, Line, Text as SvgText, G, Path,
} from 'react-native-svg'
import Animated, {
    useSharedValue, useAnimatedProps, withRepeat, withTiming,
} from 'react-native-reanimated'

// ── BlazePose 33-Landmark Connections ────────

// MediaPipe BlazePose pairs (0-based landmark indices)
const POSE_CONNECTIONS: [number, number][] = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7],  // nose → left ear
    [0, 4], [4, 5], [5, 6], [6, 8],  // nose → right ear
    // Torso
    [11, 12],       // shoulders
    [11, 23], [12, 24], [23, 24], // torso
    // Left arm
    [11, 13], [13, 15],  // shoulder → elbow → wrist
    [15, 17], [15, 19], [15, 21], // wrist → fingers
    // Right arm
    [12, 14], [14, 16],
    [16, 18], [16, 20], [16, 22],
    // Left leg
    [23, 25], [25, 27], [27, 29], [27, 31],
    // Right leg
    [24, 26], [26, 28], [28, 30], [28, 32],
]

// Key joints for larger dots
const KEY_JOINTS = new Set([11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28])

// Joint groups for coloring
const JOINT_COLORS: Record<string, string> = {
    arm_right: '#FF6B00', // amber
    arm_left: '#0A84FF',  // blue
    leg_right: '#00D97E', // green
    leg_left: '#A78BFA',  // violet
    torso: '#FFC400',     // yellow
    face: '#94A3B8',      // slate
}

function getJointColor(index: number): string {
    if (index <= 10) return JOINT_COLORS.face
    if (index === 11 || index === 13 || index === 15 || index === 17 || index === 19 || index === 21) return JOINT_COLORS.arm_left
    if (index === 12 || index === 14 || index === 16 || index === 18 || index === 20 || index === 22) return JOINT_COLORS.arm_right
    if (index === 23 || index === 25 || index === 27 || index === 29 || index === 31) return JOINT_COLORS.leg_left
    if (index === 24 || index === 26 || index === 28 || index === 30 || index === 32) return JOINT_COLORS.leg_right
    return JOINT_COLORS.torso
}

function getBoneColor(a: number, b: number): string {
    // Use the color of the "further" joint from torso
    return getJointColor(Math.max(a, b))
}

// ── Types ────────────────────────────────────

export interface SkeletonLandmark {
    x: number  // normalized 0-1
    y: number  // normalized 0-1
    z: number
    visibility: number  // 0-1
}

export interface SkeletonFrame {
    landmarks: SkeletonLandmark[]
    elbowAngle?: number
    kneeAngle?: number
    shotArc?: { x: number; y: number }[]  // Normalized control points
    timestamp?: number
}

interface SkeletonOverlayProps {
    frame: SkeletonFrame | null
    width: number
    height: number
    /** Show angle annotations */
    showAngles?: boolean
    /** Show shot arc trajectory */
    showArc?: boolean
    /** Opacity for the entire overlay */
    opacity?: number
    /** Minimum visibility to render a joint */
    visibilityThreshold?: number
}

// ── Angle Arc Path ───────────────────────────

function anglePath(
    cx: number, cy: number, r: number,
    startAngleDeg: number, endAngleDeg: number,
): string {
    const toRad = (d: number) => (d * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngleDeg))
    const y1 = cy + r * Math.sin(toRad(startAngleDeg))
    const x2 = cx + r * Math.cos(toRad(endAngleDeg))
    const y2 = cy + r * Math.sin(toRad(endAngleDeg))
    const largeArc = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

// ── Component ────────────────────────────────

export const SkeletonOverlay = memo(function SkeletonOverlay({
    frame,
    width,
    height,
    showAngles = true,
    showArc = true,
    opacity = 0.9,
    visibilityThreshold = 0.3,
}: SkeletonOverlayProps) {
    if (!frame?.landmarks?.length) return null

    const lm = frame.landmarks
    const toX = (v: number) => v * width
    const toY = (v: number) => v * height

    return (
        <Svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={[StyleSheet.absoluteFill, { opacity }]}
            pointerEvents="none"
        >
            {/* Bone connections */}
            <G opacity={0.7}>
                {POSE_CONNECTIONS.map(([a, b], i) => {
                    if (!lm[a] || !lm[b]) return null
                    if (lm[a].visibility < visibilityThreshold || lm[b].visibility < visibilityThreshold) return null
                    return (
                        <Line
                            key={`bone-${i}`}
                            x1={toX(lm[a].x)} y1={toY(lm[a].y)}
                            x2={toX(lm[b].x)} y2={toY(lm[b].y)}
                            stroke={getBoneColor(a, b)}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            opacity={Math.min(lm[a].visibility, lm[b].visibility)}
                        />
                    )
                })}
            </G>

            {/* Joint dots */}
            <G>
                {lm.map((joint, i) => {
                    if (joint.visibility < visibilityThreshold) return null
                    const isKey = KEY_JOINTS.has(i)
                    const r = isKey ? 5 : 3
                    return (
                        <React.Fragment key={`joint-${i}`}>
                            {/* Glow */}
                            {isKey && (
                                <Circle
                                    cx={toX(joint.x)} cy={toY(joint.y)}
                                    r={r + 4}
                                    fill={getJointColor(i)}
                                    opacity={joint.visibility * 0.25}
                                />
                            )}
                            {/* Core dot */}
                            <Circle
                                cx={toX(joint.x)} cy={toY(joint.y)}
                                r={r}
                                fill={getJointColor(i)}
                                opacity={joint.visibility}
                            />
                        </React.Fragment>
                    )
                })}
            </G>

            {/* Elbow angle annotation */}
            {showAngles && frame.elbowAngle != null && lm[14]?.visibility >= visibilityThreshold && (
                <G>
                    <Path
                        d={anglePath(
                            toX(lm[14].x), toY(lm[14].y),
                            20, -90, -90 + (frame.elbowAngle > 180 ? 180 : frame.elbowAngle),
                        )}
                        fill="none"
                        stroke="#FF6B00"
                        strokeWidth={1.5}
                        opacity={0.8}
                    />
                    <SvgText
                        x={toX(lm[14].x) + 24}
                        y={toY(lm[14].y) - 8}
                        fill="#FF6B00"
                        fontSize={11}
                        fontWeight="bold"
                    >
                        {`${Math.round(frame.elbowAngle)}°`}
                    </SvgText>
                </G>
            )}

            {/* Knee angle annotation */}
            {showAngles && frame.kneeAngle != null && lm[26]?.visibility >= visibilityThreshold && (
                <G>
                    <Path
                        d={anglePath(
                            toX(lm[26].x), toY(lm[26].y),
                            18, 90, 90 - (frame.kneeAngle > 180 ? 180 : frame.kneeAngle),
                        )}
                        fill="none"
                        stroke="#00D97E"
                        strokeWidth={1.5}
                        opacity={0.8}
                    />
                    <SvgText
                        x={toX(lm[26].x) + 22}
                        y={toY(lm[26].y) + 4}
                        fill="#00D97E"
                        fontSize={11}
                        fontWeight="bold"
                    >
                        {`${Math.round(frame.kneeAngle)}°`}
                    </SvgText>
                </G>
            )}

            {/* Shot arc trajectory */}
            {showArc && frame.shotArc && frame.shotArc.length >= 3 && (
                <G opacity={0.6}>
                    <Path
                        d={frame.shotArc.reduce((path, pt, i) => {
                            const px = toX(pt.x)
                            const py = toY(pt.y)
                            return i === 0 ? `M ${px} ${py}` : `${path} L ${px} ${py}`
                        }, '')}
                        fill="none"
                        stroke="#FFC400"
                        strokeWidth={2}
                        strokeDasharray="6,4"
                        strokeLinecap="round"
                    />
                    {/* Arc endpoint dot */}
                    <Circle
                        cx={toX(frame.shotArc[frame.shotArc.length - 1].x)}
                        cy={toY(frame.shotArc[frame.shotArc.length - 1].y)}
                        r={4}
                        fill="#FFC400"
                    />
                </G>
            )}
        </Svg>
    )
})

export default SkeletonOverlay
