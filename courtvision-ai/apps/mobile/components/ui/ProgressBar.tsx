import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { T } from '../../lib/theme';

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
    // We render `totalSteps` number of dots.
    const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

    return (
        <View style={styles.container}>
            {dots.map((step) => (
                <ProgressDot key={step} isActive={step === currentStep} isCompleted={step < currentStep} />
            ))}
        </View>
    );
}

function ProgressDot({ isActive, isCompleted }: { isActive: boolean; isCompleted: boolean }) {
    const width = useSharedValue(isActive ? 20 : 6);

    useEffect(() => {
        width.value = withSpring(isActive ? 20 : 6, T.spring.snappy);
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: width.value,
        };
    });

    const backgroundColor = isActive || isCompleted ? T.color.brand.primary : T.color.border.soft;

    return (
        <Animated.View
            style={[
                styles.dot,
                { backgroundColor },
                animatedStyle,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: T.spacing[4],
    },
    dot: {
        height: 6,
        borderRadius: T.radius.full,
    },
});
