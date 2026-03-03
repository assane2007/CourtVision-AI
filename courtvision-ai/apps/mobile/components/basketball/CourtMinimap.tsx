import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, Path, G } from 'react-native-svg';
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    withDelay
} from 'react-native-reanimated';
import { colors } from '../../constants/tokens';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ShotPoint {
    id: string;
    x: number; // 0 to 100 percentage of width
    y: number; // 0 to 100 percentage of height
    outcome: 'made' | 'missed';
}

interface CourtMinimapProps {
    animate?: boolean;
    style?: any;
    width?: number | string;
    height?: number | string;
    shots?: ShotPoint[];
}

export function CourtMinimap({ animate = false, style, width = '100%', height = '100%', shots = [] }: CourtMinimapProps) {
    const strokeOffsetLong = useSharedValue(1000);
    const strokeOffsetShort = useSharedValue(500);
    const opacity = useSharedValue(1);

    useEffect(() => {
        if (animate) {
            strokeOffsetLong.value = withTiming(0, {
                duration: 1200,
                easing: Easing.out(Easing.cubic),
            });

            strokeOffsetShort.value = withDelay(300, withTiming(0, {
                duration: 1000,
                easing: Easing.out(Easing.cubic),
            }));

            // Subtle pulse after drawing
            opacity.value = withDelay(1400,
                withRepeat(
                    withSequence(
                        withTiming(0.7, { duration: 2000 }),
                        withTiming(1, { duration: 2000 })
                    ),
                    -1,
                    true
                )
            );
        } else {
            strokeOffsetLong.value = 0;
            strokeOffsetShort.value = 0;
            opacity.value = 1;
        }
    }, [animate]);

    const animatedLongProps = useAnimatedProps(() => ({
        strokeDashoffset: strokeOffsetLong.value,
        opacity: opacity.value,
    }));

    const animatedShortProps = useAnimatedProps(() => ({
        strokeDashoffset: strokeOffsetShort.value,
        opacity: opacity.value,
    }));

    // Svg viewBox base coordinates
    const courtWidth = 280;
    const courtHeight = 150;

    return (
        <View style={[styles.container, style]}>
            <Svg viewBox={`0 0 ${courtWidth} ${courtHeight}`} width={width} height={height}>
                {/* Rectangle principal terrain */}
                <AnimatedRect
                    x="2" y="2" width="276" height="146" rx="4"
                    fill="none" stroke={colors.fire} strokeWidth="1.5"
                    strokeDasharray={1000} animatedProps={animatedLongProps}
                />
                {/* Ligne centrale */}
                <AnimatedLine
                    x1="140" y1="2" x2="140" y2="148"
                    stroke={colors.fire} strokeWidth="1"
                    strokeDasharray={150} animatedProps={animatedShortProps}
                />
                {/* Cercle central */}
                <AnimatedCircle
                    cx="140" cy="75" r="30"
                    fill="none" stroke={colors.fire} strokeWidth="1"
                    strokeDasharray={200} animatedProps={animatedShortProps}
                />

                {/* Raquette gauche */}
                <AnimatedRect
                    x="2" y="40" width="70" height="70"
                    fill="none" stroke={colors.fire} strokeWidth="1.2"
                    strokeDasharray={500} animatedProps={animatedShortProps}
                />
                {/* Cercle de lancer franc gauche */}
                <AnimatedCircle
                    cx="72" cy="75" r="35"
                    fill="none" stroke={colors.fire} strokeWidth="1"
                    strokeDasharray="4 4"
                    animatedProps={animatedShortProps}
                />
                {/* Arc à 3pts gauche (simplifié) */}
                <AnimatedPath
                    d="M 2 20 Q 130 150 2 130"
                    fill="none" stroke={colors.fire} strokeWidth="1"
                    strokeDasharray={500} animatedProps={animatedShortProps}
                />

                {/* Raquette droite */}
                <AnimatedRect
                    x="208" y="40" width="70" height="70"
                    fill="none" stroke={colors.fire} strokeWidth="1.2"
                    strokeDasharray={500} animatedProps={animatedShortProps}
                />
                {/* Cercle de lancer franc droite */}
                <AnimatedCircle
                    cx="208" cy="75" r="35"
                    fill="none" stroke={colors.fire} strokeWidth="1"
                    strokeDasharray="4 4"
                    animatedProps={animatedShortProps}
                />
                {/* Arc à 3pts droite (simplifié) */}
                <AnimatedPath
                    d="M 278 20 Q 150 150 278 130"
                    fill="none" stroke={colors.fire} strokeWidth="1"
                    strokeDasharray={500} animatedProps={animatedShortProps}
                />

                {/* Heatmap Shots Overlay */}
                <G opacity={animate ? opacity.value : 1}>
                    {shots.map((shot) => {
                        const cx = (shot.x / 100) * courtWidth;
                        const cy = (shot.y / 100) * courtHeight;
                        const fill = shot.outcome === 'made' ? colors.live : colors.danger;

                        return (
                            <Circle
                                key={shot.id}
                                cx={cx}
                                cy={cy}
                                r="4"
                                fill={fill}
                                opacity={0.85}
                            />
                        )
                    })}
                </G>
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    }
});
