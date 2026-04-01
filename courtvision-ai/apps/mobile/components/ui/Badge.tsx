import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, space, typography } from '../../constants/tokens';

interface BadgeProps {
    label: string;
    variant?: 'live' | 'caution' | 'danger' | 'neutral';
    style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
    let backgroundColor: string = colors.surface2;
    let textColor: string = colors.cloud;

    switch (variant) {
        case 'live':
            backgroundColor = colors.liveDim;
            textColor = colors.live;
            break;
        case 'caution':
            backgroundColor = colors.cautionDim;
            textColor = colors.caution;
            break;
        case 'danger':
            backgroundColor = colors.dangerDim;
            textColor = colors.danger;
            break;
    }

    return (
        <View
            style={[
                styles.container,
                { backgroundColor },
                style,
            ]}
        >
            <Text style={[styles.text, { color: textColor }]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: space[2],
        paddingVertical: space[0.5],
        borderRadius: radius.pill,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'transparent', // Can be overridden
    },
    text: {
        ...typography.label,
    },
});
