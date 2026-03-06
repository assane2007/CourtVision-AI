import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions, Pressable } from 'react-native';
import Svg, { Line, Circle, Path, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    interpolate,
    Extrapolation,
    useAnimatedStyle,
    withDelay
} from 'react-native-reanimated';
import { colors, typography, space, radius } from '../../constants/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Coordinates mapping for a simplified 2D side-profile basketball shooter
// Coordinates are roughly 0-100 scale, representing % of SVG viewport
interface Skeleton {
    head: { x: number, y: number };
    shoulder: { x: number, y: number };
    elbow: { x: number, y: number };
    wrist: { x: number, y: number };
    hip: { x: number, y: number };
    knee: { x: number, y: number };
    ankle: { x: number, y: number };
}

// "Perfect" form (Ghost) vs "Current" form (User with flaws)
const PERFECT_FORM: Skeleton = {
    head: { x: 50, y: 15 },
    shoulder: { x: 45, y: 30 },
    elbow: { x: 65, y: 35 },
    wrist: { x: 55, y: 15 },
    hip: { x: 40, y: 55 },
    knee: { x: 45, y: 75 },
    ankle: { x: 40, y: 95 },
};

const CURRENT_FORM: Skeleton = {
    head: { x: 48, y: 17 },
    shoulder: { x: 47, y: 32 },
    elbow: { x: 75, y: 40 }, // Flared elbow issue
    wrist: { x: 60, y: 20 }, // Lower release
    hip: { x: 40, y: 55 },
    knee: { x: 50, y: 70 },  // Less knee bend
    ankle: { x: 45, y: 95 }, // Off balance
};

export function GhostMode() {
    // Animation progress from 0 to 1
    const progress = useSharedValue(0);
    const glitchOpacity = useSharedValue(0.2);

    useEffect(() => {
        // Continuous organic sweep back and forth to simulate scrubbing the shot
        progress.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
                withDelay(500, withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.quad) }))
            ),
            -1,
            true
        );

        // Hologram glitch effect
        glitchOpacity.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 100 }),
                withTiming(0.1, { duration: 50 }),
                withTiming(0.6, { duration: 200 }),
                withDelay(2000, withTiming(0.2, { duration: 100 }))
            ),
            -1,
            false
        );
    }, []);

    const interpolateCoord = (coord: 'x' | 'y', part: keyof Skeleton) => {
        'worklet';
        // Base coordinate, but we add a gentle "breathing" phase based on progress
        const pVal = PERFECT_FORM[part][coord];
        const cVal = CURRENT_FORM[part][coord];

        // Slight movement down then up to simulate a shot motion
        const shotMotion = coord === 'y' ? interpolate(progress.value, [0, 0.5, 1], [0, 8, -6], Extrapolation.CLAMP) :
            interpolate(progress.value, [0, 0.5, 1], [0, -2, 4], Extrapolation.CLAMP);

        return {
            perfect: pVal + shotMotion,
            current: cVal + shotMotion
        };
    };

    // Helper to generate Animated Props for lines connecting joints
    const useBoneProps = (partA: keyof Skeleton, partB: keyof Skeleton, isPerfect: boolean) => {
        return useAnimatedProps(() => {
            const pA = interpolateCoord('x', partA);
            const pAy = interpolateCoord('y', partA);
            const pB = interpolateCoord('x', partB);
            const pBy = interpolateCoord('y', partB);

            return {
                x1: `${isPerfect ? pA.perfect : pA.current}%`,
                y1: `${isPerfect ? pAy.perfect : pAy.current}%`,
                x2: `${isPerfect ? pB.perfect : pB.current}%`,
                y2: `${isPerfect ? pBy.perfect : pBy.current}%`,
            };
        });
    };

    // Helper to generate Animated Props for joints
    const useJointProps = (part: keyof Skeleton, isPerfect: boolean) => {
        return useAnimatedProps(() => {
            const p = interpolateCoord('x', part);
            const py = interpolateCoord('y', part);

            return {
                cx: `${isPerfect ? p.perfect : p.current}%`,
                cy: `${isPerfect ? py.perfect : py.current}%`,
            };
        });
    };

    const ghostStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.5, 1], [0.4, 0.8, 0.4])
    }));

    // Inner components to isolate hook usage
    const BoneLine = ({ a, b, isPerfect }: { a: keyof Skeleton, b: keyof Skeleton, isPerfect: boolean }) => {
        const props = useBoneProps(a, b, isPerfect);
        return (
            <AnimatedLine
                animatedProps={props}
                stroke={isPerfect ? colors.live : colors.danger}
                strokeWidth={isPerfect ? 2 : 2.5}
                strokeLinecap="round"
                strokeDasharray={isPerfect ? "4 4" : undefined}
            />
        );
    };

    const JointCircle = ({ part, isPerfect }: { part: keyof Skeleton, isPerfect: boolean }) => {
        const props = useJointProps(part, isPerfect);
        return (
            <AnimatedCircle
                animatedProps={props}
                r={isPerfect ? 3 : 4}
                fill={colors.base}
                stroke={isPerfect ? colors.live : colors.danger}
                strokeWidth={1.5}
            />
        );
    };

    const SkeletonBones = ({ isPerfect }: { isPerfect: boolean }) => {
        const bones: [keyof Skeleton, keyof Skeleton][] = [
            ['head', 'shoulder'], ['shoulder', 'elbow'], ['elbow', 'wrist'],
            ['shoulder', 'hip'], ['hip', 'knee'], ['knee', 'ankle']
        ];
        return (
            <>
                {bones.map(([a, b]) => <BoneLine key={`${a}-${b}`} a={a} b={b} isPerfect={isPerfect} />)}
            </>
        );
    };

    const SkeletonJoints = ({ isPerfect }: { isPerfect: boolean }) => {
        return (
            <>
                {Object.keys(PERFECT_FORM).map((key) => (
                    <JointCircle key={key} part={key as keyof Skeleton} isPerfect={isPerfect} />
                ))}
            </>
        );
    };

    const ElbowFocus = () => {
        const props = useJointProps('elbow', false);
        return (
            <AnimatedCircle
                animatedProps={props}
                r="12"
                fill="none"
                stroke={colors.fire}
                strokeWidth="1"
                strokeDasharray="2 2"
            />
        );
    };
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
                    <Text style={styles.legendText}>Current Form</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.live }]} />
                    <Text style={styles.legendText}>Ghost (Perfect)</Text>
                </View>
            </View>

            <View style={styles.canvasContainer}>
                {/* Background Grid */}
                <Svg width="100%" height="100%" style={styles.svgBackground}>
                    {/* Horizon line */}
                    <Line x1="0" y1="95%" x2="100%" y2="95%" stroke={colors.line} strokeWidth="1" strokeDasharray="2 4" />
                    {/* Grid lines */}
                    <Line x1="50%" y1="0" x2="50%" y2="100%" stroke={colors.surface3} strokeWidth="1" strokeDasharray="2 8" />
                    <Line x1="0" y1="50%" x2="100%" y2="50%" stroke={colors.surface3} strokeWidth="1" strokeDasharray="2 8" />
                </Svg>

                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor={colors.live} stopOpacity="0.2" />
                            <Stop offset="100%" stopColor={colors.live} stopOpacity="0" />
                        </RadialGradient>
                    </Defs>

                    {/* Glow behind perfect form */}
                    <Animated.View style={[StyleSheet.absoluteFill, ghostStyle]}>
                        <Svg width="100%" height="100%">
                            <Circle cx="50%" cy="50%" r="40%" fill="url(#glow)" />
                        </Svg>
                    </Animated.View>

                    {/* Both Skeletons */}
                    <G opacity={0.6}>
                        <SkeletonBones isPerfect={true} />
                        <SkeletonJoints isPerfect={true} />
                    </G>

                    <G opacity={1}>
                        <SkeletonBones isPerfect={false} />
                        <SkeletonJoints isPerfect={false} />
                    </G>

                    {/* Flared Elbow Focus Area */}
                    <ElbowFocus />
                </Svg >
            </View >

            <View style={styles.analysisBox}>
                <Text style={styles.analysisTitle}>Critical Deviations</Text>
                <View style={styles.deviationRow}>
                    <Text style={styles.deviationLabel}>Elbow Flaring</Text>
                    <Text style={styles.deviationValue}>+12° ERROR</Text>
                </View>
                <View style={styles.deviationRow}>
                    <Text style={styles.deviationLabel}>Release Point</Text>
                    <Text style={styles.deviationValue}>-4cm LOW</Text>
                </View>
                <View style={[styles.deviationRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.deviationLabel}>Knee Flexion</Text>
                    <Text style={[styles.deviationValue, { color: colors.caution }]}>-8° STIFF</Text>
                </View>
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: space[5],
        marginBottom: space[4],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    legendText: {
        ...typography.label,
        color: colors.cloud,
    },
    canvasContainer: {
        height: 280,
        backgroundColor: colors.surface2,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.lineStrong,
        overflow: 'hidden',
        position: 'relative',
    },
    svgBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    analysisBox: {
        marginTop: space[4],
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: space[4],
        borderWidth: 1,
        borderColor: colors.surface3,
    },
    analysisTitle: {
        fontFamily: 'JetBrainsMono_700Bold',
        fontSize: 12,
        color: colors.fire,
        letterSpacing: 1,
        marginBottom: space[3],
        textTransform: 'uppercase',
    },
    deviationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: space[2],
        borderBottomWidth: 1,
        borderBottomColor: colors.surface3,
    },
    deviationLabel: {
        ...typography.body,
        color: colors.snow,
    },
    deviationValue: {
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 13,
        color: colors.danger,
    }
});
