import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withTiming,
    withDelay,
    Easing
} from 'react-native-reanimated';
import { T } from '../../lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface StatRingProps {
    percentage: number; // 0 to 100
    label: string;
    valueText: string;
    size?: number;
    delay?: number;
}

export function StatRing({ percentage, label, valueText, size = 80, delay = 0 }: StatRingProps) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // We animate the stroke-dashoffset to reveal the stroke
    const progress = useSharedValue(circumference);

    useEffect(() => {
        // Calculate the target offset exactly mapping the percentage (0 -> 100)
        const targetOffset = circumference - (percentage / 100) * circumference;
        progress.value = withDelay(
            delay,
            withTiming(targetOffset, {
                duration: 800,
                easing: Easing.out(Easing.cubic)
            })
        );
    }, [percentage, delay, circumference]);

    const animatedProps = useAnimatedProps(() => {
        return {
            strokeDashoffset: progress.value,
        };
    });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <View style={styles.svgWrapper}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background Ring */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={T.color.border.soft}
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Foreground Animated Ring */}
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={T.color.brand.primary}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        animatedProps={animatedProps}
                        strokeLinecap="round"
                        rotation="-90"
                        origin={`${size / 2}, ${size / 2}`} // required to rotate around center
                    />
                </Svg>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.valueText}>{valueText}</Text>
                <Text style={styles.labelText}>{label}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    svgWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    textContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueText: {
        ...T.type.h3,
        color: T.color.text.primary,
    },
    labelText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 10,
        color: T.color.text.tertiary,
        textAlign: 'center',
        marginTop: 2,
    }
});
